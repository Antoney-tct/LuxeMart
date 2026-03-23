document.addEventListener('DOMContentLoaded', () => {
    const ordersList = document.getElementById('ordersList');
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const filterBtns = document.querySelectorAll('.filter-btn');
    const orderSearchInput = document.getElementById('orderSearchInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const clearDatesBtn = document.getElementById('clearDatesBtn');

    // Check for success flag in URL to show toast
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true' && window.showToast) {
        window.showToast('Order placed successfully!', 'success');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const renderOrders = (filter = 'all') => {
        // 1. Handle Empty History (No orders at all)
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: var(--border); margin-bottom: 1rem;"></i>
                    <h3>No orders yet</h3>
                    <p style="color: var(--light-text); margin-bottom: 1.5rem;">Looks like you haven't bought anything yet.</p>
                    <a href="shop.html" class="btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        // 2. Filter orders (Status + Search)
        let filteredOrders = orders;
        
        // Status Filter
        if (filter !== 'all') {
            filteredOrders = orders.filter(order => order.status.toLowerCase() === filter.toLowerCase());
        }

        // Search Filter
        const searchTerm = orderSearchInput ? orderSearchInput.value.toLowerCase().trim() : '';
        if (searchTerm) {
            filteredOrders = filteredOrders.filter(order => {
                const matchesId = order.id.toLowerCase().includes(searchTerm);
                const matchesProduct = order.items.some(item => {
                    const product = (typeof products !== 'undefined') ? products.find(p => p.id == item.id) : null;
                    return product && product.name.toLowerCase().includes(searchTerm);
                });
                return matchesId || matchesProduct;
            });
        }

        // Date Filter
        if (startDateInput && endDateInput) {
            const start = startDateInput.value ? new Date(startDateInput.value) : null;
            const end = endDateInput.value ? new Date(endDateInput.value) : null;
            
            if (start || end) {
                // Normalize start/end times to ensure accurate date-only comparison
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                filteredOrders = filteredOrders.filter(order => {
                    const orderDate = new Date(order.date);
                    if (isNaN(orderDate)) return true; // Should not happen if dates are saved correctly
                    orderDate.setHours(0, 0, 0, 0); // Compare dates without time

                    if (start && orderDate < start) return false;
                    if (end && orderDate > end) return false;
                    return true;
                });
            }
        }

        // 3. Check if filter returned empty results
        if (filteredOrders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 3rem 0; color: var(--light-text);">
                    <p>No orders found matching your criteria.</p>
                </div>
            `;
            return;
        }

        // 4. Render Filtered Orders
        ordersList.innerHTML = filteredOrders.map(order => {
        const statusClass = order.status.toLowerCase() === 'processing' ? 'status-processing' 
                          : order.status.toLowerCase() === 'delivered' ? 'status-delivered' 
                          : order.status.toLowerCase() === 'shipped' ? 'status-shipped'
                          : 'status-cancelled';

        // Cancel Button Logic 
        const cancelButton = order.status === 'Processing' 
            ? `<button class="btn-outline cancel-order-btn" data-id="${order.id}" style="border-color: #ef4444; color: #ef4444; font-size: 0.8rem; padding: 0.25rem 0.75rem; margin-left: 1rem;">Cancel Order</button>` 
            : '';

        // === TRACKING BAR LOGIC ===
        let trackingHtml = '';
        if (order.status === 'Cancelled') {
            trackingHtml = `
                <div class="track-order" style="justify-content: center; color: #ef4444; padding: 1rem; font-weight: 500;">
                    <i class="fas fa-ban" style="margin-right: 8px;"></i> Order Cancelled
                </div>
            `;
        } else {
            const steps = ['Processing', 'Shipped', 'Delivered'];
            let stepIndex = steps.indexOf(order.status);
            if (stepIndex === -1) stepIndex = 0; // Default to first step if status is unknown

            const progressPercent = (stepIndex / (steps.length - 1)) * 100;

            const getStepIcon = (s) => {
                if (s === 'Processing') return 'fa-clipboard-check';
                if (s === 'Shipped') return 'fa-truck';
                return 'fa-check-circle'; // Delivered
            };

            trackingHtml = `
                <div class="track-order">
                    <div class="track-line-bg"></div>
                    <div class="track-line-active" style="width: ${progressPercent}%"></div>
                    ${steps.map((s, i) => `
                        <div class="track-step ${i <= stepIndex ? 'active' : ''}">
                            <div class="track-icon"><i class="fas ${getStepIcon(s)}"></i></div>
                            <div class="track-label">${s}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const itemsHtml = order.items.map(item => {
            // Find product details (handling potential missing products)
            const product = (typeof products !== 'undefined') ? products.find(p => p.id == item.id) : null;
            const name = product ? product.name : `Product #${item.id}`;
            const img = product ? product.img : 'https://via.placeholder.com/60';
            
            return `
                <div class="order-item">
                    <img src="${img}" alt="${name}" class="order-item-img">
                    <div class="order-item-info">
                        <h4>${name}</h4>
                        <div style="font-size: 0.85rem; color: var(--light-text);">Qty: ${item.qty}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">#${order.id}</div>
                        <div class="order-date">${order.date}</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div class="order-status ${statusClass}">${order.status}</div>
                        ${cancelButton}
                    </div>
                </div>
                ${trackingHtml}
                <div class="order-body">
                    ${itemsHtml}
                </div>
                <div class="order-footer">
                    <span>Order Total:</span>
                    <span class="order-total">KSh ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
    };

    // Initial Render
    renderOrders();

    // Filter Buttons Event Listeners
    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderOrders(btn.dataset.filter);
            });
        });
    }

    // Event listener for cancelling orders
    ordersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cancel-order-btn')) {
            const orderId = e.target.dataset.id;
            if (confirm('Are you sure you want to cancel this order?')) {
                const orderIndex = orders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    orders[orderIndex].status = 'Cancelled';
                    localStorage.setItem('orders', JSON.stringify(orders));
                    window.location.reload();
                }
            }
        }
    });

    // Event listener for search input
    if (orderSearchInput) {
        orderSearchInput.addEventListener('input', () => {
            const activeBtn = document.querySelector('.filter-btn.active');
            const currentFilter = activeBtn ? activeBtn.dataset.filter : 'all';
            renderOrders(currentFilter);
        });
    }

    // Event listeners for date inputs
    const triggerDateFilter = () => {
        const activeBtn = document.querySelector('.filter-btn.active');
        renderOrders(activeBtn ? activeBtn.dataset.filter : 'all');
    };

    if (startDateInput) startDateInput.addEventListener('change', triggerDateFilter);
    if (endDateInput) endDateInput.addEventListener('change', triggerDateFilter);
    
    if (clearDatesBtn) {
        clearDatesBtn.addEventListener('click', () => {
            if(startDateInput) startDateInput.value = '';
            if(endDateInput) endDateInput.value = '';
            triggerDateFilter();
        });
    }
});