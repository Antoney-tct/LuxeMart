document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutItemsEl = document.getElementById('checkoutItems');
    const checkoutTotalEl = document.getElementById('checkoutTotal');
    const checkoutForm = document.getElementById('checkoutForm');
    const discountInput = document.getElementById('discountCode');
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');

    // New elements for payment methods
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    const cardFields = document.getElementById('cardPaymentFields');
    const mpesaFields = document.getElementById('mpesaPaymentFields');

    let total = 0;

    function renderCheckoutItems() {
        // Filter only selected items
        const checkoutCart = cart.filter(item => item.selected !== false);

        if (checkoutCart.length === 0) {
            checkoutItemsEl.innerHTML = '<p>Your cart is empty or no items selected.</p>';
            checkoutTotalEl.textContent = 'KSh 0.00';
            if (clearCartBtn) clearCartBtn.style.display = 'none';
            return;
        }

        total = 0;

        checkoutItemsEl.innerHTML = checkoutCart.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return '';
            const itemTotal = product.price * item.qty;
            total += itemTotal;

            return `
                <div class="summary-item">
                    <img src="${product.img}" alt="${product.name}" class="summary-img">
                    <div class="summary-info">
                        <div style="font-weight: 600; font-size: 0.9rem;">${product.name}</div>
                        <div style="font-size: 0.85rem; color: #666; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                            Qty:
                            <button class="checkout-qty-btn" data-id="${item.id}" data-action="decrease">-</button>
                            <span>${item.qty}</span>
                            <button class="checkout-qty-btn" data-id="${item.id}" data-action="increase">+</button>
                        </div>
                    </div>
                    <div style="font-weight: 600;">KSh ${itemTotal.toFixed(2)}</div>
                </div>
            `;
        }).join('');

        checkoutTotalEl.textContent = `KSh ${total.toFixed(2)}`;
        
        // If discount was previously applied, re-apply visual indication (logic simplified here)
        if (applyDiscountBtn.disabled) {
            // For simplicity in this snippet, we revert discount state on qty change 
            // or you could recalculate it. Let's reset discount to avoid calculation errors.
            applyDiscountBtn.disabled = false;
            discountInput.disabled = false;
            applyDiscountBtn.textContent = 'Apply';
            discountInput.value = '';
        }
    }

    // Initial Render
    renderCheckoutItems();

    // Listen for Quantity Changes in Checkout
    checkoutItemsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.checkout-qty-btn');
        if (!btn) return;

        const id = parseInt(btn.dataset.id, 10);
        const action = btn.dataset.action;
        const item = cart.find(i => i.id === id);

        if (item) {
            if (action === 'increase') {
                item.qty++;
            } else if (action === 'decrease') {
                if (item.qty > 1) {
                    item.qty--;
                } else {
                    // Option: Remove item if qty becomes 0?
                    // For now, let's keep min 1 or verify user wants to remove.
                    if(confirm("Remove this item from checkout?")) {
                        cart = cart.filter(i => i.id !== id);
                    }
                }
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCheckoutItems();
        }
    });

    // Clear Cart Logic
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to clear your cart?')) {
                localStorage.removeItem('cart');
                window.location.reload();
            }
        });
    }

    // Discount Logic
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', () => {
            const code = discountInput.value.trim().toUpperCase();
            let discount = 0;
            
            if (code === 'SAVE10') { 
                discount = total * 0.10;
                alert('10% Discount Applied!');
            } else if (code === 'LUXE20') {
                 discount = total * 0.20;
                 alert('20% Discount Applied!');
            } else {
                alert('Invalid Discount Code');
                return;
            }

            total = total - discount;
            checkoutTotalEl.innerHTML = `KSh ${total.toFixed(2)} <small style="color: green; display: block; font-size: 0.8rem;">(Discount applied)</small>`;
            applyDiscountBtn.disabled = true;
            discountInput.disabled = true;
            applyDiscountBtn.textContent = 'Applied';
        });
    }

    // Event listener for payment method change
    paymentMethodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // First, hide all payment-specific fields
            cardFields.style.display = 'none';
            mpesaFields.style.display = 'none';

            // Then, show the correct one based on the selected value
            if (e.target.value === 'mpesa') {
                mpesaFields.style.display = 'block';
            } else if (e.target.value === 'card') {
                cardFields.style.display = 'block';
            }
        });
    });

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

            // Capture Customer Details
            const customerInfo = {
                name: document.getElementById('billingName').value,
                email: document.getElementById('billingEmail').value,
                address: document.getElementById('billingAddress').value,
                city: document.getElementById('billingCity').value,
                zip: document.getElementById('billingZip').value
            };

            // Create Order Object
            const order = {
                id: 'ORD-' + Date.now().toString().slice(-6),
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                total: total,
                status: 'Processing',
                items: cart.filter(item => item.selected !== false), // Save snapshot of items
                customer: customerInfo,
                paymentMethod: selectedPaymentMethod
            };

            finalizeOrder(order);
        }
    });

    const finalizeOrder = async (order) => {
        try {
            // Save to Database via API
            const response = await fetch('api/orders/create.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            const result = await response.json();

            if (!result.success) throw new Error(result.message);

            if (order.paymentMethod === 'mpesa') {
                const phone = document.getElementById('mpesaPhone').value;
                handleMpesaFlow(phone, order.total, result.order_db_id);
            } else {
                // Clear Cart and Redirect
                localStorage.removeItem('cart');
                window.location.href = 'orders.html?new=true';
            }
        } catch (error) {
            if (window.showToast) window.showToast('Error saving order: ' + error.message, 'error');
        }
    };

    const handleMpesaFlow = async (phone, amount, orderDbId) => {
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        try {
            // 1. Set Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Awaiting PIN Entry...';
            
            if (window.showToast) {
                window.showToast(`Requesting STK Push for ${phone}...`, 'info');
            }

            // 2. Call the PHP Backend
            const response = await fetch('api/mpesa/stk_push.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, amount, order_id: orderDbId })
            });
            const data = await response.json();

            if (data.ResponseCode !== "0") throw new Error(data.CustomerMessage || 'STK Push failed');

            if (window.showToast) window.showToast('STK Push sent! Please enter your PIN on your phone.', 'success');
            
            localStorage.removeItem('cart');
            setTimeout(() => { window.location.href = 'orders.html?new=true'; }, 3000);

        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            if (window.showToast) window.showToast('Payment failed or timed out. Please try again.', 'error');
        }
    };

    const handlePaypalFlow = (order) => {
        if (window.showToast) window.showToast('Redirecting to PayPal...', 'info');

        setTimeout(() => {
            if (window.showToast) window.showToast('PayPal payment authorized!', 'success');
            finalizeOrder(order);
        }, 3000);
    };

    const validateForm = () => {
        let isValid = true;
        const billingInputs = checkoutForm.querySelectorAll('.checkout-form input[required]');
        
        // Clear previous errors
        checkoutForm.querySelectorAll('.error-message').forEach(el => el.remove());
        checkoutForm.querySelectorAll('input').forEach(input => input.style.borderColor = '');

        // Basic required field validation
        billingInputs.forEach(input => {
            if (!input.value.trim()) {
                showError(input, 'This field is required');
                isValid = false;
            }
        });

        // Email validation for billing
        const emailInput = checkoutForm.querySelector('input[type="email"]');
        if (emailInput && emailInput.value.trim() && !isValidEmail(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Payment-specific validation
        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        if (selectedPaymentMethod === 'mpesa') {
            const mpesaPhone = document.getElementById('mpesaPhone');
            if (!isValidMpesaPhone(mpesaPhone.value)) {
                showError(mpesaPhone, 'Please enter a valid Kenyan phone number (e.g., 0712345678)');
                isValid = false;
            }
        } else if (selectedPaymentMethod === 'card') {
            // Basic card validation
            const cardInputs = cardFields.querySelectorAll('input');
            cardInputs.forEach(input => {
                if (!input.value.trim()) {
                    showError(input, 'This field is required for card payment');
                    isValid = false;
                }
            });
        }
        // No extra validation needed for PayPal as billing info is already checked

        return isValid;
    };

    const isValidMpesaPhone = (phone) => {
        // Validates formats like 2547... or 07... or 2541... or 01...
        return /^(254[71]\d{8}|0[71]\d{8})$/.test(phone.trim());
    };

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const showError = (input, message) => {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.style.color = '#ef4444';
        error.style.fontSize = '0.85rem';
        error.style.marginTop = '0.25rem';
        error.textContent = message;
        
        input.style.borderColor = '#ef4444';
        input.parentNode.appendChild(error);
    };
});