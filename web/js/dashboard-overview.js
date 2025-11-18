// Dashboard Overview - Main Statistics Page
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, doc, getDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Load Dashboard Overview
 */
async function loadDashboardOverview() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ Kullanıcı giriş yapmamış');
      return;
    }

    // Get user data
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data();
    const userRole = window.userRole || userData?.role;
    const companyId = userData?.companyId || 'default-company';

    console.log(`📊 Dashboard yükleniyor - Rol: ${userRole}`);

    // Load different dashboard based on role
    if (userRole === 'super_admin') {
      await loadSuperAdminDashboard();
    } else if (userRole === 'company_admin') {
      await loadCompanyAdminDashboard(companyId);
    } else {
      await loadUserDashboard(user.uid, companyId);
    }

  } catch (error) {
    console.error('❌ Dashboard yüklenirken hata:', error);
  }
}

/**
 * Super Admin Dashboard
 */
async function loadSuperAdminDashboard() {
  console.log('🔑 Super Admin Dashboard yükleniyor...');

  try {
    // Get all companies
    const companiesSnap = await getDocs(collection(db, 'companies'));
    const totalCompanies = companiesSnap.size;

    // Get all projects
    const projectsSnap = await getDocs(collection(db, 'projects'));
    const totalProjects = projectsSnap.size;

    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnap.size;

    // Calculate total budget
    let totalBudget = 0;
    let totalUsedBudget = 0;
    projectsSnap.forEach(doc => {
      const data = doc.data();
      totalBudget += parseFloat(data.budget || 0);
      totalUsedBudget += parseFloat(data.usedBudget || 0);
    });

    // Get recent activities (last 5)
    const activitiesRef = collection(db, 'audit_logs');
    const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'), limit(5));
    const activitiesSnap = await getDocs(activitiesQuery);
    const recentActivities = [];
    
    for (const activityDoc of activitiesSnap.docs) {
      const activityData = activityDoc.data();
      
      // Get user name
      let userName = 'Bilinmeyen';
      if (activityData.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', activityData.userId));
          if (userDoc.exists()) {
            const user = userDoc.data();
            userName = user.displayName || user.email || 'Kullanıcı';
          }
        } catch (err) {
          console.warn('User fetch error:', err);
        }
      }
      
      // Get project name if exists
      let projectName = null;
      if (activityData.projectId) {
        try {
          const projectDoc = await getDoc(doc(db, 'projects', activityData.projectId));
          if (projectDoc.exists()) {
            projectName = projectDoc.data().name;
          }
        } catch (err) {
          console.warn('Project fetch error:', err);
        }
      }
      
      recentActivities.push({
        id: activityDoc.id,
        ...activityData,
        userName,
        projectName,
        description: getActivityDescription(activityData, userName, projectName)
      });
    }

    // Render dashboard
    renderSuperAdminDashboard({
      totalCompanies,
      totalProjects,
      totalUsers,
      totalBudget,
      totalUsedBudget,
      recentActivities
    });

  } catch (error) {
    console.error('❌ Super Admin Dashboard hata:', error);
  }
}

/**
 * Company Admin Dashboard
 */
async function loadCompanyAdminDashboard(companyId) {
  console.log(`🏢 Company Admin Dashboard yükleniyor - ${companyId}`);

  try {
    // Get company projects
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    const projectsSnap = await getDocs(projectsQuery);
    
    const totalProjects = projectsSnap.size;
    let activeProjects = 0;
    let totalBudget = 0;
    let totalUsedBudget = 0;

    projectsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === 'Devam Ediyor') activeProjects++;
      totalBudget += parseFloat(data.budget || 0);
      totalUsedBudget += parseFloat(data.usedBudget || 0);
    });

    // Get company employees
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('companyId', '==', companyId));
    const usersSnap = await getDocs(usersQuery);
    const totalEmployees = usersSnap.size;

    // Get recent activities for this company
    const activitiesRef = collection(db, 'activity_logs');
    const activitiesQuery = query(
      activitiesRef, 
      where('companyId', '==', companyId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const activitiesSnap = await getDocs(activitiesQuery);
    const recentActivities = [];
    activitiesSnap.forEach(doc => {
      recentActivities.push({ id: doc.id, ...doc.data() });
    });

    // Render dashboard
    renderCompanyAdminDashboard({
      totalProjects,
      activeProjects,
      totalEmployees,
      totalBudget,
      totalUsedBudget,
      recentActivities
    });

  } catch (error) {
    console.error('❌ Company Admin Dashboard hata:', error);
  }
}

/**
 * User Dashboard
 */
