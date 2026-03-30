document.addEventListener('DOMContentLoaded', () => {
    const detailContainer = document.getElementById('product-detail-container');
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const shopTheLookContainer = document.getElementById('shopTheLookSection');
    const tabsContainer = document.getElementById('product-info-tabs-container');
    const relatedContainer = document.getElementById('related-products-section');
    if (!detailContainer) return;

    // Load users data if available
    const allUsersData = typeof allUsers !== 'undefined' ? allUsers : [];

    // === HELPER FUNCTIONS ===
    const getStarRating = (rating) => {
        let html = '';
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
        if (halfStar) html += '<i class="fas fa-star-half-alt"></i>';
        for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';
        return html;
    };

    // NEW: Render Breadcrumbs
    const renderBreadcrumbs = (product) => {
        if (!breadcrumbContainer) return;
        const categoryName = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        breadcrumbContainer.innerHTML = `
            <nav class="breadcrumb-nav" aria-label="breadcrumb">
                <a href="index.html">Home</a>
                <span class="separator"><i class="fas fa-chevron-right"></i></span>
                <a href="shop.html?category=${product.category}">${categoryName}</a>
                <span class="separator"><i class="fas fa-chevron-right"></i></span>
                <span class="current">${product.name}</span>
            </nav>
        `;
    };

    // === RENDER FUNCTIONS ===
    const renderImageGallery = (product) => {
        const thumbnails = (product.images && product.images.length > 1) 
            ? product.images.map((img, index) => `
                <div class="thumbnail-item ${index === 0 ? 'active' : ''}" data-img-src="${img}">
                    <img src="${img}" alt="Thumbnail of ${product.name} ${index + 1}">
                </div>
            `).join('')
            : '';

        const show360Btn = (product.has360 && product.model3d_url) ? `<button class="btn-360-view" id="view360Btn"><i class="fas fa-cube"></i> 3D View</button>` : '';

        return `
            <div class="product-thumbnails">${thumbnails}</div>
            <div class="product-main-image" id="mainImageContainer">
                <img src="${product.img}" alt="${product.name}" id="mainProductImage" loading="lazy">
                ${show360Btn}
            </div>
        `;
    };

    const renderProductInfo = (product, wishlist) => {
        let stockInfoHtml = '';

        // Find seller details
        const seller = product.sellerEmail ? allUsersData.find(u => u.email === product.sellerEmail) : null;
        
        let sellerInfoHtml = '';
        if (seller) {
            const whatsappMessage = encodeURIComponent(`Hi ${seller.name}, I'm interested in your product on LuxeMart: ${product.name}. Is it still available?`);
            sellerInfoHtml = `
                <div class="seller-info-box" style="margin: 1.5rem 0; padding: 1.5rem; border: 1px solid var(--border); border-radius: 12px; background: var(--accent);">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <img src="${seller.picture}" alt="${seller.name}" style="width: 50px; height: 50px; border-radius: 50%;">
                        <div>
                            <div style="font-size: 0.8rem; color: var(--light-text);">Sold by</div>
                            <div style="font-weight: 600;">${seller.name}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <a href="https://wa.me/${seller.phone}?text=${whatsappMessage}" target="_blank" class="btn-outline" style="text-align: center; padding: 0.6rem; border-radius: 8px; background: #25D366; color: white; border-color: #25D366;">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                        <a href="tel:${seller.phone}" class="btn-outline" style="text-align: center; padding: 0.6rem; border-radius: 8px; color: var(--text); border-color: var(--border);">
                            <i class="fas fa-phone"></i> Call Seller
                        </a>
                    </div>
                </div>
            `;
        }

        if (product.stock > 0 && product.stock <= 10) {
            stockInfoHtml = `<div class="stock-info low-stock">Only ${product.stock} left in stock!</div>`;
        } else if (product.stock > 10) {
            stockInfoHtml = `<div class="stock-info in-stock">In Stock</div>`;
        } else {
            stockInfoHtml = `<div class="stock-info out-of-stock">Out of Stock</div>`;
        }

        const isWishlisted = wishlist.includes(product.id.toString());

        const shareURL = encodeURIComponent(window.location.href);
        const shareText = encodeURIComponent(`Check out this product: ${product.name}`);
        const twitterShare = `https://twitter.com/intent/tweet?url=${shareURL}&text=${shareText}`;
        const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${shareURL}`;
        const pinterestShare = `https://pinterest.com/pin/create/button/?url=${shareURL}&media=${encodeURIComponent(product.img)}&description=${shareText}`;

        // NEW: Variant selectors
        const colorOptions = (product.color && product.color.length > 0) ? `
            <div class="variant-group">
                <div class="variant-label">Color: <span id="selectedColor" class="selected-value">${product.color[0]}</span></div>
                <div class="color-swatches">
                    ${product.color.map((c, index) => `<div class="color-swatch ${index === 0 ? 'active' : ''}" style="background-color: ${c.toLowerCase()};" data-value="${c}" title="${c}"></div>`).join('')}
                </div>
            </div>
        ` : '';

        const sizeOptions = (product.size && product.size.length > 0 && product.size[0] !== "One Size") ? `
            <div class="variant-group">
                <div class="variant-label">Size: <span id="selectedSize" class="selected-value">${product.size[0]}</span></div>
                <div class="size-selector">
                    ${product.size.map((s, index) => `<div class="size-option ${index === 0 ? 'active' : ''}" data-value="${s}">${s}</div>`).join('')}
                </div>
            </div>
        ` : '';

        return `
            <div class="product-detail-info">
                <div class="product-brand">${product.brand}</div>
                <h1>${product.name}</h1>
                <div class="product-rating">
                    <div class="stars">${getStarRating(product.rating)}</div>
                    <a href="#tab-reviews" class="rating-count">(${product.reviews} reviews)</a>
                </div>
                <div class="product-price">
                    <span class="price-current">KSh ${product.price.toFixed(2)}</span>
                    ${product.oldPrice ? `<span class="price-old">KSh ${product.oldPrice.toFixed(2)}</span>` : ''}
                </div>
                <p class="product-description">${product.desc}</p>
                
                ${sellerInfoHtml}

                <div class="product-variants">
                    ${colorOptions}
                    ${sizeOptions}
                </div>

                ${stockInfoHtml}
                
                <div class="product-detail-actions">
                    <div class="cart-item-qty">
                        <button class="qty-btn" data-action="decrease" aria-label="Decrease quantity">-</button>
                        <span class="qty-value" id="pd-qty">1</span>
                        <button class="qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-primary add-to-cart" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-bag"></i> ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button class="btn-primary btn-buy-now" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>Buy Now</button>
                    </div>
                </div>

                <div class="secondary-actions">
                    <button class="wishlist-btn" data-id="${product.id}">
                        <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                        <span id="wishlist-text">${isWishlisted ? 'Added to Wishlist' : 'Add to Wishlist'}</span>
                    </button>
                    <div class="social-share">
                        <span>Share:</span>
                        <a href="${facebookShare}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="${twitterShare}" target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><i class="fab fa-twitter"></i></a>
                        <a href="${pinterestShare}" target="_blank" rel="noopener noreferrer" aria-label="Share on Pinterest"><i class="fab fa-pinterest"></i></a>
                    </div>
                </div>

                <div class="policy-badges">
                    <div class="policy-item"><i class="fas fa-truck"></i> Free Shipping > KSh 5k</div>
                    <div class="policy-item"><i class="fas fa-undo"></i> 30-Day Free Returns</div>
                    <div class="policy-item"><i class="fas fa-shield-alt"></i> Secure Checkout</div>
                    <div class="policy-item"><i class="fas fa-medal"></i> Warranty Included</div>
                </div>
            </div>
        `;
    };

    const renderProductTabs = (product) => {
        // Dummy reviews
        const dummyReviews = [
            { author: 'Jane D.', rating: 5, text: 'Absolutely love this product! The quality is amazing and it arrived so quickly. Highly recommend.' },
            { author: 'John S.', rating: 4, text: 'Very good product, works as described. Only knocking one star off because the packaging was slightly damaged.' },
        ];

        let specsHtml = '<p>No specifications available for this product.</p>';
        if (product.specs && Object.keys(product.specs).length > 0) {
            specsHtml = `
                <table class="specs-table">
                    <tbody>
                        ${Object.entries(product.specs).map(([key, value]) => `
                            <tr>
                                <th>${key}</th>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        tabsContainer.innerHTML = `
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="description">Description</button>
                <button class="tab-btn" data-tab="specifications">Specifications</button>
                <button class="tab-btn" data-tab="reviews">Reviews (${product.reviews})</button>
            </div>
            <div class="tab-content">
                <div class="tab-panel active" id="tab-description">
                    <p>${product.desc}</p>
                </div>
                <div class="tab-panel" id="tab-specifications">
                    ${specsHtml}
                </div>
                <div class="tab-panel" id="tab-reviews">
                    <div class="reviews-section">
                        <div class="review-summary">
                            <h3>Customer Reviews</h3>
                            <div class="review-list">
                                ${dummyReviews.map(r => `
                                    <div class="review-item">
                                        <div class="review-item-header">
                                            <span class="review-author-name">${r.author}</span>
                                            <div class="stars">${getStarRating(r.rating)}</div>
                                        </div>
                                        <p class="review-text">${r.text}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="review-form">
                            <h3>Write a Review</h3>
                            <form id="reviewForm">
                                <div class="form-group">
                                    <label>Your Rating</label>
                                    <div class="star-rating-input" data-rating="0">
                                        ${[...Array(5)].map((_, i) => `<i class="fas fa-star" data-value="${i+1}"></i>`).join('')}
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="reviewName">Name</label>
                                    <input type="text" id="reviewName" required>
                                </div>
                                <div class="form-group">
                                    <label for="reviewText">Your Review</label>
                                    <textarea id="reviewText" required></textarea>
                                </div>
                                <button type="submit" class="btn-primary">Submit Review</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const renderShopTheLook = (currentProduct) => {
        if (!shopTheLookContainer || !currentProduct.shopTheLook || currentProduct.shopTheLook.length === 0) return;

        const lookProducts = products.filter(p => currentProduct.shopTheLook.includes(p.id));
        if (lookProducts.length > 0) {
            shopTheLookContainer.style.display = 'block';
            const grid = document.getElementById('shopTheLookGrid');
            // We can reuse the product card structure.
            grid.innerHTML = lookProducts.map(product => `
                <div class="product-card">
                    <div class="product-img-container">
                        <a href="product.html?id=${product.id}" class="product-img-link">
                            <img src="${product.img}" alt="${product.name}" class="product-img">
                        </a>
                    </div>
                    <div class="product-info">
                        <div class="product-brand">${product.brand}</div>
                        <h4 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h4>
                        <div class="product-price"><span class="price-current">KSh ${product.price.toFixed(2)}</span></div>
                        <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                    </div>
                </div>
            `).join('');
        }
    };

    const renderRelatedProducts = (currentProduct) => {
        const related = products.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id).slice(0, 4);
        if (related.length > 0) {
            relatedContainer.style.display = 'block';
            const grid = document.getElementById('relatedProductsGrid');
            grid.innerHTML = related.map(product => `
                <div class="product-card">
                    <div class="product-img-container">
                        <a href="product.html?id=${product.id}" class="product-img-link">
                            <img src="${product.img}" alt="${product.name}" class="product-img">
                        </a>
                    </div>
                    <div class="product-info">
                        <div class="product-brand">${product.brand}</div>
                        <h4 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h4>
                        <div class="product-price"><span class="price-current">KSh ${product.price.toFixed(2)}</span></div>
                    </div>
                </div>
            `).join('');
        }
    };

    const renderProduct = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = parseInt(urlParams.get('id'), 10);
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        
        if (typeof window.products === 'undefined' || window.products.length === 0) return; // Ensure products are loaded
        const product = products.find(p => p.id === productId);

        if (!product) {
            detailContainer.innerHTML = '<h2>Product not found</h2><p>Sorry, we couldn\'t find the product you were looking for. <a href="shop.html">Return to shop</a>.</p>';
            return;
        }

        document.title = `${product.name} - LuxeMart`;

        // MODIFIED: Render new layout
        renderBreadcrumbs(product);

        detailContainer.innerHTML = `
            ${renderImageGallery(product)}
            ${renderProductInfo(product, wishlist)}
        `;

        renderProductTabs(product);
        renderShopTheLook(product);
        renderRelatedProducts(product);
        addEventListeners(product);
        initImageZoom();
    };

    // === IMAGE ZOOM LOGIC ===
    const initImageZoom = () => { // Moved outside renderProduct for clarity
        const container = document.getElementById('mainImageContainer');
        const img = document.getElementById('mainProductImage');
        
        if (!container || !img) return;

        container.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = 'scale(2)'; // Zoom level
        });

        container.addEventListener('mouseleave', () => {
            img.style.transformOrigin = 'center center';
            img.style.transform = 'scale(1)';
        });
    };

    // === EVENT LISTENERS ===
    const addEventListeners = (product) => {
        // Quantity buttons
        detailContainer.addEventListener('click', e => {
            const qtyBtn = e.target.closest('.qty-btn');
            if (qtyBtn) {
                const qtyEl = document.getElementById('pd-qty');
                let qty = parseInt(qtyEl.textContent, 10);
                if (qtyBtn.dataset.action === 'increase') qty++;
                else if (qtyBtn.dataset.action === 'decrease' && qty > 1) qty--;
                qtyEl.textContent = qty;
            }

            // Buy Now button
            const buyNowBtn = e.target.closest('.btn-buy-now');
            if (buyNowBtn) {
                // Find the associated Add to Cart button and click it to trigger common.js logic
                const addToCartBtn = detailContainer.querySelector('.add-to-cart');
                if (addToCartBtn) {
                    addToCartBtn.click();
                }
                // Redirect to the checkout page
                setTimeout(() => { window.location.href = 'checkout.html'; }, 100);
            }
        });

        // Image gallery thumbnails
        document.querySelectorAll('.thumbnail-item').forEach(thumb => {
            thumb.addEventListener('click', () => {
                if (thumb.classList.contains('active')) return;
                document.querySelector('.thumbnail-item.active')?.classList.remove('active');
                thumb.classList.add('active');
                const mainImg = document.getElementById('mainProductImage');
                mainImg.style.opacity = 0;
                setTimeout(() => {
                    mainImg.src = thumb.dataset.imgSrc;
                    mainImg.style.opacity = 1;
                }, 200);
            });
        });

        // NEW: Variant Listeners
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelector('.color-swatch.active')?.classList.remove('active');
                swatch.classList.add('active');
                document.getElementById('selectedColor').textContent = swatch.dataset.value;
            });
        });

        document.querySelectorAll('.size-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelector('.size-option.active')?.classList.remove('active');
                option.classList.add('active');
                document.getElementById('selectedSize').textContent = option.dataset.value;
            });
        });

        // Tab functionality
        tabsContainer.addEventListener('click', e => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                tabsContainer.querySelector('.tab-btn.active').classList.remove('active');
                tabsContainer.querySelector('.tab-panel.active').classList.remove('active');
                tabBtn.classList.add('active');
                document.getElementById(`tab-${tabBtn.dataset.tab}`).classList.add('active');
            }
        });

        // MODIFIED: Wishlist button text toggle
        const wishlistBtn = document.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', () => {
                const icon = wishlistBtn.querySelector('i');
                const textEl = document.getElementById('wishlist-text');
                // The icon class is toggled by common.js, we just update the text
                setTimeout(() => { // Use timeout to wait for class change from common.js
                    if (icon.classList.contains('fas')) {
                        textEl.textContent = 'Added to Wishlist';
                    } else {
                        textEl.textContent = 'Add to Wishlist';
                    }
                }, 50);
            });
        }

        // Review form stars
        const reviewStars = document.querySelectorAll('.star-rating-input .fa-star');
        reviewStars.forEach(star => {
            star.addEventListener('mouseover', (e) => {
                const rating = e.target.dataset.value;
                reviewStars.forEach(s => s.classList.toggle('selected', s.dataset.value <= rating));
            });
            star.addEventListener('click', (e) => {
                const rating = e.target.dataset.value;
                document.querySelector('.star-rating-input').dataset.rating = rating;
            });
        });

        // 360 View Button
        const view360Btn = document.getElementById('view360Btn');
        if (view360Btn && product.model3d_url) {
            view360Btn.addEventListener('click', () => {
                const existingModal = document.getElementById('view3DModal');
                if (existingModal) existingModal.remove();

                const modalHtml = `
                    <div class="modal-overlay show" id="view3DModal">
                        <div class="modal modal-3d">
                            <div class="modal-header">
                                <h3 class="modal-title">${product.name} - 3D View</h3>
                                <button class="modal-close" onclick="document.getElementById('view3DModal').remove()">×</button>
                            </div>
                            <div class="modal-body">
                                <model-viewer 
                                    src="${product.model3d_url}" 
                                    alt="A 3D model of ${product.name}"
                                    auto-rotate 
                                    camera-controls
                                    ar
                                    ar-modes="webxr scene-viewer quick-look"
                                    style="width: 100%; height: 50vh;">
                                </model-viewer>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Close on overlay click
                document.getElementById('view3DModal').addEventListener('click', (e) => {
                    if (e.target.id === 'view3DModal') e.target.remove();
                });
            });
        }

        // Size Chart Modal
        const sizeChartBtn = document.getElementById('openSizeChart');
        if (sizeChartBtn) {
            sizeChartBtn.addEventListener('click', () => {
                // We can reuse the quick view modal structure or simple alert for now, 
                // but let's create a dedicated modal on the fly for better UX.
                const existingModal = document.getElementById('sizeChartModal');
                if (existingModal) existingModal.remove();

                const modalHtml = `
                    <div class="modal-overlay show" id="sizeChartModal">
                        <div class="modal">
                            <div class="modal-header">
                                <h3 class="modal-title">Size Guide</h3>
                                <button class="modal-close" onclick="document.getElementById('sizeChartModal').remove()">×</button>
                            </div>
                            <div class="modal-body">
                                <p>Standard Sizing (Inches)</p>
                                <table class="size-chart-table">
                                    <thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hips</th></tr></thead>
                                    <tbody>
                                        <tr><td>S</td><td>34-36</td><td>28-30</td><td>34-36</td></tr>
                                        <tr><td>M</td><td>38-40</td><td>32-34</td><td>38-40</td></tr>
                                        <tr><td>L</td><td>42-44</td><td>36-38</td><td>42-44</td></tr>
                                        <tr><td>XL</td><td>46-48</td><td>40-42</td><td>46-48</td></tr>
                                    </tbody>
                                </table>
                                <div style="margin-top:1rem; font-size:0.9rem; color:var(--light-text);">
                                    <i class="fas fa-ruler-combined"></i> measurements are in inches. If you are between sizes, we recommend sizing up.
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Close on overlay click
                document.getElementById('sizeChartModal').addEventListener('click', (e) => {
                    if (e.target.id === 'sizeChartModal') e.target.remove();
                });
            });
        }
    };

    // === INITIAL CALL ===
    renderProduct();

    // If products are not yet loaded (e.g., if this script runs before main.js's fetch completes),
    // we might need to wait. For now, assuming products are available or will be soon.
    // A more robust solution would be to listen for a 'productsLoaded' event or ensure
    // product-page.js runs after main.js has fetched initial products.
    // For now, the `typeof window.products === 'undefined' || window.products.length === 0` check
    // in `renderProduct` will handle the initial state.
});