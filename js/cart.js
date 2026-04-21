// ============================================================
//  LuxeMart — cart.js (FULL REWRITE)
//  All cart data lives in the database via api/cart/
//  No localStorage for cart data
// ============================================================

(function () {
    'use strict';

    // ── STATE ──────────────────────────────────────────────
    // Single source of truth — populated from server
    let cartItems = [];

    // ── HELPERS ────────────────────────────────────────────
    const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    // ── FETCH CART FROM SERVER ─────────────────────────────
    const fetchCart = async () => {
        const result = await window.api('api/cart/get.php');
        if (result.success) {
            cartItems = result.cart;
            renderCartSidebar(cartItems);
            syncCartCount(cartItems);
        }
        return cartItems;
    };

    // ── ADD TO CART ────────────────────────────────────────
    const addToCart = async (product, qty = 1) => {
        // Must be logged in
        const user = window.getUser ? window.getUser() : null;
        if (!user) {
            window.showToast('Please log in to add items to your cart.', 'info');
            document.getElementById('loginModal')?.classList.add('show');
            return;
        }

        // Optimistic UI — add immediately then confirm with server
        const existing = cartItems.find(i => i.product_id === product.id);
        if (existing) {
            existing.qty += qty;
        } else {
            cartItems.push({
                product_id: product.id,
                name:       product.name,
                price:      product.price,
                img:        product.img,
                brand:      product.brand || '',
                stock:      product.stock ?? 99,
                qty,
            });
        }
        renderCartSidebar(cartItems);
        syncCartCount(cartItems);

        const result = await window.api('api/cart/update.php', {
            method: 'POST',
            body: JSON.stringify({
                action:     'add',
                product_id: product.id,
                qty,
            }),
        });

        if (!result.success) {
            window.showToast('Could not add item — please try again.', 'error');
            await fetchCart(); // Revert to server state
            return;
        }

        window.showToast(`${product.name} added to cart!`, 'success');

        // Open sidebar
        document.getElementById('cartSidebar')?.classList.add('open');
    };

    // ── REMOVE FROM CART ───────────────────────────────────
    const removeFromCart = async (productId) => {
        // Optimistic removal
        cartItems = cartItems.filter(i => i.product_id !== productId);
        renderCartSidebar(cartItems);
        syncCartCount(cartItems);

        const result = await window.api('api/cart/update.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'remove', product_id: productId }),
        });

        if (!result.success) {
            window.showToast('Could not remove item.', 'error');
            await fetchCart();
        }
    };

    // ── UPDATE QTY ─────────────────────────────────────────
    const updateQty = async (productId, delta) => {
        const item = cartItems.find(i => i.product_id === productId);
        if (!item) return;

        const newQty = item.qty + delta;

        if (newQty <= 0) {
            return removeFromCart(productId);
        }

        // Enforce stock limit
        if (newQty > item.stock) {
            window.showToast(`Only ${item.stock} in stock.`, 'info');
            return;
        }

        // Optimistic update
        item.qty = newQty;
        renderCartSidebar(cartItems);
        syncCartCount(cartItems);

        const result = await window.api('api/cart/update.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'set', product_id: productId, qty: newQty }),
        });

        if (!result.success) {
            window.showToast('Could not update quantity.', 'error');
            await fetchCart();
        }
    };

    // ── CLEAR CART ─────────────────────────────────────────
    const clearCart = async () => {
        cartItems = [];
        renderCartSidebar(cartItems);
        syncCartCount(cartItems);

        await window.api('api/cart/update.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'clear' }),
        });
    };

    // ── SYNC COUNT BADGES ──────────────────────────────────
    const syncCartCount = (items) => {
        const count = items.reduce((sum, i) => sum + i.qty, 0);
        document.querySelectorAll('#cartCount, #mobileCartCount').forEach(el => {
            el.textContent = count;
        });
    };

    // ── RENDER SIDEBAR ─────────────────────────────────────
    const renderCartSidebar = (items) => {
        const cartItemsEl = document.getElementById('cartItems');
        const cartTotalEl = document.getElementById('cartTotal');
        if (!cartItemsEl) return;

        const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
        if (cartTotalEl) cartTotalEl.textContent = fmt(total);

        if (!items.length) {
            cartItemsEl.innerHTML = `
                <div style="text-align:center;padding:3rem 1rem;color:var(--light-text);">
                    <i class="fas fa-shopping-bag" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.3;"></i>
                    <p style="margin-bottom:1.5rem;">Your cart is empty</p>
                    <a href="shop.html" class="btn-primary" style="display:inline-flex;">Start Shopping</a>
                </div>`;
            return;
        }

        cartItemsEl.innerHTML = items.map(item => `
            <div class="cart-item" data-id="${item.product_id}">
                <img src="${item.img}" alt="${item.name}" class="cart-item-img"
                     onerror="this.src='https://via.placeholder.com/70x70?text=No+Image'">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div style="font-size:0.8rem;color:var(--light-text);margin-bottom:0.4rem;">${item.brand}</div>
                    <div class="cart-item-price">${fmt(item.price)}</div>
                    <div class="cart-item-qty" style="margin-top:0.5rem;">
                        <button class="qty-btn cart-decrease" data-id="${item.product_id}" aria-label="Decrease">-</button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="qty-btn cart-increase" data-id="${item.product_id}" aria-label="Increase">+</button>
                        <span style="font-size:0.8rem;color:var(--light-text);margin-left:0.5rem;">
                            = ${fmt(item.price * item.qty)}
                        </span>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${item.product_id}" aria-label="Remove item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');

        // Attach sidebar button events
        cartItemsEl.querySelectorAll('.cart-increase').forEach(btn => {
            btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), 1));
        });
        cartItemsEl.querySelectorAll('.cart-decrease').forEach(btn => {
            btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), -1));
        });
        cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
        });
    };

    // ── GLOBAL ADD TO CART DELEGATION ─────────────────────
    // Catches all .add-to-cart clicks anywhere on the page
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.add-to-cart, .btn-add-cart');
        if (!btn) return;

        e.preventDefault();

        const productId = parseInt(btn.dataset.id);
        if (!productId) return;

        // Get product from window.products (loaded by products.js)
        // or from a data attribute if available
        let product = null;
        if (window.products) {
            product = window.products.find(p => p.id === productId);
        }

        // Fallback: fetch from API if not in memory
        if (!product) {
            const result = await window.api(`api/products/single.php?id=${productId}`);
            if (result.success) product = result.product;
        }

        if (!product) {
            window.showToast('Could not add item. Please refresh.', 'error');
            return;
        }

        // Visual feedback on button
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Added';
        btn.disabled  = true;
        setTimeout(() => {
            btn.innerHTML  = originalText;
            btn.disabled   = false;
        }, 1500);

        await addToCart(product, 1);
    });

    // ── GET CART (for checkout page) ───────────────────────
    const getCart = () => cartItems;

    // ── EXPOSE GLOBALLY ────────────────────────────────────
    window.addToCart         = addToCart;
    window.removeFromCart    = removeFromCart;
    window.updateCartQty     = updateQty;
    window.clearCart         = clearCart;
    window.getCart           = getCart;
    window.fetchCart         = fetchCart;
    window.renderCartSidebar = renderCartSidebar;

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Only fetch if user is logged in
        // verifySession in common.js calls updateCartCount which calls fetchCart
        // But we fetch here too so the sidebar is ready immediately
        const user = window.getUser ? window.getUser() : null;
        if (user) fetchCart();
    });

})();