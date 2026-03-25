// This file simulates a user database.
// In a real application, this data would come from a server.

const allUsers = [
    // Dummy sellers for product association
    { 
        email: 'seller1@example.com', 
        name: 'John Doe', 
        picture: 'https://randomuser.me/api/portraits/men/75.jpg',
        phone: '254712345678', // Kenyan format for WhatsApp
        role: 'seller'
    },
    { 
        email: 'seller2@example.com', 
        name: 'Jane Smith', 
        picture: 'https://randomuser.me/api/portraits/women/75.jpg',
        phone: '254723456789',
        role: 'seller'
    }
];

// For demonstration, let's assign some of the existing products to these sellers.
if (typeof products !== 'undefined') {
    const productToAssign1 = products.find(p => p.id === 5); // Classic Denim Jacket
    if (productToAssign1) productToAssign1.sellerEmail = 'seller1@example.com';

    const productToAssign2 = products.find(p => p.id === 6); // Modern Desk Lamp
    if (productToAssign2) productToAssign2.sellerEmail = 'seller2@example.com';
}