// Main Application Initialization

console.log('🚀 ADM İnşaat Proje Yönetim Sistemi başlatılıyor...');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM yüklendi');
  setupEventListeners();
});

function setupEventListeners() {
  // Navigation logout button
  document.getElementById('navLogout').addEventListener('click', handleLogout);
  
  // Close modals when clicking outside
  document.getElementById('projectDetailModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('projectDetailModal')) {
      closeProjectModal();
    }
  });
  
  document.getElementById('createProjectModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('createProjectModal')) {
      closeCreateProjectModal();
    }
  });
  
  console.log('✅ Event listeners kuruldu');
}

// Global helper functions
window.showLoginForm = showLoginForm;
window.showDashboard = showDashboard;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showAlert = showAlert;
window.loadProjects = loadProjects;
window.openProjectDetail = openProjectDetail;
window.closeProjectModal = closeProjectModal;
window.switchTab = switchTab;
window.addLog = addLog;
window.addStock = addStock;
window.addPayment = addPayment;
window.openCreateProjectModal = openCreateProjectModal;
window.closeCreateProjectModal = closeCreateProjectModal;
window.handleCreateProject = handleCreateProject;
