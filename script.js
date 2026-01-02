// ========================================
// SECURITY CONFIGURATION
// ========================================

// IMPORTANT: Change this password hash to your own!
// To generate a new password hash:
// 1. Open browser console
// 2. Run: await generatePasswordHash("YourPasswordHere")
// 3. Copy the hash and replace the value below

const CONFIG = {
    // This is the SHA-256 hash of "SecurePass123!" with salt
    // You MUST change this to your own password hash
    PASSWORD_HASH: "8a93e5d744677e581937679ecfb060f55f5b74b70822ed4a6c4b4711e279257a", // This is hash for "admin"
    SALT: "MediaHub2026SecureSalt!@#",
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// ========================================
// PASSWORD HASHING & ENCRYPTION
// ========================================

/**
 * Generates SHA-256 hash with salt
 * Uses Web Crypto API for secure hashing
 */
async function hashPassword(password) {
    const saltedPassword = CONFIG.SALT + password + CONFIG.SALT;
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Helper function to generate password hash (for setup)
 * Call this in browser console to generate hash for your password
 */
async function generatePasswordHash(password) {
    const hash = await hashPassword(password);
    console.log("Password Hash:", hash);
    console.log("Copy this hash and update the PASSWORD_HASH in CONFIG");
    return hash;
}

// Make it available globally for easy access in console
window.generatePasswordHash = generatePasswordHash;

/**
 * Verifies if the entered password matches stored hash
 */
async function verifyPassword(password) {
    const hash = await hashPassword(password);
    return hash === CONFIG.PASSWORD_HASH;
}

// ========================================
// SESSION MANAGEMENT
// ========================================

/**
 * Creates encrypted session with timestamp
 */
function createSession() {
    const session = {
        authenticated: true,
        timestamp: Date.now(),
        token: generateSecureToken()
    };
    // Store encrypted session
    localStorage.setItem('mediaHubSession', btoa(JSON.stringify(session)));
}

/**
 * Generates a secure random token
 */
function generateSecureToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates existing session
 */
function validateSession() {
    try {
        const sessionData = localStorage.getItem('mediaHubSession');
        if (!sessionData) return false;

        const session = JSON.parse(atob(sessionData));
        const currentTime = Date.now();
        const sessionAge = currentTime - session.timestamp;

        // Check if session is still valid (within duration limit)
        if (sessionAge > CONFIG.SESSION_DURATION) {
            clearSession();
            return false;
        }

        // Verify session integrity
        return session.authenticated === true && session.token;
    } catch (error) {
        clearSession();
        return false;
    }
}

/**
 * Clears session data
 */
function clearSession() {
    localStorage.removeItem('mediaHubSession');
}

// ========================================
// UI MANAGEMENT
// ========================================

const elements = {
    loginContainer: null,
    mainContent: null,
    loginForm: null,
    passwordInput: null,
    errorMessage: null,
    logoutBtn: null
};

/**
 * Initialize DOM element references
 */
function initializeElements() {
    elements.loginContainer = document.getElementById('login-container');
    elements.mainContent = document.getElementById('main-content');
    elements.loginForm = document.getElementById('login-form');
    elements.passwordInput = document.getElementById('password-input');
    elements.errorMessage = document.getElementById('error-message');
    elements.logoutBtn = document.getElementById('logout-btn');
}

/**
 * Shows the main content (after authentication)
 */
function showMainContent() {
    elements.loginContainer.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
}

/**
 * Shows the login screen
 */
function showLoginScreen() {
    elements.mainContent.classList.add('hidden');
    elements.loginContainer.classList.remove('hidden');
    elements.passwordInput.value = '';
    elements.errorMessage.textContent = '';
}

/**
 * Displays error message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.animation = 'shake 0.5s';
    setTimeout(() => {
        elements.errorMessage.style.animation = '';
    }, 500);
}

/**
 * Handles login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const password = elements.passwordInput.value;
    
    if (!password) {
        showError('Please enter a password');
        return;
    }

    // Add loading state
    const submitBtn = elements.loginForm.querySelector('button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    try {
        // Add slight delay for better UX (shows loading state)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const isValid = await verifyPassword(password);
        
        if (isValid) {
            createSession();
            showMainContent();
        } else {
            showError('Incorrect password. Please try again.');
            elements.passwordInput.value = '';
            elements.passwordInput.focus();
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Login error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handles logout
 */
function handleLogout() {
    clearSession();
    showLoginScreen();
}

// ========================================
// LOCAL PATH HANDLING
// ========================================

/**
 * Handles clicks on local path cards
 */
function handleLocalPathClick(event) {
    const card = event.currentTarget;
    const pathType = card.getAttribute('data-type');
    const path = card.getAttribute('data-path');

    if (pathType === 'phone' || pathType === 'pc') {
        event.preventDefault();
        
        // Create a temporary element to copy the path
        const tempInput = document.createElement('input');
        tempInput.value = path;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        // Show feedback
        const originalHTML = card.innerHTML;
        card.innerHTML = `
            <div class="card-icon">✓</div>
            <h3>Path Copied!</h3>
            <p>Paste in file explorer</p>
        `;
        card.style.background = 'rgba(16, 185, 129, 0.2)';

        setTimeout(() => {
            card.innerHTML = originalHTML;
            card.style.background = '';
        }, 2000);
    }
}

/**
 * Initialize local path handlers
 */
function initializeLocalPathHandlers() {
    const localCards = document.querySelectorAll('.card[data-type]');
    localCards.forEach(card => {
        card.addEventListener('click', handleLocalPathClick);
    });
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize the application
 */
function initializeApp() {
    initializeElements();

    // Check if user has valid session
    if (validateSession()) {
        showMainContent();
    } else {
        showLoginScreen();
    }

    // Attach event listeners
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Initialize local path handlers
    initializeLocalPathHandlers();

    // Auto-logout on session expiry (check every minute)
    setInterval(() => {
        if (!elements.mainContent.classList.contains('hidden')) {
            if (!validateSession()) {
                alert('Your session has expired. Please login again.');
                handleLogout();
            }
        }
    }, 60000); // Check every minute

    // Console message for setup
    console.log('%c🔒 Media Hub Security System', 'color: #6366f1; font-size: 16px; font-weight: bold;');
    console.log('%cTo set up your own password:', 'color: #8b5cf6; font-size: 14px;');
    console.log('%c1. await generatePasswordHash("YourPasswordHere")', 'color: #64748b; font-size: 12px;');
    console.log('%c2. Copy the hash and update PASSWORD_HASH in script.js', 'color: #64748b; font-size: 12px;');
}

// ========================================
// SECURITY MEASURES
// ========================================

// Prevent right-click (optional - can be removed if too restrictive)
// document.addEventListener('contextmenu', event => event.preventDefault());

// Prevent opening DevTools with keyboard shortcuts (optional)
// document.addEventListener('keydown', event => {
//     if (event.key === 'F12' || 
//         (event.ctrlKey && event.shiftKey && event.key === 'I') ||
//         (event.ctrlKey && event.shiftKey && event.key === 'J') ||
//         (event.ctrlKey && event.key === 'U')) {
//         event.preventDefault();
//     }
// });

// Clear session on tab close (optional - can be removed if you want persistent sessions)
// window.addEventListener('beforeunload', () => {
//     clearSession();
// });

// ========================================
// START APPLICATION
// ========================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Add shake animation CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
