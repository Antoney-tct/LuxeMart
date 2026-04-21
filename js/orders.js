// ============================================================
//  LuxeMart — orders.js (FULL REWRITE)
//  Reads orders from api/orders/get.php
//  No localStorage
// ============================================================

(function () {
    'use strict';

    // ── DOM REFS ───────────────────────────────────────────
    const ordersList      = document.getElementById('ordersList');
    const filterBtns      = document.querySelectorAll('.filter-btn');
    const searchInput     = document.getElementById('orderSearchInput');
    const startDateInput  = document.getElementById('startDate');
    const endDateInput    = document.getElementById('endDate');
    const clearDatesBtn   = document.getElementById('clearDatesBtn');

    // ── STATE ──────────────────────────────────────────────
    let allOrders    = [];
    let activeFilter = 'all';

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        const user = window.getUser ? window.getUser() : null;
        if (!user) {
            renderLoginPrompt();
            return;
        }

        renderSkeletons();
        await fetchOrders();
        checkNewOrderToast();
        bindEvents();
    });

    // ── FETCH ORDERS ───────────────────────────────────────
    const fetchOrders = async () => {
        const result = await window.api('api/orders/get.php');

        if (!result.success) {
            renderError(result.message || 'Could not load orders.');
            return;
        }

        allOrders = result.orders || [];
        renderOrders();
    };

    // ── BIND EVENTS ────────────────────────────────────────
    const bindEvents = () => {
        // Status filter buttons
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                renderOrders();
            });
        });

        // Search
        searchInput?.addEventListener('input', () => renderOrders());

        // Date range
        startDateInput?.addEventListener('change', () => renderOrders());
        endDateInput?.addEventListener('change',   () => renderOrders());

        clearDatesBtn?.addEventListener('click', () => {
            if (startDateInput) startDateInput.value = '';
            if (endDateInput)   endDateInput.value   = '';
            renderOrders();
        });

        // Cancel order — event delegation
        ordersList?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.cancel-order-btn');
            if (!btn) return;
            await handleCancel(btn.dataset.id);
        });
    };

    // ── FILTER PIPELINE ────────────────────────────────────
    const getFiltered = () => {
        let list = [...allOrders];

        // Status
        if (activeFilter !== 'all') {
            list = list.filter(o => o.status.toLowerCase() === activeFilter.toLowerCase());
        }

        // Search
        const q = searchInput?.value.trim().toLowerCase();
        if (q) {
            list = list.filter(o => {
                const matchesNumber = o.order_number.toLowerCase().includes(q);
                const matchesItem   = o.items?.some(i =>
                    i.product_name.toLowerCase().includes(q)
                );
                return matchesNumber || matchesItem;
            });
        }

        // Date range
        const start = startDateInput?.value ? new Date(startDateInput.value) : null;
        const end   = endDateInput?.value   ? new Date(endDateInput.value)   : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end)   end.setHours(23, 59, 59, 999);

        if (start || end) {
            list = list.filter(o => {
                const d = new Date(o.created_at);
                if (start && d < start) return false;
                if (end   && d > end)   return false;
                return true;
            });
        }

        return list;
    };

    // ── RENDER ORDERS ──────────────────────────────────────
    const renderOrders = () => {
        if (!ordersList) return;

        if (!allOrders.length) {
            renderEmpty();
            return;
        }

        const filtered = getFiltered();

        if (!filtered.length) {
            ordersList.innerHTML = `
                <div style="text-align:center;padding:3rem 0;color:var(--light-text);">
                    <i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:1rem;opacity:0.3;"></i>
                    <p>No orders match your filters.</p>
                </div>`;
            return;
        }

        ordersList.innerHTML = filtered.map(order => buildOrderCard(order)).join('');
    };

    // ── BUILD ORDER CARD ───────────────────────────────────
    const buildOrderCard = (order) => {
        const statusClass = {
            processing: 'status-processing',
            shipped:    'status-shipped',
            delivered:  'status-delivered',
            cancelled:  'status-cancelled',
        }[order.status.toLowerCase()] || 'status-processing';

        const date = new Date(order.created_at).toLocaleDateString('en-KE', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

        const cancelBtn = order.status === 'Processing'
            ? `<button class="cancel-order-btn btn-outline"
                       data-id="${order.id}"
                       style="font-size:0.8rem;padding:0.3rem 0.8rem;border-color:#ef4444;color:#ef4444;border-radius:6px;cursor:pointer;background:none;border-width:1px;">
                   Cancel
               </button>`
            : '';

        const trackingBar = order.status === 'Cancelled'
            ? `<div style="padding:1rem 1.5rem;color:#ef4444;font-weight:500;">
                   <i class="fas fa-ban" style="margin-right:8px;"></i> Order Cancelled
               </div>`
            : buildTrackingBar(order.status);

        const itemsHtml = (order.items || []).map(item => `
            <div class="order-item">
                <img src="${item.image_url || 'https://via.placeholder.com/60x60?text=?'}"
                     alt="${item.product_name}"
                     class="order-item-img"
                     onerror="this.src='https://via.placeholder.com/60x60?text=?'">
                <div class="order-item-info">
                    <h4>${item.product_name}</h4>
                    <div style="font-size:0.85rem;color:var(--light-text);">
                        Qty: ${item.qty} &nbsp;·&nbsp;
                        KSh ${Number(item.price).toLocaleString('en-KE', { minimumFractionDigits: 2 })} each
                    </div>
                </div>
                <div style="font-weight:600;white-space:nowrap;">
                    KSh ${(item.price * item.qty).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
            </div>
        `).join('');

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">#${order.order_number}</div>
                        <div class="order-date">${date}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span class="order-status ${statusClass}">${order.status}</span>
                        ${cancelBtn}
                    </div>
                </div>
                ${trackingBar}
                <div class="order-body">${itemsHtml}</div>
                <div class="order-footer">
                    <div style="font-size:0.85rem;color:var(--light-text);">
                        <i class="fas fa-${paymentIcon(order.payment_method)}" style="margin-right:4px;"></i>
                        ${order.payment_method?.toUpperCase()}
                        ${order.discount_amount > 0
                            ? `&nbsp;·&nbsp; <span style="color:var(--success);">
                                   KSh ${Number(order.discount_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })} saved
                               </span>`
                            : ''}
                    </div>
                    <span class="order-total">
                        KSh ${Number(order.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>`;
    };

    // ── TRACKING BAR ───────────────────────────────────────
    const buildTrackingBar = (status) => {
        const steps   = ['Processing', 'Shipped', 'Delivered'];
        const current = steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
        const index   = current === -1 ? 0 : current;
        const pct     = Math.round((index / (steps.length - 1)) * 100);

        const icons = { Processing: 'fa-clipboard-check', Shipped: 'fa-truck', Delivered: 'fa-check-circle' };

        const stepsHtml = steps.map((step, i) => `
            <div class="track-step ${i <= index ? 'active' : ''}">
                <div class="track-icon">
                    <i class="fas ${icons[step]}"></i>
                </div>
                <div class="track-label">${step}</div>
            </div>
        `).join('');

        return `
            <div class="track-order">
                <div class="track-line-bg"></div>
                <div class="track-line-active" style="width:${pct}%"></div>
                ${stepsHtml}
            </div>`;
    };

    // ── CANCEL ORDER ───────────────────────────────────────
    const handleCancel = async (orderId) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        const result = await window.api('api/orders/cancel.php', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });

        if (result.success) {
            // Update local state — no need to re-fetch
            const order = allOrders.find(o => o.id == orderId);
            if (order) order.status = 'Cancelled';
            renderOrders();
            window.showToast('Order cancelled successfully.', 'info');
        } else {
            window.showToast(result.message || 'Could not cancel order.', 'error');
        }
    };

    // ── NEW ORDER TOAST ────────────────────────────────────
    const checkNewOrderToast = () => {
        const params      = new URLSearchParams(window.location.search);
        const orderNumber = params.get('new');
        if (orderNumber) {
            window.showToast(`Order #${orderNumber} placed successfully!`, 'success');
            window.history.replaceState({}, '', window.location.pathname);
        }
    };

    // ── HELPERS ────────────────────────────────────────────
    const paymentIcon = (method) => {
        const icons = { card: 'fa-credit-card', mpesa: 'fa-mobile-alt', paypal: 'fa-paypal' };
        return icons[method?.toLowerCase()] || 'fa-money-bill';
    };

    // ── STATES ─────────────────────────────────────────────
    const renderSkeletons = () => {
        if (!ordersList) return;
        ordersList.innerHTML = [1, 2].map(() => `
            <div class="skeleton" style="height:180px;border-radius:12px;margin-bottom:1.5rem;"></div>
        `).join('');
    };

    const renderEmpty = () => {
        if (!ordersList) return;
        ordersList.innerHTML = `
            <div style="text-align:center;padding:4rem 1rem;">
                <i class="fas fa-box-open" style="font-size:3rem;color:var(--border);display:block;margin-bottom:1rem;"></i>
                <h3 style="margin-bottom:0.5rem;">No orders yet</h3>
                <p style="color:var(--light-text);margin-bottom:1.5rem;">
                    Looks like you haven't placed an order yet.
                </p>
                <a href="shop.html" class="btn-primary">Start Shopping</a>
            </div>`;
    };

    const renderError = (msg) => {
        if (!ordersList) return;
        ordersList.innerHTML = `
            <div style="text-align:center;padding:3rem;color:var(--light-text);">
                <i class="fas fa-exclamation-circle" style="font-size:2rem;display:block;margin-bottom:1rem;color:#ef4444;"></i>
                <p>${msg}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top:1rem;">
                    Try Again
                </button>
            </div>`;
    };

    const renderLoginPrompt = () => {
        if (!ordersList) return;
        ordersList.innerHTML = `
            <div style="text-align:center;padding:4rem 1rem;">
                <i class="fas fa-lock" style="font-size:3rem;color:var(--border);display:block;margin-bottom:1rem;"></i>
                <h3 style="margin-bottom:0.5rem;">Sign in to view your orders</h3>
                <p style="color:var(--light-text);margin-bottom:1.5rem;">
                    You need to be logged in to see your order history.
                </p>
                <button class="btn-primary" onclick="document.getElementById('loginModal')?.classList.add('show')">
                    Sign In
                </button>
            </div>`;
    };

})();