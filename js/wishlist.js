document.addEventListener('DOMContentLoaded', () => {
    const wishlistGrid = document.getElementById('wishlistGrid');
    const addAllBtn = document.getElementById('addAllToCartBtn');
    if (!wishlistGrid) return;

    // Retrieve wishlist from localStorage
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    // Render wishlist items
    const renderWishlist = () => {
        if (typeof window.products === 'undefined' || window.products.length === 0) return; // Ensure products are loaded
        const wishlistProducts = products.filter(product => wishlist.includes(product.id.toString()));

        if (wishlistProducts.length === 0) {
            wishlistGrid.innerHTML = '<p>Your wishlist is empty.</p>';
            if (addAllBtn) addAllBtn.style.display = 'none';
            return;
        }
        if (addAllBtn) addAllBtn.style.display = 'block';

        wishlistGrid.innerHTML = wishlistProducts.map(product => `
            <div class="product-card">
                <button class="product-action-btn wishlist-remove-btn" data-id="${product.id}" style="position: absolute; top: 1rem; right: 1rem; z-index: 2; opacity: 1;">
                    <i class="fas fa-times"></i>
                </button>
                <div class="product-img-container">
                    <a href="product.html?id=${product.id}"><img src="${product.img}" alt="${product.name}" class="product-img"></a>
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h4 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h4>
                    <div class="product-price"><span class="price-current">KSh ${product.price.toFixed(2)}</span></div>
                    <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');
    };

    // Initial rendering
    renderWishlist();

    // Add All to Cart Logic
    if (addAllBtn) {
        addAllBtn.addEventListener('click', () => {
            const currentWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            if (currentWishlist.length === 0) return;

            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            let addedCount = 0;

            currentWishlist.forEach(id => {
                const productId = parseInt(id, 10);
                const existingItem = cart.find(item => item.id === productId);
                if (existingItem) {
                    existingItem.qty++;
                } else {
                    cart.push({ id: productId, qty: 1 });
                }
                addedCount++;
            });

            localStorage.setItem('cart', JSON.stringify(cart));
            if (window.updateCart) window.updateCart();
            if (window.showToast) window.showToast(`${addedCount} items added to cart!`, 'success');
            
            // Open cart sidebar to show items
            const cartSidebar = document.getElementById('cartSidebar');
            if (cartSidebar) cartSidebar.classList.add('open');
        });
    }

    // Remove from Wishlist Logic
    wishlistGrid.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.wishlist-remove-btn');
        if (!removeBtn) return;

        const idToRemove = removeBtn.dataset.id;
        
        // Update the local wishlist array
        wishlist = wishlist.filter(id => id !== idToRemove);
        
        // Update localStorage
        localStorage.setItem('wishlist', JSON.stringify(wishlist));

        // Re-render the wishlist and update counts
        renderWishlist();
        if (window.updateWishlistCount) window.updateWishlistCount();
        if (window.showToast) window.showToast('Item removed from wishlist', 'info');
    });
});