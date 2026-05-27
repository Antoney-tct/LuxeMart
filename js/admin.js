/**
 * LuxeMart — admin.js
 * Admin dashboard: stats, revenue chart, orders, products, users.
 * Loaded only on admin.html.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // ── AUTH GUARD ────────────────────────────────────────────
    const authRes = await window.api?.('api/auth/me.php');
    if (!authRes?.user || authRes.user.role !== 'admin') {
        window.showToast?.('Admin access required.', 'error');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        return;
    }

    // ── STATE ─────────────────────────────────────────────────
    let statsData     = {};
    let allOrders     = [];
    let allProducts   = [];
    let allUsers      = [];
    let orderFilter   = 'all';
    let productFilter = 'all';
    let userFilter    = 'all';
    let orderSearch   = '';
    let productSearch = '';
    let userSearch    = '';
    let chart         = null;

    const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

    // ── LOAD EVERYTHING ───────────────────────────────────────
    async function bootDashboard () {
        const [statsRes, ordersRes, productsRes, usersRes] = await Promise.all([
            window.api('api/admin/stats.php'),
            window.api('api/admin/orders.php'),
            window.api('api/products/get.php?limit=100'),
            window.api('api/admin/users.php'),
        ]);

        statsData   = statsRes?.stats      || {};
        allOrders   = ordersRes?.orders    || [];
        allProducts = productsRes?.products || [];
        allUsers    = usersRes?.users      || [];

        renderStats();
        renderChart();
        renderTopProducts();
        renderLowStock();
        renderOrders();
        renderProducts();
        renderUsers();
        updatePendingBadge();
    }

    // ── STATS CARDS ───────────────────────────────────────────
    function renderStats () {
        const el = document.getElementById('adminStats');
        if (!el) return;

        const o = statsData.orders || {};

        el.innerHTML = `
            <div class="stat-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;">Total Revenue</span>
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;color:var(--success);">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                <h3 style="font-size:1.8rem;font-weight:800;margin-bottom:0.25rem;">${fmt(statsData.total_revenue || 0)}</h3>
                <p style="font-size:0.78rem;color:var(--muted);">All time (excl. cancelled)</p>
            </div>
            <div class="stat-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;">Total Orders</span>
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,107,53,0.1);display:flex;align-items:center;justify-content:center;color:var(--secondary);">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                </div>
                <h3 style="font-size:1.8rem;font-weight:800;margin-bottom:0.25rem;">${o.total || 0}</h3>
                <p style="font-size:0.78rem;color:var(--muted);">
                    <span style="color:var(--warning);">${o.processing || 0} processing</span> ·
                    <span style="color:var(--success);">${o.delivered  || 0} delivered</span>
                </p>
            </div>
            <div class="stat-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;">Products</span>
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(59,130,246,0.1);display:flex;align-items:center;justify-content:center;color:#3b82f6;">
                        <i class="fas fa-box"></i>
                    </div>
                </div>
                <h3 style="font-size:1.8rem;font-weight:800;margin-bottom:0.25rem;">${statsData.total_products || 0}</h3>
                <p style="font-size:0.78rem;color:${statsData.low_stock > 0 ? 'var(--danger)' : 'var(--muted)'};">
                    ${statsData.low_stock || 0} low stock
                </p>
            </div>
            <div class="stat-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                    <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;">Users</span>
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;color:#8b5cf6;">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <h3 style="font-size:1.8rem;font-weight:800;margin-bottom:0.25rem;">${statsData.total_users || 0}</h3>
                <p style="font-size:0.78rem;color:var(--muted);">${statsData.total_sellers || 0} sellers</p>
            </div>
        `;
    }

    // ── REVENUE CHART ─────────────────────────────────────────
    function renderChart () {
        const canvas = document.getElementById('salesChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const chartData = statsData.revenue_chart || [];

        const labels  = chartData.map(r => {
            const d = new Date(r.day);
            return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        });
        const revenue = chartData.map(r => parseFloat(r.revenue));

        if (chart) chart.destroy();

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';

        chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue (KSh)',
                    data:  revenue,
                    borderColor:     '#ff6b35',
                    backgroundColor: 'rgba(255,107,53,0.08)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff6b35',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }],
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Revenue: ${fmt(ctx.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid:  { color: gridColor },
                        ticks: { color: textColor, maxTicksLimit: 10 },
                    },
                    y: {
                        beginAtZero: true,
                        grid:  { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: v => `KSh ${Number(v).toLocaleString('en-KE')}`,
                        },
                    },
                },
            },
        });
    }

    // ── TOP PRODUCTS ─────────────────────────────────────────
    function renderTopProducts () {
        const el = document.getElementById('topProductsList');
        if (!el) return;

        const top = statsData.top_products || [];
        if (!top.length) { el.innerHTML = '<p style="color:var(--muted);font-size:0.875rem;">No sales data yet.</p>'; return; }

        el.innerHTML = top.map((p, i) => `
            <div style="display:flex;align-items:center;gap:0.875rem;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                <div style="font-size:1.1rem;font-weight:800;color:var(--muted);width:20px;text-align:center;">${i + 1}</div>
                <img src="${p.img}" alt="${p.name}"
                     style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;"
                     onerror="this.src='https://via.placeholder.com/44?text=?'">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                    <div style="font-size:0.75rem;color:var(--muted);">${p.units_sold} sold</div>
                </div>
                <div style="font-weight:700;font-size:0.875rem;white-space:nowrap;">${fmt(p.revenue)}</div>
            </div>
        `).join('');
    }

    // ── LOW STOCK ────────────────────────────────────────────
    function renderLowStock () {
        const el = document.getElementById('lowStockList');
        if (!el) return;

        const list = statsData.low_stock_products || [];
        if (!list.length) { el.innerHTML = '<p style="color:var(--success);font-size:0.875rem;">All products are well stocked! ✓</p>'; return; }

        el.innerHTML = list.map(p => `
            <div style="display:flex;align-items:center;gap:0.875rem;padding:0.625rem 0;border-bottom:1px solid var(--border);">
                <img src="${p.img}" alt="${p.name}"
                     style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;"
                     onerror="this.src='https://via.placeholder.com/36?text=?'">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                    <div style="font-size:0.72rem;color:var(--muted);text-transform:capitalize;">${p.category}</div>
                </div>
                <span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:50px;font-size:0.72rem;font-weight:700;white-space:nowrap;">
                    ${p.stock} left
                </span>
            </div>
        `).join('');
    }

    // ── PENDING BADGE ─────────────────────────────────────────
    function updatePendingBadge () {
        const badge = document.getElementById('pendingOrdersBadge');
        const count = statsData.orders?.processing || 0;
        if (badge) {
            badge.textContent  = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // ── ORDERS TABLE ──────────────────────────────────────────
    function renderOrders () {
        const tbody = document.getElementById('adminOrdersTableBody');
        if (!tbody) return;

        let filtered = allOrders;
        if (orderFilter !== 'all') filtered = filtered.filter(o => o.status.toLowerCase() === orderFilter);
        if (orderSearch) {
            const q = orderSearch.toLowerCase();
            filtered = filtered.filter(o =>
                o.order_number.toLowerCase().includes(q) ||
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_email.toLowerCase().includes(q)
            );
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted);">No orders found.</td></tr>`;
            return;
        }

        const statusColors = {
            Processing: 'background:#dbeafe;color:#1d4ed8;',
            Shipped:    'background:#fef3c7;color:#d97706;',
            Delivered:  'background:#d1fae5;color:#065f46;',
            Cancelled:  'background:#fee2e2;color:#991b1b;',
        };

        tbody.innerHTML = filtered.map(o => `
            <tr>
                <td style="font-family:monospace;font-weight:600;font-size:0.82rem;">${o.order_number}</td>
                <td>
                    <div style="font-weight:600;font-size:0.875rem;">${o.customer_name}</div>
                    <div style="font-size:0.72rem;color:var(--muted);">${o.customer_email}</div>
                </td>
                <td style="font-size:0.82rem;color:var(--muted);">${o.date}</td>
                <td style="font-weight:700;">${fmt(o.total)}</td>
                <td>
                    <select class="status-select order-status-select" data-id="${o.id}"
                            style="padding:0.3rem 0.6rem;border-radius:6px;border:1px solid var(--border);font-size:0.8rem;font-weight:600;${statusColors[o.status] || ''}cursor:pointer;">
                        ${['Processing','Shipped','Delivered','Cancelled'].map(s =>
                            `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                    </select>
                </td>
                <td>
                    <button class="btn-sm view-order-btn" data-id="${o.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');

        // Status change
        tbody.querySelectorAll('.order-status-select').forEach(sel => {
            sel.addEventListener('change', () => updateOrderStatus(parseInt(sel.dataset.id), sel.value));
        });

        // View order
        tbody.querySelectorAll('.view-order-btn').forEach(btn => {
            btn.addEventListener('click', () => viewOrder(parseInt(btn.dataset.id)));
        });
    }

    // ── UPDATE ORDER STATUS ───────────────────────────────────
    async function updateOrderStatus (orderId, status) {
        const res = await window.api?.('api/admin/update_order.php', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, status }),
        });

        if (res?.success) {
            const o = allOrders.find(x => x.id === orderId);
            if (o) o.status = status;
            window.showToast?.(`Order status updated to ${status}.`, 'success');
            renderOrders();
            // Refresh stats counts
            const fresh = await window.api('api/admin/stats.php');
            if (fresh?.success) { statsData = fresh.stats; renderStats(); updatePendingBadge(); }
        } else {
            window.showToast?.(res?.message || 'Update failed.', 'error');
        }
    }

    // ── VIEW ORDER MODAL ──────────────────────────────────────
    function viewOrder (orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) return;

        const itemsHtml = (order.items || []).map(i => `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0;border-bottom:1px solid var(--border);">
                <img src="${i.img || 'https://via.placeholder.com/40?text=?'}" alt="${i.name}"
                     style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.875rem;">${i.name}</div>
                    <div style="font-size:0.75rem;color:var(--muted);">Qty: ${i.qty} · ${fmt(i.price)} each</div>
                </div>
                <div style="font-weight:700;font-size:0.875rem;">${fmt(i.price * i.qty)}</div>
            </div>
        `).join('');

        // Inject modal
        let modal = document.getElementById('orderViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'orderViewModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:var(--white);border-radius:16px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);">
                    <h3 style="font-weight:700;">Order ${order.order_number}</h3>
                    <button id="closeOrderModal" style="width:30px;height:30px;border-radius:8px;background:var(--accent);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:1.5rem;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                        <div>
                            <div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:0.25rem;">Customer</div>
                            <div style="font-weight:600;">${order.customer_name}</div>
                            <div style="font-size:0.82rem;color:var(--muted);">${order.customer_email}</div>
                            ${order.customer_phone ? `<div style="font-size:0.82rem;color:var(--muted);">${order.customer_phone}</div>` : ''}
                        </div>
                        <div>
                            <div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:0.25rem;">Delivery</div>
                            <div style="font-size:0.875rem;">${order.address}</div>
                            <div style="font-size:0.82rem;color:var(--muted);">${order.city}</div>
                        </div>
                        <div>
                            <div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:0.25rem;">Payment</div>
                            <div style="font-weight:600;text-transform:uppercase;">${order.payment_method}</div>
                        </div>
                        <div>
                            <div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:0.25rem;">Date</div>
                            <div style="font-weight:600;">${order.date}</div>
                        </div>
                    </div>
                    <div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--muted);margin-bottom:0.75rem;">Items</div>
                    ${itemsHtml}
                    <div style="display:flex;justify-content:space-between;padding-top:1rem;margin-top:0.5rem;border-top:2px solid var(--border);font-weight:800;font-size:1.1rem;">
                        <span>Total</span>
                        <span>${fmt(order.total)}</span>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.getElementById('closeOrderModal')?.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    }

    // ── PRODUCTS TABLE ────────────────────────────────────────
    function renderProducts () {
        const tbody = document.getElementById('adminProductsTableBody');
        if (!tbody) return;

        let filtered = allProducts;
        if (productFilter !== 'all') filtered = filtered.filter(p => p.category === productFilter);
        if (productSearch) {
            const q = productSearch.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q)
            );
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted);">No products found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(p => `
            <tr>
                <td><img src="${p.img}" alt="${p.name}"
                         style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);"
                         onerror="this.src='https://via.placeholder.com/44?text=?'"></td>
                <td>
                    <div style="font-weight:600;font-size:0.875rem;">${p.name}</div>
                    <div style="font-size:0.72rem;color:var(--muted);">${p.brand}</div>
                </td>
                <td style="text-transform:capitalize;font-size:0.875rem;">${p.category}</td>
                <td style="font-size:0.78rem;color:var(--muted);">${p.sellerEmail || '<span style="color:var(--muted);">LuxeMart</span>'}</td>
                <td style="font-weight:700;">${fmt(p.price)}</td>
                <td>
                    <span style="color:${p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warning)' : 'var(--success)'};font-weight:600;">
                        ${p.stock}
                    </span>
                </td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn-sm admin-edit-product" data-id="${p.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-danger admin-delete-product" data-id="${p.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.admin-edit-product').forEach(btn => {
            btn.addEventListener('click', () => openEditProductModal(parseInt(btn.dataset.id)));
        });

        tbody.querySelectorAll('.admin-delete-product').forEach(btn => {
            btn.addEventListener('click', () => adminDeleteProduct(parseInt(btn.dataset.id)));
        });
    }

    // ── EDIT PRODUCT MODAL ────────────────────────────────────
    function openEditProductModal (productId) {
        const p = allProducts.find(x => x.id === productId);
        if (!p) return;

        document.getElementById('editProductId').value    = p.id;
        document.getElementById('editProductName').value  = p.name;
        document.getElementById('editProductPrice').value = p.price;
        document.getElementById('editProductStock').value = p.stock;

        document.getElementById('editProductModal')?.classList.add('show');
    }

    document.getElementById('closeEditModal')?.addEventListener('click', () => {
        document.getElementById('editProductModal')?.classList.remove('show');
    });

    document.getElementById('editProductForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id    = parseInt(document.getElementById('editProductId').value);
        const p     = allProducts.find(x => x.id === id);
        if (!p) return;

        const formData = new FormData();
        formData.append('id',          id);
        formData.append('name',        document.getElementById('editProductName').value.trim());
        formData.append('brand',       p.brand);
        formData.append('description', p.desc || '');
        formData.append('price',       document.getElementById('editProductPrice').value);
        formData.append('category',    p.category);
        formData.append('stock',       document.getElementById('editProductStock').value);
        formData.append('image_url',   p.img);

        const res = await fetch('api/products/update.php', {
            method:      'POST',
            credentials: 'same-origin',
            body:        formData,
        });
        const result = await res.json();

        if (result.success) {
            window.showToast?.('Product updated!', 'success');
            document.getElementById('editProductModal')?.classList.remove('show');
            // Refresh products
            const fresh = await window.api('api/products/get.php?limit=100');
            allProducts = fresh?.products || allProducts;
            renderProducts();
        } else {
            window.showToast?.(result.message || 'Update failed.', 'error');
        }
    });

    async function adminDeleteProduct (productId) {
        if (!confirm('Permanently delete this product?')) return;

        const res = await window.api?.('api/products/delete.php', {
            method: 'POST',
            body: JSON.stringify({ id: productId }),
        });

        if (res?.success) {
            window.showToast?.('Product deleted.', 'success');
            allProducts = allProducts.filter(p => p.id !== productId);
            renderProducts();
        } else {
            window.showToast?.(res?.message || 'Delete failed.', 'error');
        }
    }

    // ── USERS TABLE ───────────────────────────────────────────
    function renderUsers () {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;

        let filtered = allUsers;
        if (userFilter !== 'all') filtered = filtered.filter(u => u.role === userFilter);
        if (userSearch) {
            const q = userSearch.toLowerCase();
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            );
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted);">No users found.</td></tr>`;
            return;
        }

        const roleBadge = role => {
            const map = {
                admin:  'background:#f3e8ff;color:#7c3aed;',
                seller: 'background:#fef3c7;color:#d97706;',
                buyer:  'background:#d1fae5;color:#065f46;',
            };
            return `<span style="${map[role] || ''}padding:2px 10px;border-radius:50px;font-size:0.72rem;font-weight:700;text-transform:uppercase;">${role}</span>`;
        };

        tbody.innerHTML = filtered.map(u => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        ${u.picture
                            ? `<img src="${u.picture}" alt="${u.name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
                            : `<div style="width:36px;height:36px;border-radius:50%;background:var(--secondary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.875rem;">${u.name[0]}</div>`
                        }
                        <div>
                            <div style="font-weight:600;font-size:0.875rem;">${u.name}</div>
                            <div style="font-size:0.72rem;color:var(--muted);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td>${roleBadge(u.role)}</td>
                <td style="font-size:0.82rem;">${u.order_count || 0}</td>
                <td style="font-weight:600;font-size:0.875rem;">${fmt(u.total_spent || 0)}</td>
                <td style="font-size:0.78rem;color:var(--muted);">${new Date(u.created_at).toLocaleDateString('en-KE', { month:'short', day:'numeric', year:'numeric' })}</td>
                <td>
                    <select class="user-role-select" data-email="${u.email}"
                            style="padding:0.3rem 0.5rem;border-radius:6px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;">
                        ${['buyer','seller','admin'].map(r =>
                            `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`
                        ).join('')}
                    </select>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.user-role-select').forEach(sel => {
            sel.addEventListener('change', () => updateUserRole(sel.dataset.email, sel.value));
        });
    }

    async function updateUserRole (email, role) {
        const res = await window.api?.('api/admin/users.php', {
            method: 'POST',
            body: JSON.stringify({ email, role }),
        });

        if (res?.success) {
            const u = allUsers.find(x => x.email === email);
            if (u) u.role = role;
            window.showToast?.(`${email} role updated to ${role}.`, 'success');
            renderUsers();
        } else {
            window.showToast?.(res?.message || 'Role update failed.', 'error');
        }
    }

    // ── SEARCH + FILTER WIRING ────────────────────────────────

    // Orders
    document.getElementById('orderSearchInput')?.addEventListener('input', e => {
        orderSearch = e.target.value.trim();
        renderOrders();
    });

    document.querySelectorAll('.order-filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.order-filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            orderFilter = tab.dataset.filter || 'all';
            renderOrders();
        });
    });

    // Products
    document.getElementById('productSearchInput')?.addEventListener('input', e => {
        productSearch = e.target.value.trim();
        renderProducts();
    });

    document.getElementById('productCategoryFilter')?.addEventListener('change', e => {
        productFilter = e.target.value;
        renderProducts();
    });

    // Users
    document.getElementById('userSearchInput')?.addEventListener('input', e => {
        userSearch = e.target.value.trim();
        renderUsers();
    });

    document.querySelectorAll('.user-filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.user-filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            userFilter = tab.dataset.filter || 'all';
            renderUsers();
        });
    });

    // ── SECTION TAB NAVIGATION ────────────────────────────────
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.section;

            document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`section-${target}`)?.classList.add('active');
        });
    });

    // ── REFRESH BUTTON ────────────────────────────────────────
    document.getElementById('refreshDashboardBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshDashboardBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...'; }
        await bootDashboard();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; }
        window.showToast?.('Dashboard refreshed.', 'success');
    });

    // ── THEME CHANGE → REDRAW CHART ──────────────────────────
    const themeBtn = document.getElementById('themeToggle');
    themeBtn?.addEventListener('click', () => {
        setTimeout(renderChart, 100);
    });

    // ── BOOT ──────────────────────────────────────────────────
    await bootDashboard();
});
