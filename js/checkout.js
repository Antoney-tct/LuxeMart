// ============================================================
//  LuxeMart — checkout.js (FULL REWRITE)
//  Reads cart from server via getCart()
//  Submits order to api/orders/create.php
//  M-Pesa STK push via api/mpesa/stk_push.php
// ============================================================

(function () {
    'use strict';

    // ── DOM REFS ───────────────────────────────────────────
    const checkoutForm    = document.getElementById('checkoutForm');
    const checkoutItemsEl = document.getElementById('checkoutItems');
    const checkoutTotalEl = document.getElementById('checkoutTotal');
    const discountInput   = document.getElementById('discountCode');
    const applyDiscountBtn= document.getElementById('applyDiscountBtn');
    const clearCartBtn    = document.getElementById('clearCartBtn');
    const paymentRadios   = document.querySelectorAll('input[name="paymentMethod"]');
    const cardFields      = document.getElementById('cardPaymentFields');
    const mpesaFields     = document.getElementById('mpesaPaymentFields');
    const submitBtn       = checkoutForm?.querySelector('button[type="submit"]');

    // ── STATE ──────────────────────────────────────────────
    let cartItems       = [];
    let subtotal        = 0;
    let discountAmount  = 0;
    let total           = 0;
    let appliedCode     = null;

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        // Redirect if not logged in
        const user = window.getUser ? window.getUser() : null;
        if (!user) {
            window.showToast('Please log in to checkout.', 'info');
            setTimeout(() => window.location.href = 'index.html', 1200);
            return;
        }

        // Pre-fill billing fields from user session
        const nameEl  = document.getElementById('billingName');
        const emailEl = document.getElementById('billingEmail');
        if (nameEl  && user.name)  nameEl.value  = user.name;
        if (emailEl && user.email) emailEl.value = user.email;

        // Load cart from server
        await loadCart();

        // Payment method toggle
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', handlePaymentToggle);
        });

        // Set initial payment field visibility
        handlePaymentToggle();

        // Discount
        applyDiscountBtn?.addEventListener('click', handleDiscount);
        discountInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleDiscount(); }
        });

        // Clear cart
        clearCartBtn?.addEventListener('click', handleClearCart);

        // Form submit
        checkoutForm?.addEventListener('submit', handleSubmit);
    });

    // ── LOAD CART ──────────────────────────────────────────
    const loadCart = async () => {
        // fetchCart is defined in cart.js and returns the server cart
        if (typeof window.fetchCart === 'function') {
            cartItems = await window.fetchCart();
        } else {
            cartItems = window.getCart ? window.getCart() : [];
        }

        if (!cartItems.length) {
            renderEmptyCart();
            return;
        }

        renderOrderSummary();
    };

    // ── RENDER EMPTY STATE ─────────────────────────────────
    const renderEmptyCart = () => {
        if (checkoutItemsEl) {
            checkoutItemsEl.innerHTML = `
                <div style="text-align:center;padding:2rem 0;color:var(--light-text);">
                    <i class="fas fa-shopping-bag" style="font-size:2.5rem;display:block;margin-bottom:1rem;opacity:0.3;"></i>
                    <p>Your cart is empty.</p>
                    <a href="shop.html" class="btn-primary" style="display:inline-flex;margin-top:1rem;">
                        Continue Shopping
                    </a>
                </div>`;
        }
        if (checkoutTotalEl) checkoutTotalEl.textContent = 'KSh 0.00';
        if (submitBtn)       submitBtn.disabled = true;
        if (clearCartBtn)    clearCartBtn.style.display = 'none';
    };

    // ── RENDER ORDER SUMMARY ───────────────────────────────
    const renderOrderSummary = () => {
        if (!checkoutItemsEl) return;

        subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        recalcTotal();

        checkoutItemsEl.innerHTML = cartItems.map(item => `
            <div class="summary-item">
                <img src="${item.img}"
                     alt="${item.name}"
                     class="summary-img"
                     onerror="this.src='https://via.placeholder.com/60x60?text=?'">
                <div class="summary-info">
                    <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.2rem;">
                        ${item.name}
                    </div>
                    <div style="font-size:0.82rem;color:var(--light-text);">
                        ${item.brand || ''}
                    </div>
                    <div style="font-size:0.85rem;margin-top:0.3rem;display:flex;align-items:center;gap:0.5rem;">
                        <button class="checkout-qty-btn" data-id="${item.product_id}" data-action="decrease"
                                style="width:22px;height:22px;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;font-size:0.9rem;">
                            −
                        </button>
                        <span style="font-weight:500;">${item.qty}</span>
                        <button class="checkout-qty-btn" data-id="${item.product_id}" data-action="increase"
                                style="width:22px;height:22px;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;font-size:0.9rem;">
                            +
                        </button>
                    </div>
                </div>
                <div style="font-weight:600;white-space:nowrap;font-size:0.95rem;">
                    KSh ${(item.price * item.qty).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
            </div>
        `).join('');

        // Qty buttons in summary
        checkoutItemsEl.querySelectorAll('.checkout-qty-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id     = parseInt(btn.dataset.id);
                const action = btn.dataset.action;
                const delta  = action === 'increase' ? 1 : -1;

                if (typeof window.updateCartQty === 'function') {
                    await window.updateCartQty(id, delta);
                }

                // Refresh cart state after update
                await loadCart();

                // Reset any applied discount
                if (appliedCode) {
                    appliedCode   = null;
                    discountAmount = 0;
                    if (discountInput)    discountInput.value    = '';
                    if (applyDiscountBtn) {
                        applyDiscountBtn.textContent = 'Apply';
                        applyDiscountBtn.disabled    = false;
                    }
                    if (discountInput) discountInput.disabled = false;
                }
            });
        });

        updateTotalsUI();
    };

    // ── TOTAL CALCULATION ──────────────────────────────────
    const recalcTotal = () => {
        total = Math.max(0, subtotal - discountAmount);
    };

    const updateTotalsUI = () => {
        recalcTotal();
        if (!checkoutTotalEl) return;

        if (discountAmount > 0) {
            checkoutTotalEl.innerHTML = `
                <span style="text-decoration:line-through;color:var(--light-text);font-size:0.9rem;margin-right:0.5rem;">
                    KSh ${subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
                KSh ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                <small style="display:block;color:var(--success);font-size:0.8rem;margin-top:0.2rem;">
                    You save KSh ${discountAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </small>`;
        } else {
            checkoutTotalEl.textContent =
                `KSh ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
        }
    };

    // ── PAYMENT TOGGLE ─────────────────────────────────────
    const handlePaymentToggle = () => {
        const selected = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';
        if (cardFields)  cardFields.style.display  = selected === 'card'  ? 'block' : 'none';
        if (mpesaFields) mpesaFields.style.display = selected === 'mpesa' ? 'block' : 'none';
    };

    // ── DISCOUNT CODE ──────────────────────────────────────
    const handleDiscount = async () => {
        const code = discountInput?.value.trim().toUpperCase();
        if (!code) {
            window.showToast('Enter a discount code first.', 'info');
            return;
        }

        applyDiscountBtn.textContent = 'Checking...';
        applyDiscountBtn.disabled    = true;

        const result = await window.api('api/discount/check.php', {
            method: 'POST',
            body: JSON.stringify({ code, order_total: subtotal }),
        });

        if (!result.success) {
            window.showToast(result.message || 'Invalid code.', 'error');
            applyDiscountBtn.textContent = 'Apply';
            applyDiscountBtn.disabled    = false;
            return;
        }

        appliedCode    = code;
        discountAmount = result.amount_off;
        if (discountInput) discountInput.disabled    = true;
        applyDiscountBtn.textContent = '✓ Applied';

        window.showToast(
            `Code "${code}" applied — KSh ${result.amount_off.toLocaleString()} off!`,
            'success'
        );

        updateTotalsUI();
    };

    // ── CLEAR CART ─────────────────────────────────────────
    const handleClearCart = async () => {
        if (!confirm('Clear your entire cart?')) return;
        if (typeof window.clearCart === 'function') await window.clearCart();
        cartItems      = [];
        discountAmount = 0;
        appliedCode    = null;
        renderEmptyCart();
    };

    // ── FORM VALIDATION ────────────────────────────────────
    const validate = () => {
        let valid = true;

        // Clear previous errors
        checkoutForm.querySelectorAll('.field-error').forEach(el => el.remove());
        checkoutForm.querySelectorAll('input.error, select.error').forEach(el => {
            el.classList.remove('error');
        });

        const required = ['billingName', 'billingEmail', 'billingAddress', 'billingCity', 'billingZip'];
        required.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value.trim()) {
                markError(el, 'This field is required.');
                valid = false;
            }
        });

        // Email format
        const emailEl = document.getElementById('billingEmail');
        if (emailEl?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
            markError(emailEl, 'Please enter a valid email address.');
            valid = false;
        }

        const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        if (method === 'card') {
            ['cardNumber', 'cardExpiry', 'cardCvv'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value.trim()) {
                    markError(el, 'Required for card payment.');
                    valid = false;
                }
            });
        }

        if (method === 'mpesa') {
            const phone = document.getElementById('mpesaPhone');
            if (!phone?.value.trim()) {
                markError(phone, 'Enter your M-Pesa phone number.');
                valid = false;
            } else if (!/^(254[71]\d{8}|0[71]\d{8})$/.test(phone.value.trim())) {
                markError(phone, 'Enter a valid Kenyan number e.g. 0712345678.');
                valid = false;
            }
        }

        return valid;
    };

    const markError = (el, msg) => {
        el.classList.add('error');
        el.style.borderColor = '#ef4444';
        const err = document.createElement('div');
        err.className   = 'field-error';
        err.style.cssText = 'color:#ef4444;font-size:0.8rem;margin-top:0.25rem;';
        err.textContent = msg;
        el.parentNode.insertBefore(err, el.nextSibling);

        // Auto-clear on input
        el.addEventListener('input', () => {
            el.classList.remove('error');
            el.style.borderColor = '';
            err.remove();
        }, { once: true });
    };

    // ── FORM SUBMIT ────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!cartItems.length) {
            window.showToast('Your cart is empty.', 'info');
            return;
        }

        if (!validate()) {
            // Scroll to first error
            checkoutForm.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setLoading(true);

        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';

        const orderPayload = {
            customer: {
                name:    document.getElementById('billingName').value.trim(),
                email:   document.getElementById('billingEmail').value.trim(),
                address: document.getElementById('billingAddress').value.trim(),
                city:    document.getElementById('billingCity').value.trim(),
                zip:     document.getElementById('billingZip').value.trim(),
            },
            items:           cartItems.map(i => ({ id: i.product_id, qty: i.qty })),
            total:           total,
            discount_amount: discountAmount,
            paymentMethod,
        };

        // Create order in DB first
        const orderResult = await window.api('api/orders/create.php', {
            method: 'POST',
            body: JSON.stringify(orderPayload),
        });

        if (!orderResult.success) {
            window.showToast(orderResult.message || 'Order failed. Please try again.', 'error');
            setLoading(false);
            return;
        }

        // Handle payment method
        if (paymentMethod === 'mpesa') {
            await handleMpesa(orderResult.order_db_id, orderResult.order_number);
        } else {
            // Card / PayPal — order is already saved, redirect
            window.showToast('Order placed successfully!', 'success');
            setTimeout(() => {
                window.location.href = `orders.html?new=${orderResult.order_number}`;
            }, 1000);
        }
    };

    // ── MPESA FLOW ─────────────────────────────────────────
    const handleMpesa = async (orderDbId, orderNumber) => {
        const phone = document.getElementById('mpesaPhone')?.value.trim();

        window.showToast('Sending M-Pesa prompt to your phone...', 'info');

        const result = await window.api('api/mpesa/stk_push.php', {
            method: 'POST',
            body: JSON.stringify({
                phone,
                amount:   Math.ceil(total),
                order_id: orderDbId,
            }),
        });

        setLoading(false);

        if (result.ResponseCode !== '0') {
            window.showToast(
                result.CustomerMessage || 'M-Pesa request failed. Try again.',
                'error'
            );
            return;
        }

        window.showToast('Please enter your M-Pesa PIN on your phone.', 'success');

        // Poll for payment confirmation
        pollMpesaStatus(orderDbId, orderNumber);
    };

    // ── POLL MPESA STATUS ──────────────────────────────────
    const pollMpesaStatus = (orderDbId, orderNumber) => {
        let attempts = 0;
        const maxAttempts = 12; // 60 seconds total

        const timer = setInterval(async () => {
            attempts++;
            const result = await window.api(`api/mpesa/check_status.php?order_id=${orderDbId}`);

            if (result.status === 'Paid') {
                clearInterval(timer);
                window.showToast('Payment confirmed! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = `orders.html?new=${orderNumber}`;
                }, 1200);
            } else if (result.status === 'Failed' || attempts >= maxAttempts) {
                clearInterval(timer);
                window.showToast(
                    attempts >= maxAttempts
                        ? 'Payment timeout. Check your orders page.'
                        : 'Payment was cancelled.',
                    'error'
                );
                setTimeout(() => {
                    window.location.href = `orders.html?new=${orderNumber}`;
                }, 2000);
            }
        }, 5000);
    };

    // ── LOADING STATE ──────────────────────────────────────
    const setLoading = (loading) => {
        if (!submitBtn) return;
        if (loading) {
            submitBtn.disabled   = true;
            submitBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            submitBtn.disabled   = false;
            submitBtn.innerHTML  = 'Place Order';
        }
    };

})();