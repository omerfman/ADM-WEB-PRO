/**
 * Error Handling & Logging Utility
 * Comprehensive error handling with monitoring hooks
 */

const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Log error with monitoring integration
 */
async function logError(error, context = {}, level = ERROR_LEVELS.ERROR) {
  try {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: error.message || String(error),
      stack: error.stack || '',
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      user: auth.currentUser?.email || 'anonymous',
    };

    // Log to console
    const logMethod = level === ERROR_LEVELS.CRITICAL ? 'error' :
                     level === ERROR_LEVELS.ERROR ? 'error' :
                     level === ERROR_LEVELS.WARNING ? 'warn' : 'log';
    console[logMethod](`[${level.toUpperCase()}]`, errorEntry);

    // Send to backend for logging (Sentry integration point)
    // TODO: Integrate with Sentry or similar monitoring service
    if (level === ERROR_LEVELS.CRITICAL) {
      await fetch('http://localhost:3000/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorEntry),
      }).catch(err => console.warn('Could not log error to backend:', err));
    }

    return errorEntry;
  } catch (err) {
    console.error('Error logging error:', err);
  }
}

/**
 * Safe API call wrapper with error handling
 */
async function safeApiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      error.url = url;
      throw error;
    }

    return await response.json();
  } catch (error) {
    await logError(error, { url, options }, ERROR_LEVELS.ERROR);
    throw error;
  }
}

/**
 * Wrap async functions with error handling
 */
function withErrorHandling(fn, errorMessage = 'İşlem sırasında bir hata oluştu') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      await logError(error, { function: fn.name, args }, ERROR_LEVELS.ERROR);
      showAlert(errorMessage, 'danger');
      throw error;
    }
  };
}

/**
 * Rate limiting helper
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isLimited(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      return true;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return false;
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

// Create rate limiters for different operations
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 mins
const apiLimiter = new RateLimiter(30, 60 * 1000); // 30 API calls per minute

/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL format
 */
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Export for use
window.logError = logError;
window.safeApiCall = safeApiCall;
window.withErrorHandling = withErrorHandling;
window.RateLimiter = RateLimiter;
window.loginLimiter = loginLimiter;
window.apiLimiter = apiLimiter;
window.sanitizeInput = sanitizeInput;
window.validateEmail = validateEmail;
window.validateUrl = validateUrl;
window.ERROR_LEVELS = ERROR_LEVELS;
