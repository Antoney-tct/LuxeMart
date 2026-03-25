document.addEventListener('DOMContentLoaded', () => {
    // === AUTH CHECK ===
    const user = JSON.parse(localStorage.getItem('luxeUser'));
    if (!user || user.role !== 'admin') {
        alert('Access Denied. Admin privileges required.');
        window.location.href = 'index.html';
        return;
    }

    // === DATA LOADING ===
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    // Merge static products with vendor products for display
    let allProducts = typeof products !== 'undefined' ? [...products] : [];
    const vendorProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
    // Merge ensuring no duplicates based on ID
    const productIds = new Set(allProducts.map(p => p.id));
    vendorProducts.forEach(p => {
        if (!productIds.has(p.id)) {
            allProducts.unshift(p);
        }
    });

    // Load users data if available
    const allUsersData = typeof allUsers !== 'undefined' ? allUsers : [];

    // === RENDER STATS ===
    const renderStats = () => {
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = orders.filter(o => o.status === 'Processing').length;

        const statsContainer = document.getElementById('adminStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>KSh ${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                    <p>Total Revenue</p>
                </div>
                <div class="stat-card">
                    <h3>${orders.length}</h3>
                    <p>Total Orders</p>
                </div>
                <div class="stat-card">
                    <h3>${pendingOrders}</h3>
                    <p>Pending Orders</p>
                </div>
                <div class="stat-card">
                    <h3>${allProducts.length}</h3>
                    <p>Total Products</p>
                </div>
            `;
        }
    };

    // === RENDER SALES CHART ===
    const renderSalesChart = () => {
        const chartCanvas = document.getElementById('salesChart');
        if (!chartCanvas || orders.length === 0) {
            if(chartCanvas) chartCanvas.parentElement.innerHTML = '<p style="text-align:center; color: var(--light-text);">No sales data available to generate a chart.</p>';
            return;
        };

        // 1. Process order data to group sales by date
        const salesByDate = orders.reduce((acc, order) => {
            // Normalize date to YYYY-MM-DD for consistent grouping and sorting
            const orderDate = new Date(order.date);
            const dateString = orderDate.toISOString().split('T')[0];
            
            if (!acc[dateString]) {
                acc[dateString] = 0;
            }
            acc[dateString] += order.total;
            return acc;
        }, {});

        // 2. Sort dates and prepare chart data
        const sortedDates = Object.keys(salesByDate).sort();
        const chartLabels = sortedDates.map(dateStr => {
            // Format date for display (e.g., 'Dec 1')
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const chartData = sortedDates.map(date => salesByDate[date]);

        // 3. Create the chart
        new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Daily Revenue (KSh)',
                    data: chartData,
                    borderColor: 'rgba(255, 107, 53, 1)', // var(--secondary)
                    backgroundColor: 'rgba(255, 107, 53, 0.2)',
                    borderWidth: 2,
                    tension: 0.3, // Makes the line smooth
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (value) => 'KSh ' + value.toLocaleString() } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Revenue: KSh ${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                        }
                    }
                }
            }
        });
    };

    // === RENDER ORDERS TABLE ===
    const renderOrdersTable = () => {
        const tbody = document.getElementById('adminOrdersTableBody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customer.name}</td>
                <td>${order.date}</td>
                <td>KSh ${order.total.toFixed(2)}</td>
                <td>
                    <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select ${order.status.toLowerCase()}">
                        <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="btn-sm" onclick="viewOrderDetails('${order.id}')">View</button>
                </td>
            </tr>
        `).join('');
    };

    // === RENDER PRODUCTS TABLE ===
    const renderProductsTable = () => {
        const tbody = document.getElementById('adminProductsTableBody');
        if (!tbody) return;

        // Show all products
        const displayProducts = allProducts;

        tbody.innerHTML = displayProducts.map(p => `
            <tr>
                <td><img src="${p.img}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${getSellerInfo(p.sellerEmail)}</td>
                <td>KSh ${p.price}</td>
                <td>${p.stock || 'N/A'}</td>
                <td>
                    <button class="btn-sm" onclick="openEditModal(${p.id})">Edit</button>
                    <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button> 
                </td>
            </tr>
        `).join('');
    };

    const getSellerInfo = (email) => {
        if (!email) return '<span style="color: var(--light-text);">LuxeMart</span>';
        const seller = allUsersData.find(u => u.email === email);
        if (!seller) return email;

        return `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${seller.picture}" style="width: 30px; height: 30px; border-radius: 50%;">
                <div>
                    <div>${seller.name}</div>
                    <a href="tel:${seller.phone}" style="font-size: 0.8rem; color: var(--secondary);"><i class="fas fa-phone"></i> Call</a>
                </div>
            </div>
        `;
    };

    // === GLOBAL FUNCTIONS FOR ONCLICK ===
    window.updateOrderStatus = (orderId, newStatus) => {
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex > -1) {
            orders[orderIndex].status = newStatus;
            localStorage.setItem('orders', JSON.stringify(orders));
            if (window.showToast) window.showToast(`Order ${orderId} status updated to ${newStatus}`, 'success');
            renderStats(); // Refresh stats
        }
    };

    window.deleteProduct = (productId) => {
        if (confirm('Are you sure you want to delete this product?')) {
            // 1. Remove from vendorProducts if it exists there
            let vProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
            const initialLength = vProducts.length;
            vProducts = vProducts.filter(p => p.id !== productId);
            
            if (vProducts.length < initialLength) {
                localStorage.setItem('vendorProducts', JSON.stringify(vProducts));
                window.showToast('Seller product deleted successfully.', 'success');
                location.reload(); // Reload to refresh lists
            } else {
                // For demo, we can "delete" a built-in product from the view
                const initialAllLength = allProducts.length;
                allProducts = allProducts.filter(p => p.id !== productId);
                if (allProducts.length < initialAllLength) {
                    renderProductsTable(); // Re-render the table without the deleted item
                    window.showToast('Built-in product removed from view (demo).', 'info');
                } else {
                    alert('Could not find product to delete.');
                }
            }
        }
    };

    window.openEditModal = (productId) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock || 0;

        document.getElementById('editProductModal').classList.add('show');
    };

    // Handle Modal Close and Form Submit
    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById('editProductModal').classList.remove('show');
    });

    document.getElementById('editProductForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('editProductId').value);
        const name = document.getElementById('editProductName').value;
        const price = parseFloat(document.getElementById('editProductPrice').value);
        const stock = parseInt(document.getElementById('editProductStock').value);

        let vProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
        const productIndex = vProducts.findIndex(p => p.id === id);
        if (productIndex > -1) {
            vProducts[productIndex] = { ...vProducts[productIndex], name, price, stock };
            localStorage.setItem('vendorProducts', JSON.stringify(vProducts));
            window.showToast('Product updated successfully!', 'success');
            location.reload();
        } else {
            alert('Editing built-in products is not supported in this demo. Only seller-added products can be persistently edited.');
            document.getElementById('editProductModal').classList.remove('show');
        }
    };

    window.viewOrderDetails = (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const itemsHtml = order.items.map(i => {
            // Try to find product details
            const p = allProducts.find(prod => prod.id === i.id) || { name: 'Item ' + i.id, price: 0 };
            return `<div>${p.name} x ${i.qty} - KSh ${(p.price * i.qty).toFixed(2)}</div>`;
        }).join('');

        alert(`
            Order ID: ${order.id}
            Customer: ${order.customer.name} (${order.customer.email})
            Address: ${order.customer.address}, ${order.customer.city}
            Payment: ${order.paymentMethod.toUpperCase()}
            \nItems:\n${itemsHtml.replace(/<[^>]*>/g, '')}
        `);
    };

    renderStats();
    renderSalesChart();
    renderOrdersTable();
    renderProductsTable();
});