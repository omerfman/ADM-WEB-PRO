// Main Application Initialization

console.log('🚀 ADM İnşaat Proje Yönetim Sistemi başlatılıyor...');

// ========== DARK MODE THEME SYSTEM ==========
function initializeTheme() {
  // Default to dark mode if no saved preference
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  
  // Update sidebar theme toggle
  const lightOption = document.querySelector('.light-option');
  const darkOption = document.querySelector('.dark-option');
  
  if (lightOption && darkOption) {
    if (theme === 'dark') {
      lightOption.classList.remove('active');
      darkOption.classList.add('active');
    } else {
      darkOption.classList.remove('active');
      lightOption.classList.add('active');
    }
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

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  console.log('✅ Theme system initialized');
});

// Export functions globally
window.toggleTheme = toggleTheme;
window.initializeTheme = initializeTheme;

// ========== DASHBOARD TAB SWITCHING ==========
function switchDashboardTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.dashboard-tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active from buttons
  document.querySelectorAll('.dashboard-tab').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabElement = document.getElementById(tabName + 'Section');
  if (tabElement) {
    tabElement.classList.remove('hidden');
  }

  // Mark button as active
  const btnElement = document.querySelector('[data-tab="' + tabName + '"]');
  if (btnElement) {
    btnElement.classList.add('active');
  }

  // Load tab-specific data
  if (tabName === 'users' && typeof loadUsers !== 'undefined') {
    loadUsers();
  } else if (tabName === 'companies' && typeof loadCompanies !== 'undefined') {
    loadCompanies();
  } else if (tabName === 'projects' && typeof loadProjects !== 'undefined') {
    loadProjects();
  }
}

// ========== SECTION SWITCHING (for new dashboard with sidebar) ==========
function switchSection(section) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  
  // Show selected section
  const sectionElement = document.getElementById(section + 'Section');
  if (sectionElement) {
    sectionElement.classList.remove('hidden');
  }
  
  // Update navigation active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItem = document.querySelector(`[data-section="${section}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }
  
  // Save active section to localStorage
  localStorage.setItem('dashboard_activeSection', section);
  
  // Update page title
  const titles = {
    'overview': 'Ana Sayfa',
    'projects': 'Projeler',
    'employees': 'Çalışanlar',
    'activity': 'Faaliyet Kayıtları',
    'companies': 'Şirketler',
    'users': 'Kullanıcılar'
  };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = titles[section] || section;
  }
  
  // Load section-specific data
  if (section === 'overview' && typeof loadDashboardOverview !== 'undefined') {
    loadDashboardOverview();
  } else if (section === 'employees' && typeof loadEmployees !== 'undefined') {
    loadEmployees();
  } else if (section === 'activity' && typeof loadActivityLogs !== 'undefined') {
    loadActivityLogs();
  } else if (section === 'users' && typeof loadUsers !== 'undefined') {
    loadUsers();
  } else if (section === 'companies' && typeof loadCompanies !== 'undefined') {
    loadCompanies();
  } else if (section === 'projects' && typeof loadProjects !== 'undefined') {
    loadProjects();
  }
}

// ========== MODAL HELPERS (Global) ==========
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }
}

// ========== CLIENT SIDEBAR FILTER (For Project Pages) ==========
function filterSidebarForClient() {
  // Only run if user is a client
  if (window.userRole !== 'client') return;
  
  console.log('🔒 Client kullanıcısı için sidebar filtreleniyor...');
  
  // Hide workflow items that clients shouldn't see
  const hideItems = [
    'navKesif',      // 1. Keşif
    'navTeklif',     // 2. Teklif
    'navSozlesme',   // 3. Sözleşme
    'navStok',       // Stok Yönetimi
    'navButce',      // Bütçe Yönetimi
    'navGunluk',     // Şantiye Günlüğü
    'navMusteri'     // Müşteri Yetkileri
  ];
  
  hideItems.forEach(itemId => {
    const element = document.getElementById(itemId);
    if (element) {
      element.style.display = 'none';
      console.log(`🚫 Gizlendi: ${itemId}`);
    }
  });
  
  // Add read-only badges to allowed items
  const readOnlyItems = [
    { id: 'navMetraj', label: 'Metraj (BOQ)' },
    { id: 'navHakedis', label: 'Hakediş' }
  ];
  
  readOnlyItems.forEach(item => {
    const element = document.getElementById(item.id);
    if (element) {
      const badge = document.createElement('span');
      badge.style.cssText = 'background: #FF9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 0.5rem; font-weight: 600;';
      badge.textContent = '👁️';
      badge.title = 'Sadece Görüntüleme';
      
      // Check if badge doesn't already exist
      if (!element.querySelector('span[title="Sadece Görüntüleme"]')) {
        element.appendChild(badge);
        console.log(`👁️ Read-only badge eklendi: ${item.label}`);
      }
    }
  });
  
  console.log('✅ Sidebar client için filtrelendi');
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

// Export functions to window for global access
window.switchDashboardTab = switchDashboardTab;
window.switchSection = switchSection;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
window.openModal = openModal;
window.filterSidebarForClient = filterSidebarForClient;
