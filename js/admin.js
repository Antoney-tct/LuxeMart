// ============================================================
//  LuxeMart — admin.js (FULL REWRITE)
//  All data from API — no localStorage
//  Auth checked on load — admin only
// ============================================================

(function () {
    'use strict';

    // ── STATE ──────────────────────────────────────────────
    let allOrders   = [];
    let allProducts = [];
    let allUsers    = [];
    let salesChart  = null;

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        const user = window.getUser ? window.getUser() : null;

        if (!user || user.role !== 'admin') {
            window.showToast('Admin access required.', 'error');
            setTimeout(() => window.location.href = 'index.html', 1200);
            return;
        }

        renderSkeletons();
        await Promise.all([fetchOrders(), fetchProducts(), fetchUsers()]);
        renderStats();
        renderSalesChart();
        renderOrdersTable();
        renderProductsTable();
        renderUsersTable();
        bindEvents();
    });

    // ── FETCH ──────────────────────────────────────────────
    const fetchOrders = async () => {
        const result = await window.api('api/admin/orders.php');
        if (result.success) allOrders = result.orders || [];
    };

    const fetchProducts = async () => {
        const result = await window.api('api/products/seller.php');
        if (result.success) allProducts = result.products || [];
    };

    const fetchUsers = async () => {
        const result = await window.api('api/admin/users.php');
        if (result.success) allUsers = result.users || [];
    };

    // ── STATS ──────────────────────────────────────────────
    const renderStats = () => {
        const container = document.getElementById('adminStats');
        if (!container) return;

        const totalRevenue  = allOrders
            .filter(o => o.status !== 'Cancelled')
            .reduce((sum, o) => sum + Number(o.total), 0);

        const pendingOrders = allOrders.filter(o => o.status === 'Processing').length;
        const totalSellers  = allUsers.filter(u => u.role === 'seller').length;
        const totalBuyers   = allUsers.filter(u => u.role === 'buyer').length;

        const stats = [
            { label: 'Total Revenue',    value: `KSh ${totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, icon: 'fa-dollar-sign',  color: '#10b981' },
            { label: 'Total Orders',     value: allOrders.length,   icon: 'fa-shopping-bag',   color: '#3b82f6' },
            { label: 'Pending Orders',   value: pendingOrders,      icon: 'fa-clock',          color: '#f59e0b' },
            { label: 'Total Products',   value: allProducts.length, icon: 'fa-box',            color: '#8b5cf6' },
            { label: 'Sellers',          value: totalSellers,       icon: 'fa-store',          color: '#ff6b35' },
            { label: 'Buyers',           value: totalBuyers,        icon: 'fa-users',          color: '#06b6d4' },
        ];

        container.innerHTML = stats.map(s => `
            <div class="stat-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <p style="color:var(--light-text);font-size:0.85rem;margin-bottom:0.5rem;">${s.label}</p>
                        <h3 style="font-size:1.75rem;font-family:'Inter',sans-serif;">${s.value}</h3>
                    </div>
                    <div style="width:44px;height:44px;border-radius:10px;background:${s.color}20;
                                display:flex;align-items:center;justify-content:center;">
                        <i class="fas ${s.icon}" style="color:${s.color};font-size:1.2rem;"></i>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // ── SALES CHART ────────────────────────────────────────
    const renderSalesChart = () => {
        const canvas = document.getElementById('salesChart');
        if (!canvas || !allOrders.length) return;

        // Group revenue by date
        const salesByDate = {};
        allOrders
            .filter(o => o.status !== 'Cancelled')
            .forEach(o => {
                const date = new Date(o.created_at).toISOString().split('T')[0];
                salesByDate[date] = (salesByDate[date] || 0) + Number(o.total);
            });

        const sorted = Object.keys(salesByDate).sort();
        const labels = sorted.map(d => new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
        const data   = sorted.map(d => salesByDate[d]);

        if (salesChart) salesChart.destroy();

        salesChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label:           'Daily Revenue (KSh)',
                    data,
                    borderColor:     '#ff6b35',
                    backgroundColor: 'rgba(255,107,53,0.1)',
                    borderWidth:     2.5,
                    tension:         0.4,
                    fill:            true,
                    pointBackgroundColor: '#ff6b35',
                    pointRadius:     4,
                    pointHoverRadius:6,
                }],
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `KSh ${Number(ctx.parsed.y).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => 'KSh ' + Number(v).toLocaleString('en-KE'),
                        },
                    },
                },
            },
        });
    };

    // ── ORDERS TABLE ───────────────────────────────────────
    const renderOrdersTable = (orders = allOrders) => {
        const tbody = document.getElementById('adminOrdersTableBody');
        if (!tbody) return;

        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--light-text);">No orders found.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const statusClass = {
                processing: 'status-processing',
                shipped:    'status-shipped',
                delivered:  'status-delivered',
                cancelled:  'status-cancelled',
            }[o.status.toLowerCase()] || 'status-processing';

            const date = new Date(o.created_at).toLocaleDateString('en-KE', {
                year: 'numeric', month: 'short', day: 'numeric',
            });

            return `
                <tr>
                    <td style="font-weight:600;font-size:0.85rem;">#${o.order_number}</td>
                    <td>
                        <div style="font-weight:500;">${o.customer_name}</div>
                        <div style="font-size:0.8rem;color:var(--light-text);">${o.customer_email}</div>
                    </td>
                    <td style="font-size:0.85rem;">${date}</td>
                    <td style="font-weight:600;">
                        KSh ${Number(o.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                        <select class="status-select ${o.status.toLowerCase()}"
                                data-order-id="${o.id}"
                                style="padding:0.35rem 0.6rem;border-radius:6px;border:1px solid var(--border);
                                       font-size:0.82rem;cursor:pointer;">
                            ${['Processing','Shipped','Delivered','Cancelled'].map(s =>
                                `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                            ).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="view-order-btn btn-sm" data-id="${o.id}"
                                style="font-size:0.8rem;padding:0.35rem 0.8rem;border-radius:6px;
                                       background:var(--accent);border:1px solid var(--border);cursor:pointer;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>`;
        }).join('');

        // Status change
        tbody.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', () => updateOrderStatus(sel.dataset.orderId, sel.value));
        });

        // View order
        tbody.querySelectorAll('.view-order-btn').forEach(btn => {
            btn.addEventListener('click', () => viewOrder(parseInt(btn.dataset.id)));
        });
    };

    // ── PRODUCTS TABLE ─────────────────────────────────────
    const renderProductsTable = (products = allProducts) => {
        const tbody = document.getElementById('adminProductsTableBody');
        if (!tbody) return;

        if (!products.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--light-text);">No products found.</td></tr>`;
            return;
        }

        tbody.innerHTML = products.map(p => {
            const seller = allUsers.find(u => u.id === p.seller_id);
            return `
                <tr>
                    <td>
                        <img src="${p.image_url}" alt="${p.name}"
                             style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border);"
                             onerror="this.src='https://via.placeholder.com/44?text=?'">
                    </td>
                    <td style="font-weight:500;max-width:160px;">
                        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                        <div style="font-size:0.78rem;color:var(--light-text);">${p.brand || ''}</div>
                    </td>
                    <td>
                        <span style="padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;
                                     background:var(--accent);text-transform:capitalize;">
                            ${p.category}
                        </span>
                    </td>
                    <td style="font-size:0.85rem;">
                        ${seller
                            ? `<div style="font-weight:500;">${seller.name}</div>
                               <div style="font-size:0.78rem;color:var(--light-text);">${seller.email}</div>`
                            : '<span style="color:var(--light-text);">LuxeMart</span>'}
                    </td>
                    <td style="font-weight:600;">
                        KSh ${Number(p.price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                        <span style="color:${p.stock > 10 ? 'var(--success)' : p.stock > 0 ? '#f59e0b' : '#ef4444'};
                                     font-weight:600;">
                            ${p.stock}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex;gap:0.4rem;">
                            <button class="edit-product-btn btn-sm" data-id="${p.id}"
                                    style="background:var(--secondary);color:white;border:none;
                                           padding:0.35rem 0.7rem;border-radius:6px;cursor:pointer;font-size:0.8rem;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-product-btn btn-sm" data-id="${p.id}"
                                    style="background:#ef4444;color:white;border:none;
                                           padding:0.35rem 0.7rem;border-radius:6px;cursor:pointer;font-size:0.8rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', () => adminDeleteProduct(parseInt(btn.dataset.id)));
        });
    };

    // ── USERS TABLE ────────────────────────────────────────
    const renderUsersTable = (users = allUsers) => {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--light-text);">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <img src="${u.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=ff6b35&color=fff`}"
                             alt="${u.name}"
                             style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                        <div>
                            <div style="font-weight:500;">${u.name}</div>
                            <div style="font-size:0.78rem;color:var(--light-text);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="padding:3px 12px;border-radius:20px;font-size:0.78rem;font-weight:600;
                                 background:${roleColor(u.role).bg};color:${roleColor(u.role).text};">
                        ${u.role}
                    </span>
                </td>
                <td style="font-size:0.85rem;">
                    ${new Date(u.created_at).toLocaleDateString('en-KE', { year:'numeric', month:'short', day:'numeric' })}
                </td>
                <td style="font-size:0.85rem;">${u.phone || '—'}</td>
                <td>
                    <select class="role-select" data-user-id="${u.id}"
                            style="padding:0.35rem 0.6rem;border-radius:6px;border:1px solid var(--border);
                                   font-size:0.82rem;cursor:pointer;">
                        ${['buyer','seller','admin'].map(r =>
                            `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
                        ).join('')}
                    </select>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.role-select').forEach(sel => {
            sel.addEventListener('change', () => updateUserRole(sel.dataset.userId, sel.value));
        });
    };

    // ── SEARCH + FILTER ────────────────────────────────────
    const bindEvents = () => {
        // Order search
        document.getElementById('orderSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            renderOrdersTable(allOrders.filter(o =>
                o.order_number.toLowerCase().includes(q) ||
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_email.toLowerCase().includes(q)
            ));
        });

        // Product search
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            renderProductsTable(allProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            ));
        });

        // User search
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            renderUsersTable(allUsers.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            ));
        });

        // Edit product modal
        document.getElementById('closeEditModal')?.addEventListener('click', closeEditModal);
        document.getElementById('editProductForm')?.addEventListener('submit', handleEditProduct);

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', async () => {
            renderSkeletons();
            await Promise.all([fetchOrders(), fetchProducts(), fetchUsers()]);
            renderStats();
            renderSalesChart();
            renderOrdersTable();
            renderProductsTable();
            renderUsersTable();
            window.showToast('Dashboard refreshed.', 'success');
        });
    };

    // ── UPDATE ORDER STATUS ────────────────────────────────
    const updateOrderStatus = async (orderId, newStatus) => {
        const result = await window.api('api/admin/update_order.php', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, status: newStatus }),
        });

        if (result.success) {
            const order = allOrders.find(o => o.id == orderId);
            if (order) order.status = newStatus;
            renderStats();
            window.showToast(`Order status updated to ${newStatus}.`, 'success');
        } else {
            window.showToast('Could not update order status.', 'error');
        }
    };

    // ── VIEW ORDER DETAILS ─────────────────────────────────
    const viewOrder = (orderId) => {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) return;

        const itemsHtml = (order.items || []).map(i => `
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;
                        border-bottom:1px solid var(--border);">
                <span>${i.product_name} × ${i.qty}</span>
                <span style="font-weight:600;">
                    KSh ${(i.price * i.qty).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
            </div>
        `).join('');

        showModal(`
            <div class="modal-header">
                <h3 class="modal-title">Order #${order.order_number}</h3>
                <button class="modal-close" onclick="document.getElementById('dynamicModal').classList.remove('show')">×</button>
            </div>
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                    <div>
                        <div style="font-size:0.8rem;color:var(--light-text);">Customer</div>
                        <div style="font-weight:500;">${order.customer_name}</div>
                        <div style="font-size:0.85rem;">${order.customer_email}</div>
                    </div>
                    <div>
                        <div style="font-size:0.8rem;color:var(--light-text);">Delivery</div>
                        <div style="font-size:0.85rem;">${order.address}, ${order.city}</div>
                    </div>
                    <div>
                        <div style="font-size:0.8rem;color:var(--light-text);">Payment</div>
                        <div style="font-weight:500;text-transform:uppercase;">${order.payment_method}</div>
                    </div>
                    <div>
                        <div style="font-size:0.8rem;color:var(--light-text);">Status</div>
                        <div style="font-weight:500;">${order.status}</div>
                    </div>
                </div>
                <div>${itemsHtml}</div>
                <div style="display:flex;justify-content:space-between;margin-top:1rem;
                            padding-top:1rem;border-top:2px solid var(--border);font-weight:700;font-size:1.1rem;">
                    <span>Total</span>
                    <span>KSh ${Number(order.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `);
    };

    // ── EDIT PRODUCT MODAL ─────────────────────────────────
    const openEditModal = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('editProductId').value    = product.id;
        document.getElementById('editProductName').value  = product.name;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock;

        document.getElementById('editProductModal')?.classList.add('show');
    };

    const closeEditModal = () => {
        document.getElementById('editProductModal')?.classList.remove('show');
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();

        const id    = document.getElementById('editProductId').value;
        const name  = document.getElementById('editProductName').value;
        const price = document.getElementById('editProductPrice').value;
        const stock = document.getElementById('editProductStock').value;

        const formData = new FormData();
        formData.append('id',    id);
        formData.append('name',  name);
        formData.append('price', price);
        formData.append('stock', stock);

        // Get existing product data to fill required fields
        const product = allProducts.find(p => p.id == id);
        if (product) {
            formData.append('brand',       product.brand       || '');
            formData.append('description', product.description || '');
            formData.append('category',    product.category    || '');
            formData.append('image_url',   product.image_url   || '');
        }

        try {
            const res    = await fetch('api/products/update.php', { method: 'POST', body: formData });
            const result = await res.json();

            if (result.success) {
                // Update local state
                const p = allProducts.find(p => p.id == id);
                if (p) { p.name = name; p.price = parseFloat(price); p.stock = parseInt(stock); }
                closeEditModal();
                renderProductsTable();
                window.showToast('Product updated.', 'success');
            } else {
                window.showToast(result.message || 'Update failed.', 'error');
            }
        } catch {
            window.showToast('Something went wrong.', 'error');
        }
    };

    // ── DELETE PRODUCT ─────────────────────────────────────
    const adminDeleteProduct = async (id) => {
        const product = allProducts.find(p => p.id === id);
        if (!confirm(`Delete "${product?.name}"? This cannot be undone.`)) return;

        const result = await window.api('api/products/delete.php', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });

        if (result.success) {
            allProducts = allProducts.filter(p => p.id !== id);
            renderProductsTable();
            renderStats();
            window.showToast('Product deleted.', 'info');
        } else {
            window.showToast(result.message || 'Could not delete.', 'error');
        }
    };

    // ── UPDATE USER ROLE ───────────────────────────────────
    const updateUserRole = async (userId, newRole) => {
        const result = await window.api('api/admin/update_user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, role: newRole }),
        });

        if (result.success) {
            const user = allUsers.find(u => u.id == userId);
            if (user) user.role = newRole;
            renderStats();
            window.showToast(`User role updated to ${newRole}.`, 'success');
        } else {
            window.showToast('Could not update user role.', 'error');
        }
    };

    // ── DYNAMIC MODAL ──────────────────────────────────────
    const showModal = (html) => {
        let modal = document.getElementById('dynamicModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id        = 'dynamicModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `<div class="modal" style="max-width:600px;"></div>`;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('show');
            });
            document.body.appendChild(modal);
        }
        modal.querySelector('.modal').innerHTML = html;
        modal.classList.add('show');
    };

    // ── HELPERS ────────────────────────────────────────────
    const roleColor = (role) => {
        const map = {
            admin:  { bg: '#fee2e2', text: '#991b1b' },
            seller: { bg: '#ffedd5', text: '#9a3412' },
            buyer:  { bg: '#dbeafe', text: '#1e40af' },
        };
        return map[role] || map.buyer;
    };

    const renderSkeletons = () => {
        const statsEl = document.getElementById('adminStats');
        if (statsEl) {
            statsEl.innerHTML = [1,2,3,4,5,6].map(() =>
                `<div class="skeleton" style="height:100px;border-radius:12px;"></div>`
            ).join('');
        }
    };

})();