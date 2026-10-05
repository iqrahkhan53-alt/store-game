// ============================================
// CHECKOUT.JS - Checkout Register System
// ============================================

const Checkout = (() => {
  let currentCustomer = null;
  let total = 0;
  let paid = 0;
  let change = 0;

  function init() {
    document.getElementById('btn-pay-cash').addEventListener('click', () => showCashInput());
    document.getElementById('btn-pay-card').addEventListener('click', () => processCard());
    document.getElementById('btn-process-cash').addEventListener('click', () => processCash());
    document.getElementById('btn-next-customer').addEventListener('click', () => nextCustomer());
    document.getElementById('btn-close-checkout').addEventListener('click', () => close());
  }

  function openWithCustomer(customer) {
    currentCustomer = customer;
    total = 0;
    paid = 0;
    change = 0;

    // Calculate total
    for (const item of customer.pickedItems) {
      total += item.price * item.qty;
    }

    // Render items
    const itemsEl = document.getElementById('checkout-items');
    itemsEl.innerHTML = '';
    for (const item of customer.pickedItems) {
      const div = document.createElement('div');
      div.className = 'checkout-item';
      div.innerHTML = `
        <span class="ci-emoji">${item.emoji}</span>
        <span class="ci-name">${item.name}</span>
        <span class="ci-qty">×${item.qty}</span>
        <span class="ci-price">$${(item.price * item.qty).toFixed(2)}</span>
      `;
      itemsEl.appendChild(div);
    }

    updateRegisterDisplay();

    // Reset UI state
    document.getElementById('cash-input-wrap').classList.add('hidden');
    document.getElementById('checkout-receipt').classList.add('hidden');
    document.getElementById('cash-input').value = '';

    UI.openPanel('checkout-ui');
    Player.lock();
  }

  function updateRegisterDisplay() {
    document.getElementById('register-total').textContent = '$' + total.toFixed(2);
    document.getElementById('register-paid').textContent = '$' + paid.toFixed(2);
    document.getElementById('register-change').textContent = '$' + change.toFixed(2);
  }

  function showCashInput() {
    document.getElementById('cash-input-wrap').classList.remove('hidden');
    document.getElementById('cash-input').value = Math.ceil(total).toString();
    document.getElementById('cash-input').focus();
  }

  function processCash() {
    const cashEl = document.getElementById('cash-input');
    const cashAmount = parseFloat(cashEl.value);
    if (isNaN(cashAmount) || cashAmount < total) {
      UI.toast('💵 Not enough cash!', 'error');
      return;
    }
    paid = cashAmount;
    change = cashAmount - total;
    updateRegisterDisplay();
    completeTransaction();
  }

  function processCard() {
    paid = total;
    change = 0;
    updateRegisterDisplay();
    completeTransaction();
    UI.toast('💳 Card payment accepted!', 'success');
  }

  function completeTransaction() {
    if (!currentCustomer) return;

    // Show receipt
    const receiptEl = document.getElementById('receipt-content');
    receiptEl.innerHTML = '';
    receiptEl.innerHTML += `<p style="border-bottom:1px dashed #ccc;margin-bottom:6px;padding-bottom:4px;">
      RETAIL EMPIRE™<br>
      ${new Date().toLocaleDateString()}<br>
      Cashier: Player<br>
    </p>`;

    for (const item of currentCustomer.pickedItems) {
      receiptEl.innerHTML += `<div style="display:flex;justify-content:space-between;">
        <span>${item.emoji} ${item.name} ×${item.qty}</span>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </div>`;
    }

    receiptEl.innerHTML += `<div style="border-top:1px dashed #ccc;margin-top:6px;padding-top:4px;">
      <div style="display:flex;justify-content:space-between;font-weight:700;">
        <span>TOTAL</span><span>$${total.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>PAID</span><span>$${paid.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:#10b981;font-weight:700;">
        <span>CHANGE</span><span>$${change.toFixed(2)}</span>
      </div>
    </div>
    <p style="text-align:center;margin-top:8px;font-size:11px;">Thank you for shopping!<br>⭐⭐⭐⭐⭐</p>`;

    document.getElementById('checkout-receipt').classList.remove('hidden');
    document.getElementById('cash-input-wrap').classList.add('hidden');

    // Complete in customer manager
    CustomerManager.completeCheckout(currentCustomer, total);
    currentCustomer = null;
  }

  function nextCustomer() {
    document.getElementById('checkout-receipt').classList.add('hidden');
    // Check if another customer is waiting
    const next = CustomerManager.getWaitingCustomer();
    if (next) {
      openWithCustomer(next);
    } else {
      close();
      UI.toast('✅ All customers served!', 'success');
    }
  }

  function close() {
    UI.closePanel('checkout-ui');
    Player.unlock();
  }

  return { init, openWithCustomer, close };
})();
