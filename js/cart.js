// Ensure DOM is ready before querying elements
document.addEventListener('DOMContentLoaded', () => {

    // === CART SYSTEM ===
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    const cartBubble = document.getElementById('cartBubble'); // floating bubble button
    const bubbleCount = document.getElementById('bubbleCount'); // number inside bubble
    const mobileCartBtn = document.getElementById('mobileCartBtn'); // Mobile menu cart button

    // Cart Page Elements
    const cartPageBody = document.getElementById('cartPageBody');
    const cartPageSubtotal = document.getElementById('cartPageSubtotal');
    const cartPageTotal = document.getElementById('cartPageTotal');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartPageContent = document.getElementById('cartPageContent');
 
    // If we are on cart.html, cartSidebar might be present but we primarily want cartPageBody logic.
    // If we are on other pages, we need cartSidebar.
    if (!cartSidebar && !cartPageBody) {
        console.warn('Cart elements not found.');
        return;
    }
 
    function updateCart() {
        let total = 0;

        // 1. Calculate Total (Needed for both Sidebar and Cart Page)
        cart.forEach(item => {
            // Default selected to true if undefined
            if (item.selected === undefined) item.selected = true;
            
            const product = (typeof window.products !== 'undefined') ? window.products.find(p => p.id == item.id) : null;
            if (product && item.selected) {
                total += product.price * item.qty;
            }
        });

        // 2. Update Sidebar (Only if elements exist)
        if (cartItemsEl) {
            cartItemsEl.innerHTML = cart.map(item => {
                const product = (typeof window.products !== 'undefined') ? window.products.find(p => p.id == item.id) : null;
                const name = product ? product.name : `Item ${item.id}`;
                const img = product ? product.img : '';
                const price = product ? product.price : 0;
                return `
                    <div class="cart-item">
                        <img src="${img}" alt="${name}" class="cart-item-img">
                        <div class="cart-item-info">
                            <div class="cart-item-title">${name}</div>
                            <div class="cart-item-price">KSH ${price.toFixed(2)} × ${item.qty}</div>
                        </div>
                        <i class="fas fa-trash cart-item-remove" data-id="${item.id}"></i>
                    </div>`;
            }).join('');
        }
        if (cartTotalEl) cartTotalEl.textContent = `KSH ${total.toFixed(2)}`;
        
        // === UPDATE FULL CART PAGE ===
        if (cartPageBody) {
            if (cart.length === 0) {
                if (cartPageContent) cartPageContent.style.display = 'none';
                if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            } else {
                if (cartPageContent) cartPageContent.style.display = 'grid';
                if (emptyCartMessage) emptyCartMessage.style.display = 'none';

                cartPageBody.innerHTML = cart.map(item => {
                    const product = (typeof window.products !== 'undefined') ? window.products.find(p => p.id == item.id) : null;
                    const name = product ? product.name : `Item ${item.id}`;
                    const img = product ? product.img : '';
                    const price = product ? product.price : 0;
                    return `
                    <tr>
                        <td style="text-align: center;">
                            <input type="checkbox" class="cart-item-select" data-id="${item.id}" ${item.selected ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        </td>
                        <td>
                            <div class="cart-product-col">
                                <img src="${img}" alt="${name}" class="cart-product-img">
                                <div>
                                    <div style="font-weight: 600;">${name}</div>
                                    <div style="color: #666; font-size: 0.9rem;">${product ? product.category : ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>KSH ${price.toFixed(2)}</td>
                        <td>
                            <div class="qty-control">
                                <button class="cart-qty-change" data-id="${item.id}" data-action="decrease">-</button>
                                <span>${item.qty}</span>
                                <button class="cart-qty-change" data-id="${item.id}" data-action="increase">+</button>
                            </div>
                        </td>
                        <td>KSH ${(price * item.qty).toFixed(2)}</td>
                        <td><i class="fas fa-trash cart-item-remove" data-id="${item.id}" style="cursor: pointer; color: #dc2626;"></i></td>
                    </tr>`;
                }).join('');

                if (cartPageSubtotal) cartPageSubtotal.textContent = `KSH ${total.toFixed(2)}`;
                if (cartPageTotal) cartPageTotal.textContent = `KSH ${total.toFixed(2)}`;
            }
        }

        const qty = cart.reduce((sum, i) => sum + i.qty, 0);
        if (cartCount) cartCount.textContent = qty; // header cart count
        if (bubbleCount) bubbleCount.textContent = qty; // floating bubble count
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Expose updateCart globally so other scripts can trigger updates
    window.updateCart = updateCart;
 
    // Open cart when clicking header cart button and floating bubble (guard checks)
    if (cartBtn) cartBtn.addEventListener('click', () => { 
        // If on cart page, sidebar might be hidden, so don't try to open it
        if (cartPageBody) return; 
        if (cartSidebar) cartSidebar.classList.add('open'); 
    });

    if (mobileCartBtn) mobileCartBtn.addEventListener('click', () => {
        // If on cart page, just close the mobile menu
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) mobileMenu.classList.remove('open');

        if (cartPageBody) return; // Don't open sidebar if on cart page

        if (cartSidebar) cartSidebar.classList.add('open');
    });

    if (cartBubble) cartBubble.addEventListener('click', () => { cartSidebar.classList.add('open'); });
    if (closeCart) closeCart.addEventListener('click', () => cartSidebar.classList.remove('open'));
 
    // Click outside to close (safe guards)
    document.addEventListener('click', e => {
        if (!cartSidebar) return; // Skip if no sidebar
        const clickedInsideSidebar = cartSidebar.contains(e.target);
        const clickedCartBtn = cartBtn && cartBtn.contains(e.target);
        const clickedMobileCartBtn = mobileCartBtn && mobileCartBtn.contains(e.target);
        const clickedBubble = cartBubble && cartBubble.contains(e.target);
        // Also check if the click was on any 'add-to-cart' button to prevent immediate closing
        const clickedAddToCart = e.target.closest('.add-to-cart');
        const clickedRemove = e.target.closest('.cart-item-remove');

        // If clicking remove button, don't close the sidebar immediately
        if (!clickedInsideSidebar && !clickedCartBtn && !clickedMobileCartBtn && !clickedBubble && !clickedAddToCart && !clickedRemove && cartSidebar.classList.contains('open')) {
            cartSidebar.classList.remove('open');
        }
    });
 
    // === ADD TO CART (use event delegation so dynamically inserted buttons work) ===
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-to-cart');
        if (!addBtn) return;

        const id = addBtn.dataset.id;
        if (!id) return;

        const productId = parseInt(id, 10);
        const existingItem = cart.find(item => item.id === productId);

        // Check if Quick View Quantity is available
        let qtyToAdd = 1;
        if (addBtn.id === 'qvAddToCart') {
            const qvQty = document.getElementById('qvQty');
            if (qvQty) qtyToAdd = parseInt(qvQty.textContent, 10) || 1;
        }

        if (existingItem) {
            existingItem.qty += qtyToAdd;
        } else {
            cart.push({ id: productId, qty: qtyToAdd, selected: true });
        }

        updateCart();

        // Open sidebar to show the user the item was added
        // Only open sidebar if NOT on cart.html (to avoid double view)
        if (cartSidebar && !cartPageBody) cartSidebar.classList.add('open');

        // small UI feedback
        const prev = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
        addBtn.style.background = '#10b981';
        setTimeout(() => {
            addBtn.innerHTML = prev;
            addBtn.style.background = '';
        }, 1500);
    });
 
    // === REMOVE FROM CART (event delegation) ===
    if (cartItemsEl) {
        cartItemsEl.addEventListener('click', (e) => {
            const rem = e.target.closest('.cart-item-remove');
            if (!rem) return;

            const id = rem.dataset.id;
            if (!id) return;
            cart = cart.filter(i => i.id !== parseInt(id, 10));
            updateCart();
        });
    }
 
    // === CHANGE QUANTITY ON CART PAGE ===
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.cart-qty-change');
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
                    // Optional: Confirm before removing if qty is 1? For now, we stop at 1.
                    return; 
                }
            }
            updateCart();
        }
    });

    // === SELECT/DESELECT ITEMS ON CART PAGE ===
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('cart-item-select')) {
            const id = parseInt(e.target.dataset.id, 10);
            const item = cart.find(i => i.id === id);
            if (item) {
                item.selected = e.target.checked;
                updateCart();
            }
        }
    });

    // Remove listeners are handled globally by document delegation in next step, 
    // or we extend the existing one to be global.
    document.addEventListener('click', (e) => {
        const rem = e.target.closest('.cart-item-remove');
        if (!rem) return;
        // Check if it's already handled by the sidebar listener? 
        // The existing listener was attached to cartItemsEl. 
        // We can just rely on this global one for both Sidebar and Cart Page.
        
        const id = rem.dataset.id;
        if (!id) return;
        cart = cart.filter(i => i.id !== parseInt(id, 10));
        updateCart();
    });

    // initialize
    updateCart();
});