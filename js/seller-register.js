document.addEventListener('DOMContentLoaded', () => {
    // This script handles the dedicated seller registration page.

    // 1. Reuse the global handleCredentialResponse but handle role logic
    // The global window.completeLogin in common.js already handles forced roles.

    // 2. Define a specific callback for seller registration
    window.handleSellerRegisterResponse = (response) => {
        // Decode JWT
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        
        // Call the global completeLogin function but force the role to 'seller'
        if (window.completeLogin) {
            window.completeLogin({ name: payload.name, email: payload.email, picture: payload.picture }, 'seller', response.credential);
        }
    };

    // 3. Initialize Google Sign-In
    const initGoogleSeller = () => {
        try {
            // Do NOT call google.accounts.id.initialize again.
            // It was already called in common.js. 
            // We only need to render the button here.
            
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

    // Check if google library is ready (loaded by common.js)
    if (window.google && window.google.accounts) {
        initGoogleSeller();
    } else {
        // Wait a bit for common.js to finish loading the script if it hasn't
        setTimeout(initGoogleSeller, 500);
    }
});