/**
 * LuxeMart — seller.js
 * Seller dashboard: list products, add/edit/delete/toggle,
 * view seller orders, show earnings stats.
 * Loaded only on seller.html.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

    // ── AUTH GUARD ────────────────────────────────────────────
    const result = await window.api?.('api/auth/me.php');
    const user   = result?.user;

    if (!user || !['seller', 'admin'].includes(user.role)) {
        window.showToast?.('Seller access required.', 'error');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
        return;
    }

    // ── STATE ─────────────────────────────────────────────────
    let products      = [];
    let editingId     = null;
    let filterStatus  = 'all';

    // ── DOM REFS ──────────────────────────────────────────────
    const tbody         = document.getElementById('sellerProductsTableBody');
    const form          = document.getElementById('addProductForm');
    const imageUrlInput = document.getElementById('pImageUrl');
    const imageFile     = document.getElementById('pImageFile');
    const preview       = document.getElementById('imagePreview');
    const submitBtn     = form?.querySelector('button[type="submit"]');

    // ── STATS ─────────────────────────────────────────────────
    async function loadStats () {
        const ordersRes = await window.api?.('api/orders/seller_orders.php');
        const orders    = ordersRes?.orders || [];

        const totalOrders   = orders.length;
        const totalRevenue  = orders
            .filter(o => o.status !== 'Cancelled')
            .reduce((s, o) => s + o.total, 0);
        const activeProducts = products.filter(p => p.is_active).length;
        const outOfStock     = products.filter(p => p.stock <= 0).length;

        const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

        const statsEl = document.getElementById('sellerStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card">
                    <div style="font-size:1.75rem;font-weight:800;">${activeProducts}</div>
                    <div style="font-size:0.8rem;color:var(--muted);font-weight:500;margin-top:0.25rem;">Active Listings</div>
                </div>
                <div class="stat-card">
                    <div style="font-size:1.75rem;font-weight:800;">${totalOrders}</div>
                    <div style="font-size:0.8rem;color:var(--muted);font-weight:500;margin-top:0.25rem;">Total Orders</div>
                </div>
                <div class="stat-card">
                    <div style="font-size:1.75rem;font-weight:800;">${fmt(totalRevenue)}</div>
                    <div style="font-size:0.8rem;color:var(--muted);font-weight:500;margin-top:0.25rem;">Total Revenue</div>
                </div>
                <div class="stat-card" style="border-left-color:${outOfStock > 0 ? 'var(--danger)' : 'var(--success)'};">
                    <div style="font-size:1.75rem;font-weight:800;color:${outOfStock > 0 ? 'var(--danger)' : 'var(--success)'};">${outOfStock}</div>
                    <div style="font-size:0.8rem;color:var(--muted);font-weight:500;margin-top:0.25rem;">Out of Stock</div>
                </div>
            `;
        }
    }

    // ── FETCH PRODUCTS ────────────────────────────────────────
    async function loadProducts () {
        const res = await window.api?.('api/products/seller.php');
        products  = res?.products || [];
        renderTable();
        renderMobileCards();
        await loadStats();
    }

    // ── FILTER ────────────────────────────────────────────────
    function getFiltered () {
        if (filterStatus === 'all')      return products;
        if (filterStatus === 'active')   return products.filter(p => p.is_active && p.stock > 0);
        if (filterStatus === 'inactive') return products.filter(p => !p.is_active);
        if (filterStatus === 'low')      return products.filter(p => p.stock <= 5 && p.stock > 0);
        return products;
    }

    // ── RENDER TABLE (desktop) ────────────────────────────────
    function renderTable () {
        if (!tbody) return;
        const list = getFiltered();

        if (!list.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:2.5rem;color:var(--muted);">
                        ${products.length ? 'No products match this filter.' : 'No products listed yet. Add your first product below.'}
                    </td>
                </tr>`;
            return;
        }

        const fmt = n => `KSh ${Number(n).toLocaleString('en-KE')}`;

        tbody.innerHTML = list.map(p => `
            <tr style="opacity:${p.is_active ? 1 : 0.55};">
                <td>
                    <img src="${p.image_url}" alt="${p.name}"
                         style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);"
                         onerror="this.src='https://via.placeholder.com/44?text=?'">
                </td>
                <td>
                    <div style="font-weight:600;font-size:0.875rem;">${p.name}</div>
                    <div style="font-size:0.72rem;color:var(--muted);">${p.brand}</div>
                </td>
                <td style="text-transform:capitalize;">${p.category}</td>
                <td style="font-weight:700;">${fmt(p.price)}</td>
                <td>
                    <span style="color:${p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warning)' : 'var(--success)'};font-weight:600;">
                        ${p.stock <= 0 ? 'Out of stock' : p.stock + ' left'}
                    </span>
                </td>
                <td>
                    <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
                        <button class="btn-sm edit-btn" data-id="${p.id}" title="Edit">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-sm toggle-btn" data-id="${p.id}"
                                style="background:${p.is_active ? '#f59e0b' : 'var(--success)'};"
                                title="${p.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fas ${p.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button class="btn-sm btn-danger delete-btn" data-id="${p.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        bindTableEvents();
    }

    // ── RENDER MOBILE CARDS ───────────────────────────────────
    function renderMobileCards () {
        const grid = document.getElementById('sellerMobileCards');
        if (!grid) return;

        const list = getFiltered();
        const fmt  = n => `KSh ${Number(n).toLocaleString('en-KE')}`;

        if (!list.length) {
            grid.innerHTML = `<p style="text-align:center;color:var(--muted);padding:2rem;">No products found.</p>`;
            return;
        }

        grid.innerHTML = list.map(p => `
            <div class="seller-product-card" style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:1rem;display:flex;gap:1rem;align-items:center;margin-bottom:0.75rem;opacity:${p.is_active ? 1 : 0.6};">
                <img src="${p.image_url}" alt="${p.name}"
                     style="width:60px;height:60px;object-fit:cover;border-radius:10px;flex-shrink:0;"
                     onerror="this.src='https://via.placeholder.com/60?text=?'">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                    <div style="font-size:0.75rem;color:var(--muted);">${p.category} · ${fmt(p.price)}</div>
                    <div style="font-size:0.72rem;margin-top:0.2rem;color:${p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warning)' : 'var(--success)'};">
                        ${p.stock <= 0 ? 'Out of stock' : p.stock + ' in stock'}
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:0.4rem;">
                    <button class="btn-sm edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        bindTableEvents();
    }

    // ── BIND TABLE ACTION EVENTS ──────────────────────────────
    function bindTableEvents () {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.id)));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleProduct(parseInt(btn.dataset.id)));
        });
    }

    // ── START EDIT ────────────────────────────────────────────
    window._sellerStartEdit = function (id) { startEdit(id); };

    function startEdit (id) {
        const p = products.find(x => x.id === id);
        if (!p) return;

        editingId = id;

        document.getElementById('pName').value     = p.name;
        document.getElementById('pBrand').value    = p.brand;
        document.getElementById('pCategory').value = p.category;
        document.getElementById('pPrice').value    = p.price;
        document.getElementById('pDesc').value     = p.description || '';
        document.getElementById('pStock').value    = p.stock;
        if (imageUrlInput) imageUrlInput.value     = p.image_url;

        if (preview && p.image_url) {
            preview.innerHTML = `<img src="${p.image_url}" alt="Preview" style="width:100%;height:100%;object-fit:contain;">`;
        }

        if (submitBtn) {
            submitBtn.innerHTML  = '<i class="fas fa-save"></i> Update Product';
            submitBtn.style.background = 'var(--success)';
        }

        const addSection = document.getElementById('addProductSection');
        addSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const heading = document.getElementById('formHeading');
        if (heading) heading.textContent = 'Edit Product';
    }

    function resetForm () {
        editingId = null;
        form?.reset();
        if (preview) preview.innerHTML = '<span style="color:var(--muted);">No image selected</span>';
        if (imageUrlInput) imageUrlInput.value = '';
        if (submitBtn) {
            submitBtn.innerHTML  = '<i class="fas fa-plus"></i> List Product';
            submitBtn.style.background = '';
        }
        const heading = document.getElementById('formHeading');
        if (heading) heading.textContent = 'Add New Product';
    }

    // ── DELETE ────────────────────────────────────────────────
    window._sellerDelete = function (id) { deleteProduct(id); };

    async function deleteProduct (id) {
        if (!confirm('Delete this product permanently?')) return;

        const res = await window.api?.('api/products/delete.php', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });

        if (res?.success) {
            window.showToast?.('Product deleted.', 'success');
            await loadProducts();
        } else {
            window.showToast?.(res?.message || 'Delete failed.', 'error');
        }
    }

    // ── TOGGLE ────────────────────────────────────────────────
    async function toggleProduct (id) {
        const res = await window.api?.('api/products/toggle.php', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });

        if (res?.success) {
            const state = res.is_active ? 'activated' : 'deactivated';
            window.showToast?.(`Product ${state}.`, 'info');
            await loadProducts();
        } else {
            window.showToast?.(res?.message || 'Toggle failed.', 'error');
        }
    }

    // ── IMAGE PREVIEW ─────────────────────────────────────────
    imageUrlInput?.addEventListener('input', () => {
        const url = imageUrlInput.value.trim();
        if (url && preview) {
            preview.innerHTML = `<img src="${url}" alt="Preview" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=\\'color:var(--danger)\\'>Invalid image URL</span>'">`;
        }
    });

    imageFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 2 * 1024 * 1024;

        if (!allowed.includes(file.type)) {
            window.showToast?.('Only JPG, PNG and WEBP allowed.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > maxSize) {
            window.showToast?.('Image must be under 2MB.', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = ev => {
            if (preview) {
                preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:contain;">`;
            }
        };
        reader.readAsDataURL(file);
    });

    // ── FORM SUBMIT ───────────────────────────────────────────
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name',        document.getElementById('pName').value.trim());
        formData.append('brand',       document.getElementById('pBrand').value.trim());
        formData.append('category',    document.getElementById('pCategory').value);
        formData.append('price',       document.getElementById('pPrice').value);
        formData.append('description', document.getElementById('pDesc').value.trim());
        formData.append('stock',       document.getElementById('pStock')?.value || 10);
        formData.append('image_url',   imageUrlInput?.value.trim() || '');

        const file = imageFile?.files[0];
        if (file) formData.append('pImageFile', file);

        if (editingId) formData.append('id', editingId);

        const endpoint = editingId ? 'api/products/update.php' : 'api/products/create.php';

        submitBtn.disabled  = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const res = await fetch(endpoint, {
                method:      'POST',
                credentials: 'same-origin',
                body:        formData,
                // Don't set Content-Type — browser sets it with boundary
            });
            const result = await res.json();

            if (result.success) {
                window.showToast?.(editingId ? 'Product updated!' : 'Product listed!', 'success');
                resetForm();
                await loadProducts();
            } else {
                window.showToast?.(result.message || 'Save failed.', 'error');
            }
        } catch (err) {
            window.showToast?.('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled  = false;
            submitBtn.innerHTML = editingId
                ? '<i class="fas fa-save"></i> Update Product'
                : '<i class="fas fa-plus"></i> List Product';
        }
    });

    // ── CANCEL EDIT BUTTON ────────────────────────────────────
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
        resetForm();
    });

    // ── FILTER TABS ───────────────────────────────────────────
    document.querySelectorAll('.seller-filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.seller-filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterStatus = tab.dataset.filter || 'all';
            renderTable();
            renderMobileCards();
        });
    });

    // ── EXPOSE GLOBALLY ───────────────────────────────────────
    window.filterSellerProducts = (status) => {
        filterStatus = status;
        renderTable();
        renderMobileCards();
    };

    // ── INIT ──────────────────────────────────────────────────
    await loadProducts();
});
