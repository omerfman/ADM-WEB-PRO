// Main Application Initialization

console.log('🚀 ADM İnşaat Proje Yönetim Sistemi başlatılıyor...');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM yüklendi');
  setupEventListeners();
});

function setupEventListeners() {
  // Navigation logout button
  const logoutBtn = document.getElementById('navLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Close modals when clicking outside
  const projectDetailModal = document.getElementById('projectDetailModal');
  if (projectDetailModal) {
    projectDetailModal.addEventListener('click', (e) => {
      if (e.target === projectDetailModal) {
        closeProjectModal();
      }
    });
  }
  
  const createProjectModal = document.getElementById('createProjectModal');
  if (createProjectModal) {
    createProjectModal.addEventListener('click', (e) => {
      if (e.target === createProjectModal) {
        closeCreateProjectModal();
      }
    });
  }
  
  console.log('✅ Event listeners kuruldu');
}

// App initialization on auth state change
console.log('✅ app.js loaded - auth state listener will trigger on firebase-config.js');
