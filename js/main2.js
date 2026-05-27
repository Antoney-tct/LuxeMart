/**
 * LuxeMart — main2.js  (fixed)
 * Product grid, filtering, sorting, hero slider, countdown,
 * scroll animations. Works with BOTH static products.js array
 * AND the live API — falls back to static gracefully on XAMPP
 * before the DB is seeded.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. LOAD PRODUCTS ────────────────────────────────────────
    // Try API first; fall back to window.products (products.js static array)
    async function loadProducts () {
        try {
            const res = await fetch('api/products/get.php?limit=48');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.products) && data.products.length > 0) {
                    // Normalise API shape to match products.js shape
                    window.products = data.products.map(p => ({
                        ...p,
                        img:      p.img      || p.image_url,
                        desc:     p.desc     || p.description,
                        oldPrice: p.oldPrice || p.original_price || null,
                        reviews:  p.reviews  || p.reviews_count  || 0,
                        inStock:  p.stock > 0,
                        onSale:   !!(p.oldPrice || p.original_price),
                        colors:   Array.isArray(p.colors) ? p.colors : [],
                        sizes:    Array.isArray(p.sizes)  ? p.sizes  : [],
                    }));
                    return;
                }
            }
        } catch (e) {
            // API not available (e.g. plain file server / GitHub Pages)
        }
        // Fallback: use static array already loaded by products.js
        if (!window.products || !window.products.length) {
            console.warn('main2.js: no products source available');
        }
    }

    await loadProducts();

    const allProducts = window.products || [];

    // ── 2. DOM REFS ──────────────────────────────────────────────
    const grid         = document.getElementById('featuredProductsGrid');
    const loadMoreBtn  = document.getElementById('loadMoreBtn');
    const sortSelect   = document.getElementById('sort');
    const filterBtns   = document.querySelectorAll('.filter-btn');
    const brandFilter  = document.getElementById('brandFilter');
    const minPrice     = document.getElementById('minPrice');
    const maxPrice     = document.getElementById('maxPrice');
    const ratingFilter = document.getElementById('ratingFilter');
    const colorFilter  = document.getElementById('colorFilter');
    const sizeFilter   = document.getElementById('sizeFilter');
    const inStockChk   = document.getElementById('inStockFilter');
    const onSaleChk    = document.getElementById('onSaleFilter');
    const sliderTrack  = document.getElementById('productSliderTrack');

    // ── 3. STATE ─────────────────────────────────────────────────
    const PER_PAGE      = 12;
    let   currentPage   = 1;
    let   currentCat    = 'all';
    let   currentSort   = 'popularity';
    let   activeColors  = [];
    let   activeSizes   = [];

    // ── 4. HELPERS ───────────────────────────────────────────────
    const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    function stars (rating) {
        let h = '';
        for (let i = 1; i <= 5; i++) {
            if (rating >= i)         h += '<i class="fas fa-star"></i>';
            else if (rating >= i-0.5) h += '<i class="fas fa-star-half-alt"></i>';
            else                      h += '<i class="far fa-star"></i>';
        }
        return h;
    }

    // ── 5. FILTER PIPELINE ───────────────────────────────────────
    function getFiltered () {
        let list = [...allProducts];

        if (currentCat !== 'all') list = list.filter(p => p.category === currentCat);

        if (brandFilter?.value && brandFilter.value !== 'all')
            list = list.filter(p => p.brand === brandFilter.value);

        const min = parseFloat(minPrice?.value) || 0;
        const max = parseFloat(maxPrice?.value) || Infinity;
        list = list.filter(p => p.price >= min && p.price <= max);

        const minR = parseFloat(ratingFilter?.value) || 0;
        if (minR) list = list.filter(p => p.rating >= minR);

        if (activeColors.length)
            list = list.filter(p => activeColors.some(c => (p.colors || []).includes(c)));

        if (activeSizes.length)
            list = list.filter(p => activeSizes.some(s => (p.sizes || []).includes(s)));

        if (inStockChk?.checked) list = list.filter(p => p.inStock || p.stock > 0);
        if (onSaleChk?.checked)  list = list.filter(p => p.onSale  || p.oldPrice || p.original_price);

        // Sort
        switch (currentSort) {
            case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
            case 'price-desc': list.sort((a,b) => b.price - a.price); break;
            case 'rating':     list.sort((a,b) => b.rating - a.rating); break;
            case 'newest':     list.sort((a,b) => b.id - a.id); break;
            default:           list.sort((a,b) => (b.reviews||0) - (a.reviews||0));
        }

        return list;
    }

    // ── 6. PRODUCT CARD HTML ─────────────────────────────────────
    function productCard (p) {
        const oldP    = p.oldPrice || p.original_price;
        const discount = oldP ? Math.round((1 - p.price / oldP) * 100) : 0;
        const badge   = p.badge ? `<div class="product-badge">${p.badge}</div>` : '';
        const inStock  = p.inStock !== undefined ? p.inStock : (p.stock > 0);

        return `
        <div class="product-card" data-id="${p.id}">
            <div class="product-img-container" style="position:relative;height:220px;overflow:hidden;">
                ${badge}
                ${discount > 0 ? `<div class="product-badge" style="left:auto;right:1rem;background:#ef4444;">-${discount}%</div>` : ''}
                <a href="product.html?id=${p.id}">
                    <img src="${p.img || p.image_url}" alt="${p.name}"
                         class="product-img" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300?text=?'"
                         style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s ease;">
                </a>
                <div class="product-actions">
                    <button class="product-action-btn quick-view-btn" data-id="${p.id}" title="Quick View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="product-action-btn wishlist-btn" data-id="${p.id}" title="Wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                ${!inStock ? '<div style="position:absolute;inset:0;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;"><span style="background:#333;color:white;padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:700;">Out of Stock</span></div>' : ''}
            </div>
            <div class="product-info">
                <div class="product-brand">${p.brand || ''}</div>
                <h4 class="product-title">
                    <a href="product.html?id=${p.id}" style="color:inherit;">${p.name}</a>
                </h4>
                <div class="product-rating">
                    <div class="stars">${stars(p.rating || 4.5)}</div>
                    <span class="rating-count">(${p.reviews || p.reviews_count || 0})</span>
                </div>
                <div class="product-price">
                    <span class="price-current">${fmt(p.price)}</span>
                    ${oldP ? `<span class="price-old">${fmt(oldP)}</span>` : ''}
                </div>
                <button class="add-to-cart" data-id="${p.id}" ${!inStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                    <i class="fas fa-shopping-bag"></i>
                    ${inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>`;
    }

    // ── 7. RENDER GRID ───────────────────────────────────────────
    function renderProducts (reset = true) {
        if (!grid) return;
        if (reset) currentPage = 1;

        const filtered = getFiltered();
        const slice    = filtered.slice(0, currentPage * PER_PAGE);

        if (reset) grid.innerHTML = '';

        if (!filtered.length) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;color:var(--muted);">
                    <i class="fas fa-search" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:1rem;"></i>
                    <h3>No products found</h3>
                    <p style="margin-top:0.5rem;">Try adjusting your filters.</p>
                </div>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        if (reset) {
            grid.innerHTML = slice.map(productCard).join('');
        } else {
            const start = (currentPage - 1) * PER_PAGE;
            filtered.slice(start, currentPage * PER_PAGE).forEach(p => {
                grid.insertAdjacentHTML('beforeend', productCard(p));
            });
        }

        if (loadMoreBtn) {
            loadMoreBtn.style.display = slice.length < filtered.length ? 'block' : 'none';
        }
    }

    // ── 8. POPULATE FILTERS ──────────────────────────────────────
    function buildFilters () {
        // Brands
        if (brandFilter) {
            const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
            brandFilter.innerHTML = '<option value="all">All Brands</option>' +
                brands.map(b => `<option value="${b}">${b}</option>`).join('');
        }

        // Colors
        if (colorFilter) {
            const colors = [...new Set(allProducts.flatMap(p => p.colors || []))].filter(Boolean).sort();
            colorFilter.innerHTML = colors.map(c =>
                `<button class="filter-option" data-value="${c}">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.toLowerCase()};border:1px solid rgba(0,0,0,0.15);margin-right:4px;"></span>${c}
                </button>`
            ).join('');

            colorFilter.addEventListener('click', e => {
                const btn = e.target.closest('.filter-option');
                if (!btn) return;
                btn.classList.toggle('active');
                activeColors = [...colorFilter.querySelectorAll('.filter-option.active')].map(b => b.dataset.value);
                renderProducts(true);
            });
        }

        // Sizes
        if (sizeFilter) {
            const sizes = [...new Set(allProducts.flatMap(p => p.sizes || []))].filter(Boolean);
            sizeFilter.innerHTML = sizes.map(s =>
                `<button class="filter-option" data-value="${s}">${s}</button>`
            ).join('');

            sizeFilter.addEventListener('click', e => {
                const btn = e.target.closest('.filter-option');
                if (!btn) return;
                btn.classList.toggle('active');
                activeSizes = [...sizeFilter.querySelectorAll('.filter-option.active')].map(b => b.dataset.value);
                renderProducts(true);
            });
        }
    }

    // ── 9. URL PARAMS (category pre-filter, search) ──────────────
    function applyUrlParams () {
        const params = new URLSearchParams(window.location.search);
        const cat    = params.get('category');
        const search = params.get('search');

        if (cat) {
            currentCat = cat;
            filterBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.filter === cat);
            });
        }

        if (search && allProducts.length) {
            const q = search.toLowerCase();
            // Temporary search filter applied once
            const orig = getFiltered;
            window._searchFilter = q;
        }
    }

    // ── 10. WIRE EVENTS ──────────────────────────────────────────
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCat = btn.dataset.filter || 'all';
            renderProducts(true);
        });
    });

    sortSelect?.addEventListener('change', () => {
        currentSort = sortSelect.value;
        renderProducts(true);
    });

    [brandFilter, ratingFilter, inStockChk, onSaleChk].forEach(el => {
        el?.addEventListener('change', () => renderProducts(true));
    });

    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    minPrice?.addEventListener('input', debounce(() => renderProducts(true), 350));
    maxPrice?.addEventListener('input', debounce(() => renderProducts(true), 350));

    loadMoreBtn?.addEventListener('click', () => {
        currentPage++;
        renderProducts(false);
    });

    // ── 11. TRENDING SLIDER ──────────────────────────────────────
    function buildSlider () {
        if (!sliderTrack || !allProducts.length) return;

        const top = [...allProducts].sort((a,b) => b.rating - a.rating).slice(0, 10);

        sliderTrack.innerHTML = top.map(p => `
            <div class="product-card slider-card" style="flex:0 0 260px;">
                <div class="product-img-container" style="height:180px;overflow:hidden;">
                    <a href="product.html?id=${p.id}">
                        <img src="${p.img || p.image_url}" alt="${p.name}" class="product-img" loading="lazy"
                             style="width:100%;height:100%;object-fit:cover;"
                             onerror="this.src='https://via.placeholder.com/260x180?text=?'">
                    </a>
                    ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.brand}</div>
                    <h4 class="product-title"><a href="product.html?id=${p.id}" style="color:inherit;">${p.name}</a></h4>
                    <div class="product-price">
                        <span class="price-current">${fmt(p.price)}</span>
                    </div>
                    <button class="add-to-cart" data-id="${p.id}" style="width:100%;margin-top:0.5rem;">
                        <i class="fas fa-shopping-bag"></i> Add to Cart
                    </button>
                </div>
            </div>
        `).join('');

        document.getElementById('sliderPrev')?.addEventListener('click', () =>
            sliderTrack.scrollBy({ left: -280, behavior: 'smooth' })
        );
        document.getElementById('sliderNext')?.addEventListener('click', () =>
            sliderTrack.scrollBy({ left: 280, behavior: 'smooth' })
        );
    }

    // ── 12. HERO SLIDER ──────────────────────────────────────────
    function initHeroSlider () {
        const container = document.querySelector('.hero-slider');
        if (!container) return;

        const slides = container.querySelectorAll('.slide');
        const dots   = container.querySelector('.slider-dots');
        if (!slides.length) return;

        let cur = 0, timer;

        if (dots) {
            slides.forEach((_, i) => {
                const d = document.createElement('button');
                d.className = 'dot' + (i === 0 ? ' active' : '');
                d.setAttribute('aria-label', `Slide ${i + 1}`);
                d.addEventListener('click', () => go(i));
                dots.appendChild(d);
            });
        }

        function go (idx) {
            slides[cur].classList.remove('active');
            dots?.children[cur]?.classList.remove('active');
            cur = (idx + slides.length) % slides.length;
            slides[cur].classList.add('active');
            dots?.children[cur]?.classList.add('active');
            reset();
        }

        function reset () {
            clearInterval(timer);
            timer = setInterval(() => go(cur + 1), 5500);
        }

        container.querySelector('.prev-btn')?.addEventListener('click', () => go(cur - 1));
        container.querySelector('.next-btn')?.addEventListener('click', () => go(cur + 1));
        reset();
    }

    // ── 13. COUNTDOWN ────────────────────────────────────────────
    function initCountdown () {
        const end = new Date();
        end.setDate(end.getDate() + 3);
        end.setHours(23, 59, 59, 0);

        function tick () {
            const diff = end - Date.now();
            if (diff <= 0) return;
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000)  / 60000);
            const s = Math.floor((diff % 60000)    / 1000);
            const pad = n => String(n).padStart(2, '0');
            const el = id => document.getElementById(id);
            if (el('days'))    el('days').textContent    = pad(d);
            if (el('hours'))   el('hours').textContent   = pad(h);
            if (el('minutes')) el('minutes').textContent = pad(m);
            if (el('seconds')) el('seconds').textContent = pad(s);
        }
        tick();
        setInterval(tick, 1000);
    }

    // ── 14. SCROLL ANIMATIONS ────────────────────────────────────
    function initScrollAnim () {
        const els = document.querySelectorAll('.fade-in-section');
        if (!els.length) return;
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
            });
        }, { threshold: 0.08 });
        els.forEach(el => obs.observe(el));
    }

    // ── 15. QUICK VIEW ───────────────────────────────────────────
    document.addEventListener('click', e => {
        const btn = e.target.closest('.quick-view-btn');
        if (!btn) return;

        const p = allProducts.find(x => x.id == btn.dataset.id);
        if (!p) return;

        const modal = document.getElementById('quickViewModal');
        if (!modal) return;

        const img   = modal.querySelector('#qvImg')        || modal.querySelector('img');
        const title = modal.querySelector('#qvTitle')      || modal.querySelector('h3');
        const price = modal.querySelector('#qvPrice');
        const desc  = modal.querySelector('#qvDesc');
        const atc   = modal.querySelector('#qvAddToCart')  || modal.querySelector('.add-to-cart');

        if (img)   { img.src = p.img || p.image_url; img.alt = p.name; }
        if (title) title.textContent = p.name;
        if (price) price.innerHTML   = `<span class="price-current">${fmt(p.price)}</span>`;
        if (desc)  desc.textContent  = p.desc || p.description || '';
        if (atc)   atc.dataset.id   = p.id;

        modal.classList.add('show');
    });

    document.getElementById('closeQuickView')?.addEventListener('click', () => {
        document.getElementById('quickViewModal')?.classList.remove('show');
    });

    // ── 16. NEWSLETTER ───────────────────────────────────────────
    document.querySelectorAll('.newsletter-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]')?.value?.trim();
            if (email) {
                window.showToast?.('🎉 Subscribed! Check your inbox.', 'success');
                form.reset();
            }
        });
    });

    // ── 17. BOOT ─────────────────────────────────────────────────
    applyUrlParams();
    buildFilters();
    renderProducts(true);
    buildSlider();
    initHeroSlider();
    initCountdown();
    initScrollAnim();
});
