// ============================================================
//  LuxeMart — common.js  (FULL REWRITE)
//  Handles: theme, auth, modals, search, wishlist, chatbot
//  All business data → PHP API, NOT localStorage
// ============================================================

(function () {
    'use strict';

    // ── THEME ──────────────────────────────────────────────
    const themeToggle = document.getElementById('themeToggle');

    const applyTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    };

    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    themeToggle?.addEventListener('click', () => {
        applyTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark');
    });

    // ── TOAST ──────────────────────────────────────────────
    window.showToast = (message, type = 'info') => {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle'
                   : type === 'error'   ? 'fa-times-circle'
                   : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 350);
        }, 2800);
    };

    // ── API HELPER ─────────────────────────────────────────
    // Single function for all fetch calls — handles errors consistently
    window.api = async (url, options = {}) => {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error(`API error [${url}]:`, err);
            return { success: false, message: 'Network error.' };
        }
    };

    // ── AUTH STATE ─────────────────────────────────────────
    // sessionStorage is only for UI rendering (name, avatar, role)
    // The real session lives in PHP $_SESSION on the server

    const getUser = () => {
        try {
            return JSON.parse(sessionStorage.getItem('luxeUser')) || null;
        } catch { return null; }
    };

    const setUser = (user) => {
        if (user) sessionStorage.setItem('luxeUser', JSON.stringify(user));
        else sessionStorage.removeItem('luxeUser');
    };

    // On every page load, verify session is still valid with the server
    const verifySession = async () => {
        const result = await window.api('api/auth/me.php');
        if (result.logged_in) {
            setUser(result.user);
            updateAccountUI();
            updateCartCount();
            updateWishlistCount();
        } else {
            setUser(null);
            updateAccountUI();
        }
    };

    // ── LOGIN ──────────────────────────────────────────────
    window.completeLogin = async (userData, forcedRole = null) => {
        const result = await window.api('api/auth/login.php', {
            method: 'POST',
            body: JSON.stringify({
                name:    userData.name,
                email:   userData.email,
                picture: userData.picture || '',
            }),
        });

        if (!result.success) {
            window.showToast('Login failed. Please try again.', 'error');
            return;
        }

        const user = result.user;

        // Seller registration page forces seller role
        if (forcedRole === 'seller' && user.role === 'buyer') {
            const roleResult = await window.api('api/auth/set_role.php', {
                method: 'POST',
                body: JSON.stringify({ role: 'seller' }),
            });
            if (roleResult.success) user.role = 'seller';
        }

        setUser(user);
        updateAccountUI();
        updateCartCount();
        updateWishlistCount();

        // Close login modal if open
        document.getElementById('loginModal')?.classList.remove('show');

        window.showToast(
            `Welcome, ${user.name}! Signed in as ${user.role.toUpperCase()}.`,
            'success'
        );

        // Redirect based on role after short delay
        setTimeout(() => {
            const here = window.location.pathname;
            if (user.role === 'admin'  && !here.includes('admin.html'))  window.location.href = 'admin.html';
            if (user.role === 'seller' && !here.includes('seller.html')) window.location.href = 'seller.html';
        }, 900);
    };

    // ── LOGOUT ─────────────────────────────────────────────
    const logout = async () => {
        await window.api('api/auth/logout.php');
        setUser(null);
        sessionStorage.clear();
        updateAccountUI();
        window.showToast('Logged out successfully.', 'info');
        setTimeout(() => window.location.href = 'index.html', 800);
    };

    // ── ACCOUNT UI ─────────────────────────────────────────
    const updateAccountUI = () => {
        const user         = getUser();
        const accountLink  = document.getElementById('accountLink');
        const logoutLink   = document.getElementById('logoutLink');
        const dropdownMenu = document.querySelector('.account-dropdown-menu');

        if (!dropdownMenu) return;

        // Ensure dynamic links exist
        let ordersLink    = dropdownMenu.querySelector('[data-link="orders"]');
        let sellerLink    = dropdownMenu.querySelector('[data-link="seller"]');
        let sellWithUs    = dropdownMenu.querySelector('[data-link="sell"]');
        let adminLink     = dropdownMenu.querySelector('[data-link="admin"]');

        const ensureLink = (attr, href, label, insertBefore) => {
            let el = dropdownMenu.querySelector(`[data-link="${attr}"]`);
            if (!el) {
                el = document.createElement('a');
                el.href = href;
                el.setAttribute('data-link', attr);
                el.textContent = label;
                insertBefore
                    ? dropdownMenu.insertBefore(el, insertBefore)
                    : dropdownMenu.appendChild(el);
            }
            return el;
        };

        const logoutEl = logoutLink || dropdownMenu.lastElementChild;

        ordersLink = ensureLink('orders',  'orders.html',          'My Orders',        logoutEl);
        sellerLink = ensureLink('seller',  'seller.html',          'My Shop',          logoutEl);
        sellWithUs = ensureLink('sell',    'seller-register.html', 'Sell with Us',     logoutEl);
        adminLink  = ensureLink('admin',   'admin.html',           'Admin Dashboard',  logoutEl);

        if (user) {
            if (accountLink) accountLink.textContent = user.name;
            if (logoutLink)  logoutLink.style.display = 'block';

            ordersLink.style.display = 'block';

            // Role-based visibility
            sellerLink.style.display = user.role === 'seller' ? 'block' : 'none';
            sellWithUs.style.display = user.role === 'buyer'  ? 'block' : 'none';
            adminLink.style.display  = user.role === 'admin'  ? 'block' : 'none';

        } else {
            if (accountLink) accountLink.textContent = 'Login / Register';
            if (logoutLink)  logoutLink.style.display = 'none';
            [ordersLink, sellerLink, sellWithUs, adminLink].forEach(el => {
                el.style.display = 'none';
            });
        }
    };

    // ── CART COUNT ─────────────────────────────────────────
    const updateCartCount = async () => {
        const result = await window.api('api/cart/get.php');
        if (!result.success) return;

        const count = result.cart.reduce((sum, item) => sum + item.qty, 0);
        document.querySelectorAll('#cartCount, #mobileCartCount').forEach(el => {
            el.textContent = count;
        });

        // If cart.js is loaded it will re-render the sidebar
        if (typeof window.renderCartSidebar === 'function') {
            window.renderCartSidebar(result.cart);
        }
    };
    window.updateCartCount = updateCartCount;

    // ── WISHLIST COUNT ─────────────────────────────────────
    const updateWishlistCount = async () => {
        const user = getUser();
        if (!user) {
            document.getElementById('wishlistCount') &&
                (document.getElementById('wishlistCount').textContent = '0');
            return;
        }
        const result = await window.api('api/wishlist/get.php');
        if (!result.success) return;
        const el = document.getElementById('wishlistCount');
        if (el) el.textContent = result.count ?? result.wishlist?.length ?? 0;
    };
    window.updateWishlistCount = updateWishlistCount;

    // ── WISHLIST TOGGLE ────────────────────────────────────
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.wishlist-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const user = getUser();
        if (!user) {
            window.showToast('Please log in to use your wishlist.', 'info');
            document.getElementById('loginModal')?.classList.add('show');
            return;
        }

        const productId = btn.dataset.id;
        const icon      = btn.querySelector('i');
        const isAdded   = icon?.classList.contains('fas');

        const result = await window.api('api/wishlist/toggle.php', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
        });

        if (result.success) {
            if (icon) {
                icon.classList.toggle('fas', result.in_wishlist);
                icon.classList.toggle('far', !result.in_wishlist);
            }
            window.showToast(
                result.in_wishlist ? 'Added to wishlist!' : 'Removed from wishlist.',
                result.in_wishlist ? 'success' : 'info'
            );
            updateWishlistCount();
        }
    });

    // ── MOBILE MENU ────────────────────────────────────────
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    const mobileMenu    = document.getElementById('mobileMenu');
    const closeMenuBtn  = document.getElementById('closeMenu');

    mobileMenuBtn?.addEventListener('click', () => mobileMenu?.classList.add('open'));
    closeMenuBtn?.addEventListener('click',  () => mobileMenu?.classList.remove('open'));
    document.querySelectorAll('#mobileMenu a').forEach(a => {
        a.addEventListener('click', () => mobileMenu?.classList.remove('open'));
    });

    // ── SEARCH MODAL ───────────────────────────────────────
    const searchModal   = document.getElementById('searchModal');
    const searchInput   = document.getElementById('searchInput');
    const searchSuggs   = document.getElementById('searchSuggestions');

    document.getElementById('searchBtn')?.addEventListener('click', () => {
        searchModal?.classList.add('show');
        setTimeout(() => searchInput?.focus(), 100);
    });
    document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
        mobileMenu?.classList.remove('open');
        searchModal?.classList.add('show');
        setTimeout(() => searchInput?.focus(), 100);
    });
    document.getElementById('closeSearch')?.addEventListener('click', () => {
        searchModal?.classList.remove('show');
    });

    // Live search suggestions
    let searchTimer;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchInput.value.trim();
        if (!q || q.length < 2) {
            searchSuggs && (searchSuggs.innerHTML = '');
            return;
        }
        searchTimer = setTimeout(async () => {
            const result = await window.api(`api/products/get.php?search=${encodeURIComponent(q)}&limit=6`);
            if (!result.success || !searchSuggs) return;
            searchSuggs.innerHTML = result.products.map(p => `
                <div class="suggestion-item" onclick="window.location.href='product.html?id=${p.id}'">
                    <img src="${p.img}" class="suggestion-img" alt="${p.name}">
                    <div class="suggestion-info">
                        <span class="suggestion-name">${p.name}</span>
                        <span class="suggestion-price">KSh ${Number(p.price).toLocaleString()}</span>
                    </div>
                </div>
            `).join('') || '<div class="suggestion-item">No results found.</div>';
            searchSuggs.classList.add('active');
        }, 300);
    });

    // Search on Enter
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            window.location.href = `shop.html?search=${encodeURIComponent(searchInput.value.trim())}`;
        }
    });

    // ── CART SIDEBAR OPEN/CLOSE ────────────────────────────
    const cartSidebar = document.getElementById('cartSidebar');

    document.getElementById('cartBtn')?.addEventListener('click', () => {
        cartSidebar?.classList.add('open');
        updateCartCount(); // Refresh from server when opened
    });
    document.getElementById('mobileCartBtn')?.addEventListener('click', () => {
        mobileMenu?.classList.remove('open');
        cartSidebar?.classList.add('open');
        updateCartCount();
    });
    document.getElementById('closeCart')?.addEventListener('click', () => {
        cartSidebar?.classList.remove('open');
    });

    // ── ACCOUNT LINK & LOGOUT ──────────────────────────────
    document.getElementById('accountLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const user = getUser();
        if (!user) {
            document.getElementById('loginModal')?.classList.add('show');
        } else {
            const role = user.role;
            if (role === 'admin')  window.location.href = 'admin.html';
            else if (role === 'seller') window.location.href = 'seller.html';
            else window.location.href = 'orders.html';
        }
    });

    document.getElementById('logoutLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // ── LOGIN MODAL ────────────────────────────────────────
    // Inject login modal HTML once
    if (!document.getElementById('loginModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="loginModal">
                <div class="modal" style="max-width:380px;text-align:center;">
                    <div class="modal-header">
                        <h3 class="modal-title">Sign In to LuxeMart</h3>
                        <button class="modal-close" id="closeLoginModal">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom:1.5rem;color:var(--light-text);">
                            Sign in with Google to continue shopping, track orders, and more.
                        </p>
                        <div id="googleBtnContainer" style="display:flex;justify-content:center;"></div>
                    </div>
                </div>
            </div>
        `);
    }

    document.getElementById('closeLoginModal')?.addEventListener('click', () => {
        document.getElementById('loginModal')?.classList.remove('show');
    });

    // Close modal on overlay click
    document.getElementById('loginModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') e.target.classList.remove('show');
    });

    // ── GOOGLE SIGN-IN ─────────────────────────────────────
    const loadGoogleSignIn = () => {
        const script = document.createElement('script');
        script.src   = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        window.handleCredentialResponse = (response) => {
            try {
                const base64  = response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(decodeURIComponent(
                    window.atob(base64).split('').map(c =>
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    ).join('')
                ));
                window.completeLogin({
                    name:    payload.name,
                    email:   payload.email,
                    picture: payload.picture,
                });
            } catch (err) {
                window.showToast('Google login failed.', 'error');
            }
        };

        script.onload = () => {
            try {
                google.accounts.id.initialize({
                    client_id: '459218839757-eo46dlmqm1jga6a62ct591b2fhfd8i7e.apps.googleusercontent.com',
                    callback:  window.handleCredentialResponse,
                });

                const container = document.getElementById('googleBtnContainer');
                if (container) {
                    google.accounts.id.renderButton(container, {
                        theme: 'outline', size: 'large', width: 280,
                    });
                }

                // One Tap — only show if not logged in
                if (!getUser()) {
                    google.accounts.id.prompt();
                }
            } catch (e) {
                console.warn('Google Sign-In failed to initialize.', e);
            }
        };
    };

    loadGoogleSignIn();

    // ── EXIT INTENT POPUP ──────────────────────────────────
    const exitModal = document.getElementById('exitIntentModal');
    if (exitModal) {
        let shown = false;
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && !shown && !getUser()) {
                shown = true;
                setTimeout(() => exitModal.classList.add('show'), 400);
            }
        });
        document.getElementById('closeExitIntent')?.addEventListener('click',       () => exitModal.classList.remove('show'));
        document.getElementById('continueShoppingExit')?.addEventListener('click',  (e) => { e.preventDefault(); exitModal.classList.remove('show'); });
    }

    // ── CHATBOT ────────────────────────────────────────────
    const initChatbot = () => {
        // Bubble button
        const chatBtn = document.createElement('div');
        chatBtn.className = 'chatbot-bubble';
        chatBtn.innerHTML = `
            <div class="chatbot-anim-wrapper">
                <i class="fas fa-shopping-bag bag-left"></i>
                <i class="fas fa-robot robot-icon"></i>
                <i class="fas fa-shopping-bag bag-right"></i>
            </div>`;
        document.body.appendChild(chatBtn);

        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chatbot-window';
        chatWindow.innerHTML = `
            <div class="chatbot-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-robot"></i>
                    <span style="font-weight:600;">LuxeMart Support</span>
                </div>
                <button class="chatbot-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="chatbot-messages" id="chatbotMessages">
                <div class="message bot-message">Hi there! How can I help you today?</div>
            </div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbotInput" placeholder="Type a message...">
                <button id="chatbotSend"><i class="fas fa-paper-plane"></i></button>
            </div>`;
        document.body.appendChild(chatWindow);

        chatBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('active');
            if (chatWindow.classList.contains('active')) {
                document.getElementById('chatbotInput')?.focus();
            }
        });
        chatWindow.querySelector('.chatbot-close').addEventListener('click', () => {
            chatWindow.classList.remove('active');
        });

        const messagesEl = document.getElementById('chatbotMessages');
        const inputEl    = document.getElementById('chatbotInput');
        const sendEl     = document.getElementById('chatbotSend');
        let   isTyping   = false;

        const botReplies = {
            shipping:   'We offer standard shipping (3–5 days) and express (1–2 days). Free standard shipping on orders over KSh 5,000!',
            return:     'You can return any item within 30 days in original condition. Visit our Contact page to start a return.',
            payment:    'We accept Visa, Mastercard, PayPal, and M-Pesa — choose at checkout.',
            order:      'You can track your order on the Orders page after logging in.',
            help:       'Happy to help! Ask me about shipping, returns, payments, or products.',
            default:    'Thanks for reaching out! For complex queries, email support@luxemart.co.ke and a human will assist you shortly.',
        };

        const getBotResponse = (msg) => {
            const m = msg.toLowerCase();
            if (m.includes('ship') || m.includes('deliver')) return botReplies.shipping;
            if (m.includes('return') || m.includes('refund'))  return botReplies.return;
            if (m.includes('pay') || m.includes('mpesa') || m.includes('card')) return botReplies.payment;
            if (m.includes('order') || m.includes('track'))    return botReplies.order;
            if (m.includes('help') || m.includes('hi') || m.includes('hello')) return botReplies.help;
            return botReplies.default;
        };

        const addMessage = (text, type) => {
            const div = document.createElement('div');
            div.className = `message ${type}-message`;
            div.innerHTML = text;
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        };

        const sendMessage = () => {
            const text = inputEl.value.trim();
            if (!text || isTyping) return;
            addMessage(text, 'user');
            inputEl.value = '';
            isTyping = true;

            // Typing indicator
            const typing = document.createElement('div');
            typing.className = 'message bot-message typing-indicator';
            typing.innerHTML = '<span></span><span></span><span></span>';
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            setTimeout(() => {
                typing.remove();
                addMessage(getBotResponse(text), 'bot');
                isTyping = false;
            }, 1200);
        };

        sendEl.addEventListener('click', sendMessage);
        inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    };

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        verifySession();   // Check PHP session on every page load
        initChatbot();
    });

    // Expose getUser globally so other scripts can use it
    window.getUser = getUser;

})();