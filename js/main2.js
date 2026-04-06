// ============================================================
//  LuxeMart — main2.js
//  Handles: product rendering, filtering, sorting, search,
//           quick view, trending slider, hero slider,
//           countdown timer, scroll animations, theme toggle
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. CONSTANTS & STATE ──────────────────────────────────
  const PRODUCTS_PER_PAGE = 12;
  let currentFilter   = 'all';
  let currentSort     = 'popularity';
  let currentPage     = 1;
  let activeColors    = [];
  let activeSizes     = [];
  let quickViewProduct = null;

  // ── 2. DOM REFS ───────────────────────────────────────────
  const grid         = document.getElementById('featuredProductsGrid');
  const sliderTrack  = document.getElementById('productSliderTrack');
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

  // ── 3. HELPERS ────────────────────────────────────────────
  const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  function stars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i)       html += '<i class="fas fa-star"></i>';
      else if (rating >= i - 0.5) html += '<i class="fas fa-star-half-alt"></i>';
      else                   html += '<i class="far fa-star"></i>';
    }
    return html;
  }

  function discount(orig, sale) {
    if (!orig) return '';
    const pct = Math.round((1 - sale / orig) * 100);
    return `<span class="discount-badge">-${pct}%</span>`;
  }

  // ── 4. BUILD FILTER OPTIONS ──────────────────────────────
  function buildFilterOptions() {
    // Brands
    if (brandFilter) {
      const brands = [...new Set(window.products.map(p => p.brand))].sort();
      brands.forEach(b => {
        const o = document.createElement('option');
        o.value = b; o.textContent = b;
        brandFilter.appendChild(o);
      });
    }

    // Colors
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

    // Sizes
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

  // ── 5. FILTER + SORT PIPELINE ────────────────────────────
  function getFilteredProducts() {
    let list = [...window.products];

    // Category
    if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);

    // Brand
    if (brandFilter && brandFilter.value !== 'all') list = list.filter(p => p.brand === brandFilter.value);

    // Price
    const min = parseFloat(minPrice?.value) || 0;
    const max = parseFloat(maxPrice?.value) || Infinity;
    list = list.filter(p => p.price >= min && p.price <= max);

    // Rating
    const minRating = parseFloat(ratingFilter?.value) || 0;
    if (minRating) list = list.filter(p => p.rating >= minRating);

    // Colors
    if (activeColors.length) list = list.filter(p => activeColors.some(c => p.colors.includes(c)));

    // Sizes
    if (activeSizes.length) list = list.filter(p => activeSizes.some(s => p.sizes.includes(s)));

    // In Stock
    if (inStockChk?.checked) list = list.filter(p => p.inStock);

    // On Sale
    if (onSaleChk?.checked) list = list.filter(p => p.onSale);

    // Sort
    switch (currentSort) {
      case 'price-asc':    list.sort((a, b) => a.price - b.price); break;
      case 'price-desc':   list.sort((a, b) => b.price - a.price); break;
      case 'rating':       list.sort((a, b) => b.rating - a.rating); break;
      case 'newest':       list.sort((a, b) => b.id - a.id); break;
      default:             list.sort((a, b) => b.reviews - a.reviews); // popularity
    }

    return list;
  }

  // ── 6. PRODUCT CARD HTML ──────────────────────────────────
  function productCard(p) {
    const badge = p.badge ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '';
    const origPrice = p.originalPrice ? `<span class="original-price">${fmt(p.originalPrice)}</span>` : '';
    const disc = discount(p.originalPrice, p.price);
    const outOfStock = !p.inStock ? '<div class="out-of-stock-overlay"><span>Out of Stock</span></div>' : '';

    return `
      <div class="product-card" data-id="${p.id}" data-category="${p.category}">
        ${outOfStock}
        <div class="product-img-wrapper">
          ${badge}
          <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
          <div class="product-overlay">
            <button class="overlay-btn quick-view-btn" data-id="${p.id}" title="Quick View">
              <i class="fas fa-eye"></i>
            </button>
            <button class="overlay-btn wishlist-btn" data-id="${p.id}" title="Add to Wishlist">
              <i class="far fa-heart"></i>
            </button>
            <button class="overlay-btn add-to-cart-overlay" data-id="${p.id}" title="Add to Cart">
              <i class="fas fa-shopping-bag"></i>
            </button>
          </div>
        </div>
        <div class="product-info">
          <p class="product-brand">${p.brand}</p>
          <h3 class="product-name">
            <a href="product.html?id=${p.id}">${p.name}</a>
          </h3>
          <div class="product-rating">
            <div class="stars">${stars(p.rating)}</div>
            <span class="rating-count">(${p.reviews})</span>
          </div>
          <div class="product-price">
            <span class="current-price">${fmt(p.price)}</span>
            ${origPrice}
            ${disc}
          </div>
          <button class="btn-add-cart" data-id="${p.id}" ${!p.inStock ? 'disabled' : ''}>
            <i class="fas fa-shopping-bag"></i>
            ${p.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>`;
  }

  // ── 7. RENDER PRODUCTS GRID ───────────────────────────────
  function renderProducts(reset = true) {
    if (!grid) return;

    if (reset) currentPage = 1;

    const filtered = getFilteredProducts();
    const total    = filtered.length;
    const slice    = filtered.slice(0, currentPage * PRODUCTS_PER_PAGE);

    if (reset) grid.innerHTML = '';

    if (total === 0) {
      grid.innerHTML = `
        <div class="no-products">
          <i class="fas fa-search" style="font-size:3rem;color:var(--light-text);margin-bottom:1rem;"></i>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>`;
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    if (reset) {
      slice.forEach(p => { grid.innerHTML += productCard(p); });
    } else {
      const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
      filtered.slice(start, currentPage * PRODUCTS_PER_PAGE).forEach(p => { grid.innerHTML += productCard(p); });
    }

    // Show/hide Load More
    if (loadMoreBtn) {
      loadMoreBtn.style.display = slice.length < total ? 'inline-flex' : 'none';
    }

    attachCardEvents();
  }

  // ── 8. CARD EVENT LISTENERS ───────────────────────────────
  function attachCardEvents() {
    // Quick View
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const p = window.products.find(x => x.id == btn.dataset.id);
        if (p) openQuickView(p);
      });
    });

    // Add to Cart (card button)
    document.querySelectorAll('.btn-add-cart, .add-to-cart-overlay').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const p = window.products.find(x => x.id == btn.dataset.id);
        if (p && p.inStock) {
          if (typeof addToCart === 'function') addToCart(p);
          showToast(`${p.name} added to cart!`, 'success');
        }
      });
    });

    // Wishlist
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const p = window.products.find(x => x.id == btn.dataset.id);
        if (p) {
          if (typeof addToWishlist === 'function') addToWishlist(p);
          btn.querySelector('i').classList.replace('far', 'fas');
          btn.style.color = 'var(--secondary)';
          showToast(`${p.name} added to wishlist!`, 'info');
        }
      });
    });
  }

  // ── 9. QUICK VIEW MODAL ───────────────────────────────────
  function openQuickView(p) {
    quickViewProduct = p;
    const modal = document.getElementById('quickViewModal');
    if (!modal) return;

    document.getElementById('qvImg').src   = p.img;
    document.getElementById('qvImg').alt   = p.name;
    document.getElementById('qvTitle').textContent = p.name;
    document.getElementById('qvStars').innerHTML   = stars(p.rating);
    document.getElementById('qvRatingCount').textContent = `(${p.reviews} reviews)`;
    document.getElementById('qvDesc').textContent  = p.desc;
    document.getElementById('qvQty').textContent   = '1';

    const priceEl = document.getElementById('qvPrice');
    priceEl.innerHTML = `<span class="current-price">${fmt(p.price)}</span>`;
    if (p.originalPrice) {
      priceEl.innerHTML += ` <span class="original-price">${fmt(p.originalPrice)}</span> ${discount(p.originalPrice, p.price)}`;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Qty controls
    document.querySelectorAll('#quickViewModal .qty-btn').forEach(btn => {
      btn.onclick = () => {
        const qtyEl = document.getElementById('qvQty');
        let qty = parseInt(qtyEl.textContent);
        if (btn.dataset.action === 'increase') qty++;
        else if (qty > 1) qty--;
        qtyEl.textContent = qty;
      };
    });

    // Add to cart from quick view
    const qvAdd = document.getElementById('qvAddToCart');
    if (qvAdd) {
      qvAdd.onclick = () => {
        const qty = parseInt(document.getElementById('qvQty').textContent);
        for (let i = 0; i < qty; i++) {
          if (typeof addToCart === 'function') addToCart(p);
        }
        showToast(`${p.name} added to cart!`, 'success');
        closeModal(modal);
      };
    }
  }

  // ── 10. TRENDING SLIDER ───────────────────────────────────
  function buildTrendingSlider() {
    if (!sliderTrack) return;
    const trending = [...window.products]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    sliderTrack.innerHTML = trending.map(p => `
      <div class="product-slide">
        <div class="product-card">
          <div class="product-img-wrapper">
            ${p.badge ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
            <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
            <div class="product-overlay">
              <button class="overlay-btn quick-view-btn" data-id="${p.id}" title="Quick View"><i class="fas fa-eye"></i></button>
              <button class="overlay-btn wishlist-btn" data-id="${p.id}" title="Wishlist"><i class="far fa-heart"></i></button>
              <button class="overlay-btn add-to-cart-overlay" data-id="${p.id}" title="Add to Cart"><i class="fas fa-shopping-bag"></i></button>
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

    // Slider prev/next
    const prev = document.getElementById('sliderPrev');
    const next = document.getElementById('sliderNext');
    if (prev && next) {
      const cardWidth = 280 + 24; // card width + gap
      prev.addEventListener('click', () => { sliderTrack.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' }); });
      next.addEventListener('click', () => { sliderTrack.scrollBy({ left:  cardWidth * 2, behavior: 'smooth' }); });
    }

    attachCardEvents();
  }

  // ── 11. HERO SLIDER ───────────────────────────────────────
  function initHeroSlider() {
    const slides   = document.querySelectorAll('.slide');
    const dotsWrap = document.querySelector('.slider-dots');
    if (!slides.length) return;

    let current = 0;
    let timer;

    // Build dots
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
      resetTimer();
    }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 5000);
    }

    document.querySelector('.prev-btn')?.addEventListener('click', () => goTo(current - 1));
    document.querySelector('.next-btn')?.addEventListener('click', () => goTo(current + 1));
    resetTimer();
  }

  // ── 12. COUNTDOWN TIMER ───────────────────────────────────
  function initCountdown() {
    const end = new Date();
    end.setDate(end.getDate() + 3);
    end.setHours(23, 59, 59, 0);

    function update() {
      const diff = end - new Date();
      if (diff <= 0) return;
      document.getElementById('days')?.textContent    = String(Math.floor(diff / 86400000)).padStart(2, '0');
      document.getElementById('hours')?.textContent   = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
      document.getElementById('minutes')?.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      document.getElementById('seconds')?.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    }
    update();
    setInterval(update, 1000);
  }

  // ── 13. SCROLL ANIMATIONS ─────────────────────────────────
  function initScrollAnimations() {
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(el => el.classList.add('animate-ready'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });
    sections.forEach(el => observer.observe(el));
  }

  // ── 14. THEME TOGGLE ─────────────────────────────────────
  function initTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    btn.innerHTML = saved === 'dark'
      ? '<i class="fas fa-sun"></i> Theme'
      : '<i class="fas fa-moon"></i> Theme';

    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btn.innerHTML = next === 'dark'
        ? '<i class="fas fa-sun"></i> Theme'
        : '<i class="fas fa-moon"></i> Theme';
    });
  }

  // ── 15. SEARCH ────────────────────────────────────────────
  function initSearch() {
    const input   = document.getElementById('searchInput');
    const suggestions = document.getElementById('searchSuggestions');
    if (!input || !suggestions) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      suggestions.innerHTML = '';
      if (!q) return;

      const matches = window.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      ).slice(0, 6);

      matches.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<img src="${p.img}" alt="${p.name}"><span>${p.name}</span><span class="suggestion-price">${fmt(p.price)}</span>`;
        item.addEventListener('click', () => { window.location.href = `product.html?id=${p.id}`; });
        suggestions.appendChild(item);
      });

      if (!matches.length) {
        suggestions.innerHTML = '<div class="suggestion-item">No results found</div>';
      }
    });
  }

  // ── 16. MODAL CLOSE HELPERS ───────────────────────────────
  function closeModal(el) {
    el.classList.remove('active');
    document.body.style.overflow = '';
  }

  function initModals() {
    // Search modal
    document.getElementById('searchBtn')?.addEventListener('click', () => {
      document.getElementById('searchModal')?.classList.add('active');
      document.getElementById('searchInput')?.focus();
    });
    document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
      document.getElementById('searchModal')?.classList.add('active');
    });
    document.getElementById('closeSearch')?.addEventListener('click', () => {
      closeModal(document.getElementById('searchModal'));
    });

    // Cart sidebar
    document.getElementById('cartBtn')?.addEventListener('click', () => {
      document.getElementById('cartSidebar')?.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    document.getElementById('mobileCartBtn')?.addEventListener('click', () => {
      document.getElementById('cartSidebar')?.classList.add('active');
    });
    document.getElementById('closeCart')?.addEventListener('click', () => {
      document.getElementById('cartSidebar')?.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Quick view close
    document.getElementById('closeQuickView')?.addEventListener('click', () => {
      closeModal(document.getElementById('quickViewModal'));
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    // Mobile menu
    document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => {
      document.getElementById('mobileMenu')?.classList.add('active');
    });
    document.getElementById('closeMenu')?.addEventListener('click', () => {
      document.getElementById('mobileMenu')?.classList.remove('active');
    });

    // Exit intent popup
    document.getElementById('closeExitIntent')?.addEventListener('click', () => {
      closeModal(document.getElementById('exitIntentModal'));
    });
    document.getElementById('continueShoppingExit')?.addEventListener('click', e => {
      e.preventDefault();
      closeModal(document.getElementById('exitIntentModal'));
    });

    let exitShown = false;
    document.addEventListener('mouseleave', e => {
      if (e.clientY < 10 && !exitShown) {
        exitShown = true;
        setTimeout(() => document.getElementById('exitIntentModal')?.classList.add('active'), 500);
      }
    });
  }

  // ── 17. FILTER EVENT WIRING ───────────────────────────────
  function initFilters() {
    // Category filter buttons
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderProducts(true);
      });
    });

    // Sort select
    sortSelect?.addEventListener('change', () => {
      currentSort = sortSelect.value;
      renderProducts(true);
    });

    // Advanced filters
    [brandFilter, ratingFilter, inStockChk, onSaleChk].forEach(el => {
      el?.addEventListener('change', () => renderProducts(true));
    });
    [minPrice, maxPrice].forEach(el => {
      el?.addEventListener('input', () => renderProducts(true));
    });

    // Load More
    loadMoreBtn?.addEventListener('click', () => {
      currentPage++;
      renderProducts(false);
    });
  }

  // ── 18. NEWSLETTER ────────────────────────────────────────
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value;
        if (email) {
          showToast('🎉 Thank you! Check your inbox for your discount code.', 'success');
          form.reset();
        }
      });
    });
  }

  // ── 19. TOAST NOTIFICATION ────────────────────────────────
  function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // Make toast globally available
  window.showToast = showToast;

  // ── 20. ACCOUNT & AUTH UI ─────────────────────────────────
  function initAuthUI() {
    const user = JSON.parse(localStorage.getItem('luxemart_user') || 'null');
    const accountLink = document.getElementById('accountLink');
    const logoutLink  = document.getElementById('logoutLink');

    if (user && accountLink) {
      accountLink.textContent = user.name || 'My Account';
      accountLink.href = 'account.html';
    }

    logoutLink?.addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('luxemart_user');
      localStorage.removeItem('luxemart_token');
      showToast('Logged out successfully.', 'info');
      setTimeout(() => window.location.href = 'index.html', 1000);
    });
  }

  // ── 21. URL PARAM FILTER (for category links) ─────────────
  function checkUrlFilter() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) {
      currentFilter = cat;
      filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === cat);
      });
    }
  }

  // ── 22. VIDEO PROMO PLAYER ────────────────────────────────
  function initVideoPlayer() {
    const video   = document.getElementById('promoVideo');
    const playBtn = document.querySelector('.video-play-btn');
    if (!video || !playBtn) return;

    playBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        video.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    });
  }

  // ── 23. INIT ALL ─────────────────────────────────────────
  buildFilterOptions();
  checkUrlFilter();
  renderProducts(true);
  buildTrendingSlider();
  initHeroSlider();
  initCountdown();
  initScrollAnimations();
  initTheme();
  initSearch();
  initModals();
  initFilters();
  initNewsletter();
  initAuthUI();
  initVideoPlayer();

});
