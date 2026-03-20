document.addEventListener('DOMContentLoaded', () => {
    // This file handles all dynamic page logic for LuxeMart.
    // It includes product filtering, sliders, video players, and animations.
    // Common functionalities like dark mode, modals, and cart are in common.js and cart.js.

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
        let productsPerPage = 12;
        let currentPage = 1;
        let currentFilteredProducts = [];

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
            if (!brandFilter) return;
            const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
            brandFilter.innerHTML += brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
        };

        const populateOptionFilter = (container, attribute) => {
            if (!container) return;
            const allValues = [...new Set(products.flatMap(p => p[attribute] || []))].sort();
        
            container.innerHTML = allValues.map(value => {
                const colorSwatch = attribute === 'color' 
                    ? `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${value.toLowerCase()}; border: 1px solid #ccc;"></span>` 
                    : '';
                return `<button class="filter-option" data-value="${value}">${colorSwatch} ${value}</button>`;
            }).join('');
        };

        const renderProducts = () => {
            const productsToDisplay = currentFilteredProducts.slice(0, currentPage * productsPerPage);

            if (productsToDisplay.length === 0) {
                productGrid.innerHTML = `<p class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: var(--light-text);">No products match your criteria.</p>`;
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            productGrid.innerHTML = productsToDisplay.map(p => {
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

        // Handle "Load More" button visibility
        if (productsToDisplay.length < currentFilteredProducts.length) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    };

    const applyFiltersAndSort = () => {
        let processedProducts = [...products];

            // 1. Search Filter
            if (currentSearchTerm) {
                const term = currentSearchTerm.toLowerCase();
                processedProducts = processedProducts.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.brand.toLowerCase().includes(term) ||
                    p.category.toLowerCase().includes(term)
                );
            }

        if (currentCategory !== 'all') {
            processedProducts = processedProducts.filter(p => p.category === currentCategory);
        }

        const brand = brandFilter ? brandFilter.value : 'all';
        const minPrice = minPriceInput ? parseFloat(minPriceInput.value) : NaN;
        const maxPrice = maxPriceInput ? parseFloat(maxPriceInput.value) : NaN;
        const minRating = ratingFilter ? parseFloat(ratingFilter.value) : 0;
        const inStock = inStockFilter ? inStockFilter.checked : false;
        const onSale = onSaleFilter ? onSaleFilter.checked : false;
        const selectedColors = colorFilterContainer ? [...colorFilterContainer.querySelectorAll('.filter-option.active')].map(el => el.dataset.value) : [];
        const selectedSizes = sizeFilterContainer ? [...sizeFilterContainer.querySelectorAll('.filter-option.active')].map(el => el.dataset.value) : [];

        processedProducts = processedProducts.filter(p => {
            if (brand !== 'all' && p.brand !== brand) return false;
            if (!isNaN(minPrice) && p.price < minPrice) return false;
            if (!isNaN(maxPrice) && p.price > maxPrice) return false;
            if (p.rating < minRating) return false;
            if (selectedColors.length > 0 && (!p.color || !p.color.some(c => selectedColors.includes(c)))) return false;
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

        currentFilteredProducts = processedProducts;
        currentPage = 1; // Reset to first page on any filter change
        renderProducts();
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