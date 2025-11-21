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
    window.location.href = 'anasayfa.html';
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
  console.log('🔄 loadUserData başlatıldı...');
  const user = auth.currentUser;
  if (user) {
    const email = user.email.split('@')[0];
    console.log(`📧 User email: ${email}`);
    
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
    const clientsNavBtn = document.getElementById('clientsNavBtn');
    const companiesNavBtn = document.getElementById('companiesNavBtn');
    const templatesNavBtn = document.getElementById('templatesNavBtn');
    
    // Clients have very limited UI access - only projects
    if (role === 'client') {
      // Hide all admin/internal sections from clients
      if (employeesNavBtn) employeesNavBtn.classList.add('hidden');
      if (activityNavBtn) activityNavBtn.classList.add('hidden');
      if (clientsNavBtn) clientsNavBtn.classList.add('hidden');
      if (companiesNavBtn) companiesNavBtn.classList.add('hidden');
      if (templatesNavBtn) templatesNavBtn.classList.add('hidden');
      
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
      
      // Company admin can see employees, clients, templates
      if (role === 'company_admin') {
        if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
        if (clientsNavBtn) clientsNavBtn.classList.remove('hidden');
        if (activityNavBtn) activityNavBtn.classList.remove('hidden');
        if (templatesNavBtn) templatesNavBtn.classList.remove('hidden');
      }
      
      // Super admin can see everything
      if (role === 'super_admin') {
        if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
        if (clientsNavBtn) clientsNavBtn.classList.remove('hidden');
        if (activityNavBtn) activityNavBtn.classList.remove('hidden');
        if (companiesNavBtn) companiesNavBtn.classList.remove('hidden');
        if (templatesNavBtn) templatesNavBtn.classList.remove('hidden');
      }
    }
    
    // Store role and company for later use (ensure string values)
    window.userRole = String(role || '');
    window.userCompanyId = companyId ? String(companyId) : null;
    
    // Cache user data for instant next load
    try {
      localStorage.setItem('cached_user_data', JSON.stringify({
        name: email,
        role: role,
        companyId: companyId,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to cache user data:', e);
    }
    
    console.log('🔑 Stored - Role:', window.userRole, '| Company:', window.userCompanyId);
  }
}

// Fast load cached user data before Firebase loads (for instant UI)
function loadCachedUserData() {
  const cached = localStorage.getItem('cached_user_data');
  if (!cached) return false;
  
  try {
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    // Use cache if less than 5 minutes old
    if (age < 5 * 60 * 1000) {
      const sidebarUserName = document.getElementById('sidebarUserName');
      const sidebarUserRole = document.getElementById('sidebarUserRole');
      
      if (sidebarUserName) sidebarUserName.textContent = data.name;
      if (sidebarUserRole) {
        const roleNames = {
          'super_admin': 'Super Admin',
          'company_admin': 'Şirket Admin',
          'user': 'Kullanıcı',
          'client': 'Müşteri'
        };
        sidebarUserRole.textContent = roleNames[data.role] || data.role;
      }
      
      // Show nav items based on cached role (instant visibility)
      const employeesNavBtn = document.getElementById('employeesNavBtn');
      const clientsNavBtn = document.getElementById('clientsNavBtn');
      const companiesNavBtn = document.getElementById('companiesNavBtn');
      
      if (data.role === 'company_admin') {
        if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
        if (clientsNavBtn) clientsNavBtn.classList.remove('hidden');
      }
      
      if (data.role === 'super_admin') {
        if (employeesNavBtn) employeesNavBtn.classList.remove('hidden');
        if (clientsNavBtn) clientsNavBtn.classList.remove('hidden');
        if (companiesNavBtn) companiesNavBtn.classList.remove('hidden');
      }
      
      window.userRole = data.role;
      window.userCompanyId = data.companyId;
      
      return true;
    }
  } catch (e) {
    console.warn('Cache parse error:', e);
  }
  
  return false;
}

// Load cached data immediately (before Firebase auth check)
if (typeof document !== 'undefined') {
  if (loadCachedUserData()) {
    console.log('✅ Loaded cached user data for instant UI');
  }
}

// Helper: Wait for a function to be available, then call callback
function waitForFunction(funcName, callback, maxAttempts = 50) {
  console.log(`🔍 Waiting for function: ${funcName}`);
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (typeof window[funcName] === 'function') {
      clearInterval(interval);
      console.log(`✅ Found function ${funcName} after ${attempts} attempts`);
      callback();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn(`⚠️ Function ${funcName} not available after ${maxAttempts} attempts`);
      console.log('Available window functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
    }
  }, 100);
}

// Export loadUserData for use in other scripts
window.loadUserData = loadUserData;
window.loadCachedUserData = loadCachedUserData;

// Auth state listener - checks if user is logged in
onAuthStateChanged(auth, async (user) => {
  const isLoginPage = window.location.pathname.includes('login.html');
  const isDashboardPage = window.location.pathname.includes('dashboard.html');
  const isProjectDetailPage = window.location.pathname.includes('project-detail.html');
  const isAnasayfaPage = window.location.pathname.includes('anasayfa.html');
  const isProjelerPage = window.location.pathname.includes('projeler.html');
  const isCalisanlarPage = window.location.pathname.includes('calisanlar.html');
  const isMusterilerPage = window.location.pathname.includes('musteriler.html');
  const isSirketlerPage = window.location.pathname.includes('sirketler.html');
  const isTemplatesPage = window.location.pathname.includes('templateler.html');
  const isClientPermissionsPage = window.location.pathname.includes('musteri-yetkileri.html');
  const isClientDashboardPage = window.location.pathname.includes('musteri-dashboard.html');
  
  if (user) {
    console.log('👤 Kullanıcı oturum açık:', user.email);
    
    // If on login page and logged in, redirect based on role
    if (isLoginPage) {
      // Load user data first to check role
      await loadUserData();
      
      if (window.userRole === 'client') {
        window.location.href = 'musteri-dashboard.html';
      } else {
        window.location.href = 'anasayfa.html';
      }
      return;
    }
    
    // Load user data for all authenticated pages
    if (isDashboardPage || isProjectDetailPage || isAnasayfaPage || isProjelerPage || 
        isCalisanlarPage || isMusterilerPage || isSirketlerPage || isTemplatesPage || 
        isClientPermissionsPage || isClientDashboardPage) {
      await loadUserData();
      
      // CLIENT REDIRECT LOGIC: If client tries to access projeler.html, redirect to musteri-dashboard.html
      if (isProjelerPage && window.userRole === 'client') {
        console.log('🔄 Client kullanıcı projeler.html\'e erişmeye çalışıyor, müşteri dashboard\'a yönlendiriliyor...');
        window.location.href = 'musteri-dashboard.html';
        return;
      }
      
      // ADMIN/USER REDIRECT LOGIC: If admin/user tries to access musteri-dashboard.html, redirect to projeler.html
      if (isClientDashboardPage && window.userRole !== 'client') {
        console.log('🔄 Admin/User kullanıcı müşteri dashboard\'a erişmeye çalışıyor, projeler sayfasına yönlendiriliyor...');
        window.location.href = 'projeler.html';
        return;
      }
      
      // Remove auth-loading class to show dashboard content
      document.body.classList.remove('auth-loading');
    }

    // Initialize page-specific modules
    if (isAnasayfaPage) {
      waitForFunction('loadDashboardOverview', () => {
        console.log('📊 Loading dashboard overview for anasayfa.html');
        window.loadDashboardOverview();
      });
    }
    
    if (isProjelerPage) {
      waitForFunction('loadProjects', () => {
        console.log('🏗️ Loading projects for projeler.html');
        window.loadProjects();
      });
    }
    
    if (isClientDashboardPage) {
      waitForFunction('initClientDashboard', () => {
        console.log('🎨 Loading client dashboard for musteri-dashboard.html');
        window.initClientDashboard();
      });
    }
    
    if (isCalisanlarPage) {
      waitForFunction('loadEmployees', () => {
        console.log('👷 Loading employees for calisanlar.html');
        window.loadEmployees();
      });
    }
    
    if (isMusterilerPage) {
      waitForFunction('initClients', () => {
        console.log('👥 Loading clients for musteriler.html');
        window.loadEmployees();
      });
    }
    
    if (isMusterilerPage) {
      waitForFunction('initClients', () => {
        console.log('👥 Loading clients for musteriler.html');
        window.initClients();
      });
    }
    
    if (isSirketlerPage) {
      waitForFunction('loadCompanies', () => {
        console.log('🏢 Loading companies for sirketler.html');
        window.loadCompanies();
      });
    }
    
    if (isTemplatesPage) {
      waitForFunction('initTemplates', () => {
        console.log('⚙️ Loading templates for templateler.html');
        window.initTemplates();
      });
    }
    
    if (isClientPermissionsPage) {
      waitForFunction('initClientPermissions', () => {
        console.log('👥 Loading client permissions for musteri-yetkileri.html');
        window.initClientPermissions();
      });
    }

    // Restore saved section or load overview as default (legacy dashboard.html support)
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
    
    // If on any authenticated page and not logged in, redirect to login
    if (isDashboardPage || isProjectDetailPage || isAnasayfaPage || isProjelerPage || 
        isCalisanlarPage || isMusterilerPage || isSirketlerPage || isTemplatesPage || isClientPermissionsPage) {
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
