document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
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

    if (cart.length === 0) {
        checkoutItemsEl.innerHTML = '<p>Your cart is empty.</p>';
        if (clearCartBtn) clearCartBtn.style.display = 'none';
        return;
    }

    let total = 0;

    // Render Cart Items
    checkoutItemsEl.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        const itemTotal = product.price * item.qty;
        total += itemTotal;

        return `
            <div class="summary-item">
                <img src="${product.img}" alt="${product.name}" class="summary-img">
                <div class="summary-info">
                    <div style="font-weight: 600; font-size: 0.9rem;">${product.name}</div>
                    <div style="font-size: 0.85rem; color: #666;">Qty: ${item.qty}</div>
                </div>
                <div style="font-weight: 600;">KSh ${itemTotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    checkoutTotalEl.textContent = `KSh ${total.toFixed(2)}`;

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

            if (selectedPaymentMethod === 'mpesa') {
                // Simulate M-Pesa STK Push
                const phone = document.getElementById('mpesaPhone').value;
                alert(`Simulating STK Push...\n\nA payment prompt for KSh ${total.toFixed(2)} has been sent to ${phone}. Please enter your M-Pesa PIN to complete the transaction.`);
                
                // In a real app, you would show a loading spinner and poll a backend endpoint to check payment status.
                // For now, we'll just simulate a success after a delay.
                setTimeout(() => {
                    alert('Payment received! Your order has been placed.');
                    localStorage.removeItem('cart');
                    window.location.href = 'index.html';
                }, 8000); // 8-second delay to simulate user entering PIN

            } else if (selectedPaymentMethod === 'paypal') {
                // Simulate PayPal redirect
                alert('You will now be redirected to PayPal to complete your payment.');
                // In a real app, you would redirect to the PayPal checkout URL generated by your backend.
                setTimeout(() => {
                    alert('Payment with PayPal successful! Your order has been placed.'); // Simulating return from PayPal
                    localStorage.removeItem('cart');
                    window.location.href = 'index.html';
                }, 4000);

            } else { // Card payment
                alert('Order placed successfully! Thank you for shopping with LuxeMart.');
                localStorage.removeItem('cart');
                window.location.href = 'index.html';
            }
        }
    });

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
        // Validates formats like 2547... or 07...
        return /^(2547\d{8}|07\d{8})$/.test(phone.trim());
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