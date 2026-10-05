// ============================================
// PLAYER.JS - First Person Player Controller
// ============================================

const Player = (() => {
  let camera;
  let scene;
  let yaw = 0;
  let pitch = 0;
  let isLocked = false;
  let isPointerLocked = false;
  let carriedObject = null;
  let carriedMesh = null;

  const MOVE_SPEED = 5.0;
  const SPRINT_SPEED = 9.0;
  const LOOK_SENSITIVITY = 0.002;
  const REACH = 2.5;
  const PLAYER_HEIGHT = 1.7;
  const JUMP_FORCE = 5.0;

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  const carryOffset = new THREE.Vector3();
  const movementEuler = new THREE.Euler();
  let onGround = true;
  let verticalVelocity = 0;

  const keys = {};
  let nearbyInteractable = null;
  let interactCooldown = 0;

  function init(cam, sc) {
    camera = cam;
    scene = sc;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onCanvasClick);
    document.addEventListener('pointerlockchange', onPointerLockChange);
  }

  function onKeyDown(e) {
    if (isLocked) return;
    keys[e.code] = true;

    switch (e.code) {
      case 'Tab':
        e.preventDefault();
        UI.showInventoryPanel();
        break;
      case 'Escape':
        if (isPointerLocked) {
          document.exitPointerLock();
        } else {
          UI.pauseGame();
        }
        break;
      case 'KeyF':
      case 'KeyE':
        if (!isLocked && interactCooldown <= 0) handlePrimaryAction();
        break;
      case 'KeyR':
        if (!isLocked && carriedObject) rotateCarried();
        break;
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onMouseMove(e) {
    if (!isPointerLocked || isLocked) return;
    const sens = GameState.raw.mouseSensitivity;
    yaw -= e.movementX * sens;
    pitch -= e.movementY * sens;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
  }

  function onCanvasClick(e) {
    const canvas = document.getElementById('game-canvas');
    if (e.target === canvas && !isLocked && GameState.raw.isRunning) {
      canvas.requestPointerLock();
    }
  }

  function onPointerLockChange() {
    isPointerLocked = !!document.pointerLockElement;
  }

  function update(dt) {
    if (!camera || !GameState.raw.isRunning || GameState.raw.isPaused) return;
    if (interactCooldown > 0) interactCooldown -= dt;

    updateMovement(dt);
    updateCamera();
    updateCarriedObject();
    checkInteractables();
    checkObjectives();
  }

  function updateMovement(dt) {
    if (isLocked) return;

    const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? SPRINT_SPEED : MOVE_SPEED;

    direction.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) direction.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) direction.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) direction.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

    direction.normalize();

    // Rotate direction by yaw
    movementEuler.set(0, yaw, 0);
    moveDirection.copy(direction).applyEuler(movementEuler);
    prevPos.copy(camera.position);

    camera.position.x += moveDirection.x * speed * dt;
    camera.position.z += moveDirection.z * speed * dt;

    // Jump
    if (keys['Space'] && onGround) {
      verticalVelocity = JUMP_FORCE;
      onGround = false;
    }

    // Gravity
    if (!onGround) {
      verticalVelocity -= 15 * dt;
      camera.position.y += verticalVelocity * dt;
    }

    // Ground collision
    if (camera.position.y <= PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      verticalVelocity = 0;
      onGround = true;
    }

    // World bounds
    camera.position.x = Math.max(-100, Math.min(100, camera.position.x));
    camera.position.z = Math.max(-60, Math.min(60, camera.position.z));
  }

  function updateCamera() {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function updateCarriedObject() {
    if (!carriedMesh) return;
    // Float item in front of camera
    carryOffset.set(0, -0.3, -1.2).applyEuler(camera.rotation);
    carriedMesh.position.copy(camera.position).add(carryOffset);
    // Gentle bob
    const t = performance.now() * 0.001;
    carriedMesh.position.y += Math.sin(t * 3) * 0.01;
    carriedMesh.rotation.y += 0.01;
  }

  function rotateCarried() {
    if (!carriedMesh) return;
    carriedMesh.rotation.y += Math.PI / 4;
  }

  function handlePickupDrop() {
    if (carriedObject) {
      dropItem();
    } else {
      // Try to pick up nearby crate/item
      const nearby = findNearestInteractable(['crate', 'item']);
      if (nearby && nearby.type === 'crate' && !nearby.isEmpty) {
        pickupCrate(nearby);
      }
    }
  }

  function handlePrimaryAction() {
    const nearest = findNearestInteractable();
    if (carriedObject && nearest?.type === 'shelf') {
      interactWithShelf(nearest);
    } else if (carriedObject && nearest?.type === 'recyclebin') {
      useRecycleBin(nearest);
    } else if (carriedObject) {
      dropItem();
    } else if (nearest?.type === 'crate') {
      handlePickupDrop();
    } else {
      handleInteract();
    }
  }

  function pickupCrate(interactable) {
    if (carriedObject) return;
    carriedObject = interactable;
    carriedMesh = interactable.mesh;
    GameState.set('carriedItem', {
      type: 'crate',
      name: 'Delivery Crate',
      emoji: '📦',
      products: interactable.products,
      quantity: interactable.products ? interactable.products.reduce((s, p) => s + p.qty, 0) : 0,
    });
    if (typeof SFX !== 'undefined') SFX.playPickup();
    UI.showCarriedItem(GameState.raw.carriedItem);
    World.setGuidanceTarget('shelf');
    UI.toast('📦 Crate picked up! Carry it to the shelf.', 'info');
    GameState.completeObjective('pickupCrate');
    interactCooldown = 0.5;

    // Remove from interactables list temporarily
    const idx = World.getInteractables().indexOf(interactable);
    if (idx >= 0) World.getInteractables().splice(idx, 1);
  }

  function dropItem() {
    if (!carriedObject || !carriedMesh) return;
    // Drop in front of player
    const forward = new THREE.Vector3(0, 0, -1.5).applyEuler(new THREE.Euler(0, yaw, 0));
    carriedMesh.position.copy(camera.position).add(forward);
    carriedMesh.position.y = 0.3;

    // Put back in interactables
    carriedObject.position.copy(carriedMesh.position);
    World.getInteractables().push(carriedObject);

    carriedObject = null;
    carriedMesh = null;
    GameState.set('carriedItem', null);
    UI.showCarriedItem(null);
    interactCooldown = 0.3;
  }

  function handleInteract() {
    const nearest = findNearestInteractable();
    if (!nearest) return;

    interactCooldown = 0.5;

    switch (nearest.type) {
      case 'computer':
        openComputer();
        break;
      case 'shelf':
        interactWithShelf(nearest);
        break;
      case 'checkout':
        openCheckout();
        break;
      case 'recyclebin':
        useRecycleBin(nearest);
        break;
      case 'crate':
        handlePickupDrop();
        break;
    }
  }

  function openComputer() {
    UI.openPanel('computer-ui');
    Computer.open();
    GameState.completeObjective('useComputer');
    UI.toast('💻 RetailOS™ Online', 'info');
    isLocked = true;
  }

  function interactWithShelf(shelf) {
    // Open shelf stocking UI or auto-stock from carried crate
    if (carriedObject && !carriedObject.isEmpty) {
      // Stock shelf from crate
      stockShelfFromCrate(shelf, carriedObject);
    } else {
      // Show pricing popup for shelf category
      openShelfMenu(shelf);
    }
    GameState.completeObjective('nearShelf');
  }

  function stockShelfFromCrate(shelf, crate) {
    if (!crate.products || crate.products.length === 0) {
      UI.toast('📦 Crate is empty!', 'warning');
      return;
    }

    let stockedCount = 0;
    for (const item of crate.products) {
      if (item.qty > 0) {
        GameState.addToShelf(item.id, item.qty);
        stockedCount += item.qty;
      }
    }

    if (stockedCount > 0) {
      UI.toast(`✅ Stocked ${stockedCount} items on the ${shelf.category} shelf!`, 'success');
      UI.notify('Shelf Stocked!', `Added ${stockedCount} items to ${shelf.label}`, 'profit');
      crate.isEmpty = true;
      crate.products = [];
      UI.toast('📦 Crate is now empty. Dispose of it in the recycling bin!', 'info');
      GameState.completeObjective('stockShelf');
      GameState.set('carriedItem', { ...GameState.raw.carriedItem, name: 'Empty Crate', quantity: 0, emoji: '🗑️' });
      UI.showCarriedItem(GameState.raw.carriedItem);
      World.clearGuidanceTarget();
      UI.openPanel('computer-ui');
      UI.openApp('pricing');
      Computer.loadApp('pricing');

      // Also add to warehouse for reference
      for (const item of crate.products || []) {
        GameState.addToWarehouse(item.id, 0);
      }
    }
  }

  function openShelfMenu(shelf) {
    // Shortcut: open pricing for this category
    UI.openPanel('computer-ui');
    UI.openApp('pricing');
    Computer.loadApp('pricing');
    GameState.completeObjective('nearShelf');
  }

  function openCheckout() {
    const waiting = CustomerManager.getWaitingCustomer();
    if (waiting) {
      Checkout.openWithCustomer(waiting);
    } else if (GameState.raw.storeOpen) {
      UI.toast('👥 No customers at checkout right now.', 'info');
    } else {
      UI.toast('🔒 Open the store first!', 'warning');
    }
  }

  function useRecycleBin(bin) {
    if (carriedObject && carriedObject.isEmpty) {
      // Remove empty crate from scene
      if (carriedMesh) {
        carriedMesh.visible = false;
        setTimeout(() => {
          World.getScene().remove(carriedMesh);
        }, 500);
      }
      carriedObject = null;
      carriedMesh = null;
      GameState.set('carriedItem', null);
      UI.showCarriedItem(null);
      UI.toast('♻️ Empty crate recycled!', 'success');
      GameState.completeObjective('recycleCrate');
    } else if (carriedObject && !carriedObject.isEmpty) {
      UI.toast('📦 Crate still has items! Stock the shelf first.', 'warning');
    } else {
      UI.toast('♻️ Nothing to recycle.', 'info');
    }
  }

  function findNearestInteractable(types = null) {
    const cameraPos = camera.position;
    let nearest = null;
    let nearestDist = REACH;

    for (const obj of World.getInteractables()) {
      if (types && !types.includes(obj.type)) continue;
      const dist = cameraPos.distanceTo(obj.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = obj;
      }
    }
    return nearest;
  }

  function checkInteractables() {
    const nearest = findNearestInteractable();
    if (nearest !== nearbyInteractable) {
      nearbyInteractable = nearest;
      if (nearest) {
        UI.setInteractHint(nearest.label || 'E - Interact');
      } else {
        UI.clearInteractHint();
      }
    }
  }

  function checkObjectives() {
    const pos = camera.position;
    const state = GameState.raw;

    // Check exit shop (player moved outside)
    if (pos.z > 2 && !state.tutorialObjectives.exitShop) {
      GameState.completeObjective('exitShop');
    }

    // Near delivery crate
    if (pos.distanceTo(new THREE.Vector3(0, 1.7, 5)) < 3 && !state.tutorialObjectives.nearCrate) {
      GameState.completeObjective('nearCrate');
    }

    // Entered shop while carrying
    if (pos.z < 0 && carriedObject && !state.tutorialObjectives.enterShop) {
      GameState.completeObjective('enterShop');
    }
  }

  function lock() { isLocked = true; }
  function unlock() {
    isLocked = false;
    if (!document.pointerLockElement) {
      try {
        const promise = document.getElementById('game-canvas').requestPointerLock();
        if (promise && promise.catch) promise.catch(() => {});
      } catch (e) {}
    }
  }

  function getPosition() { return camera ? camera.position.clone() : new THREE.Vector3(); }
  function getYaw() { return yaw; }
  function setSensitivity(val) {
    if (typeof GameState !== 'undefined') GameState.set('mouseSensitivity', val);
  }
  function getSensitivity() {
    return (typeof GameState !== 'undefined' && GameState.raw.mouseSensitivity) ? GameState.raw.mouseSensitivity : LOOK_SENSITIVITY;
  }

  return { init, update, lock, unlock, getPosition, getYaw, setSensitivity, getSensitivity };
})();
