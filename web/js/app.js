// Main Application Initialization

console.log('🚀 ADM İnşaat Proje Yönetim Sistemi başlatılıyor...');

// ========== DARK MODE THEME SYSTEM ==========
function initializeTheme() {
  // Check localStorage for saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const body = document.body;
  const isDarkMode = body.classList.toggle('dark-mode');
  const theme = isDarkMode ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  updateThemeButton(theme);
  console.log(`🎨 Theme changed to: ${theme}`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM yüklendi');
  
  // Initialize theme
  initializeTheme();
  
  // Setup theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Wait for modules to load (100ms delay)
  setTimeout(() => {
    setupEventListeners();
  }, 100);
});

function setupEventListeners() {
  // Navigation logout button
  const logoutBtn = document.getElementById('navLogout');
  if (logoutBtn && typeof handleLogout !== 'undefined') {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Close modals when clicking outside
  const projectDetailModal = document.getElementById('projectDetailModal');
  if (projectDetailModal && typeof closeProjectModal !== 'undefined') {
    projectDetailModal.addEventListener('click', (e) => {
      if (e.target === projectDetailModal) {
        closeProjectModal();
      }
    });
  }
  
  const createProjectModal = document.getElementById('createProjectModal');
  if (createProjectModal && typeof closeCreateProjectModal !== 'undefined') {
    createProjectModal.addEventListener('click', (e) => {
      if (e.target === createProjectModal) {
        closeCreateProjectModal();
      }
    });
  }

  // Close add log modal when clicking outside
  const addLogModal = document.getElementById('addLogModal');
  if (addLogModal && typeof closeAddLogModal !== 'undefined') {
    addLogModal.addEventListener('click', (e) => {
      if (e.target === addLogModal) {
        closeAddLogModal();
      }
    });
  }

  // Close add stock modal when clicking outside
  const addStockModal = document.getElementById('addStockModal');
  if (addStockModal && typeof closeAddStockModal !== 'undefined') {
    addStockModal.addEventListener('click', (e) => {
      if (e.target === addStockModal) {
        closeAddStockModal();
      }
    });
  }

  // Close add payment modal when clicking outside
  const addPaymentModal = document.getElementById('addPaymentModal');
  if (addPaymentModal && typeof closeAddPaymentModal !== 'undefined') {
    addPaymentModal.addEventListener('click', (e) => {
      if (e.target === addPaymentModal) {
        closeAddPaymentModal();
      }
    });
  }
  
  console.log('✅ Event listeners kuruldu');
}

// App initialization on auth state change
console.log('✅ app.js loaded - auth state listener will trigger on firebase-config.js');
