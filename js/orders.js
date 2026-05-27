/**
 * LuxeMart — orders.js
 * Fetches orders from api/orders/get.php and renders them
 * with tracking bars, filters, search, date range, cancel.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    // ── STATE ─────────────────────────────────────────────────
    let allOrders    = [];
    let activeFilter = 'all';
    let searchTerm   = '';
    let startDate    = null;
    let endDate      = null;

    // ── SKELETON ──────────────────────────────────────────────
    function showSkeleton () {
        ordersList.innerHTML = [1, 2].map(() => `
            <div class="order-card">
                <div class="order-head" style="background:transparent;">
                    <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
                        <div class="skeleton" style="height:14px;width:180px;"></div>
                        <div class="skeleton" style="height:11px;width:110px;"></div>
                    </div>
                    <div class="skeleton" style="height:24px;width:90px;border-radius:50px;"></div>
                </div>
                <div class="order-items">
                    <div class="order-item">
                        <div class="skeleton" style="width:56px;height:56px;flex-shrink:0;border-radius:8px;"></div>
                        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">
                            <div class="skeleton" style="height:12px;width:70%;"></div>
                            <div class="skeleton" style="height:10px;width:40%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ── FETCH ─────────────────────────────────────────────────
    async function loadOrders () {
        showSkeleton();

        const result = await window.api?.('api/orders/get.php');

        if (!result?.success) {
            // Not logged in or error
            ordersList.innerHTML = `
                <div style="text-align:center;padding:4rem 1.5rem;background:var(--white);border:1px solid var(--border);border-radius:14px;">
                    <i class="fas fa-lock" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:1rem;"></i>
                    <h3 style="margin-bottom:0.5rem;">Sign in to view your orders</h3>
                    <p style="color:var(--muted);margin-bottom:1.5rem;font-size:0.9rem;">Your order history will appear here once you sign in.</p>
                    <button onclick="document.getElementById('loginModal')?.classList.add('show')"
                            style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.75rem 1.5rem;background:var(--secondary);color:white;border-radius:50px;font-weight:700;font-size:0.875rem;border:none;cursor:pointer;">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </div>`;
            return;
        }

        allOrders = result.orders || [];
        render();
    }

    // ── FILTER + SEARCH + DATE ────────────────────────────────
    function getFiltered () {
        return allOrders.filter(order => {

            // Status filter
            if (activeFilter !== 'all' && order.status.toLowerCase() !== activeFilter) return false;

            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const inId    = order.order_number.toLowerCase().includes(term);
                const inItems = (order.items || []).some(i => i.name?.toLowerCase().includes(term));
                if (!inId && !inItems) return false;
            }

            // Date range
            const orderDate = new Date(order.created_at);
            if (startDate && orderDate < startDate) return false;
            if (endDate   && orderDate > endDate)   return false;

            return true;
        });
    }

    // ── TRACKING BAR ─────────────────────────────────────────
    function trackingBar (status) {
        if (status === 'Cancelled') {
            return `
                <div class="tracking-bar">
                    <div class="cancelled-bar">
                        <i class="fas fa-ban"></i> Order Cancelled
                    </div>
                </div>`;
        }

        const steps = [
            { key: 'Processing', label: 'Processing', icon: 'fa-clipboard-check' },
            { key: 'Shipped',    label: 'Shipped',    icon: 'fa-truck' },
            { key: 'Delivered',  label: 'Delivered',  icon: 'fa-check-circle' },
        ];

        const currentIdx  = steps.findIndex(s => s.key === status);
        const progressPct = currentIdx < 0 ? 0 : Math.round((currentIdx / (steps.length - 1)) * 100);

        return `
            <div class="tracking-bar">
                <div class="track-steps">
                    <div class="track-line">
                        <div class="track-line-fill" style="width:${progressPct}%"></div>
                    </div>
                    ${steps.map((s, i) => `
                        <div class="track-step ${i <= currentIdx ? (i === currentIdx ? 'active' : 'done') : ''}">
                            <div class="track-icon"><i class="fas ${s.icon}"></i></div>
                            <div class="track-label">${s.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    // ── STATUS BADGE ─────────────────────────────────────────
    function statusBadge (status) {
        const map = {
            Processing: 'status-processing',
            Shipped:    'status-shipped',
            Delivered:  'status-delivered',
            Cancelled:  'status-cancelled',
        };
        return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
    }

    // ── RENDER ORDERS ─────────────────────────────────────────
    function render () {
        const filtered = getFiltered();

        if (!allOrders.length) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-box-open"></i></div>
                    <h3>No orders yet</h3>
                    <p>Looks like you haven't ordered anything yet. Let's fix that.</p>
                    <a href="shop.html" class="btn-shop"><i class="fas fa-shopping-bag"></i> Start Shopping</a>
                </div>`;
            return;
        }

        if (!filtered.length) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-filter"></i></div>
                    <h3>No orders match</h3>
                    <p>Try adjusting your filters or search term.</p>
                </div>`;
            return;
        }

        ordersList.innerHTML = filtered.map(order => {
            const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
            const canCancel = order.status === 'Processing';

            const itemsHtml = (order.items || []).map(item => `
                <div class="order-item">
                    <img src="${item.img || 'https://via.placeholder.com/56?text=?'}"
                         alt="${item.name}"
                         class="order-item-img"
                         onerror="this.src='https://via.placeholder.com/56?text=?'">
                    <div class="order-item-info">
                        <div class="order-item-name">${item.name}</div>
                        <div class="order-item-meta">
                            Qty: ${item.qty} &nbsp;·&nbsp; ${fmt(item.price)} each
                        </div>
                    </div>
                    <div class="order-item-price">${fmt(item.price * item.qty)}</div>
                </div>
            `).join('');

            return `
                <div class="order-card">
                    <div class="order-head">
                        <div class="order-head-left">
                            <div class="order-number">${order.order_number}</div>
                            <div class="order-date">Placed on ${order.date}</div>
                        </div>
                        <div class="order-head-right">
                            ${statusBadge(order.status)}
                            ${canCancel ? `
                                <button class="cancel-btn" data-id="${order.id}">
                                    Cancel Order
                                </button>` : ''}
                        </div>
                    </div>

                    ${trackingBar(order.status)}

                    <div class="order-items">
                        ${itemsHtml || '<div style="padding:1rem;color:var(--muted);font-size:0.875rem;">No items found.</div>'}
                    </div>

                    <div class="order-foot">
                        <div class="order-foot-meta">
                            <span><i class="fas fa-credit-card"></i> ${order.payment_method.toUpperCase()}</span>
                            ${order.notes ? `<span><i class="fas fa-sticky-note"></i> ${order.notes}</span>` : ''}
                        </div>
                        <div class="order-total">${fmt(order.total)}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind cancel buttons
        ordersList.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => cancelOrder(parseInt(btn.dataset.id, 10)));
        });
    }

    // ── CANCEL ORDER ─────────────────────────────────────────
    async function cancelOrder (orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        const result = await window.api?.('api/orders/cancel.php', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });

        if (result?.success) {
            window.showToast?.('Order cancelled successfully.', 'info');
            // Update locally without refetch
            const order = allOrders.find(o => o.id === orderId);
            if (order) order.status = 'Cancelled';
            render();
        } else {
            window.showToast?.(result?.message || 'Could not cancel order.', 'error');
        }
    }

    // ── FILTER TABS ───────────────────────────────────────────
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter || 'all';
            render();
        });
    });

    // ── SEARCH ────────────────────────────────────────────────
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.trim();
            render();
        });
    }

    // ── DATE FILTERS ──────────────────────────────────────────
    const startEl   = document.getElementById('startDate');
    const endEl     = document.getElementById('endDate');
    const clearBtn  = document.getElementById('clearDatesBtn');

    function parseDateInput (val) {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d) ? null : d;
    }

    startEl?.addEventListener('change', () => {
        startDate = parseDateInput(startEl.value);
        render();
    });

    endEl?.addEventListener('change', () => {
        endDate = parseDateInput(endEl.value);
        // Set end to 23:59:59 of that day
        if (endDate) endDate.setHours(23, 59, 59, 999);
        render();
    });

    clearBtn?.addEventListener('click', () => {
        if (startEl) startEl.value = '';
        if (endEl)   endEl.value   = '';
        startDate = null;
        endDate   = null;
        render();
    });

    // ── NEW ORDER TOAST ───────────────────────────────────────
    const params   = new URLSearchParams(window.location.search);
    const newOrder = params.get('new');
    if (newOrder) {
        setTimeout(() => {
            window.showToast?.(`Order ${newOrder} placed! 🎉`, 'success');
        }, 400);
        window.history.replaceState({}, '', window.location.pathname);
    }

    // ── BOOT ──────────────────────────────────────────────────
    loadOrders();
});
