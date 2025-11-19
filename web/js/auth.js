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
  
  // Basic validation
  if (!email || !password) {
    showAlert('E-posta ve şifre gereklidir', 'danger');
    return;
  }
  
  try {
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = '⏳ Giriş yapılıyor...';
    
    // Add timeout for slow connections (30 seconds)
    const loginPromise = signInWithEmailAndPassword(auth, email, password);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Bağlantı zaman aşımı. Lütfen internet bağlantınızı kontrol edin.')), 30000)
    );
    
    const userCredential = await Promise.race([loginPromise, timeoutPromise]);
    console.log('✅ Kullanıcı giriş yaptı:', userCredential.user.email);
    showAlert('Giriş başarılı!', 'success');
    
    // Immediate redirect for better mobile UX
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('❌ Login hatası:', error);
    
    // User-friendly error messages
    let errorMessage = 'Giriş başarısız';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Bu e-posta adresi kayıtlı değil';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Hatalı şifre';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz e-posta adresi';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
    } else if (error.message.includes('zaman aşımı')) {
      errorMessage = error.message;
    } else {
      errorMessage = error.message;
    }
    
    showAlert(errorMessage, 'danger');
    
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
      'user': 'Kullanıcı',
      'client': 'Müşteri'
    };
    
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    if (sidebarUserRole) {
      sidebarUserRole.textContent = roleDisplay[role] || role;
    }
    
    // Show/hide navigation items based on role
    const employeesNavBtn = document.getElementById('employeesNavBtn');
    const activityNavBtn = document.getElementById('activityNavBtn');
    const usersNavBtn = document.getElementById('usersNavBtn');
    const companiesNavBtn = document.getElementById('companiesNavBtn');
    
    // Clients have very limited UI access - only projects
    if (role === 'client') {
      // Hide all admin/internal sections from clients
      if (employeesNavBtn) employeesNavBtn.classList.add('hidden');
      if (activityNavBtn) activityNavBtn.classList.add('hidden');
      if (usersNavBtn) usersNavBtn.classList.add('hidden');
      if (companiesNavBtn) companiesNavBtn.classList.add('hidden');
      
      // Hide create project button
      const createProjectBtn = document.getElementById('createProjectBtn');
      if (createProjectBtn) {
        createProjectBtn.style.display = 'none';
      }
    } else {
      // Non-client users can see activity logs
      if (activityNavBtn) {
        activityNavBtn.classList.remove('hidden');
      }
      
      // Show/hide "Yeni Proje" button for non-clients
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
    }
    
    // Store role and company for later use (ensure string values)
    window.userRole = String(role || '');
    window.userCompanyId = companyId ? String(companyId) : null;
    
    console.log('🔑 Stored - Role:', window.userRole, '| Company:', window.userCompanyId);
  }
}

// Export loadUserData for use in other scripts
window.loadUserData = loadUserData;

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

    // Restore saved section or load overview as default
    if (isDashboardPage) {
      // Wait for page to fully load before restoring section
      setTimeout(() => {
        const savedSection = localStorage.getItem('dashboard_activeSection');
        if (savedSection && typeof restoreActiveSection === 'function') {
          restoreActiveSection();
        } else if (typeof loadDashboardOverview === 'function') {
          loadDashboardOverview();
        }
      }, 100);
    }
    
    // Initialize project detail page
    if (isProjectDetailPage) {
      setTimeout(() => {
        if (typeof window.initProjectDetail === 'function') {
          console.log('🚀 Calling initProjectDetail from auth.js');
          window.initProjectDetail();
        } else {
          console.warn('⚠️ window.initProjectDetail function not found!');
        }
      }, 100);
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
