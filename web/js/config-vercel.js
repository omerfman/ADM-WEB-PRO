// Vercel deployment için API URL konfigürasyonu
// Ortama göre doğru API URL'si seç

const API_CONFIG = {
  development: 'http://localhost:5000',
  staging: 'https://adm-api-staging.vercel.app',
  production: 'https://adm-api.vercel.app'
};

// Şu anki ortamı belirle
const getEnvironment = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }
  // Staging domain kontrolü
  if (window.location.hostname.includes('staging')) {
    return 'staging';
  }
  // Production
  return 'production';
};

// API base URL
const API_BASE_URL = API_CONFIG[getEnvironment()];

console.log(`[CONFIG] Environment: ${getEnvironment()}`);
console.log(`[CONFIG] API Base URL: ${API_BASE_URL}`);

// API call helper
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}
