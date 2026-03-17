document.addEventListener('DOMContentLoaded', () => {
    // This file handles logic for the homepage, specifically the featured products grid.
    // Dark mode, mobile menu, and other common functionalities are in common.js

    /* ===== QUICK VIEW MODAL ===== */
    const quickViewOverlay = document.getElementById('quickViewModal'); // The HTML uses this ID for the overlay

    const openQuickView = (productId) => {
        if (!quickViewOverlay || typeof products === 'undefined') return;
        const product = products.find(p => p.id == productId);
        if (!product) return;

        const description = product.desc || `A high-quality product from ${product.brand}.`;
        
        quickViewOverlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Quick View</h3>
                    <button class="modal-close" id="closeQuickViewBtn" aria-label="Close quick view">×</button>
                </div>
                <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <img src="${product.img}" alt="${product.name}" class="quickview-img">
                    <div>
                        <h3>${product.name}</h3>
                        <div class="quickview-price" style="font-size: 1.5rem; font-weight: 700; color: var(--primary); margin: 1rem 0;">KSH ${product.price.toFixed(2)}</div>
                        <p style="color: var(--light-text); margin: 1rem 0;">${description}</p>
                        <div class="quickview-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button class="btn-primary add-to-cart" data-id="${product.id}">Add to Cart</button>
                            <a href="product.html?id=${product.id}" class="btn-outline" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.875rem 2rem;">View Details</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        quickViewOverlay.classList.add('show');
    };

    const closeQuickView = () => {
        if (quickViewOverlay) quickViewOverlay.classList.remove('show');
    };

    document.addEventListener('click', (e) => {
        const quickViewBtn = e.target.closest('.quick-view-btn');
        if (quickViewBtn) {
            openQuickView(quickViewBtn.dataset.id);
        }
        if (e.target.closest('#closeQuickViewBtn') || e.target === quickViewOverlay) {
            closeQuickView();
        }
    });

    /* ===== ADVANCED PRODUCT FILTERING & SORTING ===== */
    const productGrid = document.getElementById('featuredProductsGrid');
    if (!productGrid || typeof products === 'undefined') {
        if (productGrid) productGrid.innerHTML = "<p>Could not load products.</p>";
        return;
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort');
    const brandFilter = document.getElementById('brandFilter');
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const ratingFilter = document.getElementById('ratingFilter');
    const inStockFilter = document.getElementById('inStockFilter');
    const onSaleFilter = document.getElementById('onSaleFilter');
    const colorFilterContainer = document.getElementById('colorFilter');
    const sizeFilterContainer = document.getElementById('sizeFilter');

    let currentCategory = 'all';

    // Debounce function to prevent excessive re-renders on input fields
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

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

    const populateBrandFilter = () => {
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
        brandFilter.innerHTML += brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
    };

    const populateCheckboxFilter = (container, attribute) => {
        if (!container) return;
        // Use flatMap to handle arrays of attributes (like colors or sizes) and filter out undefined/null values
        const allValues = [...new Set(products.flatMap(p => p[attribute] || []))].sort();
        
        container.innerHTML = allValues.map(value => `
            <label class="checkbox-label">
                <input type="checkbox" value="${value}">
                ${attribute === 'color' 
                    ? `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${value.toLowerCase()}; border: 1px solid #ccc; margin-right: 5px;"></span>` 
                    : ''
                }
                ${value}
            </label>`).join('');
    };

    const renderProducts = (productsToRender) => {
        if (productsToRender.length === 0) {
            productGrid.innerHTML = `<p class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--light-text);">No products match your criteria.</p>`;
            return;
        }
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        productGrid.innerHTML = productsToRender.map(p => {
            const isWishlisted = wishlist.includes(p.id.toString());
            return `
            <div class="product-card">
                <div class="product-img-container">
                    <a href="product.html?id=${p.id}" class="product-img-link">
                        <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
                    </a>
                    <div class="product-actions">
                         <button class="product-action-btn quick-view-btn" data-id="${p.id}" title="Quick View"><i class="fas fa-eye"></i></button>
                         <button class="product-action-btn wishlist-btn" data-id="${p.id}" title="Add to Wishlist"><i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i></button>
                    </div>
                    ${p.oldPrice ? `<div class="product-badge">SALE</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.brand || ''}</div>
                    <h4 class="product-title"><a href="product.html?id=${p.id}">${p.name}</a></h4>
                    <div class="product-rating">
                        <div class="stars">${getStarRating(p.rating)}</div>
                        <span class="rating-count">(${p.reviews})</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">KSh ${p.price.toFixed(2)}</span>
                        ${p.oldPrice ? `<span class="price-old">KSh ${p.oldPrice.toFixed(2)}</span>` : ''}
                    </div>
                    <button class="add-to-cart" data-id="${p.id}">Add to Cart</button>
                </div>
            </div>`;
        }).join('');
    };

    const applyFiltersAndSort = () => {
        let processedProducts = [...products];

        if (currentCategory !== 'all') {
            processedProducts = processedProducts.filter(p => p.category === currentCategory);
        }

        const brand = brandFilter.value;
        const minPrice = parseFloat(minPriceInput.value);
        const maxPrice = parseFloat(maxPriceInput.value);
        const minRating = parseFloat(ratingFilter.value);
        const inStock = inStockFilter.checked;
        const onSale = onSaleFilter.checked;
        const selectedColors = [...colorFilterContainer.querySelectorAll('input:checked')].map(el => el.value);
        const selectedSizes = [...sizeFilterContainer.querySelectorAll('input:checked')].map(el => el.value);

        processedProducts = processedProducts.filter(p => {
            if (brand !== 'all' && p.brand !== brand) return false;
            if (!isNaN(minPrice) && p.price < minPrice) return false;
            if (!isNaN(maxPrice) && p.price > maxPrice) return false;
            if (p.rating < minRating) return false;
            // For multi-select, if filters are selected, product must have at least one of the selected values.
            if (selectedColors.length > 0 && (!p.color || !p.color.some(c => selectedColors.includes(c)))) return false;
            // Convert product sizes to string for comparison, as checkbox values are strings.
            if (selectedSizes.length > 0 && (!p.size || !p.size.map(String).some(s => selectedSizes.includes(s)))) return false;
            if (inStock && (!p.stock || p.stock === 0)) return false;
            if (onSale && !p.oldPrice) return false;
            return true;
        });

        const currentSort = sortSelect.value;
        switch (currentSort) {
            case 'popularity':
                processedProducts.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                break;
            case 'newest':
                processedProducts.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
                break;
            case 'price-asc':
                processedProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                processedProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                processedProducts.sort((a, b) => b.rating - a.rating);
                break;
        }

        renderProducts(processedProducts);
    };

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.filter;
            applyFiltersAndSort();
        });
    });

    // --- EVENT LISTENERS FOR INSTANT FILTERING ---
    const debouncedPriceFilter = debounce(applyFiltersAndSort, 400);

    sortSelect.addEventListener('change', applyFiltersAndSort);
    brandFilter.addEventListener('change', applyFiltersAndSort);
    ratingFilter.addEventListener('change', applyFiltersAndSort);
    inStockFilter.addEventListener('change', applyFiltersAndSort);
    onSaleFilter.addEventListener('change', applyFiltersAndSort);
    // Use event delegation for dynamically added checkboxes
    colorFilterContainer.addEventListener('change', applyFiltersAndSort);
    sizeFilterContainer.addEventListener('change', applyFiltersAndSort);
    minPriceInput.addEventListener('input', debouncedPriceFilter);
    maxPriceInput.addEventListener('input', debouncedPriceFilter);

    // Populate all filters on initial load
    populateBrandFilter();
    populateCheckboxFilter(colorFilterContainer, 'color');
    populateCheckboxFilter(sizeFilterContainer, 'size');
    applyFiltersAndSort();
});