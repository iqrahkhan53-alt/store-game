// ============================================
// WORLD.JS - Three.js 3D World Builder (v2.0)
// Bright, modern supermarket + living city
// ============================================

const World = (() => {
  let scene, camera, renderer;
  let clock;
  let interactables = [];
  let animObjects = [];
  let dayNightCycle = 0;
  let deliveryCrates = [];
  let shelves = [];
  let recycleBin;
  let computerDesk;
  let checkoutDesk;
  let storeEntrance;
  let deliveryZone;
  let ambientLight, sunLight, fillLight;
  let hemiLight;
  let guidanceMarker;
  let guidanceTarget;
  const trafficVehicles = [];
  const cityPedestrians = [];
  const clouds = [];
  const streetLights = [];

  // ─── Shared Geometry & Material pools ───
  const geoCache = {};
  const matCache = {};

  function getGeo(key, factory) {
    if (!geoCache[key]) geoCache[key] = factory();
    return geoCache[key];
  }
  function getMat(key, factory) {
    if (!matCache[key]) matCache[key] = factory();
    return matCache[key];
  }

  // Rich, high-contrast supermarket color palette
  const COLORS = {
    floor:      0xd2d7df,   // realistic soft porcelain / terrazzo
    floorTile:  0xc5cbd5,
    wall:       0xd5dae1,   // contemporary architectural warm gray, not blinding white
    wallAccent: 0x1e293b,   // rich slate navy baseboard & accents
    ceiling:    0x222730,   // dark open architectural ceiling for contrast & depth
    shelf:      0x824c25,   // rich warm natural supermarket wood
    shelfMetal: 0x242a32,   // dark graphite architectural steel uprights
    shelfBack:  0x1a1e24,   // matte dark slatwall backing (makes fruit pop!)
    exterior:   0xc8d0d8,
    road:       0x22262d,   // deep asphalt
    grass:      0x3d9142,   // rich lush grass
    pavement:   0xb8bfc7,   // concrete sidewalk slabs
    sky:        0x78b8e8,
    wood:       0x6d3d19,
    highlight:  0x00d4ff,
    gold:       0xf59e0b,
    green:      0x10b981,
    storeWall:  0xe2e8f0,
    storeSign:  0x0f766e,
    windowGlass:0x93c5fd,
  };

  let floorMesh;

  function createSupermarketFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base polished tile tone
    ctx.fillStyle = '#dbe0e7';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 64;
    const cols = 512 / tileSize;
    const rows = 512 / tileSize;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAlt = (r + c) % 2 === 0;
        ctx.fillStyle = isAlt ? '#e5e9f0' : '#d5dae2';
        ctx.fillRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);

        // Terrazzo fine stone specks
        for (let s = 0; s < 10; s++) {
          const sx = c * tileSize + 4 + Math.random() * (tileSize - 8);
          const sy = r * tileSize + 4 + Math.random() * (tileSize - 8);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(55,65,81,0.15)' : 'rgba(255,255,255,0.4)';
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }

    // Contrasting grout lines
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 10);
    return texture;
  }

  function init(canvasEl) {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Balanced exposure (eliminated whiteout)
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x78b8e8, 0.003);
    scene.background = new THREE.Color(0x78b8e8);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 250);
    camera.position.set(0, 1.7, 8);

    clock = new THREE.Clock();

    buildLighting();
    buildSky();
    buildExterior();
    buildStore();
    buildCity();
    buildCityLife();
    buildGuidanceMarker();
    spawnDeliveryCrate();
    buildDeliveryZone();

    renderer.shadowMap.needsUpdate = true;

    window.addEventListener('resize', onResize);
    return { scene, camera, renderer };
  }

  // ═══════════════════════════════════════════
  //  LIGHTING – balanced, realistic, warm daylight
  // ═══════════════════════════════════════════
  function buildLighting() {
    ambientLight = new THREE.AmbientLight(0xfff5ea, 0.32);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0x78b8e8, 0x2e3540, 0.36);
    scene.add(hemiLight);

    // Warm sun with realistic intensity
    sunLight = new THREE.DirectionalLight(0xfff2e0, 1.05);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    fillLight = new THREE.DirectionalLight(0x64748b, 0.25);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // Interior store ceiling lights
    const positions = [
      [0, 4.8, -5], [-6, 4.8, -5], [6, 4.8, -5],
      [0, 4.8, -12], [-6, 4.8, -12], [6, 4.8, -12],
      [0, 4.8, -19], [-6, 4.8, -19], [6, 4.8, -19],
    ];
    for (const [x, y, z] of positions) {
      addStoreLight(x, y, z);
    }

    // Sunlight beams through windows (soft accents)
    const beam1 = new THREE.SpotLight(0xfff8e0, 0.25, 20, Math.PI / 6, 0.5);
    beam1.position.set(-11, 5, -8);
    beam1.target.position.set(-6, 0, -8);
    scene.add(beam1);
    scene.add(beam1.target);

    const beam2 = new THREE.SpotLight(0xfff8e0, 0.25, 20, Math.PI / 6, 0.5);
    beam2.position.set(11, 5, -8);
    beam2.target.position.set(6, 0, -8);
    scene.add(beam2);
    scene.add(beam2.target);
  }

  function addStoreLight(x, y, z) {
    const light = new THREE.PointLight(0xfff6ec, 0.35, 12);
    light.position.set(x, y, z);
    scene.add(light);

    // Modern ceiling panel light
    const geo = getGeo('ceilPanel', () => new THREE.BoxGeometry(1.2, 0.06, 0.6));
    const mat = getMat('ceilLight', () => new THREE.MeshStandardMaterial({
      color: 0xfffbf0, emissive: 0xfff4e0, emissiveIntensity: 0.25, roughness: 0.3
    }));
    const fixture = new THREE.Mesh(geo, mat);
    fixture.position.set(x, y + 0.03, z);
    scene.add(fixture);
  }

  // ═══════════════════════════════════════════
  //  SKY & CLOUDS
  // ═══════════════════════════════════════════
  function buildSky() {
    const cloudMat = getMat('cloud', () => new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92, depthWrite: false
    }));
    const cloudGeo = getGeo('cloudPuff', () => new THREE.SphereGeometry(1, 8, 6));

    for (let i = 0; i < 22; i++) {
      const group = new THREE.Group();
      const puffCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        const s = 2.5 + Math.random() * 2;
        puff.scale.set(s, s * 0.5, s * 0.8);
        puff.position.set((p - puffCount / 2) * 2.2, Math.random() * 0.6, Math.random() * 1.2);
        group.add(puff);
      }
      group.position.set(-100 + Math.random() * 200, 25 + Math.random() * 20, -70 + Math.random() * 180);
      scene.add(group);
      clouds.push({ mesh: group, speed: 0.3 + Math.random() * 0.4 });
    }
  }

  // ═══════════════════════════════════════════
  //  GUIDANCE MARKER
  // ═══════════════════════════════════════════
  function buildGuidanceMarker() {
    guidanceMarker = new THREE.Group();
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.1, 4),
      new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xff7b00, emissiveIntensity: 0.9 })
    );
    arrow.rotation.x = Math.PI;
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.9, 32),
      new THREE.MeshBasicMaterial({ color: 0x32ff69, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    guidanceMarker.add(arrow, glow);
    guidanceMarker.visible = false;
    scene.add(guidanceMarker);
  }

  function setGuidanceTarget(type) {
    const target = interactables.find(item => item.type === type && (type !== 'shelf' || item.category === 'fruits'));
    if (!target || !guidanceMarker) return;
    guidanceTarget = target.position.clone();
    guidanceMarker.visible = true;
  }

  function clearGuidanceTarget() {
    guidanceTarget = null;
    if (guidanceMarker) guidanceMarker.visible = false;
  }

  // ═══════════════════════════════════════════
  //  STORE EXTERIOR
  // ═══════════════════════════════════════════
  function buildExterior() {
    // Ground – green grass
    const groundGeo = new THREE.PlaneGeometry(250, 250);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4cb050, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pavement / sidewalk around the store
    addBox(0, 0.02, 8, 32, 0.04, 22, 0xc8c8c8, false);

    // ─── STORE FRONT FACADE ───
    const facadeMat = getMat('facade', () => new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, roughness: 0.4, metalness: 0.05
    }));

    // Front wall left of door
    addBox(-8.5, 3, 0, 5, 6, 0.35, 0xf0f0f0);
    // Front wall right of door
    addBox(8.5, 3, 0, 5, 6, 0.35, 0xf0f0f0);
    // Above door
    addBox(0, 5.6, 0, 12, 0.8, 0.35, 0xf0f0f0);

    // Glass door area (transparent)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xb0d4f1, transparent: true, opacity: 0.2,
      roughness: 0.05, metalness: 0.3
    });
    const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.8), glassMat);
    doorGlass.position.set(0, 2.4, 0.05);
    scene.add(doorGlass);

    // Automatic door frame
    addBox(-3, 2.4, 0, 0.12, 4.8, 0.2, 0x607080);
    addBox(3, 2.4, 0, 0.12, 4.8, 0.2, 0x607080);
    addBox(0, 4.85, 0, 6.24, 0.12, 0.2, 0x607080);

    // Windows on side walls (bright glass panels)
    for (let z = -4; z >= -20; z -= 4) {
      // Left wall windows
      addBox(-11.15, 3, z, 0.08, 2.4, 2.5, 0xb0d4f1, true, 0x87ceeb, 0.15);
      // Right wall windows
      addBox(11.15, 3, z, 0.08, 2.4, 2.5, 0xb0d4f1, true, 0x87ceeb, 0.15);
    }

    // Store SIGN above entrance
    const signGeo = new THREE.BoxGeometry(16, 2.2, 0.3);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x1565c0, roughness: 0.3, metalness: 0.2,
      emissive: 0x1565c0, emissiveIntensity: 0.15
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 6.8, 0.2);
    sign.castShadow = true;
    scene.add(sign);

    // Sign text glow
    addBox(0, 6.8, 0.38, 14, 1.4, 0.06, 0xffffff, true, 0xffffff, 0.6);

    // Modern awning
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.5, metalness: 0.1 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(24, 0.2, 3.5), awningMat);
    awning.position.set(0, 4.2, 1.8);
    awning.castShadow = true;
    scene.add(awning);

    // Awning support brackets
    for (let x = -10; x <= 10; x += 5) {
      addBox(x, 3.7, 1.5, 0.08, 1, 0.08, 0xaaaaaa);
    }

    // Parking lot
    addBox(0, 0.025, 24, 34, 0.05, 14, 0x555555, false);
    // Parking lines
    for (let i = -14; i <= 14; i += 5) {
      addBox(i, 0.04, 24, 0.15, 0.01, 11, 0xffffff, true, 0xffffff, 0.3);
    }

    // Outdoor planters
    for (let x = -10; x <= 10; x += 5) {
      buildPlanter(x, 0, 3);
    }

    // Outdoor lamp posts
    addLampPost(14, 0, 10);
    addLampPost(-14, 0, 10);
    addLampPost(14, 0, 24);
    addLampPost(-14, 0, 24);
  }

  function buildPlanter(x, y, z) {
    // Concrete planter box
    addBox(x, 0.35, z, 0.8, 0.7, 0.8, 0x909090);
    // Dirt
    addBox(x, 0.72, z, 0.7, 0.04, 0.7, 0x6b4226);
    // Small bush
    addSphere(x, 1.1, z, 0.4, 0x2e7d32);
    addSphere(x + 0.15, 0.95, z - 0.1, 0.25, 0x388e3c);
  }

  function addLampPost(x, y, z) {
    addCylinder(x, 3, z, 0.08, 0.1, 6, 8, 0x607080);
    addBox(x, 6.15, z, 0.7, 0.18, 0.5, 0x505060);
    const lampLight = new THREE.PointLight(0xffe8c0, 0, 16, 2);
    lampLight.position.set(x, 6, z);
    scene.add(lampLight);
    const glowMat = getMat('lampGlow', () => new THREE.MeshStandardMaterial({
      color: 0xfff0d0, emissive: 0xffa030, emissiveIntensity: 1.5
    }));
    const glow = new THREE.Mesh(getGeo('lampSphere', () => new THREE.SphereGeometry(0.12, 8, 8)), glowMat);
    glow.position.set(x, 6.05, z);
    scene.add(glow);
    streetLights.push({ light: lampLight, lamp: glow });
  }

  // ═══════════════════════════════════════════
  //  STORE INTERIOR – realistic, high-contrast, polished
  // ═══════════════════════════════════════════
  function buildStore() {
    const storeW = 22;
    const storeD = 26;
    const storeH = 6;
    const storeZ = -storeD / 2;

    // ─── HIGH-CONTRAST POLISHED SUPERMARKET FLOOR ───
    const floorTexture = createSupermarketFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture, roughness: 0.28, metalness: 0.08
    });
    const floorGeo = new THREE.PlaneGeometry(storeW, storeD);
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0.01, storeZ);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // ─── WALLS (Contemporary warm architectural stone/gray) ───
    const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.55 });
    addBox(0, storeH / 2, storeZ - storeD / 2, storeW, storeH, 0.3, COLORS.wall);
    addBox(-storeW / 2, storeH / 2, storeZ, 0.3, storeH, storeD, COLORS.wall);
    addBox(storeW / 2, storeH / 2, storeZ, 0.3, storeH, storeD, COLORS.wall);

    // Architectural header band (rich teal/slate brand accent)
    addBox(0, storeH - 0.4, storeZ - storeD / 2 + 0.05, storeW, 0.3, 0.1, 0x0f766e, true, 0x0f766e, 0.2);
    addBox(-storeW / 2 + 0.05, storeH - 0.4, storeZ, 0.1, 0.3, storeD, 0x0f766e, true, 0x0f766e, 0.2);
    addBox(storeW / 2 - 0.05, storeH - 0.4, storeZ, 0.1, 0.3, storeD, 0x0f766e, true, 0x0f766e, 0.2);

    // Dark architectural ceiling for depth & contrast
    addBox(0, storeH, storeZ, storeW, 0.3, storeD, COLORS.ceiling);

    // Rich dark slate baseboards
    for (let x = -storeW / 2 + 0.5; x <= storeW / 2 - 0.5; x += 1) {
      addBox(x, 0.08, storeZ - storeD / 2 + 0.15, 1.05, 0.16, 0.1, COLORS.wallAccent, false);
    }

    // Store entrance
    storeEntrance = { x: 0, z: 1 };

    // ─── SHELVES ───
    buildShelfRow(-7, 0, -6, 3, 'fruits');
    buildShelfRow(-7, 0, -14, 3, 'vegetables');
    buildShelfRow(0, 0, -8, 3, 'snacks');
    buildShelfRow(0, 0, -16, 3, 'drinks');
    buildShelfRow(7, 0, -6, 3, 'dairy');
    buildShelfRow(7, 0, -14, 3, 'household');
    buildBackShelf(-8, 0, -25, 'frozen');
    buildBackShelf(0, 0, -25, 'electronics');
    buildBackShelf(8, 0, -25, 'cosmetics');

    // ─── CHECKOUT, COMPUTER, RECYCLING, DECOR ───
    buildCheckoutDesk();
    buildComputerArea();
    buildRecycleBin();
    buildStoreDecor();
    buildWarehouse();
  }

  // ═══════════════════════════════════════════
  //  SHELF SYSTEM (Contrasting warm oak & dark steel)
  // ═══════════════════════════════════════════
  function buildShelfRow(x, y, z, count, category) {
    const colors = {
      fruits: 0x16a34a, vegetables: 0x15803d, snacks: 0xd97706,
      drinks: 0x0284c7, dairy: 0xeab308, household: 0x7c3aed,
      frozen: 0x06b6d4, electronics: 0x4f46e5, cosmetics: 0xdb2777, pets: 0x92400e
    };
    const color = colors[category] || 0x475569;
    for (let i = 0; i < count; i++) {
      const sz = z - i * 2.2;
      const shelfData = buildSingleShelf(x, y, sz, color, category);
      shelves.push(shelfData);
    }
  }

  function buildSingleShelf(x, y, z, accentColor, category) {
    const group = new THREE.Group();

    // Dark architectural graphite steel frame
    const frameMat = getMat('shelfFrame', () => new THREE.MeshStandardMaterial({
      color: COLORS.shelfMetal, roughness: 0.35, metalness: 0.7
    }));
    for (const dx of [-0.85, 0.85]) {
      const upright = new THREE.Mesh(
        getGeo('shelfUpright', () => new THREE.BoxGeometry(0.05, 2.2, 0.05)),
        frameMat
      );
      upright.position.set(dx, 1.1, 0);
      upright.castShadow = true;
      group.add(upright);
    }

    // Shelf boards – warm natural supermarket wood
    const boardMat = getMat('shelfBoard', () => new THREE.MeshStandardMaterial({
      color: COLORS.shelf, roughness: 0.5, metalness: 0.05
    }));
    const boardGeo = getGeo('shelfBoard', () => new THREE.BoxGeometry(1.8, 0.04, 0.5));
    for (let level = 0; level < 4; level++) {
      const h = 0.35 + level * 0.55;
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, h, 0);
      board.castShadow = true;
      board.receiveShadow = true;
      group.add(board);

      // Acrylic price tag channel strip on front edge
      const edge = new THREE.Mesh(
        getGeo('shelfEdge', () => new THREE.BoxGeometry(1.8, 0.03, 0.02)),
        getMat('shelfEdgeMat', () => new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 }))
      );
      edge.position.set(0, h, 0.26);
      group.add(edge);
    }

    // Back panel - matte dark slate slatwall (makes products POP!)
    const backMat = getMat('shelfBack', () => new THREE.MeshStandardMaterial({
      color: COLORS.shelfBack, roughness: 0.85
    }));
    const back = new THREE.Mesh(
      getGeo('shelfBack', () => new THREE.BoxGeometry(1.8, 2.2, 0.03)),
      backMat
    );
    back.position.set(0, 1.1, -0.27);
    group.add(back);

    // Category label strip at top
    addBoxToGroup(group, 0, 2.32, 0, 1.7, 0.18, 0.06, accentColor, true, accentColor, 0.25);

    group.position.set(x, y, z);
    scene.add(group);

    const interactable = {
      type: 'shelf',
      category,
      position: new THREE.Vector3(x, 1, z),
      mesh: group,
      productIds: PRODUCTS[category] ? PRODUCTS[category].map(p => p.id) : [],
      label: category.charAt(0).toUpperCase() + category.slice(1) + ' Shelf (F to Stock / Price)',
    };
    interactables.push(interactable);

    displayShelfItems(group, category);
    return interactable;
  }

  function displayShelfItems(group, category) {
    const products = PRODUCTS[category];
    if (!products) return;
    const positions = [
      { x: -0.55, y: 0.42, z: 0.05 }, { x: 0, y: 0.42, z: 0.05 }, { x: 0.55, y: 0.42, z: 0.05 },
      { x: -0.55, y: 0.97, z: 0.05 }, { x: 0, y: 0.97, z: 0.05 }, { x: 0.55, y: 0.97, z: 0.05 },
      { x: -0.55, y: 1.52, z: 0.05 }, { x: 0, y: 1.52, z: 0.05 }, { x: 0.55, y: 1.52, z: 0.05 },
    ];
    for (let i = 0; i < Math.min(products.length, positions.length); i++) {
      const pos = positions[i];
      const fruitMesh = buildFruitModel(products[i].id);
      fruitMesh.position.set(pos.x, pos.y, pos.z);
      fruitMesh.scale.setScalar(0.65);
      group.add(fruitMesh);
    }
  }

  // ═══════════════════════════════════════════
  //  REALISTIC 3D FRUIT & PRODUCT MODELS
  // ═══════════════════════════════════════════
  function buildFruitModel(id) {
    const group = new THREE.Group();
    const color = getProductColor(id);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 });

    switch (id) {
      case 'apple': {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 }));
        body.scale.y = 0.9;
        group.add(body);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.015, 0.06, 6),
          new THREE.MeshStandardMaterial({ color: 0x4a2c11 })
        );
        stem.position.y = 0.13;
        group.add(stem);
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
        );
        leaf.scale.set(1, 0.3, 2);
        leaf.position.set(0.02, 0.14, 0.02);
        group.add(leaf);
        break;
      }
      case 'banana': {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, -0.1, 0),
          new THREE.Vector3(0.08, 0.05, 0),
          new THREE.Vector3(0, 0.15, 0)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.035, 8, false);
        const banana = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.4 }));
        group.add(banana);
        break;
      }
      case 'orange': {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf57c00, roughness: 0.55 }));
        group.add(body);
        const nub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.01, 0.03, 6),
          new THREE.MeshStandardMaterial({ color: 0x388e3c })
        );
        nub.position.y = 0.13;
        group.add(nub);
        break;
      }
      case 'mango': {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.45 }));
        body.scale.set(0.75, 0.9, 1.3);
        group.add(body);
        break;
      }
      case 'grapes': {
        const grapeMat = new THREE.MeshStandardMaterial({ color: 0x6a1b9a, roughness: 0.3 });
        const grapeGeo = getGeo('grape', () => new THREE.SphereGeometry(0.04, 8, 6));
        for (let row = 0; row < 3; row++) {
          const count = 3 - row;
          for (let i = 0; i < count; i++) {
            const g = new THREE.Mesh(grapeGeo, grapeMat);
            g.position.set((i - (count - 1) / 2) * 0.07, row * 0.06 - 0.06, 0);
            group.add(g);
          }
        }
        break;
      }
      case 'watermelon': {
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 })
        );
        body.scale.set(1.3, 0.9, 1);
        group.add(body);
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.25, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x14532d })
          );
          stripe.position.set(Math.cos(angle) * 0.17, 0, Math.sin(angle) * 0.15);
          stripe.rotation.y = angle;
          group.add(stripe);
        }
        break;
      }
      case 'strawberry': {
        const body = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.16, 8),
          new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 })
        );
        body.rotation.x = Math.PI;
        group.add(body);
        const top = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.04, 0.02, 8),
          new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
        );
        top.position.y = 0.08;
        group.add(top);
        break;
      }
      case 'pineapple': {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.11, 0.22, 10),
          new THREE.MeshStandardMaterial({ color: 0xe69500, roughness: 0.7 })
        );
        body.position.y = 0.11;
        group.add(body);
        for (let a = 0; a < 6; a++) {
          const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(0.025, 0.12, 4),
            new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 })
          );
          const angle = (a / 6) * Math.PI * 2;
          leaf.position.set(Math.cos(angle) * 0.04, 0.25, Math.sin(angle) * 0.04);
          leaf.rotation.z = Math.cos(angle) * 0.35;
          leaf.rotation.x = Math.sin(angle) * 0.35;
          group.add(leaf);
        }
        break;
      }
      case 'peach': {
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xff8a80, roughness: 0.7 })
        );
        body.scale.set(1.05, 0.95, 1.05);
        group.add(body);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.012, 0.05, 5),
          new THREE.MeshStandardMaterial({ color: 0x5d4037 })
        );
        stem.position.y = 0.12;
        group.add(stem);
        break;
      }
      case 'avocado': {
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.85 })
        );
        body.scale.set(0.85, 1.25, 0.85);
        group.add(body);
        break;
      }
      case 'lemon': {
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
        );
        body.scale.set(0.8, 1.35, 0.8);
        body.rotation.z = Math.PI / 4;
        group.add(body);
        break;
      }
      case 'cherry': {
        const cMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.25 });
        const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), cMat);
        c1.position.set(-0.06, 0.04, 0);
        const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), cMat);
        c2.position.set(0.06, 0.06, 0);
        group.add(c1, c2);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4),
          new THREE.MeshStandardMaterial({ color: 0x15803d })
        );
        stem.position.set(0, 0.14, 0);
        stem.rotation.z = 0.1;
        group.add(stem);
        break;
      }
      default: {
        const box = new THREE.Mesh(
          getGeo('productBox', () => new THREE.BoxGeometry(0.2, 0.2, 0.2)),
          new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
        );
        group.add(box);
      }
    }
    return group;
  }

  function getProductColor(id) {
    const colors = {
      apple: 0xd32f2f, banana: 0xfbc02d, orange: 0xf57c00, mango: 0xff9800,
      grapes: 0x6a1b9a, strawberry: 0xd32f2f, watermelon: 0x2e7d32,
      pineapple: 0xe69500, peach: 0xff8a80, avocado: 0x1b5e20, lemon: 0xfacc15, cherry: 0x991b1b,
      potato: 0xbf9860, tomato: 0xe53935, onion: 0xc0a080, carrot: 0xff6d00,
      cucumber: 0x43a047, water: 0x64b5f6, juice: 0xffa726, soda: 0xef5350,
      energy: 0xcddc39, chips: 0xf9a825, cookies: 0xbf8040, chocolate: 0x5d4037,
      milk: 0xf1f5f9, cheese: 0xfdd835, butter: 0xfff176, yogurt: 0xfce4ec,
      icecream: 0xfff0f5, pizza: 0xe8a030, soap: 0x64b5f6, detergent: 0x1565c0,
      shampoo: 0x66bb6a, batteries: 0x424242, charger: 0x37474f, earbuds: 0x546e7a,
      lipstick: 0xc62828, perfume: 0xba68c8, petfood: 0x8d6e63, pettoy: 0xe8703a,
    };
    return colors[id] || 0x64748b;
  }

  function buildBackShelf(x, y, z, category) {
    buildSingleShelf(x, y, z, 0x78909c, category);
  }

  // ═══════════════════════════════════════════
  //  CHECKOUT DESK
  // ═══════════════════════════════════════════
  function buildCheckoutDesk() {
    const x = 6, y = 0, z = -3;
    const group = new THREE.Group();

    // Modern white counter
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.1 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.9), baseMat);
    base.position.set(0, 0.5, 0);
    base.castShadow = true;
    group.add(base);

    // Counter top
    const topMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.2, metalness: 0.15 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 0.95), topMat);
    top.position.set(0, 1.04, 0);
    group.add(top);

    // POS Screen
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: 0x1565c0, emissiveIntensity: 0.4
    });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.04), screenMat);
    screen.position.set(-0.5, 1.35, 0.2);
    group.add(screen);

    // Barcode scanner
    addBoxToGroup(group, 0.4, 1.07, 0.1, 0.2, 0.05, 0.3, 0x424242);

    // Scanner laser line
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.005, 0.005), lineMat);
    line.position.set(0.4, 1.1, 0.1);
    group.add(line);
    animObjects.push({ mesh: line, type: 'scannerBlink', t: 0 });

    // Register light
    const regLight = new THREE.PointLight(0x42a5f5, 0.5, 4);
    regLight.position.set(0, 1.5, 0);
    group.add(regLight);

    group.position.set(x, y, z);
    scene.add(group);
    checkoutDesk = group;

    interactables.push({
      type: 'checkout',
      position: new THREE.Vector3(x, 1, z),
      mesh: group,
      label: 'F - Open Checkout Register',
    });
  }

  // ═══════════════════════════════════════════
  //  RECEPTION COMPUTER
  // ═══════════════════════════════════════════
  function buildComputerArea() {
    const x = 3, y = 0, z = -3;
    const group = new THREE.Group();

    // Modern white desk
    addBoxToGroup(group, 0, 0.38, 0, 1.5, 0.05, 0.7, 0xe8e8e8);
    // Desk legs
    for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
      addBoxToGroup(group, dx, 0.19, dz, 0.04, 0.38, 0.04, 0xb0b0b0);
    }

    // Monitor
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0x1976d2, emissiveIntensity: 0.6
    });
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.03), screenMat);
    monitor.position.set(0, 0.72, 0.05);
    group.add(monitor);

    // Monitor bezel
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.8 });
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.04), bezelMat);
    bezel.position.set(0, 0.72, 0.04);
    group.add(bezel);

    // Stand
    addBoxToGroup(group, 0, 0.52, 0.15, 0.05, 0.28, 0.05, 0x444444);
    addBoxToGroup(group, 0, 0.42, 0.15, 0.2, 0.02, 0.12, 0x444444);

    // Keyboard
    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.015, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.5 })
    );
    kb.position.set(0, 0.42, 0.28);
    group.add(kb);

    // Mouse
    const mouse = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.4 })
    );
    mouse.position.set(0.35, 0.42, 0.28);
    group.add(mouse);

    // Monitor glow light
    const monitorLight = new THREE.PointLight(0x42a5f5, 0.4, 3);
    monitorLight.position.set(0, 0.72, 0.5);
    group.add(monitorLight);
    animObjects.push({ mesh: monitorLight, type: 'monitorPulse', t: 0 });

    // Office chair
    addBoxToGroup(group, 0, 0.38, 0.75, 0.45, 0.04, 0.45, 0x37474f);
    addBoxToGroup(group, 0, 0.72, 0.96, 0.45, 0.55, 0.04, 0x37474f);
    addCylinderToGroup(group, 0, 0.2, 0.75, 0.04, 0.04, 0.35, 0x424242);
    // Chair wheels base
    addBoxToGroup(group, 0, 0.04, 0.75, 0.4, 0.04, 0.4, 0x37474f);

    group.position.set(x, y, z);
    scene.add(group);
    computerDesk = group;

    interactables.push({
      type: 'computer',
      position: new THREE.Vector3(x, 1, z),
      mesh: group,
      label: 'F - Use Reception Computer',
    });
  }

  // ═══════════════════════════════════════════
  //  RECYCLE BIN
  // ═══════════════════════════════════════════
  function buildRecycleBin() {
    const x = -9, y = 0, z = -2;
    const group = new THREE.Group();

    const binMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5 });
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.85, 12), binMat);
    bin.position.set(0, 0.425, 0);
    bin.castShadow = true;
    group.add(bin);

    // Recycling symbol
    const symbolMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50, emissiveIntensity: 0.6 });
    const symbol = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 3), symbolMat);
    symbol.position.set(0, 0.5, 0.33);
    group.add(symbol);

    // White arrows
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 3), arrowMat);
      a.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.11, 0.5, 0.33 + Math.sin(i * Math.PI * 2 / 3) * 0.02);
      a.rotation.z = i * Math.PI * 2 / 3;
      group.add(a);
    }

    group.position.set(x, y, z);
    scene.add(group);
    recycleBin = group;

    interactables.push({
      type: 'recyclebin',
      position: new THREE.Vector3(x, 0.5, z),
      mesh: group,
      label: 'F - Recycle Empty Crate',
    });
  }

  function buildStoreDecor() {
    // Welcome mat at entrance
    addBox(0, 0.015, -0.5, 3, 0.01, 1.5, 0x5d4037);

    // Promotional endcap displays
    for (const xPos of [-4, 4]) {
      addBox(xPos, 0.4, -4, 0.8, 0.8, 0.6, 0xf5f5f5);
      addBox(xPos, 0.85, -4, 0.7, 0.1, 0.5, 0xffc107, true, 0xffc107, 0.2);
    }

    // Shopping cart stack near entrance
    for (let i = 0; i < 3; i++) {
      addBox(-10.2, 0.2 + i * 0.15, 1.5, 0.5, 0.12, 0.4, 0xb0b0b0);
    }

    // Price tags on wall (decorative)
    for (let z = -6; z >= -22; z -= 5) {
      addBox(-10.8, 2, z, 0.05, 0.3, 0.4, 0xffc107, true, 0xffc107, 0.15);
      addBox(10.8, 2, z, 0.05, 0.3, 0.4, 0xffc107, true, 0xffc107, 0.15);
    }
  }

  function buildWarehouse() {
    // Back warehouse room
    addBox(0, 3, -38, 20, 6, 0.3, 0xe0e0e0);
    addBox(-10, 3, -33, 0.3, 6, 12, 0xe0e0e0);
    addBox(10, 3, -33, 0.3, 6, 12, 0xe0e0e0);

    // Partition wall with door gap
    addBox(-6, 3, -27, 8, 6, 0.3, 0xd0d0d0);
    addBox(6, 3, -27, 8, 6, 0.3, 0xd0d0d0);
    addBox(0, 5.6, -27, 4, 0.8, 0.3, 0xd0d0d0);

    // Warehouse floor (slightly different shade)
    addBox(0, 0.01, -33, 20, 0.02, 12, 0xdddddd, false);

    // Metal storage racks
    buildStorageRack(-7, 0, -35);
    buildStorageRack(-3, 0, -35);
    buildStorageRack(3, 0, -35);
    buildStorageRack(7, 0, -35);

    // Warehouse lighting
    const whLight = new THREE.PointLight(0xffffff, 0.5, 12);
    whLight.position.set(0, 5.5, -33);
    scene.add(whLight);
  }

  function buildStorageRack(x, y, z) {
    const mat = getMat('rackMetal', () => new THREE.MeshStandardMaterial({
      color: 0x78909c, metalness: 0.7, roughness: 0.3
    }));
    for (const dx of [-0.9, 0.9]) {
      const m = new THREE.Mesh(
        getGeo('rackUpright', () => new THREE.BoxGeometry(0.06, 3, 0.06)),
        mat
      );
      m.position.set(x + dx, 1.5, z);
      scene.add(m);
    }
    for (let level = 0; level < 3; level++) {
      const board = new THREE.Mesh(
        getGeo('rackBoard', () => new THREE.BoxGeometry(1.9, 0.05, 0.5)),
        mat
      );
      board.position.set(x, 0.5 + level, z);
      scene.add(board);
    }
  }

  // ═══════════════════════════════════════════
  //  DELIVERY ZONE
  // ═══════════════════════════════════════════
  function buildDeliveryZone() {
    deliveryZone = { x: 0, z: 15 };
    // Loading zone ground marking
    addBox(0, 0.035, 15, 6, 0.01, 4, 0x666666, false);
    // Yellow safety stripes
    for (const xOff of [-3, 3]) {
      addBox(xOff, 0.045, 15, 0.2, 0.01, 4, 0xffc107, true, 0xffc107, 0.4);
    }
    addBox(0, 0.045, 13, 6, 0.01, 0.2, 0xffc107, true, 0xffc107, 0.4);
    addBox(0, 0.045, 17, 6, 0.01, 0.2, 0xffc107, true, 0xffc107, 0.4);
    // "LOADING" text marker (small box)
    addBox(0, 0.05, 15, 2, 0.005, 0.4, 0xffffff, true, 0xffffff, 0.2);
  }

  // ═══════════════════════════════════════════
  //  CITY – alive, colorful, explorable
  // ═══════════════════════════════════════════
  function buildCity() {
    // ─── ROADS ───
    // Main east-west road
    addBox(0, 0.02, 35, 200, 0.04, 12, 0x444444, false);
    // North-south cross roads
    addBox(-38, 0.02, 16, 10, 0.04, 100, 0x444444, false);
    addBox(38, 0.02, 16, 10, 0.04, 100, 0x444444, false);

    // Road center markings (yellow dashed)
    for (let x = -90; x <= 90; x += 8) {
      addBox(x, 0.035, 35, 4, 0.02, 0.25, 0xffc107, true, 0xffc107, 0.2);
    }
    for (let z = -30; z <= 60; z += 8) {
      addBox(-38, 0.035, z, 0.25, 0.02, 4, 0xffc107, true, 0xffc107, 0.2);
      addBox(38, 0.035, z, 0.25, 0.02, 4, 0xffc107, true, 0xffc107, 0.2);
    }

    // White edge lines
    addBox(0, 0.03, 29, 200, 0.02, 0.15, 0xffffff, true, 0xffffff, 0.15);
    addBox(0, 0.03, 41, 200, 0.02, 0.15, 0xffffff, true, 0xffffff, 0.15);

    // ─── SIDEWALKS ───
    addBox(0, 0.06, 44, 200, 0.12, 4, 0xc8c8c8);
    addBox(0, 0.06, 26, 200, 0.12, 4, 0xc8c8c8);
    addBox(-45, 0.06, 16, 4, 0.12, 100, 0xc8c8c8);
    addBox(45, 0.06, 16, 4, 0.12, 100, 0xc8c8c8);

    // ─── TREES along sidewalks ───
    for (let x = -80; x <= 80; x += 14) {
      addTree(x + 4, 0, 46);
      addTree(x, 0, 24);
    }
    for (let z = -20; z <= 55; z += 14) {
      addTree(-47, 0, z);
      addTree(47, 0, z + 6);
    }

    // ─── STREET LIGHTS ───
    for (let x = -76; x <= 76; x += 18) {
      buildStreetLight(x, 0, 44);
      buildStreetLight(x + 9, 0, 26);
    }
    for (let z = -16; z <= 55; z += 18) {
      buildStreetLight(-45, 0, z);
      buildStreetLight(45, 0, z + 8);
    }

    // ─── CITY BUILDINGS ───
    buildBuilding(40, 0, 55, 14, 28, 12, 0x78909c);
    buildBuilding(-40, 0, 55, 12, 20, 14, 0x90a4ae);
    buildBuilding(30, 0, 78, 10, 18, 10, 0x607d8b);
    buildBuilding(-30, 0, 75, 16, 24, 12, 0x8d99ae);
    buildBuilding(45, 0, 90, 12, 35, 12, 0x546e7a);
    buildBuilding(-45, 0, 88, 14, 26, 16, 0x78909c);
    buildBuilding(0, 0, 80, 10, 16, 10, 0xbcaaa4);
    buildBuilding(60, 0, 70, 10, 22, 10, 0x90a4ae);

    // ─── SUPPLIER BUILDINGS ───
    buildSupplierBuilding(25, 0, 48, 'FreshMart');
    buildSupplierBuilding(-25, 0, 48, 'DrinkDepot');

    // ─── SHOP FRONTS ───
    buildShopFront(18, 0, 48, 'CAFE', 0xd32f2f);
    buildShopFront(-18, 0, 48, 'PHARMACY', 0x2e7d32);

    // ─── APARTMENT BLOCKS ───
    buildApartmentBlock(58, 0, 20, 16, 22, 12, 0xbcaaa4);
    buildApartmentBlock(-58, 0, 20, 16, 18, 12, 0x90a4ae);

    // ─── PARKED CARS ───
    addParkedCar(-9, 0, 24, 0x1565c0);
    addParkedCar(-4, 0, 24, 0xc62828);
    addParkedCar(1, 0, 24, 0x2e7d32);
    addParkedCar(6, 0, 24, 0xf9a825);
    addParkedCar(11, 0, 24, 0x6a1b9a);
  }

  function buildStreetLight(x, y, z) {
    addCylinder(x, y, z, 0.07, 0.09, 6.5, 8, 0x607080);
    // Lamp head
    addBox(x, y + 6.6, z, 0.8, 0.2, 0.5, 0x607080);
    const light = new THREE.PointLight(0xffe8c0, 0, 16, 2);
    light.position.set(x, y + 6.4, z);
    scene.add(light);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e1, emissive: 0xffa726, emissiveIntensity: 1.5
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowMat);
    glow.position.set(x, y + 6.5, z);
    scene.add(glow);
    streetLights.push({ light, lamp: glow });
  }

  function buildShopFront(x, y, z, label, color) {
    addBox(x, 3.5, z, 12, 7, 8, 0xfafafa);
    // Colored sign strip
    addBox(x, 5.8, z - 4.05, 11, 0.9, 0.12, color, true, color, 0.3);
    // Windows
    addBox(x, 2.5, z - 4.15, 3.5, 3.5, 0.08, 0xb0d4f1, true, 0x87ceeb, 0.15);
    for (const dx of [-3.5, 3.5]) {
      addBox(x + dx, 2.8, z - 4.15, 2.2, 2.5, 0.08, 0xb0d4f1, true, 0x87ceeb, 0.15);
    }
  }

  function buildApartmentBlock(x, y, z, w, h, d, color) {
    buildBuilding(x, y, z, w, h, d, color);
    addBox(x, h + 0.3, z, w + 0.5, 0.5, d + 0.5, 0x78909c);
  }

  function buildBuilding(x, y, z, w, h, d, color) {
    addBox(x, h / 2, z, w, h, d, color);
    // Windows with warm light
    const windowGeo = getGeo('bldgWindow', () => new THREE.BoxGeometry(0.7, 1.1, 0.06));
    for (let wy = 3; wy < h - 1; wy += 3.5) {
      for (let wx = -w / 2 + 1.5; wx < w / 2 - 0.5; wx += 2.2) {
        const lit = Math.random() > 0.25;
        const wColor = lit ? 0xfff8e1 : 0x90a4ae;
        const wEmissive = lit ? 0xffc107 : 0x000000;
        const wMat = new THREE.MeshStandardMaterial({
          color: wColor, emissive: wEmissive, emissiveIntensity: lit ? 0.3 : 0
        });
        const wMesh = new THREE.Mesh(windowGeo, wMat);
        wMesh.position.set(x + wx, y + wy, z + d / 2 + 0.02);
        scene.add(wMesh);
      }
    }
    // Rooftop
    addBox(x, y + h + 0.2, z, w + 0.3, 0.4, d + 0.3, 0x546e7a);
  }

  function buildSupplierBuilding(x, y, z, name) {
    addBox(x, 4.5, z, 12, 9, 9, 0xeceff1);
    addBox(x, 9.5, z + 4.6, 11, 0.7, 0.12, 0x1b5e20, true, 0x4caf50, 0.4);
    addBox(x, 0.3, z + 5.5, 5, 0.6, 2.5, 0x757575);
  }

  function addTree(x, y, z) {
    // Trunk
    addCylinder(x, 1.5, z, 0.1, 0.12, 3, 6, 0x6d4c41);
    // Canopy (bright green spheres)
    addSphere(x, 3.5, z, 1.3, 0x43a047);
    addSphere(x + 0.4, 3.2, z + 0.3, 0.95, 0x388e3c);
    addSphere(x - 0.3, 3.0, z - 0.2, 0.85, 0x4caf50);
    addSphere(x + 0.1, 3.8, z - 0.15, 0.7, 0x66bb6a);
  }

  function addParkedCar(x, y, z, color) {
    // Car body
    addBox(x, 0.35, z, 2.2, 0.6, 1.1, color);
    // Cabin
    addBox(x - 0.15, 0.8, z, 1.5, 0.5, 0.95, color);
    // Windows (bluish glass)
    addBox(x - 0.15, 0.85, z, 1.3, 0.35, 0.85, 0xb0d4f1, true, 0x64b5f6, 0.1);
    // Wheels
    for (const [wx, wz] of [[-0.85, 0.45], [0.85, 0.45], [-0.85, -0.45], [0.85, -0.45]]) {
      addCylinder(x + wx, 0.18, z + wz, 0.15, 0.15, 0.12, 8, 0x212121);
    }
    // Headlights
    for (const dz of [-0.35, 0.35]) {
      addBox(x + 1.1, 0.4, z + dz, 0.05, 0.12, 0.15, 0xfff8e1, true, 0xfff8e1, 0.5);
    }
    // Taillights
    for (const dz of [-0.35, 0.35]) {
      addBox(x - 1.1, 0.4, z + dz, 0.05, 0.12, 0.15, 0xe53935, true, 0xe53935, 0.3);
    }
  }

  // ═══════════════════════════════════════════
  //  CITY LIFE – traffic + pedestrians
  // ═══════════════════════════════════════════
  function buildCityLife() {
    const carColors = [0x1565c0, 0xc62828, 0xf5f5f5, 0x2e7d32, 0x6a1b9a, 0xf9a825, 0x424242, 0xe64a19];
    for (let i = 0; i < 10; i++) {
      const car = buildTrafficCar(carColors[i % carColors.length]);
      car.position.set(-90 + i * 20, 0.1, i % 2 ? 32 : 38);
      scene.add(car);
      trafficVehicles.push({ mesh: car, speed: 5 + Math.random() * 4, direction: i % 2 ? 1 : -1 });
    }
    for (let i = 0; i < 20; i++) {
      const person = buildCityPedestrian(i);
      const side = i % 2 ? 26 : 44;
      person.position.set(-80 + (i * 9) % 160, 0, side + (Math.random() - .5) * 1.5);
      scene.add(person);
      cityPedestrians.push({
        mesh: person, speed: 0.6 + Math.random() * 0.5,
        direction: i % 3 ? 1 : -1, phase: Math.random() * 6.28
      });
    }
  }

  function buildTrafficCar(color) {
    const group = new THREE.Group();
    addBoxToGroup(group, 0, 0.48, 0, 3.2, 0.65, 1.5, color);
    addBoxToGroup(group, -0.2, 1.02, 0, 1.7, 0.65, 1.3, color);
    addBoxToGroup(group, -0.2, 1.1, 0, 1.4, 0.4, 1.2, 0xb0d4f1, true, 0x64b5f6, 0.15);
    // Wheels
    for (const [x, z] of [[-1.1, -.7], [1.1, -.7], [-1.1, .7], [1.1, .7]]) {
      addCylinderToGroup(group, x, 0.22, z, .27, .27, .22, 0x212121);
    }
    // Headlights
    addBoxToGroup(group, 1.6, 0.5, -0.4, 0.06, 0.1, 0.14, 0xfff8e1, true, 0xfff8e1, 0.6);
    addBoxToGroup(group, 1.6, 0.5, 0.4, 0.06, 0.1, 0.14, 0xfff8e1, true, 0xfff8e1, 0.6);
    return group;
  }

  function buildCityPedestrian(index) {
    const group = new THREE.Group();
    const shirtColors = [0x1565c0, 0xc62828, 0x2e7d32, 0xf9a825, 0x6a1b9a, 0xe64a19, 0x00838f, 0xad1457];
    const skinTones = [0xdeb887, 0xd2a375, 0xc19a6b, 0xa0826a, 0x8d6e63];

    const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColors[index % shirtColors.length] });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), bodyMat);
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: skinTones[index % skinTones.length] });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), headMat);
    head.position.y = 1.32;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: [0x2c1810, 0x3e2723, 0x1a1a1a, 0x8d6e63, 0xfdd835][index % 5] });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), hairMat);
    hair.position.set(0, 1.4, -0.02);
    hair.scale.set(1.1, 0.7, 1.1);
    group.add(hair);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 });
    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.38, 4, 8), legMat);
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }

    return group;
  }

  // ═══════════════════════════════════════════
  //  DELIVERY CRATES
  // ═══════════════════════════════════════════
  function spawnDeliveryCrate() {
    const crate = buildCrate(0, 0, 5, true);
    deliveryCrates.push(crate);

    interactables.push({
      type: 'crate',
      position: new THREE.Vector3(0, 0.5, 5),
      mesh: crate.group,
      label: 'F - Pick Up Crate',
      crate: crate,
      isEmpty: false,
      products: [
        { id: 'apple', qty: 12 }, { id: 'banana', qty: 10 },
        { id: 'orange', qty: 8 }, { id: 'mango', qty: 6 }
      ],
    });
  }

  function buildCrate(x, y, z, isFull = false) {
    const group = new THREE.Group();
    const color = isFull ? 0x8d6e63 : 0x6d4c41;
    const woodMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.5, roughness: 0.4 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.5), woodMat);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Metal straps
    for (let i = -1; i <= 1; i++) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.04), metalMat);
      strap.position.set(0, i * 0.14, 0.23);
      group.add(strap);
    }

    if (isFull) {
      const fruits = [
        { color: 0xdd2222, geo: new THREE.SphereGeometry(0.06, 8, 6) },
        { color: 0xf9d71c, geo: new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6) },
        { color: 0xff8800, geo: new THREE.SphereGeometry(0.06, 8, 6) },
      ];
      for (let i = 0; i < fruits.length; i++) {
        const s = new THREE.Mesh(fruits[i].geo, new THREE.MeshStandardMaterial({ color: fruits[i].color }));
        s.position.set(-0.12 + i * 0.12, 0.28, 0.05);
        group.add(s);
      }
    }

    group.position.set(x, y + 0.225, z);
    scene.add(group);
    return { group, position: new THREE.Vector3(x, 0.225, z), isEmpty: !isFull };
  }

  // ═══════════════════════════════════════════
  //  DELIVERY TRUCK
  // ═══════════════════════════════════════════
  function spawnDeliveryTruck(products) {
    const truck = buildTruck(5, 0, 20);
    setTimeout(() => {
      const positions = [[-1, 0, 14], [1, 0, 14], [0, 0, 16]];
      let idx = 0;
      for (const [px, py, pz] of positions.slice(0, Math.min(products.length, 3))) {
        const crate = buildCrate(px, py, pz, true);
        const crateItems = [];
        const productSubset = products.slice(idx, idx + 3);
        for (const p of productSubset) {
          crateItems.push({ id: p.id, qty: Math.ceil(p.qty / 3) });
        }
        idx += 3;

        const interactable = {
          type: 'crate',
          position: new THREE.Vector3(px, 0.5, pz),
          mesh: crate.group,
          label: 'F - Pick Up Delivery Crate',
          crate: crate,
          isEmpty: false,
          products: crateItems,
        };
        interactables.push(interactable);
        deliveryCrates.push(crate);
      }
    }, 2000);
  }

  function buildTruck(x, y, z) {
    const group = new THREE.Group();
    // Cab
    addBoxToGroup(group, 0, 1.2, -0.5, 2.2, 2.4, 2, 0xf5f5f5);
    // Cargo body
    addBoxToGroup(group, 0, 1.5, 2, 2.2, 2.5, 4.5, 0x1565c0);
    // Windshield
    addBoxToGroup(group, 0, 1.8, -1.45, 1.8, 1.0, 0.05, 0xb0d4f1, true, 0x64b5f6, 0.15);
    // Wheels
    for (const [wx, wz] of [[-1.1, -0.8], [1.1, -0.8], [-1.1, 2.5], [1.1, 2.5]]) {
      addCylinderToGroup(group, wx, 0.35, wz, 0.35, 0.35, 0.28, 0x212121);
    }
    // Headlights
    addBoxToGroup(group, -0.7, 0.8, -1.5, 0.2, 0.15, 0.06, 0xfff8e1, true, 0xfff8e1, 0.5);
    addBoxToGroup(group, 0.7, 0.8, -1.5, 0.2, 0.15, 0.06, 0xfff8e1, true, 0xfff8e1, 0.5);
    group.position.set(x, y, z);
    scene.add(group);
    return group;
  }

  // ═══════════════════════════════════════════
  //  HELPER FUNCTIONS
  // ═══════════════════════════════════════════
  function addBox(x, y, z, w, h, d, color, emissive = false, emissiveColor = 0, emissiveInt = 0) {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.6,
      emissive: emissive ? emissiveColor : 0,
      emissiveIntensity: emissiveInt
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addBoxToGroup(group, x, y, z, w, h, d, color, emissive = false, emissiveColor = 0, emissiveInt = 0) {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.6,
      emissive: emissive ? emissiveColor : 0,
      emissiveIntensity: emissiveInt
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  function addCylinder(x, y, z, rTop, rBot, h, seg, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addCylinderToGroup(group, x, y, z, rTop, rBot, h, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), mat);
    mesh.position.set(x, y + h / 2, z);
    group.add(mesh);
    return mesh;
  }

  function addSphere(x, y, z, r, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ═══════════════════════════════════════════
  //  UPDATE LOOP
  // ═══════════════════════════════════════════
  function update(dt) {
    dayNightCycle += dt * 0.02;
    updateDayNight();
    updateAnimObjects(dt);
    updateCityLife(dt);

    if (guidanceMarker?.visible && guidanceTarget) {
      guidanceMarker.position.set(
        guidanceTarget.x,
        3.7 + Math.sin(dayNightCycle * 7) * 0.18,
        guidanceTarget.z
      );
      guidanceMarker.children[1].rotation.z += dt * 1.8;
    }
  }

  function updateDayNight() {
    const t = (GameState.raw.hour + GameState.raw.minute / 60) / 24;
    const sunAngle = (t - 0.25) * Math.PI * 2;
    sunLight.position.set(Math.cos(sunAngle) * 50, Math.sin(sunAngle) * 50, 20);

    const dayFactor = Math.max(0, Math.sin(sunAngle));

    // Balanced lighting (no overexposure)
    sunLight.intensity = 0.25 + dayFactor * 0.95;
    ambientLight.intensity = 0.22 + dayFactor * 0.15;
    hemiLight.intensity = 0.2 + dayFactor * 0.22;

    // Sky color – clear, vibrant day sky
    const skyR = 0.12 + (0.47 - 0.12) * dayFactor;
    const skyG = 0.22 + (0.72 - 0.22) * dayFactor;
    const skyB = 0.42 + (0.91 - 0.42) * dayFactor;
    scene.background.setRGB(skyR, skyG, skyB);
    scene.fog.color.setRGB(skyR, skyG, skyB);
    scene.fog.density = dayFactor > 0.12 ? 0.003 : 0.006;

    for (const cloud of clouds) cloud.mesh.visible = dayFactor > 0.05;

    for (const item of streetLights) {
      item.light.intensity = dayFactor < 0.3 ? 2.0 : 0;
      if (item.lamp.material) {
        item.lamp.material.emissiveIntensity = dayFactor < 0.3 ? 1.8 : 0.1;
      }
    }
  }

  function updateCityLife(dt) {
    for (const car of trafficVehicles) {
      car.mesh.position.x += car.speed * car.direction * dt;
      car.mesh.rotation.y = car.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (car.mesh.position.x > 95) car.mesh.position.x = -95;
      if (car.mesh.position.x < -95) car.mesh.position.x = 95;
    }
    for (const ped of cityPedestrians) {
      ped.mesh.position.x += ped.speed * ped.direction * dt;
      ped.mesh.position.y = Math.abs(Math.sin(dayNightCycle * 7 + ped.phase)) * 0.03;
      ped.mesh.rotation.y = ped.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (ped.mesh.position.x > 85) ped.mesh.position.x = -85;
      if (ped.mesh.position.x < -85) ped.mesh.position.x = 85;
    }
    for (const cloud of clouds) {
      cloud.mesh.position.x += cloud.speed * dt;
      if (cloud.mesh.position.x > 110) cloud.mesh.position.x = -110;
    }
  }

  function updateAnimObjects(dt) {
    for (const obj of animObjects) {
      obj.t += dt;
      if (obj.type === 'scannerBlink') {
        obj.mesh.material.emissiveIntensity = (Math.sin(obj.t * 8) > 0) ? 2 : 0;
      } else if (obj.type === 'monitorPulse') {
        obj.mesh.intensity = 0.35 + Math.sin(obj.t * 2) * 0.1;
      }
    }
  }

  // ═══════════════════════════════════════════
  //  EXPANSIONS & STORE UPGRADES (3D)
  // ═══════════════════════════════════════════
  const appliedExpansions = new Set();
  let staffMeshes = { security: null, cashier: null, stocker: null, cleaner: null, manager: null, warehouse: null };

  function applyExpansion(id) {
    if (appliedExpansions.has(id)) return;
    appliedExpansions.add(id);

    switch (id) {
      case 'shelf_produce_island': {
        const islandGroup = new THREE.Group();
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x6d4022, roughness: 0.6 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.5), tableMat);
        base.position.set(0, 0.4, 0);
        base.castShadow = true;
        islandGroup.add(base);

        for (const bx of [-0.65, 0.65]) {
          for (const bz of [-0.4, 0.4]) {
            addBoxToGroup(islandGroup, bx, 0.85, bz, 1.0, 0.12, 0.6, 0x8d5b2d);
            const f1 = buildFruitModel(bx < 0 ? 'pineapple' : 'peach');
            f1.position.set(bx - 0.2, 0.96, bz);
            f1.scale.setScalar(0.7);
            islandGroup.add(f1);

            const f2 = buildFruitModel(bz < 0 ? 'avocado' : 'cherry');
            f2.position.set(bx + 0.2, 0.96, bz);
            f2.scale.setScalar(0.7);
            islandGroup.add(f2);
          }
        }

        const board = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.35, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })
        );
        board.position.set(0, 2.1, 0);
        islandGroup.add(board);

        islandGroup.position.set(-3.5, 0, -10);
        scene.add(islandGroup);

        interactables.push({
          type: 'shelf',
          category: 'fruits',
          position: new THREE.Vector3(-3.5, 1, -10),
          mesh: islandGroup,
          productIds: ['pineapple', 'peach', 'avocado', 'lemon', 'cherry'],
          label: 'Produce Display Stand (F to Stock / Price)',
        });
        break;
      }
      case 'shelf_cold_cooler': {
        const coolerGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.7 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.8), metalMat);
        body.position.set(0, 1.1, 0);
        body.castShadow = true;
        coolerGroup.add(body);

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x60a5fa, transparent: true, opacity: 0.35, roughness: 0.1
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 0.04), glassMat);
        glass.position.set(0, 1.05, 0.41);
        coolerGroup.add(glass);

        const coolLight = new THREE.PointLight(0x38bdf8, 0.8, 4);
        coolLight.position.set(0, 1.2, 0.2);
        coolerGroup.add(coolLight);

        addBoxToGroup(coolerGroup, 0, 2.15, 0.42, 1.5, 0.2, 0.04, 0x0284c7, true, 0x0284c7, 0.5);

        coolerGroup.position.set(3.5, 0, -10);
        scene.add(coolerGroup);

        interactables.push({
          type: 'shelf',
          category: 'drinks',
          position: new THREE.Vector3(3.5, 1, -10),
          mesh: coolerGroup,
          productIds: ['water', 'juice', 'soda', 'energy'],
          label: 'Chilled Drinks Cooler (F to Stock / Price)',
        });
        break;
      }
      case 'floor_polisher': {
        if (floorMesh && floorMesh.material) {
          floorMesh.material.roughness = 0.14;
          floorMesh.material.metalness = 0.12;
          floorMesh.material.needsUpdate = true;
        }
        GameState.raw.rating = Math.min(5, GameState.raw.rating + 0.25);
        UI.updateHUD();
        break;
      }
      case 'shopping_carts': {
        for (let i = 0; i < 3; i++) {
          const cart = buildShoppingCartMesh();
          cart.position.set(-9.2, 0, 1.2 + i * 0.9);
          scene.add(cart);
        }
        break;
      }
      case 'climate_ac': {
        for (const z of [-8, -18]) {
          const ac = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.4, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
          );
          ac.position.set(0, 5.7, z);
          addBoxToGroup(ac, 0.7, 0, 0.41, 0.15, 0.05, 0.02, 0x38bdf8, true, 0x38bdf8, 1);
          scene.add(ac);
        }
        break;
      }
      case 'store_neon': {
        const neonSign = new THREE.Mesh(
          new THREE.BoxGeometry(8, 1.2, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
        );
        neonSign.position.set(0, 6.2, 0.3);
        const letters = new THREE.Mesh(
          new THREE.BoxGeometry(7.2, 0.7, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x00f0ff, emissiveIntensity: 1.6 })
        );
        letters.position.set(0, 0, 0.12);
        neonSign.add(letters);
        scene.add(neonSign);
        break;
      }
      case 'ext1': {
        buildShelfRow(-3.5, 0, -8, 2, 'snacks');
        buildShelfRow(3.5, 0, -8, 2, 'drinks');
        const signMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.4 });
        const sign1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 0.08), signMat1);
        sign1.position.set(0, 4.2, -8);
        scene.add(sign1);
        break;
      }
      case 'ext2': {
        const whGroup = new THREE.Group();
        addBoxToGroup(whGroup, -5, 1.8, -32, 0.15, 3.6, 1.8, 0x1976d2);
        addBoxToGroup(whGroup, -1, 1.8, -32, 0.15, 3.6, 1.8, 0x1976d2);
        addBoxToGroup(whGroup, -3, 1.0, -32, 3.8, 0.1, 1.7, 0xf57c00);
        addBoxToGroup(whGroup, -3, 2.2, -32, 3.8, 0.1, 1.7, 0xf57c00);
        for (let bx = -4.2; bx <= -1.8; bx += 1.2) {
          addBoxToGroup(whGroup, bx, 1.15, -32, 1.0, 0.15, 1.2, 0x8d6e63);
          addBoxToGroup(whGroup, bx, 1.5, -32, 0.8, 0.55, 0.9, 0xbcaaa4);
          addBoxToGroup(whGroup, bx, 2.35, -32, 1.0, 0.15, 1.2, 0x8d6e63);
          addBoxToGroup(whGroup, bx, 2.7, -32, 0.8, 0.55, 0.9, 0xc8b7b0);
        }
        addBoxToGroup(whGroup, 2, 0.15, -31.5, 1.2, 0.1, 0.6, 0xffd600);
        addBoxToGroup(whGroup, 2.5, 0.5, -31.5, 0.08, 0.7, 0.08, 0x212121);
        addBoxToGroup(whGroup, 2.5, 0.85, -31.5, 0.35, 0.05, 0.08, 0x212121);
        scene.add(whGroup);
        break;
      }
      case 'ext3': {
        const lane2Group = new THREE.Group();
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.4 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 3.0), deskMat);
        counter.position.set(0, 0.425, 0);
        counter.castShadow = true;
        lane2Group.add(counter);

        const beltMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 2.4), beltMat);
        belt.position.set(-0.2, 0.87, 0);
        lane2Group.add(belt);

        addBoxToGroup(lane2Group, 0.35, 1.05, -0.4, 0.05, 0.28, 0.38, 0x1e293b);
        addBoxToGroup(lane2Group, 0.33, 1.05, -0.4, 0.02, 0.22, 0.32, 0x10b981, true, 0x10b981, 0.7);

        addBoxToGroup(lane2Group, 0.1, 0.9, -0.1, 0.15, 0.06, 0.18, 0x334155);
        addBoxToGroup(lane2Group, 0.1, 0.935, -0.1, 0.1, 0.01, 0.12, 0xef4444, true, 0xef4444, 0.8);

        addBoxToGroup(lane2Group, 0, 2.3, 0, 1.5, 0.4, 0.08, 0x10b981, true, 0x10b981, 0.4);

        lane2Group.position.set(6.2, 0, -2);
        scene.add(lane2Group);

        interactables.push({
          type: 'checkout',
          position: new THREE.Vector3(6.2, 1, -2),
          mesh: lane2Group,
          label: 'F - Express Checkout Register',
        });
        break;
      }
      case 'ext4': {
        const ledMat = new THREE.MeshStandardMaterial({
          color: 0x00d4ff,
          emissive: 0x00d4ff,
          emissiveIntensity: 1.8
        });
        const stripGeo = new THREE.BoxGeometry(0.12, 0.05, 20);
        for (const lx of [-8, -3.5, 3.5, 8]) {
          const strip = new THREE.Mesh(stripGeo, ledMat);
          strip.position.set(lx, 5.85, -13);
          scene.add(strip);
        }
        if (ambientLight) ambientLight.intensity = Math.min(1.2, ambientLight.intensity + 0.2);
        break;
      }
      case 'ext5': {
        const bakeryGroup = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
        const counterB = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.9, 1.2), woodMat);
        counterB.position.set(0, 0.45, 0);
        bakeryGroup.add(counterB);

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1
        });
        const glassB = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.5, 0.9), glassMat);
        glassB.position.set(0, 1.15, 0);
        bakeryGroup.add(glassB);

        for (let bx = -1.4; bx <= 1.4; bx += 0.7) {
          addCylinderToGroup(bakeryGroup, bx, 0.95, -0.1, 0.08, 0.08, 0.45, 0xd7ccc8);
          addSphereToGroup(bakeryGroup, bx + 0.15, 0.98, 0.2, 0.12, 0xbcaaa4);
        }

        addBoxToGroup(bakeryGroup, 0, 2.5, -0.6, 3.2, 0.6, 0.1, 0xff9800, true, 0xff9800, 0.5);

        const bakeLight = new THREE.PointLight(0xffb74d, 1.2, 6);
        bakeLight.position.set(0, 2.2, 0.5);
        bakeryGroup.add(bakeLight);

        bakeryGroup.position.set(-8.5, 0, -22);
        scene.add(bakeryGroup);
        break;
      }
      case 'ext6': {
        const techGroup = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
        const techBase = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.85, 1.2), baseMat);
        techBase.position.set(0, 0.425, 0);
        techGroup.add(techBase);

        addBoxToGroup(techGroup, 0, 0.05, 0, 4.05, 0.06, 1.25, 0x06b6d4, true, 0x06b6d4, 1.5);

        const techGlassMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8, transparent: true, opacity: 0.3, roughness: 0.05
        });
        const techGlass = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.6, 1.1), techGlassMat);
        techGlass.position.set(0, 1.15, 0);
        techGroup.add(techGlass);

        for (let tx = -1.3; tx <= 1.3; tx += 0.65) {
          addBoxToGroup(techGroup, tx, 0.88, 0, 0.2, 0.04, 0.35, 0x1e293b);
          addBoxToGroup(techGroup, tx, 0.91, 0, 0.17, 0.01, 0.31, 0x0284c7, true, 0x0284c7, 0.8);
        }

        addBoxToGroup(techGroup, 0, 2.5, -0.6, 3.2, 0.6, 0.1, 0x0284c7, true, 0x0284c7, 0.6);

        const techLight = new THREE.PointLight(0x38bdf8, 1.0, 6);
        techLight.position.set(0, 2.2, 0.5);
        techGroup.add(techLight);

        techGroup.position.set(8.5, 0, -22);
        scene.add(techGroup);
        break;
      }
    }
  }

  function applyAllExpansions() {
    if (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.expansions) {
      for (const id of GameState.raw.expansions) {
        applyExpansion(id);
      }
    }
  }

  function updateStaff(employees) {
    if (!employees) return;

    // Security Guard
    if (employees.security > 0 && !staffMeshes.security) {
      const guard = buildSecurityGuardMesh();
      guard.position.set(3.2, 0, 0.8);
      guard.rotation.y = Math.PI;
      scene.add(guard);
      staffMeshes.security = guard;
    } else if ((!employees.security || employees.security === 0) && staffMeshes.security) {
      scene.remove(staffMeshes.security);
      staffMeshes.security = null;
    }

    // Cashier
    if (employees.cashier > 0 && !staffMeshes.cashier) {
      const cashier = buildCashierMesh();
      cashier.position.set(-3.2, 0, -2.8);
      cashier.rotation.y = 0;
      scene.add(cashier);
      staffMeshes.cashier = cashier;
    } else if ((!employees.cashier || employees.cashier === 0) && staffMeshes.cashier) {
      scene.remove(staffMeshes.cashier);
      staffMeshes.cashier = null;
    }

    // Stocker
    if (employees.stocker > 0 && !staffMeshes.stocker) {
      const stocker = buildStockerMesh();
      stocker.position.set(-2.0, 0, -14.0);
      stocker.rotation.y = Math.PI * 0.25;
      scene.add(stocker);
      staffMeshes.stocker = stocker;
    } else if ((!employees.stocker || employees.stocker === 0) && staffMeshes.stocker) {
      scene.remove(staffMeshes.stocker);
      staffMeshes.stocker = null;
    }

    // Cleaner
    if (employees.cleaner > 0 && !staffMeshes.cleaner) {
      const cleaner = buildCleanerMesh();
      cleaner.position.set(2.5, 0, -8.0);
      cleaner.rotation.y = -Math.PI * 0.4;
      scene.add(cleaner);
      staffMeshes.cleaner = cleaner;
    } else if ((!employees.cleaner || employees.cleaner === 0) && staffMeshes.cleaner) {
      scene.remove(staffMeshes.cleaner);
      staffMeshes.cleaner = null;
    }

    // Manager
    if (employees.manager > 0 && !staffMeshes.manager) {
      const manager = buildManagerMesh();
      manager.position.set(-8.2, 0, -3.5);
      manager.rotation.y = Math.PI * 0.5;
      scene.add(manager);
      staffMeshes.manager = manager;
    } else if ((!employees.manager || employees.manager === 0) && staffMeshes.manager) {
      scene.remove(staffMeshes.manager);
      staffMeshes.manager = null;
    }

    // Warehouse Worker
    if (employees.warehouse > 0 && !staffMeshes.warehouse) {
      const whWorker = buildWarehouseWorkerMesh();
      whWorker.position.set(0, 0, 16.5);
      whWorker.rotation.y = -Math.PI * 0.2;
      scene.add(whWorker);
      staffMeshes.warehouse = whWorker;
    } else if ((!employees.warehouse || employees.warehouse === 0) && staffMeshes.warehouse) {
      scene.remove(staffMeshes.warehouse);
      staffMeshes.warehouse = null;
    }
  }

  function buildSecurityGuardMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    addBoxToGroup(group, 0.08, 0.95, 0.18, 0.06, 0.08, 0.02, 0xf59e0b, true, 0xf59e0b, 0.4);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xd2a375, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 8), capMat);
    cap.position.set(0, 1.62, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.12), capMat);
    visor.position.set(0, 1.58, 0.15);
    group.add(cap, visor);

    for (const lx of [-0.09, 0.09]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function buildCashierMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    addBoxToGroup(group, -0.07, 0.95, 0.17, 0.08, 0.04, 0.02, 0xffffff);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.38, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function buildStockerMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }); // Orange apron
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Stock box held in hands
    addBoxToGroup(group, 0, 0.85, 0.3, 0.45, 0.3, 0.35, 0xb45309);
    addBoxToGroup(group, 0, 0.85, 0.31, 0.47, 0.04, 0.36, 0x78350f);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xc19a6b, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.38, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function buildCleanerMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 }); // Blue uniform
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Mop & Bucket
    addBoxToGroup(group, 0.35, 0.25, 0.1, 0.35, 0.35, 0.35, 0xf59e0b); // bucket
    addCylinderToGroup(group, -0.25, 0.9, 0.2, 0.02, 0.02, 1.4, 0x94a3b8); // mop handle

    const headMat = new THREE.MeshStandardMaterial({ color: 0xa0826a, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.38, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function buildManagerMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }); // Dark suit
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Tie & Clipboard
    addBoxToGroup(group, 0, 0.9, 0.17, 0.04, 0.25, 0.01, 0xd97706); // gold tie
    addBoxToGroup(group, 0.25, 0.85, 0.2, 0.2, 0.28, 0.02, 0x78350f); // clipboard

    const headMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.065, 0.38, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function buildWarehouseWorkerMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }); // Hi-Vis yellow vest
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 4, 8), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Hardhat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), hatMat);
    hat.position.set(0, 1.55, 0);
    hat.scale.set(1.1, 0.6, 1.1);
    group.add(hat);

    const headMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      leg.position.set(lx, 0.25, 0);
      group.add(leg);
    }
    return group;
  }

  function addSphereToGroup(group, x, y, z, r, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  function setShadowsEnabled(enabled) {
    if (!renderer) return;
    renderer.shadowMap.enabled = enabled;
    if (sunLight) sunLight.castShadow = enabled;
    renderer.shadowMap.needsUpdate = true;
  }

  function setFov(val) {
    if (!camera) return;
    camera.fov = val;
    camera.updateProjectionMatrix();
  }

  function getInteractables() { return interactables; }
  function getCamera() { return camera; }
  function getScene() { return scene; }
  function getRenderer() { return renderer; }

  return {
    init, update,
    getCamera, getScene, getRenderer, getInteractables,
    spawnDeliveryTruck, buildCrate,
    setGuidanceTarget, clearGuidanceTarget,
    applyExpansion, applyAllExpansions, updateStaff,
    setShadowsEnabled, setFov,
    COLORS
  };
})();
