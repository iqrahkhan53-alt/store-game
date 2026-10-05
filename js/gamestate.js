// ============================================
// GAMESTATE.JS - Central Game State Manager
// ============================================

const GameState = (() => {
  const state = {
    // Meta
    day: 1,
    hour: 8,
    minute: 0,
    weather: 'sunny',
    isRunning: false,
    isPaused: false,
    storeOpen: false,
    tutorialStep: 0,
    tutorialComplete: false,

    // Economy
    cash: 2500,
    totalRevenue: 0,
    totalExpenses: 0,
    dailyRevenue: 0,
    dailyExpenses: 0,
    weeklyRevenue: 0,
    totalProfit: 0,
    salesHistory: [],

    // Inventory
    warehouse: {},       // { productId: quantity }
    onShelves: {},       // { productId: { quantity, price, shelfId } }
    prices: {},          // { productId: sellingPrice }
    
    // Orders
    pendingOrders: [],
    orderHistory: [],
    
    // Carried item
    carriedItem: null,   // { type: 'crate'|'item', product, quantity, isEmpty }

    // Employees
    employees: {
      cashier: 0, stocker: 0, cleaner: 0,
      security: 0, manager: 0, warehouse: 0
    },
    dailyWages: 0,

    // Store stats
    customersSatisfied: 0,
    customersAngry: 0,
    itemsSold: 0,
    rating: 4.0,
    footTraffic: 0,

    // Unlocks & progress
    expansions: [],
    unlockedCategories: ['fruits', 'vegetables'],
    storeLevel: 1,

    // Marketing
    activeCampaigns: [],

    // Loans & Banking
    activeLoans: [],

    // Shoplifting
    shopliftingLosses: 0,

    // Settings
    mouseSensitivity: 0.002,
    volume: 0.7,
    shadowsEnabled: true,
    fov: 72,

    // Tutorial objectives
    tutorialObjectives: {
      exitShop: false,
      nearCrate: false,
      pickupCrate: false,
      enterShop: false,
      nearShelf: false,
      stockShelf: false,
      recycleCrate: false,
      useComputer: false,
      placeOrder: false,
      setPrices: false,
      openStore: false,
      firstSale: false,
    }
  };

  const listeners = {};

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }

  function emit(event, data) {
    if (listeners[event]) listeners[event].forEach(cb => cb(data));
  }

  function get(key) { return state[key]; }
  
  function set(key, value) {
    state[key] = value;
    emit('change:' + key, value);
    emit('change', { key, value });
  }

  function addCash(amount) {
    state.cash += amount;
    if (amount > 0) {
      state.dailyRevenue += amount;
      state.totalRevenue += amount;
      state.weeklyRevenue += amount;
    } else {
      state.dailyExpenses += Math.abs(amount);
      state.totalExpenses += Math.abs(amount);
    }
    state.totalProfit = state.totalRevenue - state.totalExpenses;
    emit('change:cash', state.cash);
  }

  function addToWarehouse(productId, qty) {
    if (!state.warehouse[productId]) state.warehouse[productId] = 0;
    state.warehouse[productId] += qty;
    emit('warehouse:update', { productId, qty: state.warehouse[productId] });
  }

  function removeFromWarehouse(productId, qty) {
    if (!state.warehouse[productId]) return false;
    if (state.warehouse[productId] < qty) return false;
    state.warehouse[productId] -= qty;
    emit('warehouse:update', { productId, qty: state.warehouse[productId] });
    return true;
  }

  function addToShelf(productId, qty, shelfId = 'main') {
    if (!state.onShelves[productId]) {
      state.onShelves[productId] = { quantity: 0, price: getPrice(productId), shelfId };
    }
    state.onShelves[productId].quantity += qty;
    emit('shelf:update', { productId });
  }

  function removeFromShelf(productId, qty) {
    if (!state.onShelves[productId]) return false;
    state.onShelves[productId].quantity -= qty;
    if (state.onShelves[productId].quantity < 0) state.onShelves[productId].quantity = 0;
    emit('shelf:update', { productId });
    return true;
  }

  function getPrice(productId) {
    if (state.prices[productId] !== undefined) return state.prices[productId];
    // Find default price
    for (const cat of Object.values(PRODUCTS)) {
      const p = cat.find(x => x.id === productId);
      if (p) return p.defaultPrice;
    }
    return 1.0;
  }

  function setPrice(productId, price) {
    state.prices[productId] = price;
    if (state.onShelves[productId]) state.onShelves[productId].price = price;
    emit('price:update', { productId, price });
  }

  function getProductData(productId) {
    for (const cat of Object.values(PRODUCTS)) {
      const p = cat.find(x => x.id === productId);
      if (p) return p;
    }
    return null;
  }

  function recordSale(productId, qty, price) {
    const data = getProductData(productId);
    const revenue = price * qty;
    const cost = data ? data.wholesale * qty : 0;
    const profit = revenue - cost;
    state.itemsSold += qty;
    addCash(revenue);
    state.salesHistory.push({ productId, qty, price, revenue, profit, day: state.day, hour: state.hour });
    emit('sale', { productId, qty, price, revenue, profit });
  }

  function advanceTime(minutes) {
    state.minute += minutes;
    while (state.minute >= 60) { state.minute -= 60; state.hour++; }
    while (state.hour >= 24) { state.hour -= 24; newDay(); }
    emit('time:update', { day: state.day, hour: state.hour, minute: state.minute });
  }

  function newDay() {
    state.day++;
    state.dailyRevenue = 0;
    state.dailyExpenses = 0;
    state.footTraffic = 0;
    // Pay wages
    let wages = 0;
    for (const [role, count] of Object.entries(state.employees)) {
      const roleData = EMPLOYEE_ROLES.find(r => r.id === role);
      if (roleData) wages += roleData.salary * count;
    }
    state.dailyWages = wages;
    addCash(-wages);

    // Pay loan interest
    if (state.activeLoans && state.activeLoans.length > 0) {
      let interestTotal = 0;
      for (const loan of state.activeLoans) {
        interestTotal += loan.dailyPayment;
        loan.daysLeft--;
      }
      addCash(-interestTotal);
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(`🏦 Daily loan payments: -$${interestTotal.toFixed(0)} deducted.`, 'info');
      }
    }

    emit('new:day', { day: state.day });
  }

  function saveGame(slot = 0) {
    try {
      localStorage.setItem(`retailEmpire_save_${slot}`, JSON.stringify(state));
      return true;
    } catch (e) { return false; }
  }

  function loadGame(slot = 0) {
    try {
      const data = localStorage.getItem(`retailEmpire_save_${slot}`);
      if (!data) return false;
      const saved = JSON.parse(data);
      Object.assign(state, saved);
      return true;
    } catch (e) { return false; }
  }

  function hasSave() {
    return !!localStorage.getItem('retailEmpire_save_0');
  }

  function resetGame() {
    try {
      localStorage.removeItem('retailEmpire_save_0');
      return true;
    } catch (e) { return false; }
  }

  function completeObjective(obj) {
    if (!state.tutorialObjectives[obj]) {
      state.tutorialObjectives[obj] = true;
      emit('objective:complete', obj);
    }
  }

  return {
    get, set, on, emit,
    addCash, addToWarehouse, removeFromWarehouse,
    addToShelf, removeFromShelf, getPrice, setPrice,
    getProductData, recordSale, advanceTime, saveGame, loadGame, hasSave, resetGame,
    completeObjective,
    raw: state
  };
})();
