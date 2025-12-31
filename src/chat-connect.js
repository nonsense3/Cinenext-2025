// Chat Connect Feature JavaScript
// Add this code at the end of setupChat() function in app.js
// Chat connection state
let chatConnected = false;
function initChatConnection() {
    const isMobile = window.innerWidth <= 767;
    const chatSection = document.querySelector('aside[aria-label="Community Chat"]');
    if (!chatSection) {
        console.warn('Chat section not found');
        return;
    }
    // Create connect overlay dynamically
    const overlay = document.createElement('div');
    overlay.id = 'chat-connect-overlay';
    overlay.className = 'chat-connect-overlay';
    overlay.innerHTML = `
    <div class="connect-content">
      <h3 style="margin: 0 0 10px; font-size: 1.3rem;">🎬 Community Chat</h3>
      <p style="margin: 0 0 20px; color: #ccc;">Connect to chat with other movie lovers!</p>
      <button id="connect-chat-btn" class="btn-connect">
        Connect to Chat
      </button>
    </div>
  `;
    // Insert overlay as first child of chat section
    chatSection.insertBefore(overlay, chatSection.firstChild);
    if (isMobile) {
        // Mobile: Show connect overlay
        chatSection.classList.add('chat-disconnected');
        const connectBtn = document.getElementById('connect-chat-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', connectToChat);
        }
    } else {
        // Desktop: Auto-connect
        connectToChat();
    }
}
function connectToChat() {
    if (chatConnected) return;
    chatConnected = true;
    const chatSection = document.querySelector('aside[aria-label="Community Chat"]');
    if (chatSection) {
        chatSection.classList.remove('chat-disconnected');
    }
    // Show welcome message
    showWelcomeMessage();
}
function showWelcomeMessage() {
    const feed = $('chat-feed');
    if (!feed) return;
    const welcomeMsg = {
        id: 'welcome-' + Date.now(),
        user_name: 'CineBot',
        message: 'Welcome to the community chat! 🎬',
        created_at: new Date().toISOString(),
        is_anonymous: false
    };
    appendMessageToFeed(welcomeMsg);
    // Remove welcome message after 3 seconds
    setTimeout(() => {
        const msgDiv = feed.querySelector(`[data-message-id="${welcomeMsg.id}"]`);
        if (msgDiv) {
            msgDiv.style.transition = 'opacity 0.5s ease-out';
            msgDiv.style.opacity = '0';
            setTimeout(() => msgDiv.remove(), 500);
        }
    }, 3000);
}
// Initialize connection feature
initChatConnection();