// ============================================
// CUSTOMERS.JS - Customer AI System (v2.0)
// Auto-purchase: customers buy automatically
// ============================================

const CustomerManager = (() => {
  let customers = [];
  let spawnTimer = 0;
  let spawnInterval = 25;
  let isFlowing = false;
  let totalServed = 0;
  let scene;
  let hudTimer = 0;
  const exitTarget = new THREE.Vector3();
  const moveOffset = new THREE.Vector3();

  const CUSTOMER_COLORS = [
    0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a,
    0xe64a19, 0x00838f, 0xad1457, 0xf9a825,
    0x4527a0, 0x00695c,
  ];

  function init(sc) {
    scene = sc;
    GameState.on('change:storeOpen', (open) => {
      if (open) startFlow();
      else stopFlow();
    });
  }

  function startFlow() {
    isFlowing = true;
    spawnTimer = 4;
  }

  function stopFlow() {
    isFlowing = false;
  }

  function update(dt) {
    if (!GameState.raw.storeOpen || !isFlowing) return;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnCustomer();
      const baseInterval = 20;
      const marketingBonus = GameState.raw.activeCampaigns.length > 0 ? 0.55 : 1.0;
      const ratingBonus = GameState.raw.rating > 3.5 ? 0.75 : 1.1;
      spawnInterval = baseInterval * marketingBonus * ratingBonus + Math.random() * 8;
      spawnTimer = spawnInterval;
    }

    for (let i = customers.length - 1; i >= 0; i--) {
      const c = customers[i];
      updateCustomer(c, dt);
      if (c.state === 'gone') {
        if (c.mesh) scene.remove(c.mesh);
        customers.splice(i, 1);
      }
    }

    // Throttled DOM updates
    hudTimer -= dt;
    if (hudTimer <= 0) {
      UI.updateHUD();
      hudTimer = 0.25;
    }
  }

  function spawnCustomer() {
    if (customers.length >= 10) return;

    const hasStock = Object.values(GameState.raw.onShelves).some(s => s.quantity > 0);
    if (!hasStock) {
      UI.toast('⚠️ Customers left — shelves are empty!', 'warning');
      return;
    }

    const typeData = CUSTOMER_TYPES[Math.floor(Math.random() * CUSTOMER_TYPES.length)];
    const color = CUSTOMER_COLORS[Math.floor(Math.random() * CUSTOMER_COLORS.length)];

    const mesh = buildCustomerMesh(color, typeData.emoji);
    const spawnX = (Math.random() - 0.5) * 8;
    mesh.position.set(spawnX, 0, 28); // arrive from city sidewalk
    scene.add(mesh);

    const shoppingList = generateShoppingList(typeData);

    const customer = {
      id: Math.random().toString(36).substr(2),
      type: typeData,
      mesh,
      state: 'entering',
      shoppingList,
      pickedItems: [],
      mood: 'happy',
      patience: typeData.patience * (90 + Math.random() * 40),
      timer: 0,
      targetPos: new THREE.Vector3(spawnX, 0, 2),
      exitX: (Math.random() - 0.5) * 6,
      moveSpeed: 1.8 + Math.random() * 0.6,
      shopTimer: 0,
      shopDuration: 12 + Math.random() * 18,
      browseCount: 0,
      maxBrowse: 2 + Math.floor(Math.random() * 3),
    };

    customers.push(customer);
    GameState.raw.footTraffic++;
  }

  function buildCustomerMesh(bodyColor, typeEmoji) {
    const group = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Head
    const skinTones = [0xdeb887, 0xd2a375, 0xc19a6b, 0xa0826a, 0x8d6e63];
    const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairColors = [0x2c1810, 0x3e2723, 0x1a1a1a, 0x8d6e63, 0xfdd835];
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColors[Math.floor(Math.random() * hairColors.length)] });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), hairMat);
    hair.position.set(0, 1.55, -0.02);
    hair.scale.set(1.05, 0.65, 1.05);
    group.add(hair);

    // Legs
    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.38, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }

    // Shopping basket (50% chance)
    if (Math.random() > 0.5) {
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.15, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.5 })
      );
      basket.position.set(0.3, 0.9, 0);
      group.add(basket);
    }

    return group;
  }

  function generateShoppingList(typeData) {
    const list = [];
    const shelved = Object.entries(GameState.raw.onShelves).filter(([id, s]) => s.quantity > 0);
    if (shelved.length === 0) return list;

    const itemCount = Math.floor(typeData.items * (0.7 + Math.random() * 0.6));
    for (let i = 0; i < itemCount; i++) {
      const [id, info] = shelved[Math.floor(Math.random() * shelved.length)];
      const data = GameState.getProductData(id);
      if (!data) continue;

      // Price sensitivity: higher prices = fewer purchases
      const priceRatio = GameState.getPrice(id) / data.defaultPrice;
      if (priceRatio > 2.0 && Math.random() < typeData.sensitivity) continue;
      if (priceRatio > 1.5 && Math.random() < typeData.sensitivity * 0.5) continue;
      // Lower prices increase quantity bought
      const qtyBonus = priceRatio < 0.8 ? 2 : 1;

      list.push({
        id, name: data.name, emoji: data.emoji,
        price: GameState.getPrice(id),
        qty: qtyBonus
      });
    }
    return list;
  }

  function updateCustomer(c, dt) {
    c.timer += dt;

    // Patience drain
    c.patience -= dt;
    if (c.patience <= 0 && c.state !== 'done' && c.state !== 'leaving' && c.state !== 'gone') {
      customerLeaveAngry(c);
      return;
    }

    // Mood
    if (c.patience > 60) c.mood = 'happy';
    else if (c.patience > 30) c.mood = 'neutral';
    else if (c.patience > 10) c.mood = 'impatient';
    else c.mood = 'angry';

    switch (c.state) {
      case 'entering':
        moveToward(c, c.targetPos, dt);
        if (c.mesh.position.distanceTo(c.targetPos) < 0.8) {
          c.state = 'shopping';
          c.timer = 0;
          c.shopTimer = 0;
          c.targetPos.set((Math.random() - 0.5) * 8, 0, -4 - Math.random() * 6);
        }
        break;

      case 'shopping':
        c.shopTimer += dt;

        // Browse: move between shelves
        if (c.shopTimer > 3.5) {
          c.browseCount++;
          const interactableShelves = World.getInteractables().filter(i => i.type === 'shelf');
          if (interactableShelves.length > 0) {
            const shelf = interactableShelves[Math.floor(Math.random() * interactableShelves.length)];
            c.targetPos.copy(shelf.position).add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, 1.5));
          }
          c.shopTimer = 0;
        }
        moveToward(c, c.targetPos, dt);

        // After enough browsing time, AUTO-PURCHASE and leave
        if (c.timer > c.shopDuration) {
          c.pickedItems = reserveItems(c.shoppingList);
          if (c.pickedItems.length === 0) {
            customerLeaveNoItems(c);
          } else {
            autoCheckout(c);
          }
        }
        break;

      case 'leaving':
        exitTarget.set(c.exitX, 0, 28);
        moveToward(c, exitTarget, dt);
        if (c.mesh.position.z > 26 || c.timer > 10) {
          c.state = 'gone';
        }
        break;
    }

    // Walking animation
    if (c.mesh) {
      const t = performance.now() * 0.004;
      if (c.mesh.children[0]) {
        c.mesh.children[0].rotation.x = Math.sin(t * 3 + c.timer) * 0.08;
      }
      // Subtle bob
      if (c.state === 'shopping' || c.state === 'entering') {
        c.mesh.position.y = Math.abs(Math.sin(t * 5)) * 0.015;
      }
    }
  }

  // ═══════════════════════════════════════════
  //  AUTO-CHECKOUT – customers pay automatically
  // ═══════════════════════════════════════════
  function autoCheckout(customer) {
    const total = customer.pickedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    // Record all sales
    for (const item of customer.pickedItems) {
      GameState.recordSale(item.id, item.qty, item.price);
    }

    totalServed++;
    GameState.raw.customersSatisfied++;
    GameState.raw.rating = Math.min(5, GameState.raw.rating + 0.02);

    // Show floating cash and notification
    const moodEmoji = customer.mood === 'happy' ? '😄' : customer.mood === 'neutral' ? '🙂' : '😐';
    UI.toast(`${moodEmoji} ${customer.type.name} bought ${customer.pickedItems.length} items! +$${total.toFixed(2)}`, 'success');
    UI.floatingCash(total);

    GameState.completeObjective('firstSale');
    UI.updateHUD();

    // Customer transitions to leaving
    customer.state = 'leaving';
    customer.timer = 0;
  }

  function moveToward(c, target, dt) {
    if (!c.mesh) return;
    moveOffset.subVectors(target, c.mesh.position);
    moveOffset.y = 0;
    const dist = moveOffset.length();
    if (dist > 0.3) {
      moveOffset.multiplyScalar(c.moveSpeed * dt / dist);
      c.mesh.position.add(moveOffset);
      const angle = Math.atan2(moveOffset.x, moveOffset.z);
      // Smooth rotation
      const currentY = c.mesh.rotation.y;
      c.mesh.rotation.y = currentY + (angle - currentY) * Math.min(1, dt * 5);
    }
  }

  function customerLeaveAngry(c) {
    releaseReservedItems(c);
    c.state = 'leaving';
    c.timer = 0;
    GameState.raw.customersAngry++;
    GameState.raw.rating = Math.max(1, GameState.raw.rating - 0.05);
    UI.toast(`😠 ${c.type.name} left angry!`, 'error');
  }

  function customerLeaveNoItems(c) {
    c.state = 'leaving';
    c.timer = 0;
    UI.toast(`😕 ${c.type.name} left — couldn't find what they wanted.`, 'warning');
  }

  function getWaitingCustomer() {
    // Auto-checkout means no waiting queue, but keep interface for compatibility
    return null;
  }

  function completeCheckout(customer, totalPaid) {
    // Legacy compatibility - auto-checkout handles this now
    customer.state = 'leaving';
    customer.timer = 0;
  }

  function getActiveCount() {
    return customers.length;
  }

  function reserveItems(requestedItems) {
    const reserved = [];
    const available = {};

    for (const item of requestedItems) {
      if (available[item.id] === undefined) {
        available[item.id] = GameState.raw.onShelves[item.id]?.quantity || 0;
      }
      const quantity = Math.min(item.qty, available[item.id]);
      if (quantity <= 0) continue;

      available[item.id] -= quantity;
      GameState.removeFromShelf(item.id, quantity);
      reserved.push({ ...item, qty: quantity });
    }
    return reserved;
  }

  function releaseReservedItems(customer) {
    if (!customer.pickedItems?.length || customer.state === 'leaving') return;
    for (const item of customer.pickedItems) {
      GameState.addToShelf(item.id, item.qty);
    }
    customer.pickedItems = [];
  }

  function getWaitingCount() {
    return 0;
  }

  return {
    init, update, startFlow, stopFlow,
    getWaitingCustomer, completeCheckout,
    getActiveCount, getWaitingCount
  };
})();
