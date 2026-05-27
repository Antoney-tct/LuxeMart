/**
 * LuxeMart — cart.js
 * All cart operations go through api/cart/index.php.
 * Falls back to localStorage for guests.
 */

'use strict';

(function () {

    // ── STATE ─────────────────────────────────────────────────
    let _cartItems = [];   // [{ product_id, name, brand, price, img, qty, stock }]

    // ── HELPERS ───────────────────────────────────────────────
    const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    function isLoggedIn () {
        return typeof window.getUser === 'function' && window.getUser() !== null;
    }

    // ── GUEST STORAGE (localStorage fallback) ─────────────────
    function guestGet () {
        try { return JSON.parse(localStorage.getItem('luxemart_guest_cart') || '[]'); }
        catch { return []; }
    }

    function guestSave (cart) {
        localStorage.setItem('luxemart_guest_cart', JSON.stringify(cart));
    }

    // ── FETCH CART FROM SERVER ────────────────────────────────
    window.fetchCart = async function () {
        if (isLoggedIn()) {
            const result = await window.api('api/cart/index.php');
            _cartItems   = result?.cart || [];
        } else {
            // Map guest cart IDs to full product data from products.js
            const guest = guestGet();
            _cartItems  = guest.map(g => {
                const p = (window.products || []).find(x => x.id === g.product_id);
                if (!p) return null;
                return {
                    product_id: p.id,
                    name:  p.name,
                    brand: p.brand,
                    price: p.price,
                    img:   p.img,
                    stock: p.stock ?? 99,
                    qty:   g.qty,
                };
            }).filter(Boolean);
        }

        renderCartSidebar();
        updateBadges();
        return _cartItems;
    };

    // ── ADD TO CART ───────────────────────────────────────────
    window.addToCart = async function (product, qty = 1) {
        const pid = product.id ?? product.product_id;

        if (isLoggedIn()) {
            const result = await window.api('api/cart/index.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'add', product_id: pid, qty }),
            });

            if (!result?.success) {
                window.showToast?.(result?.message || 'Could not add to cart.', 'error');
                return false;
            }
        } else {
            // Guest cart
            const guest = guestGet();
            const idx   = guest.findIndex(i => i.product_id === pid);

            if (idx > -1) {
                guest[idx].qty = Math.min(guest[idx].qty + qty, product.stock ?? 99);
            } else {
                guest.push({ product_id: pid, qty });
            }
            guestSave(guest);
        }

        await window.fetchCart();
        return true;
    };

    // ── UPDATE QTY (+1 / -1) ─────────────────────────────────
    window.updateCartQty = async function (productId, delta) {
        const pid     = parseInt(productId, 10);
        const current = _cartItems.find(i => i.product_id === pid);
        if (!current) return;

        const newQty = Math.max(0, current.qty + delta);

        if (isLoggedIn()) {
            if (newQty === 0) {
                await window.api('api/cart/index.php', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'remove', product_id: pid }),
                });
            } else {
                await window.api('api/cart/index.php', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'set', product_id: pid, qty: newQty }),
                });
            }
        } else {
            const guest = guestGet();
            const idx   = guest.findIndex(i => i.product_id === pid);
            if (idx > -1) {
                if (newQty === 0) guest.splice(idx, 1);
                else guest[idx].qty = newQty;
                guestSave(guest);
            }
        }

        await window.fetchCart();
    };

    // ── REMOVE ITEM ───────────────────────────────────────────
    window.removeFromCart = async function (productId) {
        const pid = parseInt(productId, 10);

        if (isLoggedIn()) {
            await window.api('api/cart/index.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'remove', product_id: pid }),
            });
        } else {
            const guest = guestGet().filter(i => i.product_id !== pid);
            guestSave(guest);
        }

        await window.fetchCart();
    };

    // ── CLEAR CART ────────────────────────────────────────────
    window.clearCart = async function () {
        if (isLoggedIn()) {
            await window.api('api/cart/index.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'clear' }),
            });
        } else {
            guestSave([]);
        }

        _cartItems = [];
        renderCartSidebar();
        updateBadges();
    };

    // ── GETTER ────────────────────────────────────────────────
    window.getCart = () => _cartItems;

    // ── UPDATE COUNT BADGES ───────────────────────────────────
    function updateBadges () {
        const count = _cartItems.reduce((s, i) => s + i.qty, 0);
        document.querySelectorAll('#cartCount, #mobileCartCount, .nav-badge[data-cart]').forEach(el => {
            el.textContent = count;
        });
        // Also update any element with the cart count specifically
        document.querySelectorAll('#cartCount').forEach(el => el.textContent = count);
    }

    // ── RENDER SIDEBAR ────────────────────────────────────────
    window.renderCartSidebar = function () {
        const itemsEl = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        if (!itemsEl) return;

        const total = _cartItems.reduce((s, i) => s + (i.price * i.qty), 0);
        if (totalEl) totalEl.textContent = fmt(total);

        if (!_cartItems.length) {
            itemsEl.innerHTML = `
                <div style="text-align:center;padding:2.5rem 1rem;color:var(--muted);">
                    <i class="fas fa-shopping-bag" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:1rem;"></i>
                    <p style="font-weight:600;margin-bottom:0.5rem;">Your cart is empty</p>
                    <a href="shop.html" style="color:var(--secondary);font-size:0.875rem;font-weight:600;">Browse Products →</a>
                </div>`;
            return;
        }

        itemsEl.innerHTML = _cartItems.map(item => `
            <div class="cart-item" data-id="${item.product_id}" style="display:flex;gap:0.875rem;padding:0.875rem 0;border-bottom:1px solid var(--border);align-items:flex-start;">
                <a href="product.html?id=${item.product_id}">
                    <img src="${item.img}" alt="${item.name}"
                         style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0;"
                         onerror="this.src='https://via.placeholder.com/60?text=?'">
                </a>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.875rem;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                    <div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.5rem;">${item.brand || ''}</div>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <button class="cart-qty-btn cart-dec" data-id="${item.product_id}"
                                style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;color:var(--text);">−</button>
                        <span style="font-weight:700;font-size:0.875rem;min-width:20px;text-align:center;">${item.qty}</span>
                        <button class="cart-qty-btn cart-inc" data-id="${item.product_id}"
                                style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;color:var(--text);" ${item.qty >= item.stock ? 'disabled' : ''}>+</button>
                        <span style="margin-left:auto;font-weight:700;font-size:0.875rem;">${fmt(item.price * item.qty)}</span>
                    </div>
                </div>
                <button class="cart-remove-btn" data-id="${item.product_id}"
                        style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px;flex-shrink:0;"
                        title="Remove item">
                    <i class="fas fa-times" style="font-size:0.8rem;"></i>
                </button>
            </div>
        `).join('');

        // Bind qty buttons
        itemsEl.querySelectorAll('.cart-dec').forEach(btn => {
            btn.addEventListener('click', () => window.updateCartQty(btn.dataset.id, -1));
        });
        itemsEl.querySelectorAll('.cart-inc').forEach(btn => {
            btn.addEventListener('click', () => window.updateCartQty(btn.dataset.id, 1));
        });
        itemsEl.querySelectorAll('.cart-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => window.removeFromCart(btn.dataset.id));
        });
    };

    // ── GLOBAL ADD-TO-CART DELEGATION ────────────────────────
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.add-to-cart');
        if (!btn) return;

        e.preventDefault();
        const pid = parseInt(btn.dataset.id, 10);
        if (!pid) return;

        // Find product from window.products or cart
        let product = (window.products || []).find(p => p.id === pid);

        if (!product) {
            // Try fetching from API
            const res = await window.api(`api/products/single.php?id=${pid}`);
            if (res?.success) product = res.product;
        }

        if (!product) {
            window.showToast?.('Product not found.', 'error');
            return;
        }

        const ok = await window.addToCart(product, 1);
        if (ok) {
            window.showToast?.(`${product.name} added to cart!`, 'success');

            // Animate button briefly
            const original = btn.innerHTML;
            btn.innerHTML  = '<i class="fas fa-check"></i> Added!';
            btn.disabled   = true;
            setTimeout(() => {
                btn.innerHTML = original;
                btn.disabled  = false;
            }, 1500);

            // Open sidebar
            document.getElementById('cartSidebar')?.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    });

    // ── MERGE GUEST CART AFTER LOGIN ─────────────────────────
    // Called after successful Google sign-in
    window.mergeGuestCart = async function () {
        const guest = guestGet();
        if (!guest.length) return;

        for (const item of guest) {
            await window.api('api/cart/index.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'add', product_id: item.product_id, qty: item.qty }),
            });
        }

        guestSave([]);
        await window.fetchCart();
    };

    // ── INIT ──────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        await window.fetchCart();

        // Cart sidebar close button
        document.getElementById('closeCart')?.addEventListener('click', () => {
            document.getElementById('cartSidebar')?.classList.remove('open');
            document.body.style.overflow = '';
        });

        // Checkout links in sidebar
        const checkoutBtns = document.querySelectorAll('.cart-actions a[href*="checkout"]');
        checkoutBtns.forEach(btn => { btn.href = 'checkout.html'; });
    });

})();
