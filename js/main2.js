// ============================================================
//  LuxeMart — main2.js
//  ONLY handles: product rendering, filtering, sorting,
//  quick view, trending slider, hero slider, countdown,
//  scroll animations, video player
//  (Search, cart UI, theme, mobile menu handled by common.js)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. CONSTANTS & STATE ──────────────────────────────────
  const PRODUCTS_PER_PAGE = 12;
  let currentFilter  = 'all';
  let currentSort    = 'popularity';
  let currentPage    = 1;
  let activeColors   = [];
  let activeSizes    = [];

  // ── 2. DOM REFS ───────────────────────────────────────────
  const grid        = document.getElementById('featuredProductsGrid');
  const sliderTrack = document.getElementById('productSliderTrack');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const sortSelect  = document.getElementById('sort');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const brandFilter = document.getElementById('brandFilter');
  const minPrice    = document.getElementById('minPrice');
  const maxPrice    = document.getElementById('maxPrice');
  const ratingFilter= document.getElementById('ratingFilter');
  const colorFilter = document.getElementById('colorFilter');
  const sizeFilter  = document.getElementById('sizeFilter');
  const inStockChk  = document.getElementById('inStockFilter');
  const onSaleChk   = document.getElementById('onSaleFilter');

  // ── 3. HELPERS ────────────────────────────────────────────
  const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  function stars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) html += '<i class="fas fa-star"></i>';
      else if (rating >= i - 0.5) html += '<i class="fas fa-star-half-alt"></i>';
      else html += '<i class="far fa-star"></i>';
    }
    return html;
  }

  function discountBadge(orig, sale) {
    if (!orig) return '';
    return `<span class="discount-badge">-${Math.round((1 - sale/orig)*100)}%</span>`;
  }

  // ── 4. BUILD FILTER OPTIONS ───────────────────────────────
  function buildFilterOptions() {
    if (!window.products) return;

    if (brandFilter) {
      const brands = [...new Set(window.products.map(p => p.brand))].sort();
      brands.forEach(b => {
        const o = document.createElement('option');
        o.value = b; o.textContent = b;
        brandFilter.appendChild(o);
      });
    }

    if (colorFilter) {
      const colors = [...new Set(window.products.flatMap(p => p.colors))].filter(Boolean).sort();
      colors.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag'; btn.textContent = c; btn.dataset.value = c;
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          activeColors = [...colorFilter.querySelectorAll('.filter-tag.active')].map(b => b.dataset.value);
          renderProducts();
        });
        colorFilter.appendChild(btn);
      });
    }

    if (sizeFilter) {
      const sizes = [...new Set(window.products.flatMap(p => p.sizes))].filter(Boolean);
      sizes.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag'; btn.textContent = s; btn.dataset.value = s;
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          activeSizes = [...sizeFilter.querySelectorAll('.filter-tag.active')].map(b => b.dataset.value);
          renderProducts();
        });
        sizeFilter.appendChild(btn);
      });
    }
  }

  // ── 5. FILTER + SORT PIPELINE ─────────────────────────────
  function getFilteredProducts() {
    if (!window.products) return [];
    let list = [...window.products];

    if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);
    if (brandFilter && brandFilter.value !== 'all') list = list.filter(p => p.brand === brandFilter.value);

    const min = parseFloat(minPrice?.value) || 0;
    const max = parseFloat(maxPrice?.value) || Infinity;
    list = list.filter(p => p.price >= min && p.price <= max);

    const minRating = parseFloat(ratingFilter?.value) || 0;
    if (minRating) list = list.filter(p => p.rating >= minRating);

    if (activeColors.length) list = list.filter(p => activeColors.some(c => p.colors.includes(c)));
    if (activeSizes.length)  list = list.filter(p => activeSizes.some(s => p.sizes.includes(s)));
    if (inStockChk?.checked) list = list.filter(p => p.inStock);
    if (onSaleChk?.checked)  list = list.filter(p => p.onSale);

    switch (currentSort) {
      case 'price-asc':  list.sort((a,b) => a.price - b.price); break;
      case 'price-desc': list.sort((a,b) => b.price - a.price); break;
      case 'rating':     list.sort((a,b) => b.rating - a.rating); break;
      case 'newest':     list.sort((a,b) => b.id - a.id); break;
      default:           list.sort((a,b) => b.reviews - a.reviews);
    }
    return list;
  }

  // ── 6. PRODUCT CARD HTML ──────────────────────────────────
  function productCard(p) {
    const badge = p.badge ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '';
    const origPrice = p.originalPrice ? `<span class="original-price">${fmt(p.originalPrice)}</span>` : '';
    return `
      <div class="product-card" data-id="${p.id}" data-category="${p.category}">
        <div class="product-img-wrapper">
          ${badge}
          <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
          <div class="product-overlay">
            <button class="overlay-btn quick-view-btn" data-id="${p.id}" title="Quick View"><i class="fas fa-eye"></i></button>
            <button class="overlay-btn wishlist-btn" data-id="${p.id}" title="Add to Wishlist"><i class="far fa-heart"></i></button>
            <button class="overlay-btn add-to-cart-overlay" data-id="${p.id}" title="Add to Cart"><i class="fas fa-shopping-bag"></i></button>
          </div>
        </div>
        <div class="product-info">
          <p class="product-brand">${p.brand}</p>
          <h3 class="product-name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <div class="product-rating">
            <div class="stars">${stars(p.rating)}</div>
            <span class="rating-count">(${p.reviews})</span>
          </div>
          <div class="product-price">
            <span class="current-price">${fmt(p.price)}</span>
            ${origPrice}
            ${discountBadge(p.originalPrice, p.price)}
          </div>
          <button class="btn-add-cart" data-id="${p.id}" ${!p.inStock?'disabled':''}>
            <i class="fas fa-shopping-bag"></i> ${p.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>`;
  }

  // ── 7. RENDER PRODUCTS GRID ───────────────────────────────
  function renderProducts(reset = true) {
    if (!grid) return;
    if (reset) currentPage = 1;

    const filtered = getFilteredProducts();
    const slice    = filtered.slice(0, currentPage * PRODUCTS_PER_PAGE);

    if (reset) grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="no-products" style="grid-column:1/-1;text-align:center;padding:4rem;color:#888;">
        <i class="fas fa-search" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
        <h3>No products found</h3><p>Try adjusting your filters.</p></div>`;
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    if (reset) {
      slice.forEach(p => grid.innerHTML += productCard(p));
    } else {
      const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
      filtered.slice(start, currentPage * PRODUCTS_PER_PAGE).forEach(p => grid.innerHTML += productCard(p));
    }

    if (loadMoreBtn) {
      loadMoreBtn.style.display = slice.length < filtered.length ? 'inline-flex' : 'none';
    }

    attachCardEvents();
  }

  // ── 8. CARD EVENTS ────────────────────────────────────────
  function attachCardEvents() {
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const p = window.products.find(x => x.id == btn.dataset.id);
        if (p) openQuickView(p);
      };
    });

    document.querySelectorAll('.btn-add-cart, .add-to-cart-overlay').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const p = window.products.find(x => x.id == btn.dataset.id);
        if (p && p.inStock) {
          if (typeof addToCart === 'function') addToCart(p);
          if (typeof window.showToast === 'function') window.showToast(`${p.name} added to cart!`, 'success');
        }
      };
    });
  }

  // ── 9. QUICK VIEW MODAL ───────────────────────────────────
  function openQuickView(p) {
    const modal = document.getElementById('quickViewModal');
    if (!modal) return;

    document.getElementById('qvImg').src  = p.img;
    document.getElementById('qvImg').alt  = p.name;
    document.getElementById('qvTitle').textContent = p.name;
    document.getElementById('qvStars').innerHTML   = stars(p.rating);
    document.getElementById('qvRatingCount').textContent = `(${p.reviews} reviews)`;
    document.getElementById('qvDesc').textContent  = p.desc;
    document.getElementById('qvQty').textContent   = '1';

    const priceEl = document.getElementById('qvPrice');
    priceEl.innerHTML = `<span class="current-price">${fmt(p.price)}</span>`;
    if (p.originalPrice) priceEl.innerHTML += ` <span class="original-price">${fmt(p.originalPrice)}</span> ${discountBadge(p.originalPrice, p.price)}`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.querySelectorAll('#quickViewModal .qty-btn').forEach(btn => {
      btn.onclick = () => {
        const qEl = document.getElementById('qvQty');
        let q = parseInt(qEl.textContent);
        if (btn.dataset.action === 'increase') q++;
        else if (q > 1) q--;
        qEl.textContent = q;
      };
    });

    const qvAdd = document.getElementById('qvAddToCart');
    if (qvAdd) {
      qvAdd.onclick = () => {
        const qty = parseInt(document.getElementById('qvQty').textContent);
        for (let i = 0; i < qty; i++) {
          if (typeof addToCart === 'function') addToCart(p);
        }
        if (typeof window.showToast === 'function') window.showToast(`${p.name} added to cart!`, 'success');
        modal.classList.remove('active');
        document.body.style.overflow = '';
      };
    }

    // Close quick view
    document.getElementById('closeQuickView').onclick = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };
    modal.onclick = (e) => {
      if (e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    };
  }

  // ── 10. TRENDING SLIDER ───────────────────────────────────
  function buildTrendingSlider() {
    if (!sliderTrack || !window.products) return;
    const trending = [...window.products].sort((a,b) => b.rating - a.rating).slice(0, 10);

    sliderTrack.innerHTML = trending.map(p => `
      <div class="product-slide">
        <div class="product-card">
          <div class="product-img-wrapper">
            ${p.badge ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
            <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
            <div class="product-overlay">
              <button class="overlay-btn quick-view-btn" data-id="${p.id}"><i class="fas fa-eye"></i></button>
              <button class="overlay-btn wishlist-btn" data-id="${p.id}"><i class="far fa-heart"></i></button>
              <button class="overlay-btn add-to-cart-overlay" data-id="${p.id}"><i class="fas fa-shopping-bag"></i></button>
            </div>
          </div>
          <div class="product-info">
            <p class="product-brand">${p.brand}</p>
            <h3 class="product-name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
            <div class="product-rating"><div class="stars">${stars(p.rating)}</div><span class="rating-count">(${p.reviews})</span></div>
            <div class="product-price">
              <span class="current-price">${fmt(p.price)}</span>
              ${p.originalPrice ? `<span class="original-price">${fmt(p.originalPrice)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('');

    const cardWidth = 304;
    document.getElementById('sliderPrev')?.addEventListener('click', () => sliderTrack.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' }));
    document.getElementById('sliderNext')?.addEventListener('click', () => sliderTrack.scrollBy({ left:  cardWidth * 2, behavior: 'smooth' }));

    attachCardEvents();
  }

  // ── 11. HERO SLIDER ───────────────────────────────────────
  function initHeroSlider() {
    const slides   = document.querySelectorAll('.slide');
    const dotsWrap = document.querySelector('.slider-dots');
    if (!slides.length) return;

    let current = 0;
    let timer;

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });
    }

    function goTo(idx) {
      slides[current].classList.remove('active');
      dotsWrap?.children[current]?.classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('active');
      dotsWrap?.children[current]?.classList.add('active');
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 5000);
    }

    document.querySelector('.prev-btn')?.addEventListener('click', () => goTo(current - 1));
    document.querySelector('.next-btn')?.addEventListener('click', () => goTo(current + 1));
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  // ── 12. COUNTDOWN TIMER ───────────────────────────────────
  function initCountdown() {
    const end = new Date();
    end.setDate(end.getDate() + 3);
    end.setHours(23, 59, 59, 0);

    function update() {
      const diff = end - new Date();
      if (diff <= 0) return;
      document.getElementById('days')?.textContent    = String(Math.floor(diff / 86400000)).padStart(2,'0');
      document.getElementById('hours')?.textContent   = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
      document.getElementById('minutes')?.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
      document.getElementById('seconds')?.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
    }
    update();
    setInterval(update, 1000);
  }

  // ── 13. SCROLL ANIMATIONS ─────────────────────────────────
  function initScrollAnimations() {
    // Use a small delay so elements are visible by default first
    setTimeout(() => {
      const sections = document.querySelectorAll('.fade-in-section');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'translateY(0)';
            observer.unobserve(e.target);
          }
        });
      }, { threshold: 0.05 });

      sections.forEach(el => {
        // Only animate if not already in viewport
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(30px)';
          el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        }
        observer.observe(el);
      });
    }, 100);
  }

  // ── 14. VIDEO PROMO PLAYER ────────────────────────────────
  function initVideoPlayer() {
    const video   = document.getElementById('promoVideo');
    const playBtn = document.querySelector('.video-play-btn');
    if (!video || !playBtn) return;
    playBtn.addEventListener('click', () => {
      if (video.paused) { video.play(); playBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
      else              { video.pause(); playBtn.innerHTML = '<i class="fas fa-play"></i>'; }
    });
  }

  // ── 15. FILTER EVENTS ─────────────────────────────────────
  function initFilters() {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderProducts(true);
      });
    });

    sortSelect?.addEventListener('change', () => { currentSort = sortSelect.value; renderProducts(true); });
    brandFilter?.addEventListener('change', () => renderProducts(true));
    ratingFilter?.addEventListener('change', () => renderProducts(true));
    inStockChk?.addEventListener('change', () => renderProducts(true));
    onSaleChk?.addEventListener('change', () => renderProducts(true));
    minPrice?.addEventListener('input', () => renderProducts(true));
    maxPrice?.addEventListener('input', () => renderProducts(true));

    loadMoreBtn?.addEventListener('click', () => { currentPage++; renderProducts(false); });
  }

  // ── 16. URL PARAM FILTER ──────────────────────────────────
  function checkUrlFilter() {
    const cat = new URLSearchParams(window.location.search).get('category');
    if (cat) {
      currentFilter = cat;
      filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === cat));
    }

    // Also handle search param from common.js
    const q = new URLSearchParams(window.location.search).get('search');
    if (q && grid) {
      const results = window.products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.brand.toLowerCase().includes(q.toLowerCase()) ||
        p.category.toLowerCase().includes(q.toLowerCase())
      );
      grid.innerHTML = '';
      if (results.length === 0) {
        grid.innerHTML = `<div class="no-products" style="grid-column:1/-1;text-align:center;padding:4rem;color:#888;">
          <i class="fas fa-search" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
          <h3>No results for "${q}"</h3></div>`;
      } else {
        results.forEach(p => grid.innerHTML += productCard(p));
        attachCardEvents();
      }
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return true; // skip normal render
    }
    return false;
  }

  // ── 17. NEWSLETTER ────────────────────────────────────────
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (typeof window.showToast === 'function') window.showToast('🎉 Subscribed! Check your inbox.', 'success');
        form.reset();
      });
    });
  }

  // ── 18. CART SIDEBAR CLOSE (complement to common.js) ──────
  function initCartClose() {
    document.getElementById('cartBtn')?.addEventListener('click', () => {
      document.getElementById('cartSidebar')?.classList.add('active');
    });
    document.getElementById('closeCart')?.addEventListener('click', () => {
      document.getElementById('cartSidebar')?.classList.remove('active');
    });
  }

  // ── 19. INIT ALL ──────────────────────────────────────────
  if (!window.products || window.products.length === 0) {
    console.error('LuxeMart: products.js not loaded! Check the script tag order in HTML.');
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:red;">
      <h3>⚠️ Products failed to load</h3><p>Please check the browser console for errors.</p></div>`;
    return;
  }

  const searchHandled = checkUrlFilter();
  buildFilterOptions();
  if (!searchHandled) renderProducts(true);
  buildTrendingSlider();
  initHeroSlider();
  initCountdown();
  initScrollAnimations();
  initVideoPlayer();
  initFilters();
  initNewsletter();
  initCartClose();

});
