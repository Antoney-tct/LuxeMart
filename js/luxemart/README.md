# LuxeMart — Fix Instructions

## Files to add/replace in your project

### 1. js/products.js  ← NEW FILE
Copy `js/products.js` to your `js/` folder.
This replaces the broken PHP API call with static product data.

### 2. js/cart.js  ← REPLACE
Replace your existing `js/cart.js` with this new version.
Full cart management with localStorage persistence.

### 3. js/main2.js  ← REPLACE
Replace your existing `js/main2.js` with this new version.
Handles product rendering, filtering, sorting, search, quick view, sliders.

### 4. css/products-extra.css  ← NEW FILE
Copy `css/products-extra.css` to your `css/` folder.
Adds product card styles, toasts, mobile responsiveness.

### 5. shop.html  ← REPLACE
Replace your existing `shop.html` with this new version.
Removes the broken PHP fetch, wires up static products.

---

## Add to index.html

In index.html, make sure the CSS link and script tags are:

<!-- In <head>, after main.css: -->
<link rel="stylesheet" href="css/products-extra.css">

<!-- At bottom of <body>, scripts already there but verify order: -->
<script src="js/products.js"></script>
<script src="js/cart.js"></script>
<script src="js/main2.js"></script>

---

## What's fixed
- ✅ Shop page now shows 26 products across all categories
- ✅ Category filtering works (Fashion, Electronics, Home, Beauty, Sports, Kids, Footwear, Watches)
- ✅ Sort by price, rating, newest, popularity
- ✅ Advanced filters: brand, price range, rating, color, size, in-stock, on-sale
- ✅ Quick view modal
- ✅ Add to cart with persistent localStorage
- ✅ Cart count badges update in real time
- ✅ Cart sidebar shows items with qty controls
- ✅ Wishlist functionality
- ✅ Search with instant suggestions
- ✅ Load More pagination
- ✅ Toast notifications
- ✅ Full mobile responsiveness
- ✅ Checkout button in cart sidebar now works
