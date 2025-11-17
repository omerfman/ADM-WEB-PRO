// Authentication Management
// Firebase modular SDK uyumluluğu
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Kullanıcı giriş yaptı:', userCredential.user.email);
    showAlert('Giriş başarılı!', 'success');
    await loadUserData();
    showDashboard();
  } catch (error) {
    console.error('❌ Login hatası:', error.message);
    showAlert('Giriş başarısız: ' + error.message, 'danger');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    console.log('✅ Kullanıcı çıkış yaptı');
    showAlert('Çıkış yapıldı', 'success');
    showLoginForm();
  } catch (error) {
    console.error('❌ Logout hatası:', error.message);
  }
}

function showLoginForm() {
  document.getElementById('loginContainer').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  
  document.getElementById('navLogin').classList.remove('hidden');
  document.getElementById('navLogout').classList.add('hidden');
  document.getElementById('navDashboard').classList.add('hidden');
  document.getElementById('navProjects').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginContainer').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  
  document.getElementById('navLogin').classList.add('hidden');
  document.getElementById('navLogout').classList.remove('hidden');
  document.getElementById('navDashboard').classList.remove('hidden');
  document.getElementById('navProjects').classList.remove('hidden');
}

async function loadUserData() {
  const user = auth.currentUser;
  if (user) {
    const email = user.email.split('@')[0];
    document.getElementById('userNameDisplay').textContent = email;
    
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
    document.getElementById('userRoleDisplay').textContent = `Rol: ${roleDisplay[role] || role}`;
    
    // Show/hide admin tabs based on role
    const usersTabBtn = document.getElementById('usersTabBtn');
    const companiesTabBtn = document.getElementById('companiesTabBtn');
    
    // Company admin can see users tab
    if (role === 'company_admin') {
      usersTabBtn.classList.remove('hidden');
    } else {
      usersTabBtn.classList.add('hidden');
    }
    
    // Super admin can see companies tab
    if (role === 'super_admin') {
      companiesTabBtn.classList.remove('hidden');
    } else {
      companiesTabBtn.classList.add('hidden');
    }
    
    // Store role and company for later use
    window.userRole = role;
    window.userCompanyId = companyId;
  }
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('👤 Kullanıcı oturum açık:', user.email);
    await loadUserData();
    showDashboard();
    loadProjects();
  } else {
    console.log('👤 Kullanıcı oturum kapalı');
    showLoginForm();
  }
});

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
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
window.showLoginForm = showLoginForm;
window.showDashboard = showDashboard;
window.showAlert = showAlert;
window.loadUserData = loadUserData;
