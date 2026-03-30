document.addEventListener('DOMContentLoaded', () => {
    // This file handles all dynamic page logic for LuxeMart.
    // It includes product filtering, sliders, video players, and animations.
    // Common functionalities like dark mode, modals, and cart are in common.js and cart.js.

    window.products = []; // Global array to accumulate products

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
    if (productGrid && typeof products !== 'undefined') {
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
        const loadMoreBtn = document.getElementById('loadMoreBtn');

        const urlParams = new URLSearchParams(window.location.search);
        let currentCategory = urlParams.get('category') || 'all';
        let currentSearchTerm = urlParams.get('search') || '';
        let productsPerPage = 24; // This will now be the 'limit' for the API
        let currentPage = 1;
        let totalProductsCount = 0; // New variable to store total count from API


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

        // This function will now be responsible for fetching and rendering
        const fetchAndRenderProducts = async (page = 1, append = false) => {
            const originalBtnText = loadMoreBtn ? loadMoreBtn.innerHTML : '';
            if (loadMoreBtn) {
                loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                loadMoreBtn.disabled = true;
            }

            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', productsPerPage);
            
            // Add filters and sort to query params
            if (currentCategory !== 'all') queryParams.append('category', currentCategory);
            if (currentSearchTerm) queryParams.append('search', currentSearchTerm);
            if (sortSelect && sortSelect.value !== 'default') queryParams.append('sort', sortSelect.value);
            if (brandFilter && brandFilter.value !== 'all') queryParams.append('brand', brandFilter.value);
            if (minPriceInput && minPriceInput.value) queryParams.append('min_price', minPriceInput.value);
            if (maxPriceInput && maxPriceInput.value) queryParams.append('max_price', maxPriceInput.value);
            if (ratingFilter && ratingFilter.value !== '0') queryParams.append('min_rating', ratingFilter.value);
            if (inStockFilter && inStockFilter.checked) queryParams.append('in_stock', 'true');
            if (onSaleFilter && onSaleFilter.checked) queryParams.append('on_sale', 'true');
            
            const selectedColors = colorFilterContainer ? [...colorFilterContainer.querySelectorAll('.filter-option.active')].map(el => el.dataset.value) : [];
            if (selectedColors.length > 0) queryParams.append('colors', selectedColors.join(','));
            const selectedSizes = sizeFilterContainer ? [...sizeFilterContainer.querySelectorAll('.filter-option.active')].map(el => el.dataset.value) : [];
            if (selectedSizes.length > 0) queryParams.append('sizes', selectedSizes.join(','));

            try {
                const response = await fetch(`api/products/get_products.php?${queryParams.toString()}`);
                const result = await response.json();

                if (result.success) {
                    totalProductsCount = result.total_products;
                    if (append) {
                        window.products = window.products.concat(result.products);
                    } else {
                        window.products = result.products; // Replace for new filter/sort
                    }
                    renderProductGridItems(); // Render the accumulated products
                    renderTrendingSlider(); // Re-render trending slider as well
                    populateBrandFilter(); // Re-populate filters based on new data
                    populateOptionFilter(colorFilterContainer, 'color');
                    populateOptionFilter(sizeFilterContainer, 'size');
                } else {
                    console.error('API Error:', result.message);
                    productGrid.innerHTML = `<p class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--light-text);">Error loading products: ${result.message}</p>`;
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                productGrid.innerHTML = `<p class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--light-text);">An error occurred while fetching products.</p>`;
            } finally {
                if (loadMoreBtn) {
                    loadMoreBtn.innerHTML = originalBtnText;
                    loadMoreBtn.disabled = false;
                }
            }
        };

        const populateBrandFilter = () => {
            if (!brandFilter) return;
            const brands = [...new Set(window.products.map(p => p.brand).filter(Boolean))];
            brandFilter.innerHTML = '<option value="all">All Brands</option>' + brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
            if (urlParams.get('brand')) brandFilter.value = urlParams.get('brand');
        };

        const populateOptionFilter = (container, attribute) => {
            if (!container) return;
            const allValues = [...new Set(window.products.flatMap(p => p[attribute] || []))].sort();
        
            container.innerHTML = allValues.map(value => {
                const colorSwatch = attribute === 'color' 
                    ? `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${value.toLowerCase()}; border: 1px solid #ccc;"></span>` 
                    : '';
                return `<button class="filter-option" data-value="${value}">${colorSwatch} ${value}</button>`;
            }).join('');
            const urlValues = urlParams.get(attribute + 's')?.split(',') || [];
            urlValues.forEach(val => {
                const btn = container.querySelector(`.filter-option[data-value="${val}"]`);
                if (btn) btn.classList.add('active');
            });
        };

        const renderProductGridItems = () => { // Renamed from renderProducts
            if (window.products.length === 0) {
                productGrid.innerHTML = `<p class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--light-text);">No products match your criteria.</p>`;
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            productGrid.innerHTML = window.products.map(p => { // Use window.products directly
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

            // Update Load More button visibility based on total products from API
            if (window.products.length < totalProductsCount) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        };

        const applyFiltersAndSort = () => {
            currentPage = 1; // Always reset to page 1 on filter/sort change
            fetchAndRenderProducts(currentPage, false); // Fetch new data, don't append
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

        if(sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);
        if(brandFilter) brandFilter.addEventListener('change', applyFiltersAndSort);
        if(ratingFilter) ratingFilter.addEventListener('change', applyFiltersAndSort);
        if(inStockFilter) inStockFilter.addEventListener('change', applyFiltersAndSort);
        if(onSaleFilter) onSaleFilter.addEventListener('change', applyFiltersAndSort);
        if(minPriceInput) minPriceInput.addEventListener('input', debouncedPriceFilter);
        if(maxPriceInput) maxPriceInput.addEventListener('input', debouncedPriceFilter);

        // Event delegation for new filter options
        [colorFilterContainer, sizeFilterContainer].forEach(container => {
            if (container) {
                container.addEventListener('click', (e) => {
                    const filterOption = e.target.closest('.filter-option');
                    if (filterOption) {
                        filterOption.classList.toggle('active');
                        applyFiltersAndSort();
                    }
                });
            }
        });

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                currentPage++;
                fetchAndRenderProducts(currentPage, true); // Fetch next page and append
            });
        }

        // Initial load of products and filters
        // This will be called once the DOM is ready and the productGrid exists.
        // We need to ensure `window.products` is populated before populating filters.
        // So, the initial fetch should happen first.
        fetchAndRenderProducts(1, false).then(() => {
            populateBrandFilter();
            populateOptionFilter(colorFilterContainer, 'color');
            populateOptionFilter(sizeFilterContainer, 'size');
            // Re-apply initial filters/sort from URL if any
            if (urlParams.get('sort')) sortSelect.value = urlParams.get('sort');
            if (urlParams.get('min_price')) minPriceInput.value = urlParams.get('min_price');
            if (urlParams.get('max_price')) maxPriceInput.value = urlParams.get('max_price');
            if (urlParams.get('min_rating')) ratingFilter.value = urlParams.get('min_rating');
            if (urlParams.get('in_stock') === 'true') inStockFilter.checked = true;
            if (urlParams.get('on_sale') === 'true') onSaleFilter.checked = true;
        });
    } // End of productGrid check

    /* ===== HERO SLIDER LOGIC ===== */
    const initHeroSlider = () => {
        const sliderContainer = document.querySelector('.hero-slider');
        if (!sliderContainer) return;

        const slides = sliderContainer.querySelectorAll('.slide');
        const dotsContainer = sliderContainer.querySelector('.slider-dots');
        const navContainer = sliderContainer.querySelector('.slider-nav');

        if (!dotsContainer || slides.length <= 1) return;

        let currentSlide = 0;
        const slideInterval = 5000;
        let slideTimer;

        dotsContainer.innerHTML = ''; // Clear previous dots
        
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
        const dots = dotsContainer.querySelectorAll('.dot');

        const goToSlide = (slideIndex) => {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            currentSlide = (slideIndex + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        };

        const resetInterval = () => {
            clearInterval(slideTimer);
            slideTimer = setInterval(() => goToSlide(currentSlide + 1), slideInterval);
        };

        if (navContainer) {
            sliderContainer.querySelector('.next-btn')?.addEventListener('click', () => { goToSlide(currentSlide + 1); resetInterval(); });
            sliderContainer.querySelector('.prev-btn')?.addEventListener('click', () => { goToSlide(currentSlide - 1); resetInterval(); });
        }

        resetInterval();
    };
    initHeroSlider();

    /* ===== TRENDING PRODUCTS SLIDER ===== */
    const productSliderTrack = document.getElementById('productSliderTrack');
    // This part also needs to wait for window.products to be populated.
    // It should be called after the initial fetch.
    const renderTrendingSlider = () => {
        if (!productSliderTrack || typeof window.products === 'undefined' || window.products.length === 0) return;

        const featured = window.products.filter(p => p.rating >= 4.5).slice(0, 10);
        productSliderTrack.innerHTML = featured.map(product => `
            <div class="product-card slider-card">
                <div class="product-img-container">
                     <a href="product.html?id=${product.id}">
                        <img src="${product.img}" alt="${product.name}" class="product-img">
                    </a>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h4 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h4>
                    <div class="product-price">
                        <span class="price-current">KSh ${product.price.toFixed(2)}</span>
                    </div>
                    <button class="add-to-cart" data-id="${product.id}" style="width:100%; margin-top:0.5rem;">Add to Cart</button>
                </div>
            </div>
        `).join('');

        const prevBtn = document.getElementById('sliderPrev');
        const nextBtn = document.getElementById('sliderNext');

        if (prevBtn && nextBtn) {
            nextBtn.addEventListener('click', () => productSliderTrack.scrollBy({ left: 300, behavior: 'smooth' }));
            prevBtn.addEventListener('click', () => productSliderTrack.scrollBy({ left: -300, behavior: 'smooth' }));
        }
    };
    // Call renderTrendingSlider after products are loaded
    // This will be handled by the fetchAndRenderProducts function.

    /* ===== VIDEO PLAYER LOGIC ===== */
    const videoPlayer = document.querySelector('.video-promo-player');
    if (videoPlayer) {
        const video = document.getElementById('promoVideo');
        const playBtn = videoPlayer.querySelector('.video-play-btn');

        videoPlayer.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                videoPlayer.classList.add('playing');
            } else {
                video.pause();
                videoPlayer.classList.remove('playing');
            }
        });
    }

    /* ===== SCROLL FADE-IN ANIMATION ===== */
    const animatedSections = document.querySelectorAll('.fade-in-section');
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedSections.forEach(section => sectionObserver.observe(section));

    /* ===== COUNTDOWN TIMER ===== */
    const daysEl = document.getElementById('days');
    if (daysEl) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 2); // 2 days from now

        const updateCountdown = () => {
            const now = new Date();
            const diff = endDate - now;
            if (diff <= 0) return;

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        };
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    // Initial calls for elements that don't depend on products
    // renderProducts(); // This will now be called by fetchAndRenderProducts
    // renderProductSlider(); // This will now be called after products are loaded

    // Listen for the custom event dispatched by shop.html (or wherever products are loaded)
    // This is no longer needed if `main.js` handles the initial fetch.
    // If `shop.html` still dispatches `productsLoaded`, then `main.js` should listen.
    // Given the previous diff, `shop.html`'s script block was removed, so `main.js` must initiate.

    // Initial fetch for products on pages that use the product grid (shop.html, index.html featured)
    // This will be handled by the `productGrid` check above.
});
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

    if(sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);
    if(brandFilter) brandFilter.addEventListener('change', applyFiltersAndSort);
    if(ratingFilter) ratingFilter.addEventListener('change', applyFiltersAndSort);
    if(inStockFilter) inStockFilter.addEventListener('change', applyFiltersAndSort);
    if(onSaleFilter) onSaleFilter.addEventListener('change', applyFiltersAndSort);
    if(minPriceInput) minPriceInput.addEventListener('input', debouncedPriceFilter);
    if(maxPriceInput) maxPriceInput.addEventListener('input', debouncedPriceFilter);

    // Event delegation for new filter options
    [colorFilterContainer, sizeFilterContainer].forEach(container => {
        if (container) {
            container.addEventListener('click', (e) => {
                const filterOption = e.target.closest('.filter-option');
                if (filterOption) {
                    filterOption.classList.toggle('active');
                    applyFiltersAndSort();
                }
            });
        }
    });

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderProducts();
    });

    // Populate all filters on initial load
    populateBrandFilter();
    populateOptionFilter(colorFilterContainer, 'color');
    populateOptionFilter(sizeFilterContainer, 'size');
    applyFiltersAndSort();
    } // End of productGrid check

    /* ===== HERO SLIDER LOGIC ===== */
    const initHeroSlider = () => {
        const sliderContainer = document.querySelector('.hero-slider');
        if (!sliderContainer) return;

        const slides = sliderContainer.querySelectorAll('.slide');
        const dotsContainer = sliderContainer.querySelector('.slider-dots');
        const navContainer = sliderContainer.querySelector('.slider-nav');

        if (!dotsContainer || slides.length <= 1) return;

        let currentSlide = 0;
        const slideInterval = 5000;
        let slideTimer;

        dotsContainer.innerHTML = ''; // Clear previous dots
        
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
        const dots = dotsContainer.querySelectorAll('.dot');

        const goToSlide = (slideIndex) => {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            currentSlide = (slideIndex + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        };

        const resetInterval = () => {
            clearInterval(slideTimer);
            slideTimer = setInterval(() => goToSlide(currentSlide + 1), slideInterval);
        };

        if (navContainer) {
            sliderContainer.querySelector('.next-btn')?.addEventListener('click', () => { goToSlide(currentSlide + 1); resetInterval(); });
            sliderContainer.querySelector('.prev-btn')?.addEventListener('click', () => { goToSlide(currentSlide - 1); resetInterval(); });
        }

        resetInterval();
    };
    initHeroSlider();

    /* ===== TRENDING PRODUCTS SLIDER ===== */
    const productSliderTrack = document.getElementById('productSliderTrack');
    if (productSliderTrack && typeof products !== 'undefined') {
        const featured = products.filter(p => p.rating >= 4.5).slice(0, 10);
        productSliderTrack.innerHTML = featured.map(product => `
            <div class="product-card slider-card">
                <div class="product-img-container">
                     <a href="product.html?id=${product.id}">
                        <img src="${product.img}" alt="${product.name}" class="product-img">
                    </a>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h4 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h4>
                    <div class="product-price">
                        <span class="price-current">KSh ${product.price.toFixed(2)}</span>
                    </div>
                    <button class="add-to-cart" data-id="${product.id}" style="width:100%; margin-top:0.5rem;">Add to Cart</button>
                </div>
            </div>
        `).join('');

        const prevBtn = document.getElementById('sliderPrev');
        const nextBtn = document.getElementById('sliderNext');

        if (prevBtn && nextBtn) {
            nextBtn.addEventListener('click', () => productSliderTrack.scrollBy({ left: 300, behavior: 'smooth' }));
            prevBtn.addEventListener('click', () => productSliderTrack.scrollBy({ left: -300, behavior: 'smooth' }));
        }
    }

    /* ===== VIDEO PLAYER LOGIC ===== */
    const videoPlayer = document.querySelector('.video-promo-player');
    if (videoPlayer) {
        const video = document.getElementById('promoVideo');
        const playBtn = videoPlayer.querySelector('.video-play-btn');

        videoPlayer.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                videoPlayer.classList.add('playing');
            } else {
                video.pause();
                videoPlayer.classList.remove('playing');
            }
        });
    }

    /* ===== SCROLL FADE-IN ANIMATION ===== */
    const animatedSections = document.querySelectorAll('.fade-in-section');
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedSections.forEach(section => sectionObserver.observe(section));

    /* ===== COUNTDOWN TIMER ===== */
    const daysEl = document.getElementById('days');
    if (daysEl) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 2); // 2 days from now

        const updateCountdown = () => {
            const now = new Date();
            const diff = endDate - now;
            if (diff <= 0) return;

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        };
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }
});