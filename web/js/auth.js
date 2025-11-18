// Authentication Management
// Firebase modular SDK uyumluluğu
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.querySelector('button[type="submit"]');
  
  // Prevent multiple submissions
  if (loginBtn.disabled) return;
  
  try {
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = '⏳ Giriş yapılıyor...';
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Kullanıcı giriş yaptı:', userCredential.user.email);
    showAlert('Giriş başarılı!', 'success');
    
    // Immediate redirect for better mobile UX
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('❌ Login hatası:', error.message);
    showAlert('Giriş başarısız: ' + error.message, 'danger');
    
    // Re-enable button on error
    loginBtn.disabled = false;
    loginBtn.textContent = 'Giriş Yap';
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    console.log('✅ Kullanıcı çıkış yaptı');
    showAlert('Çıkış yapıldı', 'success');
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  } catch (error) {
    console.error('❌ Logout hatası:', error.message);
  }
}

async function loadUserData() {
  const user = auth.currentUser;
  if (user) {
    const email = user.email.split('@')[0];
    
    // Update user name displays (both exist in dashboard)
    const userNameDisplay = document.getElementById('userNameDisplay');
    const sidebarUserName = document.getElementById('sidebarUserName');
    
    if (userNameDisplay) userNameDisplay.textContent = email;
    if (sidebarUserName) sidebarUserName.textContent = email;
    
    // Get user role from custom claims
    const idTokenResult = await user.getIdTokenResult(true);
    const role = idTokenResult.claims.role || 'user';
    const companyId = idTokenResult.claims.companyId || null;
    
    console.log(`👤 User Role: ${role}, Company: ${companyId}`);
    
    // Display role
    const roleDisplay = {
      'super_admin': 'Super Admin',
      'company_admin': 'Şirket Admin',
      'user': 'Kullanıcı'
    };
    
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    if (sidebarUserRole) {
      sidebarUserRole.textContent = roleDisplay[role] || role;
    }
    
    // Show/hide admin navigation items based on role
    const employeesNavBtn = document.getElementById('employeesNavBtn');
    const activityNavBtn = document.getElementById('activityNavBtn');
    const usersNavBtn = document.getElementById('usersNavBtn');
    const companiesNavBtn = document.getElementById('companiesNavBtn');
    
    // Everyone can see activity logs
    if (activityNavBtn) {
      activityNavBtn.classList.remove('hidden');
    }
    
    // Show/hide "Yeni Proje" button based on role
    const createProjectBtn = document.getElementById('createProjectBtn');
    if (createProjectBtn) {
      if (role === 'super_admin' || role === 'company_admin') {
        createProjectBtn.style.display = 'block';
      } else {
        createProjectBtn.style.display = 'none';
      }
    }
    
    // Company admin can see employees
    if (role === 'company_admin') {
      if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
      if (activityNavBtn) activityNavBtn.classList.remove('hidden');
    }
    
    // Super admin can see everything
    if (role === 'super_admin') {
      if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
      if (activityNavBtn) activityNavBtn.classList.remove('hidden');
      if (usersNavBtn) usersNavBtn.classList.remove('hidden');
      if (companiesNavBtn) companiesNavBtn.classList.remove('hidden');
    }
    
    // Store role and company for later use (ensure string values)
    window.userRole = String(role || '');
    window.userCompanyId = companyId ? String(companyId) : null;
    
    console.log('🔑 Stored - Role:', window.userRole, '| Company:', window.userCompanyId);
  }
}

// Auth state listener - checks if user is logged in
onAuthStateChanged(auth, async (user) => {
  const isLoginPage = window.location.pathname.includes('login.html');
  const isDashboardPage = window.location.pathname.includes('dashboard.html');
  const isProjectDetailPage = window.location.pathname.includes('project-detail.html');
  
  if (user) {
    console.log('👤 Kullanıcı oturum açık:', user.email);
    
    // If on login page and logged in, redirect to dashboard
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
      return;
    }
    
    // Load user data if on dashboard or project detail page
    if (isDashboardPage || isProjectDetailPage) {
      await loadUserData();
    }

    // Load dashboard overview as the default page
    if (isDashboardPage) {
      if (typeof loadDashboardOverview === 'function') {
        loadDashboardOverview();
      }
    }
  } else {
    console.log('👤 Kullanıcı oturum kapalı');
    
    // If on dashboard and not logged in, redirect to login
    if (isDashboardPage || isProjectDetailPage) {
      window.location.href = 'login.html';
    }
  }
});

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} show`;
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}

// Global window exports
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showAlert = showAlert;
window.loadUserData = loadUserData;
