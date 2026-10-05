// ============================================
// UI.JS - UI Manager
// ============================================

const UI = (() => {
  let activePanel = null;
  let notifQueue = [];

  function init() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.panel');
        panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        panel.querySelectorAll('.panel-content').forEach(c => {
          c.classList.toggle('hidden', c.id !== tabId);
        });
      });
    });

    // Desktop app clicks
    document.querySelectorAll('.desktop-app').forEach(app => {
      app.addEventListener('click', () => openApp(app.dataset.app));
    });

    // Computer close
    document.getElementById('btn-close-computer').addEventListener('click', () => {
      closePanel('computer-ui');
      Player.unlock();
    });

    // Store toggle
    document.getElementById('btn-toggle-store').addEventListener('click', toggleStore);

    // Pause menu
    document.getElementById('btn-resume').addEventListener('click', () => resumeGame());
    document.getElementById('btn-save').addEventListener('click', () => {
      GameState.saveGame(0);
      toast('💾 Game Saved!', 'success');
    });
    const btnLoadPause = document.getElementById('btn-load-pause');
    if (btnLoadPause) {
      btnLoadPause.addEventListener('click', () => {
        if (GameState.hasSave()) {
          resumeGame();
          continueGame();
        } else {
          toast('⚠️ No saved game found.', 'warning');
        }
      });
    }
    document.getElementById('btn-main-menu').addEventListener('click', () => {
      window.location.reload();
    });

    // Main menu buttons
    document.getElementById('btn-new-game').addEventListener('click', startNewGame);
    document.getElementById('btn-continue').addEventListener('click', continueGame);

    // Settings & Credits Modal
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) btnSettings.addEventListener('click', openSettings);
    const btnSettingsPause = document.getElementById('btn-settings-pause');
    if (btnSettingsPause) btnSettingsPause.addEventListener('click', openSettings);
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', closeSettings);

    const btnCredits = document.getElementById('btn-credits');
    if (btnCredits) btnCredits.addEventListener('click', openCredits);
    const btnCloseCredits = document.getElementById('btn-close-credits');
    if (btnCloseCredits) btnCloseCredits.addEventListener('click', closeCredits);
    const btnOkCredits = document.getElementById('btn-ok-credits');
    if (btnOkCredits) btnOkCredits.addEventListener('click', closeCredits);

    // Settings Inputs
    initSettingsControls();

    if (GameState.hasSave()) {
      document.getElementById('btn-continue').disabled = false;
    }

    // GameState listeners
    GameState.on('change:cash', updateHUD);
    GameState.on('time:update', updateTime);
    GameState.on('new:day', onNewDay);
  }

  function showScreen(id) {
    document.querySelectorAll('#loading-screen, #main-menu, #game-hud, #tutorial-panel').forEach(s => {
      s.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function startNewGame() {
    AmbientCity.start();
    showScreen('loading-screen');
    simulateLoading(() => {
      showScreen('game-hud');
      document.getElementById('tutorial-panel').classList.remove('hidden');
      GameState.set('isRunning', true);
      syncStoreStatus();
      updateHUD();
      if (window.World && typeof World.applyAllExpansions === 'function') {
        World.applyAllExpansions();
      }
      if (window.World && typeof World.updateStaff === 'function') {
        World.updateStaff(GameState.raw.employees);
      }
      Tutorial.start();
      World.setGuidanceTarget('crate');
    });
  }

  function continueGame() {
    AmbientCity.start();
    GameState.loadGame(0);
    showScreen('loading-screen');
    simulateLoading(() => {
      showScreen('game-hud');
      GameState.set('isRunning', true);
      syncStoreStatus();
      updateHUD();
      if (window.World && typeof World.applyAllExpansions === 'function') {
        World.applyAllExpansions();
      }
      if (window.World && typeof World.updateStaff === 'function') {
        World.updateStaff(GameState.raw.employees);
      }
      toast('🎮 Game Loaded!', 'success');
    });
  }

  function simulateLoading(cb) {
    const bar = document.getElementById('loading-bar');
    const tips = [
      '💡 Use Arrow Keys to move and mouse to look around',
      '📦 Press F to pick up boxes and items',
      '🏪 Order products from the store computer',
      '💰 Set competitive prices to attract customers',
      '👥 Hire staff to help manage your store',
    ];
    const texts = [
      'Initializing World...', 'Building Store...', 'Spawning Products...',
      'Generating City...', 'Loading Customers...', 'Starting Economy...', 'Ready!'
    ];
    let pct = 0;
    let t = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 15 + 5;
      if (pct > 100) pct = 100;
      bar.style.width = pct + '%';
      document.getElementById('loading-text').textContent = texts[Math.min(t, texts.length - 1)];
      document.getElementById('loading-tip').textContent = tips[t % tips.length];
      t++;
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(cb, 400);
      }
    }, 300);
  }

  function updateHUD() {
    const s = GameState.raw;
    document.getElementById('hud-cash').textContent = '$' + s.cash.toFixed(2);
    document.getElementById('hud-customers').textContent = CustomerManager ? CustomerManager.getActiveCount() : '0';
    document.getElementById('hud-orders').textContent = s.pendingOrders.length;
    const stars = Math.round(s.rating);
    document.getElementById('hud-rating').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  function updateTime() {
    const { hour, minute } = GameState.raw;
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    document.getElementById('hud-time').textContent = `${h}:${m} ${ampm}`;
  }

  function onNewDay(data) {
    showDayBanner(`Day ${data.day} - ${getDayPeriod()}`);
    updateHUD();
  }

  function getDayPeriod() {
    const h = GameState.raw.hour;
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    if (h < 20) return 'Evening';
    return 'Night';
  }

  function showDayBanner(text) {
    const banner = document.getElementById('day-banner');
    document.getElementById('day-banner-text').textContent = text;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 3000);
  }

  function toggleStore() {
    const open = !GameState.raw.storeOpen;
    GameState.set('storeOpen', open);
    syncStoreStatus();
    document.getElementById('btn-toggle-store').classList.remove('tutorial-open');
    if (open) {
      GameState.completeObjective('openStore');
    }
  }

  function syncStoreStatus() {
    const open = GameState.raw.storeOpen;
    const statusEl = document.getElementById('store-status-text');
    const btnEl = document.getElementById('btn-toggle-store');
    if (open) {
      statusEl.textContent = '🟢 OPEN';
      btnEl.textContent = 'Close Store';
      btnEl.style.background = '#ef4444';
      toast('🏪 Store is now OPEN! Customers will start arriving.', 'success');
      CustomerManager && CustomerManager.startFlow();
    } else {
      statusEl.textContent = '🔴 CLOSED';
      btnEl.textContent = 'Open Store';
      btnEl.style.background = '';
      toast('🔒 Store is now CLOSED.', 'info');
      CustomerManager && CustomerManager.stopFlow();
    }
  }

  function highlightOpenStore() {
    const button = document.getElementById('btn-toggle-store');
    button.classList.add('tutorial-open');
    button.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function openPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    if (activePanel && activePanel !== id) {
      document.getElementById(activePanel)?.classList.add('hidden');
    }
    panel.classList.remove('hidden');
    activePanel = id;
    Player.lock();
  }

  function closePanel(id) {
    document.getElementById(id)?.classList.add('hidden');
    if (activePanel === id) activePanel = null;
    Player.unlock();
  }

  function openApp(appName) {
    document.querySelectorAll('.app-window').forEach(w => w.classList.add('hidden'));
    document.getElementById('desktop-apps').classList.add('hidden');
    const appEl = document.getElementById(`app-${appName}`);
    if (appEl) {
      appEl.classList.remove('hidden');
      Computer.loadApp(appName);
    }
  }

  function showDesktop() {
    document.querySelectorAll('.app-window').forEach(w => w.classList.add('hidden'));
    document.getElementById('desktop-apps').classList.remove('hidden');
  }

  function setInteractHint(text) {
    document.getElementById('interact-hint').textContent = text;
  }

  function clearInteractHint() {
    document.getElementById('interact-hint').textContent = '';
  }

  function showCarriedItem(item) {
    const el = document.getElementById('carried-item');
    if (item) {
      el.classList.remove('hidden');
      document.getElementById('carried-item-icon').textContent = item.emoji || '📦';
      document.getElementById('carried-item-name').textContent = item.name;
    } else {
      el.classList.add('hidden');
    }
  }

  function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    if (typeof SFX !== 'undefined') {
      if (type === 'success') SFX.playSuccess();
      else if (type === 'error' || type === 'warning') SFX.playError();
      else SFX.playClick();
    }
    setTimeout(() => t.remove(), 3100);
  }

  function floatingCash(amount) {
    const el = document.createElement('div');
    el.className = 'floating-cash';
    el.textContent = `+$${amount.toFixed(2)}`;
    document.getElementById('game-hud').appendChild(el);
    if (typeof SFX !== 'undefined') SFX.playCash();
    setTimeout(() => el.remove(), 1400);
  }

  function notify(title, desc, type = 'info') {
    const area = document.getElementById('notification-area');
    const card = document.createElement('div');
    card.className = `notification-card ${type}`;
    card.innerHTML = `<div class="notif-title">${title}</div><div class="notif-desc">${desc}</div>`;
    area.appendChild(card);
    setTimeout(() => card.remove(), 5000);
  }

  function showInventoryPanel() {
    openPanel('inventory-panel');
    refreshInventoryPanel();
  }

  function refreshInventoryPanel() {
    // Carried
    const carried = GameState.raw.carriedItem;
    const carriedGrid = document.getElementById('inv-carried-grid');
    carriedGrid.innerHTML = '';
    if (carried) {
      const div = document.createElement('div');
      div.className = 'inv-item';
      div.innerHTML = `<span class="item-emoji">${carried.emoji || '📦'}</span>
        <span class="item-name">${carried.name}</span>
        <span class="item-qty">${carried.quantity || 1}</span>`;
      carriedGrid.appendChild(div);
    } else {
      carriedGrid.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Nothing carried</p>';
    }

    // Warehouse
    const wGrid = document.getElementById('inv-warehouse-grid');
    wGrid.innerHTML = '';
    const wh = GameState.raw.warehouse;
    let hasWarehouse = false;
    for (const [id, qty] of Object.entries(wh)) {
      if (qty <= 0) continue;
      hasWarehouse = true;
      const data = GameState.getProductData(id);
      if (!data) continue;
      const div = document.createElement('div');
      div.className = 'inv-item';
      div.innerHTML = `<span class="item-emoji">${data.emoji}</span>
        <span class="item-name">${data.name}</span>
        <span class="item-qty">×${qty}</span>`;
      wGrid.appendChild(div);
    }
    if (!hasWarehouse) wGrid.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Warehouse empty</p>';

    // Shelves
    const sGrid = document.getElementById('inv-shelves-grid');
    sGrid.innerHTML = '';
    const shelves = GameState.raw.onShelves;
    let hasShelves = false;
    for (const [id, info] of Object.entries(shelves)) {
      if (info.quantity <= 0) continue;
      hasShelves = true;
      const data = GameState.getProductData(id);
      if (!data) continue;
      const div = document.createElement('div');
      div.className = 'inv-item';
      div.innerHTML = `<span class="item-emoji">${data.emoji}</span>
        <span class="item-name">${data.name}</span>
        <span class="item-qty">×${info.quantity} @ $${GameState.getPrice(id).toFixed(2)}</span>`;
      sGrid.appendChild(div);
    }
    if (!hasShelves) sGrid.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px;">Shelves empty</p>';
  }

  function resumeGame() {
    document.getElementById('pause-menu').classList.add('hidden');
    GameState.set('isPaused', false);
    Player.unlock();
  }

  function pauseGame() {
    document.getElementById('pause-menu').classList.remove('hidden');
    GameState.set('isPaused', true);
    Player.lock();
  }

  function updateWeatherIndicator(w) {
    const icons = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️' };
    document.getElementById('weather-indicator').textContent = icons[w] || '☀️';
  }

  // ═══════════════════════════════════════════
  //  SETTINGS & CREDITS MODALS
  // ═══════════════════════════════════════════
  function initSettingsControls() {
    const sensEl = document.getElementById('setting-sens');
    const sensValEl = document.getElementById('setting-sens-val');
    if (sensEl) {
      sensEl.value = GameState.raw.mouseSensitivity || 0.002;
      sensValEl.textContent = (sensEl.value * 1000).toFixed(1);
      sensEl.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        GameState.raw.mouseSensitivity = val;
        sensValEl.textContent = (val * 1000).toFixed(1);
        if (typeof Player !== 'undefined' && Player.setSensitivity) {
          Player.setSensitivity(val);
        }
      });
    }

    const volEl = document.getElementById('setting-volume');
    const volValEl = document.getElementById('setting-volume-val');
    if (volEl) {
      volEl.value = (GameState.raw.volume !== undefined) ? GameState.raw.volume : 0.7;
      volValEl.textContent = Math.round(volEl.value * 100) + '%';
      volEl.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        GameState.raw.volume = val;
        volValEl.textContent = Math.round(val * 100) + '%';
        if (typeof AmbientCity !== 'undefined' && AmbientCity.setVolume) {
          AmbientCity.setVolume(val);
        }
      });
    }

    const fovEl = document.getElementById('setting-fov');
    const fovValEl = document.getElementById('setting-fov-val');
    if (fovEl) {
      fovEl.value = GameState.raw.fov || 72;
      fovValEl.textContent = fovEl.value + '°';
      fovEl.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        GameState.raw.fov = val;
        fovValEl.textContent = val + '°';
        if (typeof World !== 'undefined' && World.setFov) {
          World.setFov(val);
        }
      });
    }

    const shadowEl = document.getElementById('setting-shadows');
    if (shadowEl) {
      shadowEl.checked = GameState.raw.shadowsEnabled !== false;
      shadowEl.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        GameState.raw.shadowsEnabled = enabled;
        if (typeof World !== 'undefined' && World.setShadowsEnabled) {
          World.setShadowsEnabled(enabled);
        }
      });
    }

    const btnResetSave = document.getElementById('btn-reset-save');
    if (btnResetSave) {
      btnResetSave.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your saved empire progress? This cannot be undone.')) {
          GameState.resetGame();
          toast('🗑️ Saved data cleared.', 'info');
          setTimeout(() => window.location.reload(), 600);
        }
      });
    }
  }

  function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    Player.lock();
  }

  function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
    if (!GameState.raw.isPaused && activePanel === null) {
      Player.unlock();
    }
  }

  function openCredits() {
    document.getElementById('credits-modal').classList.remove('hidden');
    Player.lock();
  }

  function closeCredits() {
    document.getElementById('credits-modal').classList.add('hidden');
    if (!GameState.raw.isPaused && activePanel === null) {
      Player.unlock();
    }
  }

  return {
    init, showScreen, toast, notify, openPanel, closePanel, openApp, showDesktop,
    setInteractHint, clearInteractHint, showCarriedItem, floatingCash,
    showInventoryPanel, refreshInventoryPanel,
    resumeGame, pauseGame, toggleStore, updateHUD, updateWeatherIndicator,
    showDayBanner, syncStoreStatus, highlightOpenStore,
    openSettings, closeSettings, openCredits, closeCredits
  };
})();
