// ============================================
// MAIN.JS - Game Engine Entry Point
// ============================================

let scene, camera, renderer;
let animFrameId;
let lastTime = 0;
let timeAccumulator = 0;

// Game time speed (1 in-game minute per real second)
const GAME_TIME_SPEED = 0.5;

function initGame() {
  // Initialize Three.js world
  const canvas = document.getElementById('game-canvas');
  const worldRefs = World.init(canvas);
  scene = worldRefs.scene;
  camera = worldRefs.camera;
  renderer = worldRefs.renderer;

  // Initialize systems
  Player.init(camera, scene);
  CustomerManager.init(scene);
  Checkout.init();
  UI.init();
  GameState.on('objective:complete', objective => {
    if (objective === 'setPrices') {
      UI.closePanel('computer-ui');
      World.setGuidanceTarget('computer');
      UI.toast('Prices saved. Go to the reception computer and press F.', 'success');
    }
    if (objective === 'placeOrder') {
      UI.highlightOpenStore();
      UI.toast('Order placed. Open your store to welcome customers.', 'success');
    }
    if (objective === 'useComputer' || objective === 'placeOrder') World.clearGuidanceTarget();
  });

  // Set initial weather
  const weathers = ['sunny', 'cloudy', 'rainy'];
  const weather = weathers[Math.floor(Math.random() * weathers.length)];
  GameState.set('weather', weather);
  UI.updateWeatherIndicator(weather);

  // Set initial prices from defaults
  for (const cat of Object.values(PRODUCTS)) {
    for (const p of cat) {
      if (GameState.raw.prices[p.id] === undefined) {
        GameState.raw.prices[p.id] = p.defaultPrice;
      }
    }
  }

  // Show main menu
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');

  // Start render loop
  gameLoop(0);
}

function gameLoop(timestamp) {
  animFrameId = requestAnimationFrame(gameLoop);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (!GameState.raw.isRunning || GameState.raw.isPaused) {
    renderer.render(scene, camera);
    return;
  }

  // Update game time
  timeAccumulator += dt * GAME_TIME_SPEED;
  if (timeAccumulator >= 1) {
    GameState.advanceTime(Math.floor(timeAccumulator));
    timeAccumulator = timeAccumulator % 1;
    UI.updateHUD();
  }

  // Update systems
  Player.update(dt);
  CustomerManager.update(dt);
  World.update(dt);
  updateEmployees(dt);

  // Check expired marketing campaigns
  updateCampaigns();

  // Render
  renderer.render(scene, camera);
}

let stockerTimer = 0;
let cleanerTimer = 0;
let managerTimer = 0;

function updateEmployees(dt) {
  const emps = GameState.raw.employees;
  if (!emps) return;

  // Shelf Stocker: auto-transfers from warehouse to low shelves
  if (emps.stocker > 0) {
    stockerTimer += dt;
    if (stockerTimer >= 8.0) {
      stockerTimer = 0;
      autoRestockByStaff(emps.stocker);
    }
  }

  // Cleaner: gradually raises store rating & customer happiness
  if (emps.cleaner > 0) {
    cleanerTimer += dt;
    if (cleanerTimer >= 15.0) {
      cleanerTimer = 0;
      GameState.raw.rating = Math.min(5.0, GameState.raw.rating + 0.02 * emps.cleaner);
      UI.updateHUD();
    }
  }

  // Manager: optimizes store operations and yields periodic management bonus
  if (emps.manager > 0) {
    managerTimer += dt;
    if (managerTimer >= 30.0) {
      managerTimer = 0;
      const bonus = 40 * emps.manager;
      GameState.addCash(bonus);
      UI.toast(`👔 Manager bonus: +$${bonus.toFixed(0)} operational profit!`, 'success');
      UI.floatingCash(bonus);
      UI.updateHUD();
    }
  }
}

function autoRestockByStaff(stockerCount) {
  const shelves = GameState.raw.onShelves;
  const warehouse = GameState.raw.warehouse;
  let restockedItem = null;
  let restockedAmount = 0;

  for (const [id, info] of Object.entries(shelves)) {
    if (info.quantity < 12 && warehouse[id] > 0) {
      const needed = 12 - info.quantity;
      const transfer = Math.min(needed, warehouse[id], stockerCount * 3);
      if (transfer > 0) {
        GameState.removeFromWarehouse(id, transfer);
        GameState.addToShelf(id, transfer);
        const pData = GameState.getProductData(id);
        restockedItem = pData ? pData.name : id;
        restockedAmount = transfer;
        break;
      }
    }
  }

  if (restockedItem) {
    UI.toast(`📦 Stocker restocked +${restockedAmount} ${restockedItem} on shelves.`, 'info');
    UI.refreshInventoryPanel();
  }
}

function updateCampaigns() {
  const campaigns = GameState.raw.activeCampaigns;
  for (let i = campaigns.length - 1; i >= 0; i--) {
    const c = campaigns[i];
    if (GameState.raw.day - c.startDay >= c.duration) {
      campaigns.splice(i, 1);
      UI.toast(`📢 "${c.name}" campaign ended.`, 'info');
    }
  }
}

// Handle pointer lock errors gracefully
document.addEventListener('pointerlockerror', () => {
  console.warn('Pointer lock request failed.');
});

// Start everything when DOM ready
window.addEventListener('load', initGame);

// Auto-save every 5 minutes of real time
setInterval(() => {
  if (GameState.raw.isRunning && !GameState.raw.isPaused) {
    GameState.saveGame(0);
    document.getElementById('btn-continue').disabled = false;
  }
}, 300000);

// Expose certain functions globally for HTML onclick handlers
window.UI = UI;
window.Player = Player;
