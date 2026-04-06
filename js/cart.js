// ============================================================
//  LuxeMart — cart.js
//  Cart management: add, remove, update qty, persist to
//  localStorage, update all cart UI counters & sidebar
// ============================================================

(function () {

  // ── LOAD CART FROM STORAGE ──────────────────────────────
  function getCart() {
    try { return JSON.parse(localStorage.getItem('luxemart_cart') || '[]'); }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem('luxemart_cart', JSON.stringify(cart));
    updateCartUI(cart);
  }

  // ── ADD TO CART ─────────────────────────────────────────
  function addToCart(product, qty = 1) {
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id:    product.id,
        name:  product.name,
        price: product.price,
        img:   product.img,
        brand: product.brand,
        qty:   qty
      });
    }
    saveCart(cart);
  }

  // ── REMOVE FROM CART ────────────────────────────────────
  function removeFromCart(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
  }

  // ── UPDATE QTY ──────────────────────────────────────────
  function updateQty(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) return saveCart(cart.filter(i => i.id !== id));
    saveCart(cart);
  }

  // ── FORMAT CURRENCY ─────────────────────────────────────
  const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  // ── UPDATE ALL UI ────────────────────────────────────────
  function updateCartUI(cart) {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);

    // Update all count badges
    ['cartCount', 'mobileCartCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });

    // Update sidebar
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');

    if (cartTotalEl) cartTotalEl.textContent = fmt(total);

    if (cartItemsEl) {
      if (!cart.length) {
        cartItemsEl.innerHTML = `
          <div class="cart-empty">
            <i class="fas fa-shopping-bag"></i>
            <p>Your cart is empty</p>
            <a href="shop.html" class="btn-primary" style="margin-top:1rem;">Shop Now</a>
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
              <span class="qty-value">${item.qty}</span>
              <button class="qty-btn cart-increase" data-id="${item.id}">+</button>
            </div>
          </div>
          <button class="cart-remove" data-id="${item.id}" title="Remove">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>`).join('');

      // Attach cart sidebar events
      cartItemsEl.querySelectorAll('.cart-increase').forEach(btn => {
        btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), 1));
      });
      cartItemsEl.querySelectorAll('.cart-decrease').forEach(btn => {
        btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), -1));
      });
      cartItemsEl.querySelectorAll('.cart-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
      });
    }
  }

  // ── WISHLIST ─────────────────────────────────────────────
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem('luxemart_wishlist') || '[]'); }
    catch { return []; }
  }

  function addToWishlist(product) {
    const list = getWishlist();
    if (!list.find(i => i.id === product.id)) {
      list.push({ id: product.id, name: product.name, price: product.price, img: product.img, brand: product.brand });
      localStorage.setItem('luxemart_wishlist', JSON.stringify(list));
    }
    // Update wishlist count badge
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) wishlistCount.textContent = list.length;
  }

  function initWishlistCount() {
    const list = getWishlist();
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) wishlistCount.textContent = list.length;
  }

  // ── EXPOSE GLOBALLY ──────────────────────────────────────
  window.addToCart     = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateCartQty = updateQty;
  window.getCart       = getCart;
  window.addToWishlist = addToWishlist;
  window.getWishlist   = getWishlist;

  // ── INIT ON DOM READY ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    updateCartUI(getCart());
    initWishlistCount();

    // Checkout button in sidebar
    const checkoutBtn = document.querySelector('.cart-actions .btn-outline');
    if (checkoutBtn) {
      checkoutBtn.href = 'checkout.html';
    }
  });

})();
