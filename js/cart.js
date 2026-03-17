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
 
    if (!cartSidebar) {
        console.warn('cartSidebar element not found. Cart will be disabled until element exists.');
        return;
    }
 
    function updateCart() {
        if (!cartItemsEl || !cartTotalEl) return;
 
        let total = 0;
        const cartItemHTML = cart.map(item => {
            const product = (typeof products !== 'undefined') ? products.find(p => p.id == item.id) : null;
            const name = product ? product.name : `Item ${item.id}`;
            const img = product ? product.img : '';
            const price = product ? product.price : 0;
            total += price * item.qty;
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
 
        cartItemsEl.innerHTML = cartItemHTML;
        cartTotalEl.textContent = `KSH ${total.toFixed(2)}`;
        const qty = cart.reduce((sum, i) => sum + i.qty, 0);
        if (cartCount) cartCount.textContent = qty; // header cart count
        if (bubbleCount) bubbleCount.textContent = qty; // floating bubble count
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Expose updateCart globally so other scripts can trigger updates
    window.updateCart = updateCart;
 
    // Open cart when clicking header cart button and floating bubble (guard checks)
    if (cartBtn) cartBtn.addEventListener('click', () => { cartSidebar.classList.add('open'); });
    if (cartBubble) cartBubble.addEventListener('click', () => { cartSidebar.classList.add('open'); });
    if (closeCart) closeCart.addEventListener('click', () => cartSidebar.classList.remove('open'));
 
    // Click outside to close (safe guards)
    document.addEventListener('click', e => {
        const clickedInsideSidebar = cartSidebar.contains(e.target);
        const clickedCartBtn = cartBtn && cartBtn.contains(e.target);
        const clickedBubble = cartBubble && cartBubble.contains(e.target);
        // Also check if the click was on any 'add-to-cart' button to prevent immediate closing
        const clickedAddToCart = e.target.closest('.add-to-cart');

        if (!clickedInsideSidebar && !clickedCartBtn && !clickedBubble && !clickedAddToCart && cartSidebar.classList.contains('open')) {
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

        if (existingItem) {
            existingItem.qty++;
        } else {
            cart.push({ id: productId, qty: 1 });
        }

        updateCart();

        // Open sidebar to show the user the item was added
        if (cartSidebar) cartSidebar.classList.add('open');

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
 
    // initialize
    updateCart();
});