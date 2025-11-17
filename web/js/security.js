/**
 * Password Policy & Validation
 * Güvenli şifre gereksinimlerini uygula
 */

const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Validate password against security policy
 * Returns {valid: boolean, errors: string[]}
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Şifre en az ${PASSWORD_RULES.minLength} karakter olmalıdır`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Şifre en az bir büyük harf içermelidir (A-Z)');
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Şifre en az bir küçük harf içermelidir (a-z)');
  }

  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push('Şifre en az bir rakam içermelidir (0-9)');
  }

  if (PASSWORD_RULES.requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${PASSWORD_RULES.specialChars.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push(`Şifre en az bir özel karakter içermelidir: ${PASSWORD_RULES.specialChars}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    score: calculatePasswordStrength(password),
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password) {
  let score = 0;

  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 20;
  if (/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 10; // Unicode chars
  if (password.match(/(.)\1{2,}/)) score -= 10; // Repeated chars penalty

  return Math.min(100, Math.max(0, score));
}

/**
 * Render password strength indicator
 */
function renderPasswordStrengthIndicator(containerId, password) {
  const validation = validatePassword(password);
  const container = document.getElementById(containerId);

  if (!container) return;

  const score = validation.score;
  const strength = score < 30 ? 'Zayıf' : score < 60 ? 'Orta' : score < 80 ? 'İyi' : 'Çok İyi';
  const color = score < 30 ? '#e74c3c' : score < 60 ? '#f39c12' : score < 80 ? '#27ae60' : '#27ae60';

  container.innerHTML = `
    <div style="margin-top: 0.5rem;">
      <small style="color: #999;">Şifre Gücü:</small>
      <div style="width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px; margin: 0.25rem 0; overflow: hidden;">
        <div style="width: ${score}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
      </div>
      <small style="color: ${color}; font-weight: bold;">${strength} (${score}/100)</small>
      ${validation.errors.length > 0 ? `
        <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 3px; font-size: 0.85rem; color: #856404;">
          ${validation.errors.map(err => `• ${err}`).join('<br>')}
        </div>
      ` : '<div style="margin-top: 0.25rem;"><small style="color: #27ae60;">✅ Güvenli şifre</small></div>'}
    </div>
  `;
}

// Export for use in other modules
window.validatePassword = validatePassword;
window.calculatePasswordStrength = calculatePasswordStrength;
window.renderPasswordStrengthIndicator = renderPasswordStrengthIndicator;
