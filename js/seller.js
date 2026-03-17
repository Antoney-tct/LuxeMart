document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const fileInput = document.getElementById('pImageFile');
    const urlInput = document.getElementById('pImageUrl');
    const previewDiv = document.getElementById('imagePreview');
    let finalImageSrc = '';

    // Handle File Upload Preview
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                finalImageSrc = e.target.result; // Base64 string
                previewDiv.innerHTML = `<img src="${finalImageSrc}" alt="Preview">`;
                urlInput.value = ''; // Clear URL if file is selected
            }
            reader.readAsDataURL(file);
        }
    });

    // Handle URL Input Preview
    urlInput.addEventListener('input', function() {
        if (this.value) {
            finalImageSrc = this.value;
            previewDiv.innerHTML = `<img src="${finalImageSrc}" alt="Preview" onerror="this.src='https://via.placeholder.com/150?text=Invalid+URL'">`;
            fileInput.value = ''; // Clear file input
        }
    });

    // Handle Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!finalImageSrc) {
            alert('Please provide an image for the product.');
            return;
        }

        const name = document.getElementById('pName').value;
        const brand = document.getElementById('pBrand').value;
        const category = document.getElementById('pCategory').value;
        const price = parseFloat(document.getElementById('pPrice').value);
        const desc = document.getElementById('pDesc').value;

        // Generate new ID (Find max existing ID + 1)
        const allIds = products.map(p => p.id);
        const newId = (allIds.length > 0 ? Math.max(...allIds) : 0) + 1;

        const newProduct = {
            id: newId,
            name: name,
            brand: brand,
            category: category,
            price: price,
            desc: desc,
            img: finalImageSrc,
            rating: 5.0, // Default new listing to 5 stars
            reviews: 0,
            stock: 10, // Default stock
            dateAdded: new Date().toISOString()
        };

        // Save to LocalStorage
        const vendorProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
        vendorProducts.push(newProduct);
        localStorage.setItem('vendorProducts', JSON.stringify(vendorProducts));

        // Show success
        if (window.showToast) {
            window.showToast('Product listed successfully!', 'success');
        } else {
            alert('Product listed successfully!');
        }
        
        setTimeout(() => {
            window.location.href = 'shop.html?category=' + category;
        }, 1500);
    });
});