async function loadUserDashboard(userId, companyId) {
  console.log(`👤 User Dashboard yükleniyor - ${userId}`);

  try {
    // Get user's projects (where they are involved)
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    const projectsSnap = await getDocs(projectsQuery);
    const userProjects = projectsSnap.size;

    // Get user's activities
    const activitiesRef = collection(db, 'activity_logs');
    const activitiesQuery = query(
      activitiesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const activitiesSnap = await getDocs(activitiesQuery);
    const recentActivities = [];
    activitiesSnap.forEach(doc => {
      recentActivities.push({ id: doc.id, ...doc.data() });
    });

    // Render dashboard
    renderUserDashboard({
      userProjects,
      recentActivities
    });

  } catch (error) {
    console.error('❌ User Dashboard hata:', error);
  }
}

/**
 * Render Super Admin Dashboard
 */
function renderSuperAdminDashboard(data) {
  const container = document.getElementById('overviewSection');
  if (!container) return;

  const budgetPercentage = data.totalBudget > 0 
    ? ((data.totalUsedBudget / data.totalBudget) * 100).toFixed(1)
    : 0;

  container.innerHTML = `
    <div class="section-header">
      <h3>📊 Genel Bakış - Super Admin</h3>
      <div style="color: var(--text-secondary); font-size: 0.9rem;">
        ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-bottom: 2rem;">
      <!-- Total Companies -->
      <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="stats-icon">🏢</div>
        <div class="stats-content">
          <div class="stats-label">Toplam Şirket</div>
          <div class="stats-value">${data.totalCompanies}</div>
        </div>
      </div>

      <!-- Total Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div class="stats-icon">🏗️</div>
        <div class="stats-content">
          <div class="stats-label">Toplam Proje</div>
          <div class="stats-value">${data.totalProjects}</div>
        </div>
      </div>

      <!-- Total Users -->
      <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
        <div class="stats-icon">👥</div>
        <div class="stats-content">
          <div class="stats-label">Toplam Kullanıcı</div>
          <div class="stats-value">${data.totalUsers}</div>
        </div>
      </div>

      <!-- Budget Usage -->
      <div class="stats-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
        <div class="stats-icon">💰</div>
        <div class="stats-content">
          <div class="stats-label">Bütçe Kullanımı</div>
          <div class="stats-value">${budgetPercentage}%</div>
          <div class="stats-detail">${formatCurrency(data.totalUsedBudget)} / ${formatCurrency(data.totalBudget)}</div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="card" style="margin-top: 2rem;">
      <h4 style="margin-bottom: 1rem;">🔥 Son Aktiviteler (Tüm Şirketler)</h4>
      <div class="activity-timeline">
        ${data.recentActivities.length > 0 
          ? data.recentActivities.map(activity => `
            <div class="activity-item">
              <div class="activity-icon">${getActivityIcon(activity.action)}</div>
              <div class="activity-content">
                <div class="activity-text">${activity.description || activity.action}</div>
                <div class="activity-meta">
                  <span>${activity.userName || 'Kullanıcı'}</span>
                  <span>•</span>
                  <span>${formatDate(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          `).join('')
          : '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Henüz aktivite yok</p>'
        }
      </div>
    </div>
  `;
}

/**
 * Render Company Admin Dashboard
 */
function renderCompanyAdminDashboard(data) {
  const container = document.getElementById('overviewSection');
  if (!container) return;

  const budgetPercentage = data.totalBudget > 0 
    ? ((data.totalUsedBudget / data.totalBudget) * 100).toFixed(1)
    : 0;

  const budgetColor = budgetPercentage < 70 ? '#10b981' : budgetPercentage < 90 ? '#f59e0b' : '#ef4444';

  container.innerHTML = `
    <div class="section-header">
      <h3>📊 Şirket Özeti</h3>
      <div style="color: var(--text-secondary); font-size: 0.9rem;">
        ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-bottom: 2rem;">
      <!-- Total Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="stats-icon">🏗️</div>
        <div class="stats-content">
          <div class="stats-label">Toplam Proje</div>
          <div class="stats-value">${data.totalProjects}</div>
          <div class="stats-detail">${data.activeProjects} Aktif</div>
        </div>
      </div>

      <!-- Total Employees -->
      <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div class="stats-icon">👷</div>
        <div class="stats-content">
          <div class="stats-label">Aktif Çalışan</div>
          <div class="stats-value">${data.totalEmployees}</div>
        </div>
      </div>

      <!-- Budget Total -->
      <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
        <div class="stats-icon">💼</div>
        <div class="stats-content">
          <div class="stats-label">Toplam Bütçe</div>
          <div class="stats-value">${formatCurrency(data.totalBudget)}</div>
        </div>
      </div>

      <!-- Budget Usage -->
      <div class="stats-card" style="background: linear-gradient(135deg, ${budgetColor} 0%, ${budgetColor}dd 100%); color: white;">
        <div class="stats-icon">📊</div>
        <div class="stats-content">
          <div class="stats-label">Bütçe Kullanımı</div>
          <div class="stats-value">${budgetPercentage}%</div>
          <div class="progress-bar" style="background: rgba(255,255,255,0.3); height: 8px; border-radius: 4px; margin-top: 0.5rem;">
            <div style="background: white; height: 100%; width: ${budgetPercentage}%; border-radius: 4px; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="card" style="margin-top: 2rem;">
      <h4 style="margin-bottom: 1rem;">🔔 Son 5 Aktivite</h4>
      <div class="activity-timeline">
        ${data.recentActivities.length > 0 
          ? data.recentActivities.map(activity => `
            <div class="activity-item">
              <div class="activity-icon">${getActivityIcon(activity.action)}</div>
              <div class="activity-content">
                <div class="activity-text">${activity.description || activity.action}</div>
                <div class="activity-meta">
                  <span>${activity.userName || 'Kullanıcı'}</span>
                  <span>•</span>
                  <span>${formatDate(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          `).join('')
          : '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Henüz aktivite yok</p>'
        }
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card" style="margin-top: 2rem;">
      <h4 style="margin-bottom: 1rem;">⚡ Hızlı Erişim</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <button class="btn btn-primary" onclick="switchSection('projects')" style="padding: 1rem;">
          📊 Projelere Git
        </button>
        <button class="btn btn-primary" onclick="switchSection('employees')" style="padding: 1rem;">
          👷 Çalışanlara Git
        </button>
        <button class="btn btn-primary" onclick="switchSection('activity')" style="padding: 1rem;">
          📋 Faaliyet Kayıtları
        </button>
      </div>
    </div>
  `;
}

/**
 * Render User Dashboard
 */
function renderUserDashboard(data) {
  const container = document.getElementById('overviewSection');
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h3>📊 Kişisel Özet</h3>
      <div style="color: var(--text-secondary); font-size: 0.9rem;">
        ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-bottom: 2rem;">
      <!-- Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="stats-icon">🏗️</div>
        <div class="stats-content">
          <div class="stats-label">Dahil Olduğum Projeler</div>
          <div class="stats-value">${data.userProjects}</div>
        </div>
      </div>

      <!-- Activities -->
      <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div class="stats-icon">📝</div>
        <div class="stats-content">
          <div class="stats-label">Son Aktivitelerim</div>
          <div class="stats-value">${data.recentActivities.length}</div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="card" style="margin-top: 2rem;">
      <h4 style="margin-bottom: 1rem;">🔔 Son Yaptığım İşler</h4>
      <div class="activity-timeline">
        ${data.recentActivities.length > 0 
          ? data.recentActivities.map(activity => `
            <div class="activity-item">
              <div class="activity-icon">${getActivityIcon(activity.action)}</div>
              <div class="activity-content">
                <div class="activity-text">${activity.description || activity.action}</div>
                <div class="activity-meta">
                  <span>${formatDate(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          `).join('')
          : '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Henüz aktivite yok</p>'
        }
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card" style="margin-top: 2rem;">
      <h4 style="margin-bottom: 1rem;">⚡ Hızlı Erişim</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <button class="btn btn-primary" onclick="switchSection('projects')" style="padding: 1rem;">
          📊 Projelere Git
        </button>
        <button class="btn btn-primary" onclick="switchSection('activity')" style="padding: 1rem;">
          📋 Faaliyet Kayıtlarım
        </button>
      </div>
    </div>
  `;
}

/**
 * Helper functions
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Bilinmiyor';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getActivityIcon(action) {
  const icons = {
    'CREATE_PROJECT': '📁',
    'UPDATE_PROJECT': '✏️',
    'DELETE_PROJECT': '🗑️',
    'CREATE_USER': '👤',
    'UPDATE_USER': '✏️',
    'DELETE_USER': '🗑️',
    'CREATE_COMPANY': '🏢',
    'UPDATE_COMPANY': '✏️',
    'DELETE_COMPANY': '🗑️',
    'UPLOAD_PHOTO': '📸',
    'ADD_LOG': '📝',
    'ADD_STOCK': '📦',
    'ADD_PAYMENT': '💰',
    'create': '➕',
    'update': '✏️',
    'delete': '🗑️',
    'login': '🔐',
    'logout': '🚪',
    'upload': '📤',
    'download': '📥'
  };
  return icons[action] || '📌';
}

function getActivityDescription(activityData, userName, projectName) {
  const actionDescriptions = {
    'CREATE_PROJECT': 'yeni proje oluşturdu',
    'UPDATE_PROJECT': 'projeyi güncelledi',
    'DELETE_PROJECT': 'projeyi sildi',
    'CREATE_USER': 'yeni kullanıcı ekledi',
    'UPDATE_USER': 'kullanıcıyı güncelledi',
    'DELETE_USER': 'kullanıcıyı sildi',
    'CREATE_COMPANY': 'yeni şirket oluşturdu',
    'UPDATE_COMPANY': 'şirketi güncelledi',
    'DELETE_COMPANY': 'şirketi sildi',
    'UPLOAD_PHOTO': 'fotoğraf yükledi',
    'ADD_LOG': 'şantiye günlüğü ekledi',
    'ADD_STOCK': 'stok ekledi',
    'ADD_PAYMENT': 'hakediş ekledi'
  };
  
  const actionDesc = actionDescriptions[activityData.action] || activityData.action;
  let description = `${userName} ${actionDesc}`;
  
  if (projectName) {
    description += ` - ${projectName}`;
  }
  
  return description;
}

// Export for global use
window.loadDashboardOverview = loadDashboardOverview;

console.log('✅ Dashboard Overview module loaded');
