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

        // Show latest 20 products
        const displayProducts = allProducts.slice(0, 20);

        tbody.innerHTML = displayProducts.map(p => `
            <tr>
                <td><img src="${p.img}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>KSh ${p.price}</td>
                <td>${p.stock || 'N/A'}</td>
                <td>
                    <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
                </td>
            </tr>
        `).join('');
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
                alert('Product deleted successfully.');
                location.reload(); // Reload to refresh lists
            } else {
                alert('Cannot delete built-in products in this demo mode. Only Seller added products can be deleted.');
            }
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