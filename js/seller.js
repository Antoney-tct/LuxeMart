document.addEventListener('DOMContentLoaded', () => {
    // === AUTH & ROLE CHECK ===
    const user = JSON.parse(localStorage.getItem('luxeUser'));
    if (!user || user.role !== 'seller') {
        alert('Access Denied. You must be logged in as a Seller to access this dashboard.');
        window.location.href = 'index.html';
        return;
    }

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

    // Handle File Upload changes (Convert image to Base64 for LocalStorage)
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => updatePreview(event.target.result);
            reader.readAsDataURL(file);
        }
    });

    // === FORM SUBMISSION ===
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Gather Data
            const name = document.getElementById('pName').value;
            const brand = document.getElementById('pBrand').value;
            const category = document.getElementById('pCategory').value;
            const price = parseFloat(document.getElementById('pPrice').value);
            const desc = document.getElementById('pDesc').value;
            let img = imageUrlInput.value;

            // 2. Handle Image Source (File takes precedence over URL)
            const processProductSave = (finalImage) => {
                const newProduct = {
                    id: Date.now(), // Generate a unique ID based on timestamp
                    name: name,
                    brand: brand,
                    category: category,
                    price: price,
                    desc: desc,
                    img: finalImage,
                    rating: 0,
                    reviews: 0,
                    stock: 10, // Default starting stock
                    dateAdded: new Date().toISOString(), // For "Newest" sorting
                    badge: "NEW",
                    sellerEmail: user.email // Associate product with current seller
                };

                saveToLocalStorage(newProduct);
            };

            if (imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => processProductSave(event.target.result);
                reader.readAsDataURL(imageInput.files[0]);
            } else if (img) {
                processProductSave(img);
            } else {
                alert('Please upload an image or provide a valid image URL.');
            }
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