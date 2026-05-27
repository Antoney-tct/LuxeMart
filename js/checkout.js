/**
 * LuxeMart — checkout.js
 * Handles the checkout page: cart summary, form validation,
 * discount codes, order submission, M-Pesa STK Push + polling.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // ── STATE ─────────────────────────────────────────────────
    let cartItems     = [];
    let subtotal      = 0;
    let discountAmt   = 0;
    let shippingCost  = 0;
    let activeMethod  = 'card';
    let promoApplied  = false;

    const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    // ── LOAD CART ─────────────────────────────────────────────
    async function loadCart () {
        if (typeof window.fetchCart === 'function') {
            cartItems = await window.fetchCart();
        } else {
            cartItems = window.getCart?.() || [];
        }

        renderSummaryItems();
        updateTotals();

        // Disable checkout if cart is empty
        if (!cartItems.length) {
            document.getElementById('placeOrderBtn').disabled = true;
        }
    }

    // ── SUMMARY ITEMS ─────────────────────────────────────────
    function renderSummaryItems () {
        const el = document.getElementById('summaryItems');
        if (!el) return;

        if (!cartItems.length) {
            el.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--muted);">
                    <i class="fas fa-shopping-bag" style="font-size:2rem;opacity:0.2;display:block;margin-bottom:0.75rem;"></i>
                    <p style="font-weight:600;">Your cart is empty</p>
                    <a href="shop.html" style="color:var(--secondary);font-weight:600;font-size:0.875rem;">Browse Products →</a>
                </div>`;
            return;
        }

        el.innerHTML = cartItems.map(item => `
            <div class="summary-item">
                <div class="summary-img-wrap">
                    <img src="${item.img}" alt="${item.name}" class="summary-img"
                         onerror="this.src='https://via.placeholder.com/56?text=?'">
                    <span class="summary-qty-badge">${item.qty}</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="summary-item-name">${item.name}</div>
                    <div class="summary-item-brand">${item.brand || ''}</div>
                </div>
                <div class="summary-item-price">${fmt(item.price * item.qty)}</div>
            </div>
        `).join('');
    }

    // ── TOTALS ────────────────────────────────────────────────
    function updateTotals () {
        subtotal = cartItems.reduce((s, i) => s + (i.price * i.qty), 0);
        const total = Math.max(0, subtotal - discountAmt + shippingCost);

        document.getElementById('totalSubtotal').textContent = fmt(subtotal);
        document.getElementById('totalGrand').textContent    = fmt(total);

        const shipEl = document.getElementById('totalShipping');
        if (shipEl) {
            shipEl.textContent  = shippingCost > 0 ? fmt(shippingCost) : 'Free';
            shipEl.style.color  = shippingCost > 0 ? 'var(--text)' : 'var(--success)';
        }

        if (discountAmt > 0) {
            const row = document.getElementById('discountRow');
            const val = document.getElementById('totalDiscount');
            if (row) row.style.display = 'flex';
            if (val) val.textContent   = `− ${fmt(discountAmt)}`;
        }
    }

    // ── PAYMENT TABS ─────────────────────────────────────────
    document.querySelectorAll('.payment-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.payment-fields').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            activeMethod = tab.dataset.method;
            document.getElementById(`fields-${activeMethod}`)?.classList.add('active');
        });
    });

    // ── SHIPPING METHOD ───────────────────────────────────────
    document.querySelectorAll('input[name="shippingMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            shippingCost = radio.value === 'express' ? 650 : 0;
            updateTotals();

            // Border highlight
            document.querySelectorAll('input[name="shippingMethod"]').forEach(r => {
                const label = r.closest('label');
                if (label) label.style.borderColor = r.checked ? 'var(--secondary)' : 'var(--border)';
            });
        });
    });

    // ── CARD FORMATTING ───────────────────────────────────────
    document.getElementById('cardNumber')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16)
            .replace(/(.{4})/g, '$1 ').trim();
    });

    document.getElementById('cardExpiry')?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 4);
        if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
        e.target.value = v;
    });

    document.getElementById('cardCvv')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });

    // ── PRE-FILL USER INFO ────────────────────────────────────
    const user = window.getUser?.();
    if (user) {
        const nameEl  = document.getElementById('billingName');
        const emailEl = document.getElementById('billingEmail');
        if (nameEl  && !nameEl.value)  nameEl.value  = user.name  || '';
        if (emailEl && !emailEl.value) emailEl.value = user.email || '';

        const greet = document.getElementById('userGreeting');
        if (greet) greet.textContent = `👋 Hi, ${user.name?.split(' ')[0]}`;
    }

    // ── DISCOUNT CODE ─────────────────────────────────────────
    document.getElementById('applyDiscountBtn')?.addEventListener('click', applyDiscount);
    document.getElementById('discountCode')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyDiscount();
    });

    async function applyDiscount () {
        if (promoApplied) return;

        const input = document.getElementById('discountCode');
        const btn   = document.getElementById('applyDiscountBtn');
        const code  = input?.value.trim().toUpperCase();

        if (!code) { window.showToast?.('Enter a discount code first.', 'info'); return; }

        btn.disabled    = true;
        btn.textContent = '...';

        const result = await window.api?.('api/discount/check.php', {
            method: 'POST',
            body: JSON.stringify({ code, order_total: subtotal }),
        });

        if (!result?.success) {
            window.showToast?.(result?.message || 'Invalid code.', 'error');
            btn.disabled    = false;
            btn.textContent = 'Apply';
            return;
        }

        discountAmt  = result.amount_off;
        promoApplied = true;
        updateTotals();

        window.showToast?.(`"${code}" applied — ${fmt(discountAmt)} off!`, 'success');

        if (input) input.disabled    = true;
        btn.disabled    = true;
        btn.textContent = '✓ Applied';
        btn.style.background = 'var(--success)';
    }

    // ── VALIDATION ────────────────────────────────────────────
    function validate () {
        // Clear previous errors
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

        let valid = true;

        const required = [
            ['billingName',    'Full name is required.'],
            ['billingEmail',   'Email address is required.'],
            ['billingAddress', 'Street address is required.'],
            ['billingCity',    'City is required.'],
            ['billingZip',     'ZIP / postal code is required.'],
        ];

        required.forEach(([id, msg]) => {
            const el = document.getElementById(id);
            if (!el?.value.trim()) { markError(el, msg); valid = false; }
        });

        const emailEl = document.getElementById('billingEmail');
        if (emailEl?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
            markError(emailEl, 'Enter a valid email address.');
            valid = false;
        }

        if (activeMethod === 'card') {
            [
                ['cardNumber', 'Card number is required.'],
                ['cardName',   'Cardholder name is required.'],
                ['cardExpiry', 'Expiry date is required.'],
                ['cardCvv',    'CVV is required.'],
            ].forEach(([id, msg]) => {
                const el = document.getElementById(id);
                if (!el?.value.trim()) { markError(el, msg); valid = false; }
            });
        }

        if (activeMethod === 'mpesa') {
            const phone = document.getElementById('mpesaPhone');
            if (!phone?.value.trim()) {
                markError(phone, 'Phone number is required.'); valid = false;
            } else if (!/^(254[71]\d{8}|0[71]\d{8})$/.test(phone.value.trim())) {
                markError(phone, 'Enter a valid Kenyan number e.g. 0712345678.'); valid = false;
            }
        }

        if (!valid) {
            document.querySelector('.form-control.error')?.scrollIntoView({ behavior:'smooth', block:'center' });
        }

        return valid;
    }

    function markError (el, msg) {
        if (!el) return;
        el.classList.add('error');
        const err = document.createElement('div');
        err.className = 'field-error';
        err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
        el.parentNode?.appendChild(err);
        el.addEventListener('input', () => { el.classList.remove('error'); err.remove(); }, { once: true });
    }

    // ── PLACE ORDER ───────────────────────────────────────────
    document.getElementById('placeOrderBtn')?.addEventListener('click', placeOrder);

    async function placeOrder () {
        if (!cartItems.length) {
            window.showToast?.('Your cart is empty.', 'info');
            return;
        }

        if (!validate()) return;

        const btn = document.getElementById('placeOrderBtn');
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const shipping = document.querySelector('input[name="shippingMethod"]:checked')?.value || 'standard';

        const payload = {
            customer: {
                name:    document.getElementById('billingName').value.trim(),
                email:   document.getElementById('billingEmail').value.trim(),
                phone:   document.getElementById('billingPhone')?.value.trim() || null,
                address: document.getElementById('billingAddress').value.trim(),
                city:    document.getElementById('billingCity').value.trim(),
                zip:     document.getElementById('billingZip').value.trim(),
                country: document.getElementById('billingCountry')?.value || 'Kenya',
            },
            items:           cartItems.map(i => ({ id: i.product_id, qty: i.qty })),
            shipping_method: shipping,
            payment_method:  activeMethod,
            discount_amount: discountAmt,
            notes:           document.getElementById('orderNotes')?.value.trim() || '',
            total:           Math.max(0, subtotal - discountAmt + shippingCost),
        };

        const result = await window.api?.('api/orders/create.php', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!result?.success) {
            window.showToast?.(result?.message || 'Order failed. Please try again.', 'error');
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-lock"></i> Place Order Securely';
            return;
        }

        if (activeMethod === 'mpesa') {
            await handleMpesa(result.order_db_id, result.order_number);
        } else {
            await window.clearCart?.();
            showSuccess(result.order_number);
        }
    }

    // ── M-PESA FLOW ───────────────────────────────────────────
    async function handleMpesa (orderId, orderNumber) {
        const btn   = document.getElementById('placeOrderBtn');
        const phone = document.getElementById('mpesaPhone')?.value.trim();

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Awaiting M-Pesa PIN...';
        window.showToast?.('STK Push sent. Enter your M-Pesa PIN.', 'info');

        const pushRes = await window.api?.('api/mpesa/stk_push.php', {
            method: 'POST',
            body: JSON.stringify({
                phone,
                amount:   Math.ceil(subtotal - discountAmt + shippingCost),
                order_id: orderId,
            }),
        });

        if (pushRes?.ResponseCode !== '0') {
            window.showToast?.(pushRes?.CustomerMessage || 'M-Pesa request failed. Try again.', 'error');
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-lock"></i> Place Order Securely';
            return;
        }

        // Poll every 5 seconds, up to 12 attempts (60 seconds total)
        let attempts = 0;
        const poll   = setInterval(async () => {
            attempts++;
            const status = await window.api?.(`api/mpesa/check_status.php?order_id=${orderId}`);

            if (status?.status === 'Processing') {
                // Still waiting for PIN
                if (attempts >= 12) {
                    clearInterval(poll);
                    window.showToast?.('Payment timed out. Check your orders.', 'error');
                    btn.disabled  = false;
                    btn.innerHTML = '<i class="fas fa-lock"></i> Place Order Securely';
                }
                return;
            }

            clearInterval(poll);

            if (status?.status === 'Shipped' || status?.status === 'Delivered' ||
                (status?.status !== 'Cancelled')) {
                // Anything other than cancelled means paid
                await window.clearCart?.();
                showSuccess(orderNumber);
            } else {
                window.showToast?.('Payment cancelled. Please try again.', 'error');
                btn.disabled  = false;
                btn.innerHTML = '<i class="fas fa-lock"></i> Place Order Securely';
            }
        }, 5000);
    }

    // ── SUCCESS OVERLAY ───────────────────────────────────────
    function showSuccess (orderNumber) {
        document.getElementById('successOrderNum').textContent = `#${orderNumber}`;
        document.getElementById('successOverlay')?.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Auto redirect after 8 seconds
        setTimeout(() => {
            window.location.href = `orders.html?new=${orderNumber}`;
        }, 8000);
    }

    // ── INIT ──────────────────────────────────────────────────
    await loadCart();
});
