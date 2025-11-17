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
    document.getElementById('userNameDisplay').textContent = user.email.split('@')[0];
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
