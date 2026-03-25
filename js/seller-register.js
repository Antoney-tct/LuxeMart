document.addEventListener('DOMContentLoaded', () => {
    // This script handles the dedicated seller registration page.

    // 1. Load Google Script for this page specifically
    // We check if google is already defined to avoid duplicate loading, 
    // though re-initializing with a specific callback is key.
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
        script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }

    // 2. Define a specific callback for seller registration
    window.handleSellerRegisterResponse = (response) => {
        // Decode JWT
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        
        // Call the global completeLogin function but force the role to 'seller'
        if (window.completeLogin) {
            window.completeLogin({ name: payload.name, email: payload.email, picture: payload.picture }, 'seller');
        }
    };

    // 3. Initialize Google Sign-In
    const initGoogleSeller = () => {
        try {
            google.accounts.id.initialize({
                client_id: "459218839757-eo46dlmqm1jga6a62ct591b2fhfd8i7e.apps.googleusercontent.com", 
                callback: window.handleSellerRegisterResponse // Use our specific callback
            });
            const btnContainer = document.getElementById("sellerGoogleBtnContainer");
            if (btnContainer) {
                google.accounts.id.renderButton(
                    btnContainer,
                    { theme: "outline", size: "large", width: "300" } 
                );
            }
        } catch (e) {
            console.warn("Google Sign-In for seller page failed to load.", e);
        }
    };

    // If script is already loaded, init immediately, otherwise wait for onload
    if (window.google && window.google.accounts) {
        initGoogleSeller();
    } else {
        script.onload = initGoogleSeller;
    }

});