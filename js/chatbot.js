document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const notificationSound = document.getElementById('notificationSound');

    const playNotificationSound = () => {
        notificationSound.play().catch(error => {
            console.error("Playback failed because audio couldn't start before user interaction.", error);
        });
    };

    const addMessage = (message, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
    };

    const handleBotResponse = (userMessage) => {
        // Basic logic for responses
        let botResponse = "I'm sorry, I didn't understand that. How can I help?";
        if (userMessage.toLowerCase().includes('order')) {
            botResponse = "You can track your order on our website using your order ID.";
        } else if (userMessage.toLowerCase().includes('return')) {
            botResponse = "Our return policy allows returns within 30 days of purchase.";
        }
        return botResponse;
    };

    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText) {
            addMessage(messageText, 'user');
            messageInput.value = '';

            // Simulate bot response after a short delay
            setTimeout(() => {
                const botResponse = handleBotResponse(messageText);
                addMessage(botResponse, 'bot');
                playNotificationSound();
            }, 500);
        }
    });

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });
});