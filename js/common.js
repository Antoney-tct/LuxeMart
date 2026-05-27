/**
 * LuxeMart — common.js  (fixed build)
 * Fixes: Google One Tap timing, modal injection order,
 *        cart/wishlist counts, theme, mobile menu, chatbot.
 */

'use strict';

// ── API HELPER ────────────────────────────────────────────────
window.api = async function (url, options = {}) {
    try {
        const isFormData = options.body instanceof FormData;
        const res = await fetch(url, {
            credentials: 'same-origin',
            headers: isFormData
                ? {}
                : { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

// ── TOAST ─────────────────────────────────────────────────────
window.showToast = function (message, type = 'info') {
    let box = document.getElementById('toastContainer');
    if (!box) {
        box = document.createElement('div');
        box.id        = 'toastContainer';
        box.className = 'toast-container';
        document.body.appendChild(box);
    }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 3000);
};

// ── THEME (apply immediately, before DOMContentLoaded) ────────
(function () {
    const t = localStorage.getItem('theme') ||
        (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', t);
})();

function applyTheme (t) {
    document.body.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    document.querySelectorAll('#themeToggle i').forEach(i => {
        i.className = `fas ${t === 'dark' ? 'fa-sun' : 'fa-moon'}`;
    });
}

// ── SESSION STATE ─────────────────────────────────────────────
let _user = null;
window.getUser = () => _user;

async function verifySession () {
    const r = await window.api('api/auth/me.php');
    _user = r?.user || null;
    updateAccountUI();
    if (_user) { updateCartCount(); updateWishlistCount(); }
    else        { updateWishlistCount(); }
}

// ── COMPLETE LOGIN ────────────────────────────────────────────
window.completeLogin = async function (userData, forcedRole) {
    const payload = { ...userData };
    if (forcedRole) payload.role = forcedRole;

    const r = await window.api('api/auth/login.php', {
        method: 'POST',
        body:   JSON.stringify(payload),
    });

    if (!r?.success) { window.showToast('Sign-in failed. Please try again.', 'error'); return; }

    _user = r.user;
    updateAccountUI();

    if (typeof window.mergeGuestCart === 'function') await window.mergeGuestCart();
    updateCartCount();
    updateWishlistCount();

    document.getElementById('loginModal')?.classList.remove('show');
    window.showToast(`Welcome back, ${_user.name.split(' ')[0]}! (${_user.role.toUpperCase()})`, 'success');

    setTimeout(() => {
        const role = _user.role;
        const here = window.location.pathname;
        if (role === 'admin'  && !here.includes('admin.html'))  window.location.href = 'admin.html';
        else if (role === 'seller' && !here.includes('seller.html') &&
                 !here.includes('seller-register.html'))        window.location.href = 'seller.html';
    }, 900);
};

// ── ACCOUNT UI ────────────────────────────────────────────────
function updateAccountUI () {
    const u           = _user;
    const accountLink = document.getElementById('accountLink');
    const logoutLink  = document.getElementById('logoutLink');
    const sellerLink  = document.querySelector('.account-dropdown-menu a[href="seller.html"]');
    const ordersLink  = document.querySelector('.account-dropdown-menu a[href="orders.html"]');
    const adminLink   = document.querySelector('.account-dropdown-menu a[href="admin.html"]');
    const sellLink    = document.querySelector('.account-dropdown-menu a[href="seller-register.html"]');

    if (u && accountLink) {
        accountLink.innerHTML = `<i class="fas fa-user-circle"></i> ${u.name.split(' ')[0]}`;
        if (logoutLink) logoutLink.style.display = 'block';
        if (ordersLink) ordersLink.style.display = 'block';
        if (sellerLink) sellerLink.style.display = u.role === 'seller' ? 'block' : 'none';
        if (adminLink)  adminLink.style.display  = u.role === 'admin'  ? 'block' : 'none';
        if (sellLink)   sellLink.style.display   = u.role === 'buyer'  ? 'block' : 'none';
    } else if (accountLink) {
        accountLink.innerHTML = 'Sign In';
        if (logoutLink) logoutLink.style.display = 'none';
        if (ordersLink) ordersLink.style.display = 'none';
        if (sellerLink) sellerLink.style.display = 'none';
        if (adminLink)  adminLink.style.display  = 'none';
        if (sellLink)   sellLink.style.display   = 'block';
    }
}

// ── CART / WISHLIST COUNTS ────────────────────────────────────
window.updateCartCount = async function () {
    let count = 0;
    if (_user) {
        const r = await window.api('api/cart/index.php');
        count = (r?.cart || []).reduce((s, i) => s + i.qty, 0);
    } else {
        const g = JSON.parse(localStorage.getItem('luxemart_guest_cart') || '[]');
        count   = g.reduce((s, i) => s + (i.qty || 1), 0);
    }
    document.querySelectorAll('#cartCount, #mobileCartCount').forEach(el => el.textContent = count);
};

window.updateWishlistCount = async function () {
    let count = 0;
    if (_user) {
        const r = await window.api('api/wishlist/index.php');
        count   = r?.wishlist?.length || 0;
    } else {
        count = JSON.parse(localStorage.getItem('wishlist') || '[]').length;
    }
    document.querySelectorAll('#wishlistCount').forEach(el => el.textContent = count);
};

// ── WISHLIST TOGGLE (delegation) ──────────────────────────────
document.addEventListener('click', async e => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const pid  = btn.dataset.id; if (!pid) return;
    const icon = btn.querySelector('i');

    if (_user) {
        const r = await window.api('api/wishlist/index.php', {
            method: 'POST', body: JSON.stringify({ product_id: pid }),
        });
        const added = r?.action === 'added';
        window.showToast(added ? 'Added to wishlist!' : 'Removed from wishlist.', added ? 'success' : 'info');
        if (icon) { icon.classList.toggle('fas', added); icon.classList.toggle('far', !added); }
    } else {
        let ids = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const idx = ids.indexOf(String(pid));
        const added = idx === -1;
        if (added) ids.push(String(pid)); else ids.splice(idx, 1);
        localStorage.setItem('wishlist', JSON.stringify(ids));
        window.showToast(added ? 'Added to wishlist!' : 'Removed from wishlist.', added ? 'success' : 'info');
        if (icon) { icon.classList.toggle('fas', added); icon.classList.toggle('far', !added); }
    }
    window.updateWishlistCount();
});

// ── GOOGLE SIGN-IN ────────────────────────────────────────────
const GOOG_CLIENT = '459218839757-eo46dlmqm1jga6a62ct591b2fhfd8i7e.apps.googleusercontent.com';

function decodeJWT (cred) {
    try {
        const b64 = cred.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
        return JSON.parse(decodeURIComponent(
            atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        ));
    } catch { return null; }
}

window.handleCredentialResponse = function (response) {
    const p = decodeJWT(response.credential);
    if (!p) { window.showToast('Sign-in failed.', 'error'); return; }
    window.completeLogin({ name: p.name, email: p.email, picture: p.picture || '' });
};

function tryInitGoogle () {
    if (typeof google === 'undefined' || !google?.accounts?.id) return;
    try {
        google.accounts.id.initialize({
            client_id:             GOOG_CLIENT,
            callback:              window.handleCredentialResponse,
            auto_select:           false,
            cancel_on_tap_outside: true,
        });

        // Render button(s) — any element with id googleBtnContainer
        document.querySelectorAll('#googleBtnContainer').forEach(el => {
            google.accounts.id.renderButton(el, {
                theme: 'outline', size: 'large', width: 280, text: 'signin_with',
            });
        });

        // One Tap only when not logged in
        if (!_user) google.accounts.id.prompt();
    } catch (err) {
        console.warn('Google Sign-In init:', err);
    }
}

// Inject Google script (once)
if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
    const s = document.createElement('script');
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = tryInitGoogle;
    document.head.appendChild(s);
}

// ── DOM READY ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Apply saved theme icon
    const saved = localStorage.getItem('theme') || 'light';
    document.querySelectorAll('#themeToggle i').forEach(i => {
        i.className = `fas ${saved === 'dark' ? 'fa-sun' : 'fa-moon'}`;
    });

    document.querySelectorAll('#themeToggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const cur = document.body.getAttribute('data-theme') || 'light';
            applyTheme(cur === 'dark' ? 'light' : 'dark');
        });
    });

    // ── Login modal (inject if missing) ──
    if (!document.getElementById('loginModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="loginModal">
                <div class="modal" style="max-width:380px;text-align:center;">
                    <div class="modal-header">
                        <h3 class="modal-title">Sign In to LuxeMart</h3>
                        <button class="modal-close" id="closeLoginModal">×</button>
                    </div>
                    <div class="modal-body" style="padding:2rem 1.5rem;">
                        <p style="color:var(--muted);font-size:0.875rem;margin-bottom:1.75rem;line-height:1.6;">
                            Sign in with Google to access your orders, wishlist, and more.
                        </p>
                        <div id="googleBtnContainer" style="display:flex;justify-content:center;margin-bottom:1rem;min-height:44px;"></div>
                        <p style="font-size:0.75rem;color:var(--muted);">
                            Want to sell? <a href="seller-register.html" style="color:var(--secondary);font-weight:600;">Become a Seller →</a>
                        </p>
                    </div>
                </div>
            </div>`);
        document.getElementById('closeLoginModal')?.addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('show');
        });
        // Try to render Google button inside newly injected modal
        tryInitGoogle();
    }

    // ── Account link click ──
    document.getElementById('accountLink')?.addEventListener('click', e => {
        e.preventDefault();
        if (_user) {
            const role = _user.role;
            if (role === 'admin')  { window.location.href = 'admin.html';  return; }
            if (role === 'seller') { window.location.href = 'seller.html'; return; }
            window.location.href = 'orders.html';
        } else {
            document.getElementById('loginModal').classList.add('show');
        }
    });

    // ── Logout (delegation so it works for both header + sidebar) ──
    document.addEventListener('click', async e => {
        const logoutEl = e.target.closest('#logoutLink, #sidebarLogout');
        if (!logoutEl) return;
        e.preventDefault();
        await window.api('api/auth/logout.php');
        _user = null;
        updateAccountUI();
        updateCartCount();
        updateWishlistCount();
        window.showToast('Logged out successfully.', 'info');
        setTimeout(() => { window.location.href = 'index.html'; }, 700);
    });

    // ── Cart sidebar ──
    const openCart = () => {
        document.getElementById('cartSidebar')?.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (typeof window.fetchCart === 'function') window.fetchCart();
    };
    const closeCart = () => {
        document.getElementById('cartSidebar')?.classList.remove('open');
        document.body.style.overflow = '';
    };
    document.getElementById('cartBtn')?.addEventListener('click', openCart);
    document.getElementById('mobileCartBtn')?.addEventListener('click', openCart);
    document.getElementById('closeCart')?.addEventListener('click', closeCart);

    // ── Mobile menu ──
    document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => {
        document.getElementById('mobileMenu')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    });
    document.getElementById('closeMenu')?.addEventListener('click', () => {
        document.getElementById('mobileMenu')?.classList.remove('open');
        document.body.style.overflow = '';
    });
    document.querySelectorAll('#mobileMenu a').forEach(a => {
        a.addEventListener('click', () => {
            document.getElementById('mobileMenu')?.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // ── Search modal ──
    const openSearch = () => {
        document.getElementById('searchModal')?.classList.add('show');
        setTimeout(() => document.getElementById('searchInput')?.focus(), 80);
    };
    document.getElementById('searchBtn')?.addEventListener('click', openSearch);
    document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
        document.getElementById('mobileMenu')?.classList.remove('open');
        openSearch();
    });
    document.getElementById('closeSearch')?.addEventListener('click', () => {
        document.getElementById('searchModal')?.classList.remove('show');
    });

    // ── Live search suggestions ──
    const si  = document.getElementById('searchInput');
    const sug = document.getElementById('searchSuggestions');
    if (si && sug) {
        si.addEventListener('input', () => {
            const q = si.value.trim().toLowerCase();
            sug.innerHTML = ''; sug.classList.remove('active');
            if (q.length < 2 || !window.products?.length) return;
            const matches = window.products
                .filter(p => p.name.toLowerCase().includes(q) ||
                             (p.brand||'').toLowerCase().includes(q) ||
                             p.category.toLowerCase().includes(q))
                .slice(0, 6);
            if (!matches.length) return;
            matches.forEach(p => {
                const el = document.createElement('div');
                el.className = 'suggestion-item';
                el.innerHTML = `
                    <img src="${p.img||p.image_url}" alt="${p.name}" class="suggestion-img"
                         onerror="this.src='https://via.placeholder.com/45?text=?'">
                    <div class="suggestion-info">
                        <span class="suggestion-name">${p.name}</span>
                        <span class="suggestion-price">KSh ${Number(p.price).toLocaleString('en-KE')}</span>
                    </div>`;
                el.addEventListener('click', () => { window.location.href = `product.html?id=${p.id}`; });
                sug.appendChild(el);
            });
            sug.classList.add('active');
        });
        si.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const q = si.value.trim();
                if (q) window.location.href = `shop.html?search=${encodeURIComponent(q)}`;
            }
        });
    }

    // ── Close modal overlays on backdrop click ──
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
    });

    // ── Newsletter ──
    document.querySelectorAll('.newsletter-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]')?.value?.trim();
            if (email) { window.showToast('🎉 Subscribed! Check your inbox.', 'success'); form.reset(); }
        });
    });

    // ── New order toast ──
    const params = new URLSearchParams(window.location.search);
    if (params.get('new')) {
        setTimeout(() => window.showToast(`Order #${params.get('new')} placed! 🎉`, 'success'), 400);
        window.history.replaceState({}, '', window.location.pathname);
    }

    // ── Boot session ──
    verifySession();
});

