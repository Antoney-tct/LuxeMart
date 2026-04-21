// ============================================================
//  LuxeMart — seller.js (FULL REWRITE)
//  All product CRUD → api/products/
//  Auth checked on load — redirects if not seller/admin
// ============================================================

(function () {
    'use strict';

    // ── STATE ──────────────────────────────────────────────
    let sellerProducts = [];
    let editingId      = null;
    let imageDataUrl   = null; // base64 preview for file uploads

    // ── DOM REFS ───────────────────────────────────────────
    const form          = document.getElementById('addProductForm');
    const imageFileInput= document.getElementById('pImageFile');
    const imageUrlInput = document.getElementById('pImageUrl');
    const previewEl     = document.getElementById('imagePreview');
    const tableBody     = document.getElementById('sellerProductsTableBody');
    const submitBtn     = form?.querySelector('button[type="submit"]');
    const formSection   = document.querySelector('.seller-form')?.closest('section') ||
                          form?.closest('section');

    // ── INIT ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        // Auth check — must be seller or admin
        const user = window.getUser ? window.getUser() : null;

        if (!user) {
            window.showToast('Please sign in to access the seller dashboard.', 'info');
            setTimeout(() => window.location.href = 'index.html', 1200);
            return;
        }

        if (user.role !== 'seller' && user.role !== 'admin') {
            window.showToast('Seller access required.', 'error');
            setTimeout(() => window.location.href = 'seller-register.html', 1200);
            return;
        }

        // Greet seller
        const greetEl = document.querySelector('.seller-header p');
        if (greetEl) greetEl.textContent = `Welcome back, ${user.name}! Manage your listings below.`;

        await fetchProducts();
        bindFormEvents();
    });

    // ── FETCH SELLER PRODUCTS ──────────────────────────────
    const fetchProducts = async () => {
        renderTableSkeletons();

        const result = await window.api('api/products/seller.php');

        if (!result.success) {
            renderTableError(result.message || 'Could not load products.');
            return;
        }

        sellerProducts = result.products || [];
        renderTable();
    };

    // ── RENDER TABLE ───────────────────────────────────────
    const renderTable = () => {
        if (!tableBody) return;

        if (!sellerProducts.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:2rem;color:var(--light-text);">
                        <i class="fas fa-box-open" style="font-size:2rem;display:block;margin-bottom:0.75rem;opacity:0.4;"></i>
                        No products listed yet. Use the form below to add your first product.
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = sellerProducts.map(p => `
            <tr data-id="${p.id}">
                <td>
                    <img src="${p.image_url}"
                         alt="${p.name}"
                         style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border);"
                         onerror="this.src='https://via.placeholder.com/44x44?text=?'">
                </td>
                <td style="font-weight:500;">${p.name}</td>
                <td>
                    <span style="padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;
                                 background:var(--accent);color:var(--text);text-transform:capitalize;">
                        ${p.category}
                    </span>
                </td>
                <td>KSh ${Number(p.price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                <td>
                    <span style="color:${p.stock > 10 ? 'var(--success)' : p.stock > 0 ? '#f59e0b' : '#ef4444'};font-weight:600;">
                        ${p.stock > 0 ? p.stock : 'Out of stock'}
                    </span>
                </td>
                <td>
                    <span style="padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600;
                                 background:${p.is_active ? '#d1fae5' : '#fee2e2'};
                                 color:${p.is_active ? '#065f46' : '#991b1b'};">
                        ${p.is_active ? 'Active' : 'Hidden'}
                    </span>
                </td>
                <td>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <button class="edit-btn icon-btn" data-id="${p.id}"
                                title="Edit product"
                                style="color:var(--secondary);">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="toggle-btn icon-btn" data-id="${p.id}" data-active="${p.is_active}"
                                title="${p.is_active ? 'Hide product' : 'Show product'}"
                                style="color:${p.is_active ? '#f59e0b' : 'var(--success)'};">
                            <i class="fas ${p.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button class="delete-btn icon-btn" data-id="${p.id}"
                                title="Delete product"
                                style="color:#ef4444;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind table action buttons
        tableBody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.id)));
        });
        tableBody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
        });
        tableBody.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleVisibility(
                parseInt(btn.dataset.id),
                btn.dataset.active === '1'
            ));
        });
    };

    // ── BIND FORM EVENTS ───────────────────────────────────
    const bindFormEvents = () => {
        if (!form) return;

        // Image URL preview
        imageUrlInput?.addEventListener('input', () => {
            const url = imageUrlInput.value.trim();
            if (url) {
                imageDataUrl = null;
                updatePreview(url);
            }
        });

        // File upload preview + validation
        imageFileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowed.includes(file.type)) {
                window.showToast('Only JPG, PNG, or WEBP images allowed.', 'error');
                imageFileInput.value = '';
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                window.showToast('Image must be under 2MB.', 'error');
                imageFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                imageDataUrl = ev.target.result;
                updatePreview(imageDataUrl);
                if (imageUrlInput) imageUrlInput.value = '';
            };
            reader.readAsDataURL(file);
        });

        // Form submit
        form.addEventListener('submit', handleSubmit);

        // Cancel edit button
        document.getElementById('cancelEditBtn')?.addEventListener('click', resetForm);
    };

    // ── IMAGE PREVIEW ──────────────────────────────────────
    const updatePreview = (src) => {
        if (!previewEl) return;
        previewEl.innerHTML = src
            ? `<img src="${src}" alt="Preview"
                    style="width:100%;height:100%;object-fit:contain;"
                    onerror="this.parentElement.innerHTML='<span>Invalid image URL</span>'">`
            : '<span>No image selected</span>';
    };

    // ── HANDLE FORM SUBMIT ─────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitLoading(true);

        // Use FormData so we can send files
        const formData = new FormData();
        formData.append('name',        document.getElementById('pName').value.trim());
        formData.append('brand',       document.getElementById('pBrand').value.trim());
        formData.append('category',    document.getElementById('pCategory').value);
        formData.append('price',       document.getElementById('pPrice').value);
        formData.append('stock',       document.getElementById('pStock')?.value || 10);
        formData.append('description', document.getElementById('pDesc').value.trim());
        formData.append('on_sale',     document.getElementById('pOnSale')?.checked ? 1 : 0);
        formData.append('old_price',   document.getElementById('pOldPrice')?.value || '');

        // Image — file takes priority over URL
        const file = imageFileInput?.files[0];
        if (file) {
            formData.append('image_file', file);
        } else if (imageUrlInput?.value.trim()) {
            formData.append('image_url', imageUrlInput.value.trim());
        }

        if (editingId) formData.append('id', editingId);

        const endpoint = editingId
            ? 'api/products/update.php'
            : 'api/products/create.php';

        // FormData needs no Content-Type header — browser sets it with boundary
        try {
            const res    = await fetch(endpoint, { method: 'POST', body: formData });
            const result = await res.json();

            if (!result.success) {
                window.showToast(result.message || 'Could not save product.', 'error');
                setSubmitLoading(false);
                return;
            }

            window.showToast(
                editingId ? 'Product updated successfully!' : 'Product listed successfully!',
                'success'
            );

            resetForm();
            await fetchProducts();

        } catch (err) {
            window.showToast('Something went wrong. Please try again.', 'error');
        }

        setSubmitLoading(false);
    };

    // ── START EDIT ─────────────────────────────────────────
    const startEdit = (id) => {
        const product = sellerProducts.find(p => p.id === id);
        if (!product) return;

        editingId = id;

        // Populate form
        document.getElementById('pName').value     = product.name;
        document.getElementById('pBrand').value    = product.brand || '';
        document.getElementById('pCategory').value = product.category;
        document.getElementById('pPrice').value    = product.price;
        document.getElementById('pDesc').value     = product.description || '';

        const stockEl    = document.getElementById('pStock');
        const oldPriceEl = document.getElementById('pOldPrice');
        const onSaleEl   = document.getElementById('pOnSale');

        if (stockEl)    stockEl.value      = product.stock;
        if (oldPriceEl) oldPriceEl.value   = product.old_price || '';
        if (onSaleEl)   onSaleEl.checked   = !!product.on_sale;

        if (imageUrlInput) imageUrlInput.value = product.image_url || '';
        updatePreview(product.image_url);

        // Update submit button
        if (submitBtn) {
            submitBtn.innerHTML   = '<i class="fas fa-save"></i> Update Product';
            submitBtn.style.background = '#10b981';
        }

        // Show cancel button
        let cancelBtn = document.getElementById('cancelEditBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type        = 'button';
            cancelBtn.id          = 'cancelEditBtn';
            cancelBtn.className   = 'btn-outline';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.style.cssText = 'margin-left:1rem;border-color:var(--border);color:var(--text);';
            cancelBtn.addEventListener('click', resetForm);
            submitBtn?.parentNode.appendChild(cancelBtn);
        }
        cancelBtn.style.display = 'inline-flex';

        // Scroll to form
        form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.showToast('Editing product — make your changes below.', 'info');
    };

    // ── DELETE PRODUCT ─────────────────────────────────────
    const deleteProduct = async (id) => {
        const product = sellerProducts.find(p => p.id === id);
        if (!product) return;

        if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

        const result = await window.api('api/products/delete.php', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });

        if (result.success) {
            sellerProducts = sellerProducts.filter(p => p.id !== id);
            renderTable();
            window.showToast('Product deleted.', 'info');

            // If we were editing this product, reset
            if (editingId === id) resetForm();
        } else {
            window.showToast(result.message || 'Could not delete product.', 'error');
        }
    };

    // ── TOGGLE VISIBILITY ──────────────────────────────────
    const toggleVisibility = async (id, currentlyActive) => {
        const result = await window.api('api/products/toggle.php', {
            method: 'POST',
            body: JSON.stringify({ id, is_active: currentlyActive ? 0 : 1 }),
        });

        if (result.success) {
            const product = sellerProducts.find(p => p.id === id);
            if (product) product.is_active = currentlyActive ? 0 : 1;
            renderTable();
            window.showToast(
                currentlyActive ? 'Product hidden from shop.' : 'Product is now visible.',
                'info'
            );
        } else {
            window.showToast(result.message || 'Could not update visibility.', 'error');
        }
    };

    // ── RESET FORM ─────────────────────────────────────────
    const resetForm = () => {
        editingId    = null;
        imageDataUrl = null;
        form?.reset();
        updatePreview(null);
        if (imageUrlInput) imageUrlInput.value = '';

        if (submitBtn) {
            submitBtn.innerHTML        = '<i class="fas fa-plus"></i> List Product';
            submitBtn.style.background = '';
        }

        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';
    };

    // ── FORM VALIDATION ────────────────────────────────────
    const validateForm = () => {
        const required = {
            pName:     'Product name is required.',
            pBrand:    'Brand is required.',
            pCategory: 'Please select a category.',
            pPrice:    'Price is required.',
            pDesc:     'Description is required.',
        };

        let valid = true;

        // Clear previous errors
        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            el.style.borderColor = '';
        });

        for (const [id, msg] of Object.entries(required)) {
            const el = document.getElementById(id);
            if (!el || !el.value.trim()) {
                if (el) {
                    el.style.borderColor = '#ef4444';
                    el.classList.add('input-error');
                    const err = document.createElement('div');
                    err.className   = 'field-error';
                    err.style.cssText = 'color:#ef4444;font-size:0.8rem;margin-top:0.25rem;';
                    err.textContent = msg;
                    el.parentNode.insertBefore(err, el.nextSibling);
                    el.addEventListener('input', () => {
                        el.style.borderColor = '';
                        err.remove();
                    }, { once: true });
                }
                valid = false;
            }
        }

        // Price must be positive
        const priceEl = document.getElementById('pPrice');
        if (priceEl && parseFloat(priceEl.value) <= 0) {
            priceEl.style.borderColor = '#ef4444';
            valid = false;
            window.showToast('Price must be greater than zero.', 'error');
        }

        // Must have an image (either URL or file or editing existing)
        const hasUrl  = imageUrlInput?.value.trim();
        const hasFile = imageFileInput?.files[0];
        const hasExisting = editingId !== null;

        if (!hasUrl && !hasFile && !hasExisting) {
            window.showToast('Please provide a product image.', 'error');
            valid = false;
        }

        if (!valid) {
            form.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return valid;
    };

    // ── SUBMIT LOADING STATE ───────────────────────────────
    const setSubmitLoading = (loading) => {
        if (!submitBtn) return;
        if (loading) {
            submitBtn.disabled  = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        } else {
            submitBtn.disabled  = false;
            submitBtn.innerHTML = editingId
                ? '<i class="fas fa-save"></i> Update Product'
                : '<i class="fas fa-plus"></i> List Product';
        }
    };

    // ── TABLE STATES ───────────────────────────────────────
    const renderTableSkeletons = () => {
        if (!tableBody) return;
        tableBody.innerHTML = [1, 2, 3].map(() => `
            <tr>
                ${[1,2,3,4,5,6,7].map(() =>
                    '<td><div class="skeleton" style="height:20px;border-radius:4px;"></div></td>'
                ).join('')}
            </tr>
        `).join('');
    };

    const renderTableError = (msg) => {
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:2rem;color:#ef4444;">
                    <i class="fas fa-exclamation-circle" style="margin-right:8px;"></i>${msg}
                </td>
            </tr>`;
    };

})();