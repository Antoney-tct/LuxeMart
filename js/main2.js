// This file handles logic specific to the product grid pages (index.html, shop.html)
// It depends on products.js and common.js being loaded first.

document.addEventListener('DOMContentLoaded', () => {

    // === STATE MANAGEMENT ===
    const urlParams = new URLSearchParams(window.location.search);
    let currentFilter = urlParams.get('category') || 'all';
    let currentPage = 1;
    const productsPerPage = 24;
    let currentSort = 'default';
    let currentSearchTerm = urlParams.get('search') || '';

    const isSalePage = window.location.pathname.includes('sale.html');

    // Update UI active state for filters based on URL
    if (currentFilter !== 'all') {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === currentFilter);
        });
    }

    // === RENDER LOGIC ===
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

    const renderProducts = () => {
        const grid = document.getElementById('featuredProductsGrid');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        if (!grid || typeof products === 'undefined') return;

        let filteredProducts = [...products];

        if (currentFilter !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === currentFilter);
        }

        if (isSalePage) {
            filteredProducts = filteredProducts.filter(p => p.oldPrice);
        }

        if (currentSearchTerm) {
            const searchTerm = currentSearchTerm.toLowerCase();
            filteredProducts = filteredProducts.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.brand.toLowerCase().includes(searchTerm)
            );
        }

        if (currentSort === 'price-low-to-high') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'price-high-to-low') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (currentSort === 'rating') {
            filteredProducts.sort((a, b) => b.rating - a.rating);
        } else {
            filteredProducts.sort((a, b) => a.id - b.id);
        }

        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const paginatedProducts = filteredProducts.slice(start, end);

        const productsHtml = paginatedProducts.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-img-container">
                    <a href="product.html?id=${product.id}" class="product-img-link">
                        <img src="${product.img}" alt="${product.name}" class="product-img">
                    </a>
                    ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                    <div class="product-actions">
                        <button class="product-action-btn wishlist-btn" data-id="${product.id}">
                            <i class="${wishlist.includes(product.id.toString()) ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                        <button class="product-action-btn quickview-btn" data-id="${product.id}">
                            <i class="far fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h4 class="product-title">
                        <a href="product.html?id=${product.id}">${product.name}</a>
                    </h4>
                    <div class="product-rating">
                        <div class="stars">${getStarRating(product.rating)}</div>
                        <span class="rating-count">(${product.reviews})</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">KSh ${product.price.toFixed(2)}</span>
                        ${product.oldPrice ? `<span class="price-old">KSh ${product.oldPrice.toFixed(2)}</span>` : ''}
                    </div>
                    <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');

        if (currentPage === 1) {
            grid.innerHTML = productsHtml;
        } else {
            grid.innerHTML += productsHtml;
        }

        if (loadMoreBtn) {
            if (filteredProducts.length > end) {
                loadMoreBtn.style.display = 'inline-block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    };

    // === EVENT LISTENERS ===

    // Filter Button Event Listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter;
            currentSearchTerm = ''; // Clear search when changing category
            document.getElementById('searchInput').value = ''; // Clear search input field
            currentPage = 1;
            renderProducts();
        });
    });

    // Sort options
    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            currentPage = 1;
            renderProducts();
        });
    }

    // Load More Button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            const originalText = loadMoreBtn.innerHTML;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            loadMoreBtn.disabled = true;

            // Simulate delay for better UX
            setTimeout(() => {
                currentPage++;
                renderProducts();
                loadMoreBtn.innerHTML = originalText;
                loadMoreBtn.disabled = false;
            }, 800);
        });
    }

    // === SCROLL ANIMATION LOGIC ===
    const animatedSections = document.querySelectorAll('.fade-in-section');
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // === HERO SLIDER LOGIC ===
    function initHeroSlider() {
        const sliderContainer = document.querySelector('.hero-slider');
        if (!sliderContainer) return;

        const slides = sliderContainer.querySelectorAll('.slide');
        const dotsContainer = sliderContainer.querySelector('.slider-dots');
        const navContainer = sliderContainer.querySelector('.slider-nav');

        if (!dotsContainer || !navContainer || slides.length <= 1) {
            if (dotsContainer) dotsContainer.style.display = 'none';
            if (navContainer) navContainer.style.display = 'none';
            if (slides.length > 0) slides[0].classList.add('active'); // Ensure first slide is visible
            return;
        }

        let currentSlide = 0;
        const slideInterval = 5000;
        let slideTimer;

        dotsContainer.innerHTML = ''; // Clear previous dots
        dotsContainer.style.display = 'flex';
        navContainer.style.display = 'flex';

        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
        const dots = dotsContainer.querySelectorAll('.dot');

        const goToSlide = (slideIndex) => {
            if (slides[currentSlide]) slides[currentSlide].classList.remove('active');
            if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
            currentSlide = (slideIndex + slides.length) % slides.length;
            if (slides[currentSlide]) slides[currentSlide].classList.add('active');
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        };

        const resetInterval = () => {
            clearInterval(slideTimer);
            slideTimer = setInterval(() => goToSlide(currentSlide + 1), slideInterval);
        };

        sliderContainer.querySelector('.next-btn')?.addEventListener('click', () => { goToSlide(currentSlide + 1); resetInterval(); });
        sliderContainer.querySelector('.prev-btn')?.addEventListener('click', () => { goToSlide(currentSlide - 1); resetInterval(); });

        goToSlide(0); // Initialize first slide
        resetInterval(); // Start the timer
    }
    window.initHeroSlider = initHeroSlider;

    // Auto-initialize slider on pages that have it hardcoded (like index.html)
    if (document.querySelector('.slider-wrapper') && document.querySelector('.slider-wrapper').children.length > 0) {
        initHeroSlider();
    }

    // === VIDEO PROMO LOGIC ===
    const videoPlayer = document.querySelector('.video-promo-player');
    if (videoPlayer) {
        const video = document.getElementById('promoVideo');
        const playBtn = videoPlayer.querySelector('.video-play-btn');

        videoPlayer.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                videoPlayer.classList.add('playing');
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                video.pause();
                videoPlayer.classList.remove('playing');
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }

    // === COUNTDOWN LOGIC ===
    const daysEl = document.getElementById('days');
    if (daysEl) {
        // Set timer for 2 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 2); 

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

    // Initial calls
    renderProducts();

    // === PRODUCT SLIDER LOGIC ===
    const renderProductSlider = () => {
        const sliderTrack = document.getElementById('productSliderTrack');
        if (!sliderTrack || typeof products === 'undefined') return;

        // Select top rated products (rating >= 4.5)
        const featured = products.filter(p => p.rating >= 4.5).slice(0, 10);

        sliderTrack.innerHTML = featured.map(product => `
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
            nextBtn.addEventListener('click', () => {
                sliderTrack.scrollBy({ left: 300, behavior: 'smooth' });
            });
            prevBtn.addEventListener('click', () => {
                sliderTrack.scrollBy({ left: -300, behavior: 'smooth' });
            });
        }
    };
    renderProductSlider();

    // === QUICK VIEW LOGIC ===
    const qvModal = document.getElementById('quickViewModal');
    const closeQV = document.getElementById('closeQuickView');

    if (qvModal && closeQV) {
        document.addEventListener('click', e => {
            const qvBtn = e.target.closest('.quickview-btn');
            if (qvBtn) {
                const productId = parseInt(qvBtn.dataset.id);
                const product = products.find(p => p.id === productId);
                
                if (product) {
                    document.getElementById('qvImg').src = product.img;
                    document.getElementById('qvTitle').textContent = product.name;
                    document.getElementById('qvPrice').textContent = `KSh ${product.price.toFixed(2)}`;
                    document.getElementById('qvDesc').textContent = product.desc;
                    document.getElementById('qvStars').innerHTML = getStarRating(product.rating);
                    document.getElementById('qvRatingCount').textContent = `(${product.reviews} reviews)`;
                    document.getElementById('qvAddToCart').dataset.id = product.id;
                    qvModal.classList.add('show');
                }
            }
        });

        closeQV.addEventListener('click', () => qvModal.classList.remove('show'));
    }
});