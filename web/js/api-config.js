// API Configuration
// This file sets the API base URL based on environment

// Determine API base URL
let API_BASE_URL = '';

// Check if we're in production (Vercel)
if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('adm-web')) {
  API_BASE_URL = ''; // Same domain in production
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Local development - you may need to start the API server locally
  // or use a deployed API URL
  API_BASE_URL = 'http://localhost:5000'; // Change this if your API runs on different port
}

// Export to window
window.API_BASE_URL = API_BASE_URL;

console.log('🔧 API Base URL:', API_BASE_URL || '(same domain)');
