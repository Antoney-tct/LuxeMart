
await Promise.all([fetchOrders(), fetchProducts(), fetchUsers()]);
renderStats();
renderSalesChart();
renderOrdersTable();
renderProductsTable();
renderUsersTable();
renderRecentOrders();   // ← add
renderLowStock();       // ← add
updatePendingBadge();   // ← add
bindEvents();
// ── WIRE FILTER CALLBACKS ──────────────────────────────
window._adminFilterOrders = (status) => {
    const filtered = status === 'all'
        ? allOrders
        : allOrders.filter(o => o.status === status);
    renderOrdersTable(filtered);
};

window._adminFilterProducts = (category) => {
    const filtered = category === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === category);
    renderProductsTable(filtered);
};

window._adminFilterUsers = (role) => {
    const filtered = role === 'all'
        ? allUsers
        : allUsers.filter(u => u.role === role);
    renderUsersTable(filtered);
};

// ── RECENT ORDERS (overview panel) ────────────────────
const renderRecentOrders = () => {
    const el = document.getElementById('recentOrdersList');
    if (!el) return;

    const recent = allOrders.slice(0, 6);
    if (!recent.length) {
        el.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--light-text);">No orders yet.</div>`;
        return;
    }

    el.innerHTML = recent.map(o => {
        const statusColors = {
            processing: '#3b82f6',
            shipped:    '#f59e0b',
            delivered:  '#10b981',
            cancelled:  '#ef4444',
        };
        const color = statusColors[o.status.toLowerCase()] || '#6b7280';

        return `
            <div class="recent-item">
                <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                <div class="recent-info">
                    <div class="recent-name">${o.customer_name}</div>
                    <div class="recent-sub">#${o.order_number} · ${o.status}</div>
                </div>
                <div class="recent-amount">
                    KSh ${Number(o.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
            </div>`;
    }).join('');
};

// ── LOW STOCK PANEL ────────────────────────────────────
const renderLowStock = () => {
    const card  = document.getElementById('lowStockCard');
    const tbody = document.getElementById('lowStockTableBody');
    if (!card || !tbody) return;

    const lowStock = allProducts.filter(p => p.stock <= 5 && p.stock > 0);
    const outOfStock= allProducts.filter(p => p.stock === 0);
    const combined = [...outOfStock, ...lowStock];

    if (!combined.length) { card.style.display = 'none'; return; }

    card.style.display = 'block';

    tbody.innerHTML = combined.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <img src="${p.image_url}" alt="${p.name}"
                         style="width:36px;height:36px;border-radius:6px;object-fit:cover;border:1px solid var(--border);"
                         onerror="this.src='https://via.placeholder.com/36?text=?'">
                    <span style="font-weight:500;font-size:0.875rem;">${p.name}</span>
                </div>
            </td>
            <td>
                <span class="badge" style="background:var(--accent);color:var(--text);text-transform:capitalize;">
                    ${p.category}
                </span>
            </td>
            <td>
                <span style="font-weight:700;color:${p.stock === 0 ? 'var(--danger)' : 'var(--warning)'};">
                    ${p.stock === 0 ? 'Out of stock' : p.stock + ' left'}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm edit-product-btn" data-id="${p.id}">
                    <i class="fas fa-edit"></i> Edit Stock
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
};

// ── PENDING BADGE ──────────────────────────────────────
const updatePendingBadge = () => {
    const badge = document.getElementById('pendingBadge');
    if (!badge) return;
    const count = allOrders.filter(o => o.status === 'Processing').length;
    badge.textContent  = count;
    badge.style.display= count > 0 ? 'inline-flex' : 'none';
};

// Add these calls inside your existing init, after the await Promise.all:
// renderRecentOrders();
// renderLowStock();
// updatePendingBadge();