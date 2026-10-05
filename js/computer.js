// ============================================
// COMPUTER.JS - Store Computer Application System
// ============================================

const Computer = (() => {
  let currentSupplier = null;
  let orderCart = [];

  function open() {
    // Refresh desktop clock etc
    UI.showDesktop();
  }

  function loadApp(appName) {
    switch (appName) {
      case 'ordering':   loadOrdering(); break;
      case 'employees':  loadEmployees(); break;
      case 'finance':    loadFinance(); break;
      case 'expansion':  loadExpansion(); break;
      case 'pricing':    loadPricing(); break;
      case 'marketing':  loadMarketing(); break;
      case 'reports':    loadReports(); break;
      case 'inventory':  loadInventoryApp(); break;
      case 'bank':       loadBankApp(); break;
      case 'reviews':    loadReviewsApp(); break;
    }
  }

  // ========== ORDERING ==========
  function loadOrdering() {
    orderCart = [];
    renderSuppliers();
    renderOrderCart();
    document.getElementById('btn-confirm-order').onclick = confirmOrder;
  }

  function renderSuppliers() {
    const list = document.getElementById('supplier-list');
    list.innerHTML = '<h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">SUPPLIERS</h4>';
    for (const sup of SUPPLIERS) {
      const btn = document.createElement('button');
      btn.className = `supplier-btn${currentSupplier?.id === sup.id ? ' active' : ''}`;
      btn.innerHTML = `${sup.name}<br><small style="font-weight:400;color:var(--text-muted)">${sup.specialty}</small>`;
      btn.addEventListener('click', () => {
        currentSupplier = sup;
        list.querySelectorAll('.supplier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProductCatalog(sup);
      });
      list.appendChild(btn);
    }
  }

  function renderProductCatalog(supplier) {
    const catalog = document.getElementById('product-catalog');
    catalog.innerHTML = `<h4 style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:4px 0;">
      ${supplier.name} — Products</h4>`;

    const grid = document.createElement('div');
    grid.className = 'catalog-grid';

    for (const cat of supplier.categories) {
      const products = PRODUCTS[cat];
      if (!products) continue;
      for (const p of products) {
        const card = document.createElement('div');
        card.className = 'product-card';
        const cartQty = orderCart.find(x => x.id === p.id)?.qty || 0;
        card.innerHTML = `
          <span class="p-emoji">${p.emoji}</span>
          <div class="p-name">${p.name}</div>
          <div class="p-cost">$${p.wholesale.toFixed(2)}/unit</div>
          <div class="p-demand">Demand: ${'⭐'.repeat(Math.round(p.demand / 2))}</div>
          <div class="qty-controls">
            <button class="qty-btn" data-action="dec" data-id="${p.id}">−</button>
            <span class="qty-val" id="qty-${p.id}">${cartQty}</span>
            <button class="qty-btn" data-action="inc" data-id="${p.id}">+</button>
          </div>
        `;
        grid.appendChild(card);
      }
    }

    catalog.appendChild(grid);

    // Event delegation
    catalog.onclick = (e) => {
      const btn = e.target.closest('.qty-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      adjustCartItem(id, action);
      renderOrderCart();
    };
  }

  function adjustCartItem(id, action) {
    let item = orderCart.find(x => x.id === id);
    if (!item) {
      const data = GameState.getProductData(id);
      if (!data) return;
      item = { id, name: data.name, emoji: data.emoji, cost: data.wholesale, qty: 0 };
      orderCart.push(item);
    }
    if (action === 'inc') item.qty++;
    else if (action === 'dec') item.qty = Math.max(0, item.qty - 1);
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.textContent = item.qty;
  }

  function renderOrderCart() {
    const itemsEl = document.getElementById('order-items');
    itemsEl.innerHTML = '';
    let total = 0;

    for (const item of orderCart) {
      if (item.qty === 0) continue;
      const cost = item.qty * item.cost;
      total += cost;
      const div = document.createElement('div');
      div.className = 'order-item';
      div.innerHTML = `
        <span>${item.emoji} ${item.name}</span>
        <span>×${item.qty}</span>
        <span style="color:var(--gold)">$${cost.toFixed(2)}</span>
        <button class="order-item-remove" data-id="${item.id}">✕</button>
      `;
      itemsEl.appendChild(div);
    }

    document.getElementById('order-total-val').textContent = '$' + total.toFixed(2);
    itemsEl.onclick = (e) => {
      const removeBtn = e.target.closest('.order-item-remove');
      if (!removeBtn) return;
      orderCart = orderCart.filter(item => item.id !== removeBtn.dataset.id);
      renderOrderCart();
      if (currentSupplier) renderProductCatalog(currentSupplier);
    };
  }

  function confirmOrder() {
    const activeItems = orderCart.filter(x => x.qty > 0);
    if (activeItems.length === 0) {
      UI.toast('🛒 Cart is empty!', 'warning');
      return;
    }

    let total = activeItems.reduce((s, x) => s + x.qty * x.cost, 0);
    if (GameState.raw.cash < total) {
      UI.toast(`❌ Not enough cash! Need $${total.toFixed(2)}`, 'error');
      return;
    }

    GameState.addCash(-total);
    const order = { id: Date.now(), items: activeItems, total, status: 'processing', eta: 30 };
    GameState.raw.pendingOrders.push(order);
    GameState.raw.orderHistory.push(order);

    UI.toast(`✅ Order placed! $${total.toFixed(2)} charged. Delivery arriving in ~30s.`, 'success');
    UI.notify('📦 Order Confirmed', `Delivery of ${activeItems.length} products for $${total.toFixed(2)}`, 'delivery');
    GameState.completeObjective('placeOrder');

    // Orders become available immediately; the delivery truck remains as the
    // visual confirmation in the loading zone.
    deliverOrder(order);

    orderCart = [];
    renderOrderCart();
    UI.updateHUD();
  }

  function deliverOrder(order) {
    const idx = GameState.raw.pendingOrders.indexOf(order);
    if (idx >= 0) GameState.raw.pendingOrders.splice(idx, 1);

    // Add to warehouse
    for (const item of order.items) {
      GameState.addToWarehouse(item.id, item.qty);
    }

    // Spawn delivery truck and crates in world
    World.spawnDeliveryTruck(order.items);

    UI.toast('🚚 Delivery arrived! Carry crates inside and stock shelves.', 'success');
    UI.notify('🚚 Delivery Arrived!', `${order.items.length} products delivered to warehouse.`, 'delivery');
    UI.updateHUD();
  }

  // ========== EMPLOYEES ==========
  function loadEmployees() {
    const content = document.getElementById('employee-content');
    content.innerHTML = '';

    const totalWages = EMPLOYEE_ROLES.reduce((s, r) => s + r.salary * (GameState.raw.employees[r.id] || 0), 0);

    const header = document.createElement('div');
    header.innerHTML = `<div style="padding:12px 0;border-bottom:1px solid var(--border);margin-bottom:12px;">
      <p style="font-size:13px;color:var(--text-muted)">Daily wage bill: <strong style="color:var(--gold)">$${totalWages}</strong></p>
    </div>`;
    content.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'employee-categories';

    for (const role of EMPLOYEE_ROLES) {
      const count = GameState.raw.employees[role.id] || 0;
      const card = document.createElement('div');
      card.className = 'employee-category';
      card.innerHTML = `
        <h4>${role.emoji} ${role.name}</h4>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${role.effect}</p>
        <div class="emp-role">
          <span class="emp-role-name">$${role.salary}/day</span>
          <span class="emp-count">${count} / ${role.max}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          ${count < role.max ? `<button class="hire-btn" data-role="${role.id}">+ Hire ($${role.salary})</button>` : '<span style="font-size:11px;color:var(--text-muted)">Max hired</span>'}
          ${count > 0 ? `<button class="fire-btn" data-role="${role.id}">Fire</button>` : ''}
        </div>
      `;
      grid.appendChild(card);
    }

    content.appendChild(grid);

    // Event delegation
    content.onclick = (e) => {
      const hireBtn = e.target.closest('.hire-btn');
      const fireBtn = e.target.closest('.fire-btn');
      if (hireBtn) hireEmployee(hireBtn.dataset.role);
      if (fireBtn) fireEmployee(fireBtn.dataset.role);
    };
  }

  function hireEmployee(roleId) {
    const role = EMPLOYEE_ROLES.find(r => r.id === roleId);
    if (!role) return;
    const current = GameState.raw.employees[roleId] || 0;
    if (current >= role.max) { UI.toast('Max employees for this role!', 'warning'); return; }
    if (GameState.raw.cash < role.salary * 7) {
      UI.toast(`❌ Not enough cash to hire (need $${role.salary * 7} for a week)`, 'error'); return;
    }
    GameState.raw.employees[roleId] = current + 1;
    GameState.addCash(-role.salary * 3); // 3-day signing bonus
    UI.toast(`✅ Hired ${role.emoji} ${role.name}!`, 'success');
    if (window.World && typeof World.updateStaff === 'function') {
      World.updateStaff(GameState.raw.employees);
    }
    loadEmployees();
  }

  function fireEmployee(roleId) {
    const current = GameState.raw.employees[roleId] || 0;
    if (current <= 0) return;
    GameState.raw.employees[roleId] = current - 1;
    const role = EMPLOYEE_ROLES.find(r => r.id === roleId);
    UI.toast(`👋 ${role?.name} fired.`, 'info');
    if (window.World && typeof World.updateStaff === 'function') {
      World.updateStaff(GameState.raw.employees);
    }
    loadEmployees();
  }

  // ========== FINANCE ==========
  function loadFinance() {
    const content = document.getElementById('finance-content');
    const s = GameState.raw;
    const netProfit = s.totalRevenue - s.totalExpenses;
    const profitPct = s.totalRevenue > 0 ? (netProfit / s.totalRevenue) * 100 : 0;

    content.innerHTML = `
      <div class="finance-grid">
        <div class="finance-card">
          <div class="f-label">Cash Balance</div>
          <div class="f-val">$${s.cash.toFixed(0)}</div>
          <div class="f-change">Available funds</div>
        </div>
        <div class="finance-card">
          <div class="f-label">Today's Revenue</div>
          <div class="f-val">$${s.dailyRevenue.toFixed(0)}</div>
          <div class="f-change">Day ${s.day}</div>
        </div>
        <div class="finance-card">
          <div class="f-label">Total Profit</div>
          <div class="f-val" style="color:${netProfit >= 0 ? 'var(--accent3)' : 'var(--danger)'}">$${netProfit.toFixed(0)}</div>
          <div class="f-change">${profitPct.toFixed(1)}% margin</div>
        </div>
        <div class="finance-card">
          <div class="f-label">Total Revenue</div>
          <div class="f-val">$${s.totalRevenue.toFixed(0)}</div>
          <div class="f-change">All time</div>
        </div>
        <div class="finance-card">
          <div class="f-label">Items Sold</div>
          <div class="f-val" style="color:var(--accent)">${s.itemsSold}</div>
          <div class="f-change">Units</div>
        </div>
        <div class="finance-card">
          <div class="f-label">Daily Wages</div>
          <div class="f-val" style="color:var(--danger)">$${s.dailyWages.toFixed(0)}</div>
          <div class="f-change">Per day</div>
        </div>
      </div>
      <div class="profit-bar-container">
        <div class="profit-bar-label">
          <span>Revenue Progress</span>
          <span>$${s.totalRevenue.toFixed(0)} / $10,000</span>
        </div>
        <div class="profit-bar">
          <div class="profit-bar-fill" style="width:${Math.min(100, s.totalRevenue / 100)}%"></div>
        </div>
      </div>
    `;
  }

  // ========== EXPANSION ==========
  function loadExpansion() {
    const content = document.getElementById('expansion-content');
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'expansion-grid';

    for (const exp of EXPANSIONS) {
      const purchased = GameState.raw.expansions.includes(exp.id);
      const card = document.createElement('div');
      card.className = 'expansion-card';
      card.innerHTML = `
        <h4>${exp.name}</h4>
        <p>${exp.desc}</p>
        <div class="expansion-price">${purchased ? '✅ Purchased' : '$' + exp.cost.toLocaleString()}</div>
        <button class="expand-btn" ${purchased ? 'disabled' : ''} data-id="${exp.id}">
          ${purchased ? 'Owned' : 'Purchase Upgrade'}
        </button>
      `;
      grid.appendChild(card);
    }

    content.appendChild(grid);

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('.expand-btn');
      if (!btn || btn.disabled) return;
      purchaseExpansion(btn.dataset.id);
    });
  }

  function purchaseExpansion(id) {
    const exp = EXPANSIONS.find(e => e.id === id);
    if (!exp) return;
    if (GameState.raw.expansions.includes(id)) { UI.toast('Already purchased!', 'warning'); return; }
    if (GameState.raw.cash < exp.cost) {
      UI.toast(`❌ Need $${exp.cost.toLocaleString()} — only have $${GameState.raw.cash.toFixed(0)}`, 'error');
      return;
    }
    GameState.addCash(-exp.cost);
    GameState.raw.expansions.push(id);
    UI.toast(`✅ ${exp.name} purchased!`, 'success');
    UI.notify('🏗️ Store Expanded!', exp.name + ' is now active.', 'profit');
    if (window.World && typeof World.applyExpansion === 'function') {
      World.applyExpansion(id);
    }
    loadExpansion();
  }

  // ========== PRICING ==========
  function loadPricing() {
    const content = document.getElementById('pricing-content');
    const shelved = Object.entries(GameState.raw.onShelves).filter(([id, s]) => s.quantity > 0);
    const warehouse = Object.entries(GameState.raw.warehouse).filter(([id, qty]) => qty > 0);
    const all = new Map();

    for (const [id] of shelved) all.set(id, true);
    for (const [id] of warehouse) all.set(id, true);

    // Also add all products player has ordered
    for (const order of GameState.raw.orderHistory) {
      for (const item of order.items) all.set(item.id, true);
    }

    if (all.size === 0) {
      content.innerHTML = '<p style="padding:16px;color:var(--text-muted);">No products in inventory yet. Order some products first!</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'pricing-table';
    table.innerHTML = `<thead><tr>
      <th>Product</th>
      <th>On Shelf</th>
      <th>Cost</th>
      <th>Your Price</th>
      <th>Margin</th>
    </tr></thead><tbody id="pricing-tbody"></tbody>`;

    content.innerHTML = '';
    content.appendChild(table);

    const tbody = document.getElementById('pricing-tbody');
    for (const [id] of all) {
      const data = GameState.getProductData(id);
      if (!data) continue;
      const price = GameState.getPrice(id);
      const margin = ((price - data.wholesale) / data.wholesale * 100).toFixed(0);
      const marginClass = parseFloat(margin) > 100 ? 'good' : parseFloat(margin) > 30 ? 'ok' : 'bad';
      const shelfInfo = GameState.raw.onShelves[id];
      const onShelf = shelfInfo ? shelfInfo.quantity : 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.emoji} ${data.name}</td>
        <td>${onShelf > 0 ? `✅ ${onShelf}` : '—'}</td>
        <td style="color:var(--gold)">$${data.wholesale.toFixed(2)}</td>
        <td><input type="number" class="price-input" value="${price.toFixed(2)}" step="0.10" min="${data.wholesale.toFixed(2)}" data-id="${id}" /></td>
        <td class="profit-pct ${marginClass}" id="margin-${id}">+${margin}%</td>
      `;
      tbody.appendChild(tr);
    }

    // Live margin updates
    content.oninput = (e) => {
      const input = e.target.closest('.price-input');
      if (!input) return;
      const id = input.dataset.id;
      const newPrice = parseFloat(input.value);
      if (isNaN(newPrice)) return;
      GameState.setPrice(id, newPrice);
      const data = GameState.getProductData(id);
      if (!data) return;
      const margin = ((newPrice - data.wholesale) / data.wholesale * 100).toFixed(0);
      const el = document.getElementById(`margin-${id}`);
      if (el) {
        el.textContent = `+${margin}%`;
        el.className = `profit-pct ${parseFloat(margin) > 100 ? 'good' : parseFloat(margin) > 30 ? 'ok' : 'bad'}`;
      }
    };

    content.onchange = (e) => {
      const input = e.target.closest('.price-input');
      if (!input) return;
      GameState.completeObjective('setPrices');
      UI.toast('🏷️ Prices updated!', 'success');
    };
  }

  // ========== MARKETING ==========
  function loadMarketing() {
    const content = document.getElementById('marketing-content');
    const active = GameState.raw.activeCampaigns;

    let html = '';
    if (active.length > 0) {
      html += `<div style="padding:10px 16px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:8px;margin:0 16px 12px;">
        <strong>🎯 Active Campaigns:</strong><br>
        ${active.map(c => `${c.name}`).join(', ')}
      </div>`;
    }

    html += '<div class="campaign-grid" style="padding:16px;">';
    for (const c of MARKETING_CAMPAIGNS) {
      const isActive = active.some(a => a.id === c.id);
      html += `<div class="campaign-card">
        <h4>${c.name}</h4>
        <p>${c.desc}</p>
        <div class="campaign-effect">${c.effect}</div>
        <div class="campaign-cost">${c.cost === 0 ? '🆓 Free' : '$' + c.cost}</div>
        <button class="campaign-btn ${isActive ? 'active' : ''}" data-id="${c.id}" ${isActive ? 'disabled' : ''}>
          ${isActive ? '✅ Running' : 'Launch Campaign'}
        </button>
      </div>`;
    }
    html += '</div>';
    content.innerHTML = html;

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('.campaign-btn');
      if (!btn || btn.disabled) return;
      launchCampaign(btn.dataset.id);
    });
  }

  function launchCampaign(id) {
    const camp = MARKETING_CAMPAIGNS.find(c => c.id === id);
    if (!camp) return;
    if (camp.cost > 0 && GameState.raw.cash < camp.cost) {
      UI.toast(`❌ Need $${camp.cost} for this campaign`, 'error'); return;
    }
    if (camp.cost > 0) GameState.addCash(-camp.cost);
    GameState.raw.activeCampaigns.push({ ...camp, startDay: GameState.raw.day });
    UI.toast(`📢 ${camp.name} launched!`, 'success');
    loadMarketing();
  }

  // ========== REPORTS ==========
  function loadReports() {
    const content = document.getElementById('reports-content');
    const sales = GameState.raw.salesHistory;

    // Aggregate by product
    const byProduct = {};
    for (const sale of sales) {
      if (!byProduct[sale.productId]) byProduct[sale.productId] = { sold: 0, revenue: 0 };
      byProduct[sale.productId].sold += sale.qty;
      byProduct[sale.productId].revenue += sale.revenue;
    }

    const sorted = Object.entries(byProduct).sort((a, b) => b[1].revenue - a[1].revenue);

    let html = `<div style="padding:16px;">
      <h4 style="margin-bottom:12px;">🏆 Best-Selling Products</h4>
      <div class="bestsellers-list">`;

    if (sorted.length === 0) {
      html += '<p style="color:var(--text-muted);font-size:13px;">No sales yet. Open the store and serve customers!</p>';
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      sorted.slice(0, 10).forEach(([id, data], i) => {
        const productData = GameState.getProductData(id);
        if (!productData) return;
        html += `<div class="bestseller-item">
          <span class="bs-rank">${medals[i] || (i + 1)}</span>
          <span class="bs-emoji">${productData.emoji}</span>
          <span class="bs-name">${productData.name}</span>
          <span class="bs-sold">${data.sold} sold</span>
          <span class="bs-revenue">$${data.revenue.toFixed(2)}</span>
        </div>`;
      });
    }

    html += `</div>
      <div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:8px;">
        <h4 style="margin-bottom:8px;">📈 Summary</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
          <div>Total Sales: <strong style="color:var(--accent3)">$${GameState.raw.totalRevenue.toFixed(2)}</strong></div>
          <div>Customers Served: <strong>${GameState.raw.customersSatisfied}</strong></div>
          <div>Items Sold: <strong>${GameState.raw.itemsSold}</strong></div>
          <div>Rating: <strong style="color:var(--gold)">${'★'.repeat(Math.round(GameState.raw.rating))}${'☆'.repeat(5 - Math.round(GameState.raw.rating))}</strong></div>
        </div>
      </div>
    </div>`;

    content.innerHTML = html;
  }

  // ========== INVENTORY (COMPUTER) ==========
  function loadInventoryApp() {
    const content = document.getElementById('inv-computer-content');
    const warehouse = GameState.raw.warehouse;
    const shelves = GameState.raw.onShelves;

    let html = '<div style="padding:16px;">';
    html += '<h4 style="margin-bottom:12px;">🏭 Warehouse Stock</h4>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<thead><tr><th style="text-align:left;padding:6px;font-size:11px;color:var(--text-muted);">Product</th><th>Warehouse</th><th>On Shelf</th><th>Total Value</th></tr></thead><tbody>';

    let hasAny = false;
    const all = new Set([...Object.keys(warehouse), ...Object.keys(shelves)]);
    for (const id of all) {
      const wQty = warehouse[id] || 0;
      const sQty = shelves[id]?.quantity || 0;
      if (wQty === 0 && sQty === 0) continue;
      hasAny = true;
      const data = GameState.getProductData(id);
      if (!data) continue;
      const totalValue = (wQty + sQty) * data.wholesale;
      html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:8px 6px;">${data.emoji} ${data.name}</td>
        <td style="text-align:center;color:var(--accent)">${wQty}</td>
        <td style="text-align:center;color:var(--accent3)">${sQty}</td>
        <td style="text-align:center;color:var(--gold)">$${totalValue.toFixed(2)}</td>
      </tr>`;
    }

    if (!hasAny) {
      html += '<tr><td colspan="4" style="padding:16px;color:var(--text-muted);">No inventory yet. Order products!</td></tr>';
    }

    html += '</tbody></table></div>';
    content.innerHTML = html;
  }

  // ========== BANK LOANS ==========
  const AVAILABLE_LOANS = [
    { id: 'starter', name: '🌱 Micro Business Loan', amount: 1000, dailyPayment: 45, termDays: 30, fee: 50 },
    { id: 'expansion', name: '📈 Supermarket Growth Loan', amount: 5000, dailyPayment: 210, termDays: 30, fee: 200 },
    { id: 'mega', name: '🚀 Mega Retail Syndicate Capital', amount: 15000, dailyPayment: 600, termDays: 30, fee: 500 }
  ];

  function loadBankApp() {
    const content = document.getElementById('bank-content');
    const loans = GameState.raw.activeLoans || [];

    let html = '<div style="padding:16px;">';
    html += '<h4 style="margin-bottom:12px;">🏦 Retail Capital Loans</h4>';

    if (loans.length > 0) {
      html += '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);padding:12px;border-radius:8px;margin-bottom:16px;">';
      html += '<strong>💳 Active Loans:</strong>';
      html += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">';
      for (const l of loans) {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);padding:8px 12px;border-radius:6px;">
          <div>
            <strong>${l.name}</strong><br>
            <small style="color:var(--text-muted)">$${l.dailyPayment}/day • ${l.daysLeft} days remaining</small>
          </div>
          <button class="hire-btn repay-btn" data-id="${l.id}">Repay Early ($${(l.dailyPayment * l.daysLeft).toFixed(0)})</button>
        </div>`;
      }
      html += '</div></div>';
    }

    html += '<div class="campaign-grid">';
    for (const option of AVAILABLE_LOANS) {
      const isTaken = loans.some(l => l.id === option.id);
      html += `<div class="campaign-card">
        <h4>${option.name}</h4>
        <p>Immediate cash injection of <strong style="color:var(--gold)">+$${option.amount.toLocaleString()}</strong>.</p>
        <div class="campaign-effect">Daily Payment: $${option.dailyPayment}/day (${option.termDays} days)</div>
        <div class="campaign-cost">Origination Fee: $${option.fee}</div>
        <button class="campaign-btn loan-btn ${isTaken ? 'active' : ''}" data-id="${option.id}" ${isTaken ? 'disabled' : ''}>
          ${isTaken ? '✅ Active Loan' : 'Apply for $' + option.amount.toLocaleString()}
        </button>
      </div>`;
    }
    html += '</div></div>';

    content.innerHTML = html;

    content.onclick = (e) => {
      const loanBtn = e.target.closest('.loan-btn');
      const repayBtn = e.target.closest('.repay-btn');
      if (loanBtn && !loanBtn.disabled) takeLoan(loanBtn.dataset.id);
      if (repayBtn) repayLoan(repayBtn.dataset.id);
    };
  }

  function takeLoan(id) {
    const loanData = AVAILABLE_LOANS.find(l => l.id === id);
    if (!loanData) return;
    if (!GameState.raw.activeLoans) GameState.raw.activeLoans = [];
    const netCash = loanData.amount - loanData.fee;
    GameState.addCash(netCash);
    GameState.raw.activeLoans.push({
      id: loanData.id,
      name: loanData.name,
      dailyPayment: loanData.dailyPayment,
      daysLeft: loanData.termDays
    });
    UI.toast(`🏦 Loan approved! +$${netCash.toLocaleString()} added to cash.`, 'success');
    UI.notify('🏦 Loan Approved', `Received $${netCash.toLocaleString()} from Retail Capital.`, 'profit');
    UI.updateHUD();
    loadBankApp();
  }

  function repayLoan(id) {
    const idx = (GameState.raw.activeLoans || []).findIndex(l => l.id === id);
    if (idx < 0) return;
    const loan = GameState.raw.activeLoans[idx];
    const payoff = loan.dailyPayment * loan.daysLeft;
    if (GameState.raw.cash < payoff) {
      UI.toast(`❌ Need $${payoff.toFixed(0)} to pay off loan early!`, 'error');
      return;
    }
    GameState.addCash(-payoff);
    GameState.raw.activeLoans.splice(idx, 1);
    UI.toast(`✅ Loan "${loan.name}" fully paid off!`, 'success');
    UI.updateHUD();
    loadBankApp();
  }

  // ========== CUSTOMER REVIEWS ==========
  function loadReviewsApp() {
    const content = document.getElementById('reviews-content');
    const rating = GameState.raw.rating || 4.0;
    const happy = GameState.raw.customersSatisfied || 0;
    const angry = GameState.raw.customersAngry || 0;
    const total = happy + angry;
    const satPct = total > 0 ? ((happy / total) * 100).toFixed(0) : 100;

    const sampleReviews = [
      { stars: 5, author: 'Sarah M.', comment: 'Love this supermarket! Great produce selection and super fast checkout.' },
      { stars: 4, author: 'David K.', comment: 'Clean store and friendly staff. Will shop here again.' },
      { stars: rating >= 4 ? 5 : 2, author: 'Alex R.', comment: rating >= 4 ? 'Prices are fair and shelves are always stocked well!' : 'Prices feel a bit high on some items.' },
      { stars: rating >= 3 ? 4 : 1, author: 'Jessica L.', comment: happy > 10 ? 'Bright lighting and great atmosphere!' : 'Ran out of inventory when I visited.' },
    ];

    let html = '<div style="padding:16px;">';
    html += `<div style="display:flex;gap:16px;align-items:center;background:var(--bg-card);padding:16px;border-radius:10px;margin-bottom:16px;">
      <div style="font-size:36px;font-weight:800;color:var(--gold);line-height:1;">${rating.toFixed(1)}</div>
      <div>
        <div style="color:var(--gold);font-size:18px;">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</div>
        <div style="font-size:12px;color:var(--text-muted);">${satPct}% Customer Satisfaction Rate (${total} Shoppers Rated)</div>
      </div>
    </div>`;

    html += '<h4 style="margin-bottom:12px;">💬 Recent Customer Feedback</h4>';
    html += '<div style="display:flex;flex-direction:column;gap:10px;">';
    for (const r of sampleReviews) {
      html += `<div style="background:var(--bg-card);padding:12px;border-radius:8px;border-left:4px solid ${r.stars >= 4 ? 'var(--accent3)' : 'var(--danger)'}">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong style="font-size:13px;">${r.author}</strong>
          <span style="color:var(--gold);font-size:12px;">${'★'.repeat(r.stars)}</span>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:0;">"${r.comment}"</p>
      </div>`;
    }
    html += '</div></div>';

    content.innerHTML = html;
  }

  return { open, loadApp };
})();
