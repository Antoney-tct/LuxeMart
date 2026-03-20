document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const moonIcon = '<i class="fas fa-moon"></i>';
    const sunIcon = '<i class="fas fa-sun"></i>';

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sun';
                } else {
                    themeToggle.innerHTML = sunIcon;
                }
            }
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.setAttribute('data-theme', 'light');
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-moon';
                } else {
                    themeToggle.innerHTML = moonIcon;
                }
            }
            localStorage.setItem('theme', 'light');
        }
    };

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme');
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }

    // Load saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light'); // Default to light
    }

    // === WISHLIST COUNT ===
    const updateWishlistCount = () => {
        const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        const wishlistCountEl = document.getElementById('wishlistCount');
        if (wishlistCountEl) wishlistCountEl.textContent = wishlist.length;
    };
    window.updateWishlistCount = updateWishlistCount; // Expose globally

    // === MODAL LOGIC (Search & Profile) ===
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const closeSearch = document.getElementById('closeSearch');

    if (searchBtn && searchModal && closeSearch) {
        searchBtn.addEventListener('click', () => searchModal.classList.add('show'));
        closeSearch.addEventListener('click', () => searchModal.classList.remove('show'));
    }

    const profileBtn = document.getElementById('profileBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfile = document.getElementById('closeProfile');

    if (profileBtn && profileModal && closeProfile) {
        profileBtn.addEventListener('click', () => profileModal.classList.add('show'));
        closeProfile.addEventListener('click', () => profileModal.classList.remove('show'));
    }

    // === SEARCH LOGIC ===
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchSubmitBtn = document.querySelector('#searchModal .btn-primary');

    if (searchInput) {
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                // Redirect to shop page with search query
                window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
            }
        };

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        // Search on Button Click
        if (searchSubmitBtn) {
            searchSubmitBtn.addEventListener('click', performSearch);
        }

        // Live Suggestions
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (!searchSuggestions) return;
            
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.remove('active');

            if (query.length < 2) return;

            if (typeof products !== 'undefined') {
                const matches = products.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.brand.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query)
                ).slice(0, 5);

                if (matches.length > 0) {
                    searchSuggestions.innerHTML = matches.map(p => `
                        <div class="suggestion-item" onclick="window.location.href='product.html?id=${p.id}'">
                            <img src="${p.img}" class="suggestion-img" alt="${p.name}">
                            <div class="suggestion-info">
                                <span class="suggestion-name">${p.name}</span>
                                <span class="suggestion-price">KSh ${p.price.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('');
                    searchSuggestions.classList.add('active');
                }
            }
        });
    }

    // === TOAST NOTIFICATION ===
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
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2700);
    };

    // === GLOBAL WISHLIST LOGIC ===
    document.addEventListener('click', (e) => {
        const wishlistBtn = e.target.closest('.wishlist-btn');
        if (!wishlistBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const id = wishlistBtn.dataset.id;
        if (!id) return;

        let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        const index = wishlist.indexOf(id.toString());
        const icon = wishlistBtn.querySelector('i');

        if (index === -1) {
            wishlist.push(id.toString());
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            window.showToast('Added to wishlist!', 'success');
            if (icon) icon.classList.replace('far', 'fas');
        } else {
            wishlist.splice(index, 1);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            window.showToast('Removed from wishlist', 'info');
            if (icon) icon.classList.replace('fas', 'far');
        }
        updateWishlistCount();
    });
    updateWishlistCount(); // Initial call on page load

    // === GLOBAL MOBILE MENU LOGIC ===
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenuBtn = document.getElementById('closeMenu');
    const mobileLinks = document.querySelectorAll('#mobileMenu a');

    if (mobileMenuBtn && mobileMenu) mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('open'));
    if (closeMenuBtn && mobileMenu) closeMenuBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });

    // Mobile Menu Search & Account Hooks
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileAccountBtn = document.getElementById('mobileAccountBtn');
    if (mobileSearchBtn && searchModal) mobileSearchBtn.addEventListener('click', () => { mobileMenu.classList.remove('open'); searchModal.classList.add('show'); });
    if (mobileAccountBtn && profileModal) mobileAccountBtn.addEventListener('click', () => { mobileMenu.classList.remove('open'); profileModal.classList.add('show'); });

    // === EXIT-INTENT POPUP LOGIC ===
    const exitIntentModal = document.getElementById('exitIntentModal');
    if (exitIntentModal) {
        const closeBtn = document.getElementById('closeExitIntent');
        const continueLink = document.getElementById('continueShoppingExit');

        const showExitIntentPopup = () => {
            // Only show if it hasn't been shown this session and cart is not empty
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            if (!sessionStorage.getItem('exitIntentShown') && cart.length > 0) {
                exitIntentModal.classList.add('show');
                sessionStorage.setItem('exitIntentShown', 'true');
            }
        };

        const closeExitIntentPopup = () => {
            exitIntentModal.classList.remove('show');
        };

        document.addEventListener('mouseout', (e) => {
            // If the mouse is leaving the top of the viewport
            if (e.clientY <= 0) {
                showExitIntentPopup();
            }
        });

        closeBtn.addEventListener('click', closeExitIntentPopup);
        continueLink.addEventListener('click', closeExitIntentPopup);
    }
});

//Floating Chatbot
document.addEventListener('DOMContentLoaded', function() {
    // 1. Create Chatbot Trigger Button
    const chatBtn = document.createElement('div');
    chatBtn.className = 'chatbot-bubble';
    // This is the corrected HTML for the animated character
    chatBtn.innerHTML = `
        <div class="chatbot-anim-wrapper">
            <i class="fas fa-shopping-bag bag-left"></i>
            <i class="fas fa-robot robot-icon"></i>
            <i class="fas fa-shopping-bag bag-right"></i>
        </div>
    `;
    document.body.appendChild(chatBtn);

    // 2. Create Chatbot Popup Window
    const greetings = [
        "Hello! How can I help you today?",
        "Hi there! What can I do for you?",
        "Welcome to LuxeMart Support! Ask me anything about shipping, returns, or sales."
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const chatWindow = document.createElement('div');
    chatWindow.className = 'chatbot-window';
    chatWindow.innerHTML = `
        <div class="chatbot-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-robot" style="font-size: 1.2rem;"></i>
                <span style="font-weight: 600;">LuxeMart Support</span>
            </div>
            <button class="chatbot-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="chatbot-messages" id="chatbotMessages">
            <div class="message bot-message">${randomGreeting}</div>
        </div>
        <div class="chatbot-input-area">
            <input type="text" id="chatbotInput" placeholder="Type a message...">
            <button id="chatbotSend"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(chatWindow);

    // 3. Toggle Logic
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        // Auto-focus input when opening
        if (chatWindow.classList.contains('active')) {
            input.focus();
        }
    });
    chatWindow.querySelector('.chatbot-close').addEventListener('click', () => chatWindow.classList.remove('active'));

    // 4. Message Handling Logic
    const input = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('chatbotSend');
    const messagesContainer = document.getElementById('chatbotMessages');
    let isBotTyping = false;

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // User Message
        messagesContainer.innerHTML += `<div class="message user-message">${text}</div>`;
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show typing indicator and get bot response
        showTypingIndicator();
        setTimeout(() => {
            const botResponse = getBotResponse(text);
            hideTypingIndicator();
            messagesContainer.innerHTML += `<div class="message bot-message">${botResponse}</div>`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1500); // Simulate thinking time
    }

    function showTypingIndicator() {
        if (isBotTyping) return;
        isBotTyping = true;
        messagesContainer.innerHTML += `
            <div class="message bot-message typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingIndicator = messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        isBotTyping = false;
    }

    function getBotResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        // Sentiment Analysis
        const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'broken', 'slow', 'upset', 'angry', 'disappointed', 'wrong', 'late', 'complaint', 'horrible'];
        const positiveWords = ['good', 'great', 'love', 'amazing', 'awesome', 'best', 'happy', 'thanks', 'thank you', 'excellent', 'cool', 'perfect'];
        
        let sentimentPrefix = '';
        let isNegative = negativeWords.some(word => message.includes(word));
        let isPositive = positiveWords.some(word => message.includes(word));

        if (isNegative) {
            sentimentPrefix = "I'm really sorry to hear that. ";
        } else if (isPositive) {
            sentimentPrefix = "I'm glad to hear that! ";
        }

        if (message.includes('shipping') || message.includes('delivery')) {
            if (isNegative) return sentimentPrefix + "If your delivery is delayed, please provide your order number so we can track it immediately.";
            return sentimentPrefix + "We offer standard shipping (3-5 business days) and express shipping (1-2 days). Orders over KSh 5000 get free standard shipping!";
        }
        if (message.includes('return') || message.includes('refund')) {
            if (isNegative) return sentimentPrefix + "We want to make it right. You can return any item within 30 days for a full refund.";
            return sentimentPrefix + "You can return any item within 30 days of purchase, as long as it's in its original condition. Just visit our Contact page to start the process!";
        }
        if (message.includes('sale') || message.includes('discount')) {
            return sentimentPrefix + "You can check out all our current deals on the <a href='sale.html'>Sale page</a>. We often have flash sales running!";
        }
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return "Hello there! How can I assist you today? You can ask me about shipping, returns, or sales.";
        }
        if (message.includes('payment') || message.includes('pay')) {
            return sentimentPrefix + "We accept Visa, Mastercard, PayPal, and M-Pesa. You can select your preferred method at checkout.";
        }
        if (message.includes('track') || message.includes('order')) {
            if (isNegative) return sentimentPrefix + "Please email support@luxemart.co.ke with your Order ID and we will investigate the status right away.";
            return sentimentPrefix + "To track your order, please check the confirmation email we sent you. It contains a tracking link!";
        }
        if (message.includes('contact') || message.includes('support') || message.includes('help')) {
            return sentimentPrefix + "You can reach our support team at support@luxemart.co.ke or visit our <a href='contact.html'>Contact page</a>.";
        }
        if (message.includes('broken') || message.includes('damaged')) {
            return sentimentPrefix + "Please email us a photo of the item at support@luxemart.co.ke along with your Order ID. We will arrange a replacement or refund for you immediately.";
        }
        if (message.includes('shoes')) {
            const shoeProducts = products.filter(p => p.category === 'footwear').slice(0, 3).map(p => `<a href="product.html?id=${p.id}">${p.name}</a>`).join(', ');
            return sentimentPrefix + `Check out these shoes: ${shoeProducts}`;
        }

         if (message.includes('watch')) {
            const watchProducts = products.filter(p => p.category === 'watches').slice(0, 3).map(p => `<a href="product.html?id=${p.id}">${p.name}</a>`).join(', ');
            return sentimentPrefix + `Check out these watches: ${watchProducts}`;
        }

        // Default response
        if (isNegative) {
            return "I apologize for any inconvenience. Please reach out to us at support@luxemart.co.ke so a human agent can resolve this for you immediately.";
        } else if (isPositive) {
            return "Thank you! We're happy to help. Let us know if you need anything else.";
        }
        return "Thanks for your message! I've noted it down. For complex issues, our human team will get back to you via email shortly.";
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});