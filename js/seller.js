document.addEventListener('DOMContentLoaded', () => {
    // === AUTH & ROLE CHECK ===
    const user = JSON.parse(localStorage.getItem('luxeUser'));
    if (!user || user.role !== 'seller') {
        alert('Access Denied. You must be logged in as a Seller to access this dashboard.');
        window.location.href = 'index.html';
        return;
    }

    // === DATA LOADING ===
    let sellerProducts = [];
    let editingProductId = null;

    const form = document.getElementById('addProductForm');
    const imageInput = document.getElementById('pImageFile');
    const imageUrlInput = document.getElementById('pImageUrl');
    const previewContainer = document.getElementById('imagePreview');

    // === IMAGE PREVIEW LOGIC ===
    const updatePreview = (src) => {
        previewContainer.innerHTML = `<img src="${src}" alt="Product Preview" style="width: 100%; height: 100%; object-fit: contain;">`;
    };

    // Handle URL input changes
    imageUrlInput.addEventListener('input', (e) => {
        if (e.target.value.match(/\.(jpeg|jpg|gif|png|webp)$/) != null) {
            updatePreview(e.target.value); 
        }
    });

    // Handle File Upload changes with validation
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSize = 2 * 1024 * 1024; // 2MB limit

            if (!allowedTypes.includes(file.type)) {
                const msg = 'Invalid file format. Please upload a JPG, PNG, or WEBP image.';
                if (window.showToast) window.showToast(msg, 'error');
                else alert(msg);
                e.target.value = ''; // Reset input
                previewContainer.innerHTML = '<span>No image selected</span>';
                return;
            }

            if (file.size > maxSize) {
                const msg = 'File too large. Maximum allowed size is 2MB.';
                if (window.showToast) window.showToast(msg, 'error');
                else alert(msg);
                e.target.value = ''; // Reset input
                previewContainer.innerHTML = '<span>No image selected</span>';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => updatePreview(event.target.result);
            reader.readAsDataURL(file);
        }
    });

    // === DELETE PRODUCT ===
    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await fetch('api/products/delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, sellerEmail: user.email })
            });
            const result = await response.json();
            if (result.success) {
                if (window.showToast) window.showToast('Product deleted!', 'success');
                fetchSellerProducts();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    // === PREPARE EDIT MODE ===
    const startEdit = (id) => {
        const product = sellerProducts.find(p => p.id == id);
        if (!product) return;

        editingProductId = id;
        document.getElementById('pName').value = product.name;
        document.getElementById('pBrand').value = product.brand;
        document.getElementById('pCategory').value = product.category;
        document.getElementById('pPrice').value = product.price;
        document.getElementById('pDesc').value = product.description;
        imageUrlInput.value = product.image_url;
        updatePreview(product.image_url);

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
        submitBtn.style.background = 'var(--success)';
        
        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    };

    const resetForm = () => {
        editingProductId = null;
        form.reset();
        previewContainer.innerHTML = '<span>No image selected</span>';
        form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> List Product';
        form.querySelector('button[type="submit"]').style.background = '';
    };

    // === API CALL TO FETCH PRODUCTS ===
    const fetchSellerProducts = async () => {
        try {
            const response = await fetch(`api/products/list_seller_products.php?email=${encodeURIComponent(user.email)}`);
            const result = await response.json();
            if (result.success) {
                sellerProducts = result.products;
                renderProductsTable();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    // === RENDER PRODUCTS TABLE ===
    const renderProductsTable = () => {
        const tbody = document.getElementById('sellerProductsTableBody');
        if (!tbody) return;

        if (sellerProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No products listed yet.</td></tr>';
            return;
        }

        // Show all products
        const displayProducts = sellerProducts;

        tbody.innerHTML = displayProducts.map(p => `
            <tr>
                <td><img src="${p.image_url}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>KSh ${p.price}</td>
                <td>${p.stock || 'N/A'}</td>
                <td>
                    <div style="display:flex; gap: 0.5rem;">
                        <button class="icon-btn edit-btn" data-id="${p.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" data-id="${p.id}" style="color: #ef4444;" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

     // Function to apply theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
        } else {
        }
    };

    // Event Delegation for Table Buttons
    document.getElementById('sellerProductsTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('delete-btn')) deleteProduct(id);
        if (btn.classList.contains('edit-btn')) startEdit(id);
    });

    fetchSellerProducts();
    applyTheme();

    // === FORM SUBMISSION ===
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData();
            
            // Append text fields
            formData.append('name', document.getElementById('pName').value);
            formData.append('brand', document.getElementById('pBrand').value);
            formData.append('category', document.getElementById('pCategory').value);
            formData.append('price', document.getElementById('pPrice').value);
            formData.append('description', document.getElementById('pDesc').value);
            formData.append('image_url', imageUrlInput.value); // Fallback URL
            formData.append('sellerEmail', user.email);
            formData.append('stock', 10);

            if (editingProductId) {
                formData.append('id', editingProductId);
            }

            // Append file if selected
            const file = imageInput.files[0];
            if (file) {
                // Re-validate before upload (safety check)
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                const maxSize = 2 * 1024 * 1024;

                if (!allowedTypes.includes(file.type) || file.size > maxSize) {
                    const msg = 'Please select a valid image (JPG/PNG/WEBP, < 2MB).';
                    if (window.showToast) window.showToast(msg, 'error');
                    else alert(msg);
                    return;
                }
                formData.append('pImageFile', file);
            }

            const endpoint = editingProductId ? 'api/products/update.php' : 'api/products/create.php';

            fetch(endpoint, {
                method: 'POST',
                // Note: Don't set Content-Type header when using FormData; 
                // the browser sets it automatically with the correct boundary.
                body: formData
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    const msg = editingProductId ? 'Product updated!' : 'Product listed!';
                    if (window.showToast) window.showToast(msg, 'success');
                    resetForm();
                    fetchSellerProducts();
                } else {
                    alert('Error: ' + result.message);
                }
            })
            .catch(error => console.error('Upload error:', error));
        });
    }
    function saveToLocalStorage(product) {
        // Get existing vendor products or initialize empty array
        const vendorProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
        
        vendorProducts.push(product);
        localStorage.setItem('vendorProducts', JSON.stringify(vendorProducts));

        // Show Success Feedback
        if (window.showToast) window.showToast('Product listed successfully!', 'success');
        else alert('Product listed successfully!');
        
        // Reset Form
        form.reset();
        previewContainer.innerHTML = '<span>No image selected</span>';
        
        // Optional: Redirect to shop to see the new item
        // setTimeout(() => window.location.href = 'shop.html', 1500);
    }

});