// ============================================================
//  LuxeMart — cart.js
//  Manages cart with localStorage key 'cart' (matches common.js)
// ============================================================
(function () {

  const CART_KEY = 'cart'; // Must match common.js

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI(cart);
  }

  function addToCart(product, qty = 1) {
    const cart = getCart();
    const existing = cart.find(i => i.id == product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + qty;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, img: product.img, brand: product.brand, qty });
    }
    saveCart(cart);
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id != id));
  }

  function updateQty(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id == id);
    if (!item) return;
    item.qty = (item.qty || 1) + delta;
    if (item.qty <= 0) return saveCart(cart.filter(i => i.id != id));
    saveCart(cart);
  }

  const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  function updateCartUI(cart) {
    const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
    const count = cart.reduce((s, i) => s + (i.qty || 1), 0);

    // Update count badges
    ['cartCount', 'mobileCartCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });

    // Update total
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = fmt(total);

    // Update sidebar items
    const cartItemsEl = document.getElementById('cartItems');
    if (!cartItemsEl) return;

    if (!cart.length) {
      cartItemsEl.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:#aaa;">
          <i class="fas fa-shopping-bag" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
          <p>Your cart is empty</p>
          <a href="shop.html" class="btn-primary" style="display:inline-block;margin-top:1rem;">Shop Now</a>
        </div>`;
      return;
    }

    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.img}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${fmt(item.price)}</p>
          <div class="cart-item-qty">
            <button class="qty-btn cart-decrease" data-id="${item.id}">-</button>
            <span class="qty-value">${item.qty || 1}</span>
            <button class="qty-btn cart-increase" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="cart-remove" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
      </div>`).join('');

    cartItemsEl.querySelectorAll('.cart-increase').forEach(btn =>
      btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), 1)));
    cartItemsEl.querySelectorAll('.cart-decrease').forEach(btn =>
      btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), -1)));
    cartItemsEl.querySelectorAll('.cart-remove').forEach(btn =>
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id))));
  }

  // Wishlist
  function addToWishlist(product) {
    let list = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (!list.includes(String(product.id))) {
      list.push(String(product.id));
      localStorage.setItem('wishlist', JSON.stringify(list));
    }
    const el = document.getElementById('wishlistCount');
    if (el) el.textContent = list.length;
  }

  // Expose globally
  window.addToCart      = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateCartQty  = updateQty;
  window.getCart        = getCart;
  window.addToWishlist  = addToWishlist;

  document.addEventListener('DOMContentLoaded', () => {
    updateCartUI(getCart());
    // Fix checkout link in sidebar
    const checkoutBtn = document.querySelector('.cart-actions .btn-outline');
    if (checkoutBtn) checkoutBtn.href = 'checkout.html';
  });

})();