// ── CHATBOT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const here = window.location.pathname;
    if (here.includes('admin.html') || here.includes('seller.html')) return;

    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    bubble.innerHTML = `
        <div class="chatbot-anim-wrapper">
            <i class="fas fa-shopping-bag bag-left"></i>
            <i class="fas fa-robot robot-icon"></i>
            <i class="fas fa-shopping-bag bag-right"></i>
        </div>`;

    const greets = [
        'Hello! How can I help you today?',
        'Hi! Ask me about orders, shipping or products.',
        'Welcome to LuxeMart Support!',
    ];
    const chatWin = document.createElement('div');
    chatWin.className = 'chatbot-window';
    chatWin.innerHTML = `
        <div class="chatbot-header">
            <div style="display:flex;align-items:center;gap:10px;">
                <i class="fas fa-robot"></i>
                <span style="font-weight:600;">LuxeMart Support</span>
            </div>
            <button class="chatbot-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="chatbot-messages" id="chatbotMessages">
            <div class="message bot-message">${greets[Math.floor(Math.random()*greets.length)]}</div>
        </div>
        <div class="chatbot-input-area">
            <input type="text" id="chatbotInput" placeholder="Type a message…">
            <button id="chatbotSend"><i class="fas fa-paper-plane"></i></button>
        </div>`;

    document.body.appendChild(bubble);
    document.body.appendChild(chatWin);

    bubble.addEventListener('click', () => {
        chatWin.classList.toggle('active');
        if (chatWin.classList.contains('active')) document.getElementById('chatbotInput')?.focus();
    });
    chatWin.querySelector('.chatbot-close').addEventListener('click', () => chatWin.classList.remove('active'));

    const msgs  = document.getElementById('chatbotMessages');
    const input = document.getElementById('chatbotInput');
    const sendB = document.getElementById('chatbotSend');

    function botReply (text) {
        const m   = text.toLowerCase();
        const neg = ['bad','terrible','hate','broken','wrong','late','horrible'].some(w => m.includes(w));
        const pos = ['great','love','amazing','awesome','thanks','thank you','perfect'].some(w => m.includes(w));
        const px  = neg ? "I'm sorry. " : pos ? "Glad to hear that! " : '';
        if (m.includes('ship') || m.includes('deliver'))
            return px + 'Standard shipping is <strong>free</strong>. Express is KSh 650. Track at <a href="orders.html">My Orders</a>.';
        if (m.includes('return') || m.includes('refund'))
            return px + '<strong>30-day returns</strong> on all items. Start from <a href="orders.html">My Orders</a>.';
        if (m.includes('pay') || m.includes('mpesa'))
            return px + 'We accept <strong>M-Pesa</strong>, Visa, Mastercard and PayPal.';
        if (m.includes('cancel'))
            return px + 'Processing orders can be cancelled from <a href="orders.html">My Orders</a>.';
        if (m.includes('order') || m.includes('track'))
            return px + 'View your orders at <a href="orders.html">My Orders</a>.';
        if (m.includes('sale') || m.includes('discount'))
            return px + 'See current deals on our <a href="sale.html">Sale page</a>. Use code <strong>SAVE10</strong> for 10% off!';
        if (m.includes('sell'))
            return px + 'Become a seller at <a href="seller-register.html">Seller Registration</a>. Free to list!';
        if (m.includes('hi') || m.includes('hello'))
            return 'Hello! I can help with orders, payments, shipping, or returns. What do you need?';
        if (neg) return "I apologize! Please <a href='contact.html'>contact our team</a> and we'll help right away.";
        if (pos) return "Thank you! Let us know if you need anything else. 😊";
        return "For detailed help, visit our <a href='faq.html'>FAQ</a> or <a href='contact.html'>Contact Us</a>.";
    }

    function sendMsg () {
        const text = input.value.trim(); if (!text) return;
        msgs.innerHTML += `<div class="message user-message">${text}</div>`;
        input.value = ''; msgs.scrollTop = msgs.scrollHeight;
        msgs.innerHTML += `<div class="message bot-message typing-indicator" id="typingDot"><span></span><span></span><span></span></div>`;
        msgs.scrollTop = msgs.scrollHeight;
        setTimeout(() => {
            document.getElementById('typingDot')?.remove();
            msgs.innerHTML += `<div class="message bot-message">${botReply(text)}</div>`;
            msgs.scrollTop = msgs.scrollHeight;
        }, 1000);
    }

    sendB.addEventListener('click', sendMsg);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });
});
