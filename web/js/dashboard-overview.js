// Dashboard Overview - Main Statistics Page
import { auth, db } from "./firebase-config.js";
import { IMGBB_API_KEY, IMGBB_UPLOAD_URL, MAX_FILE_SIZE } from './imgbb-config.js';
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
      console.log('🔑 Super Admin dashboard yüklenecek');
      await loadSuperAdminDashboard();
    } else if (userRole === 'company_admin') {
      console.log('🏢 Company Admin dashboard yüklenecek, companyId:', companyId);
      await loadCompanyAdminDashboard(companyId);
    } else if (userRole === 'client') {
      console.log('👤 Client dashboard yüklenecek, userId:', user.uid);
      console.log('📋 userData:', userData);
      await loadClientDashboard(user.uid, userData);
    } else {
      console.log('👷 User dashboard yüklenecek, role:', userRole);
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

    // Get company info
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    const companyData = companyDoc.exists() ? companyDoc.data() : null;
    const companyName = companyData?.name || 'Şirket';
    const companyLogo = companyData?.logoUrl || null;

    // Get company employees
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('companyId', '==', companyId));
    const usersSnap = await getDocs(usersQuery);
    const totalEmployees = usersSnap.size;

    // Get recent activities for this company - Use audit_logs
    const activitiesRef = collection(db, 'audit_logs');
    const activitiesQuery = query(
      activitiesRef,
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const activitiesSnap = await getDocs(activitiesQuery);
    const recentActivities = [];
    
    // Filter activities for this company
    for (const activityDoc of activitiesSnap.docs) {
      const activityData = activityDoc.data();
      
      // Check if activity belongs to this company
      let belongsToCompany = false;
      
      if (activityData.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', activityData.userId));
          if (userDoc.exists() && userDoc.data().companyId === companyId) {
            belongsToCompany = true;
            activityData.userName = userDoc.data().fullName || userDoc.data().displayName || userDoc.data().email;
          }
        } catch (err) {
          console.warn('User fetch error:', err);
        }
      }
      
      if (belongsToCompany) {
        recentActivities.push({ id: activityDoc.id, ...activityData });
        if (recentActivities.length >= 5) break;
      }
    }

    // Render dashboard
    renderCompanyAdminDashboard({
      companyName,
      companyLogo,
      companyId,
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
    // Get company info
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    const companyData = companyDoc.exists() ? companyDoc.data() : null;
    const companyName = companyData?.name || 'Şirket';
    const companyLogo = companyData?.logoUrl || null;

    // Get user's projects (where they are involved)
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    const projectsSnap = await getDocs(projectsQuery);
    const userProjects = projectsSnap.size;

    // Get user's activities
    const activitiesRef = collection(db, 'audit_logs');
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
      companyName,
      companyLogo,
      userProjects,
      recentActivities
    });

  } catch (error) {
    console.error('❌ User Dashboard hata:', error);
  }
}

/**
 * Client Dashboard - Read-only view for authorized projects
 */
async function loadClientDashboard(userId, userData) {
  console.log('🏢 Client Dashboard yükleniyor...', { userId, userData });

  try {
    // Get all projects
    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    console.log(`📊 Toplam proje sayısı: ${projectsSnapshot.size}`);
    
    // Find projects where user has permissions
    const authorizedProjects = [];
    
    for (const projectDoc of projectsSnapshot.docs) {
      try {
        // Check project_permissions subcollection
        const permissionsRef = collection(db, `projects/${projectDoc.id}/project_permissions`);
        const permQuery = query(permissionsRef, where('userId', '==', userId));
        const permSnapshot = await getDocs(permQuery);
        
        if (!permSnapshot.empty) {
          const projectData = projectDoc.data();
          const permissionData = permSnapshot.docs[0].data();
          
          console.log(`✅ Yetkili proje bulundu: ${projectData.name}`, permissionData);
          
          authorizedProjects.push({
            id: projectDoc.id,
            ...projectData,
            permission: permissionData.permission || 'view'
          });
        }
      } catch (err) {
        console.warn(`⚠️ Proje izinleri kontrol edilemedi: ${projectDoc.id}`, err);
      }
    }
    
    console.log(`📋 Toplam yetkili proje: ${authorizedProjects.length}`, authorizedProjects);
    
    if (authorizedProjects.length === 0) {
      renderClientDashboard({
        clientInfo: {
          companyName: userData?.company || userData?.companyName || null,
          contactPerson: userData?.fullName || userData?.displayName || null
        },
        projects: [],
        userName: userData?.fullName || userData?.displayName || userData?.email,
        message: 'Henüz size proje yetkisi verilmemiş. Lütfen firma yetkiliniz ile iletişime geçin.'
      });
      return;
    }

    renderClientDashboard({
      clientInfo: {
        companyName: userData?.company || userData?.companyName || null,
        contactPerson: userData?.fullName || userData?.displayName || null
      },
      projects: authorizedProjects,
      userName: userData?.fullName || userData?.displayName || userData?.email
    });

  } catch (error) {
    console.error('❌ Client Dashboard hata:', error);
    renderClientDashboard({
      clientInfo: {},
      projects: [],
      userName: userData?.fullName || userData?.displayName || userData?.email,
      message: 'Dashboard yüklenirken hata oluştu: ' + error.message
    });
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
    <!-- Company Header with Logo -->
    <div class="company-header" style="
      background: linear-gradient(135deg, var(--brand-red) 0%, #c62828 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    ">
      <div class="company-logo-container" style="
        flex-shrink: 0;
        width: 120px;
        height: 120px;
        background: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        position: relative;
      ">
        ${data.companyLogo 
          ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src=''; this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 3rem; color: var(--brand-red);">🏢</div>`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--brand-red);">🏢</div>`
        }
        <button 
          onclick="openCompanyLogoUpload()" 
          class="btn btn-primary" 
          style="
            position: absolute;
            bottom: -10px;
            right: -10px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "
          title="Logo Yükle"
        >📷</button>
      </div>
      <div style="flex: 1;">
        <h1 style="margin: 0 0 0.5rem 0; font-size: 2.5rem; font-weight: 700;">${data.companyName}</h1>
        <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">
          📅 ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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
    
    <!-- Company Logo Upload Modal -->
    <div id="companyLogoModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 500px;">
        <h3 style="margin-bottom: 1.5rem;">🏢 Şirket Logosu Yükle</h3>
        <form id="companyLogoForm" onsubmit="handleCompanyLogoUpload(event, '${data.companyId}')">
          <div class="form-group">
            <label>Logo Seç</label>
            <input type="file" id="companyLogoFile" accept="image/*" required style="
              width: 100%;
              padding: 0.75rem;
              border: 2px dashed var(--border-color);
              border-radius: 8px;
              background: var(--input-bg);
              cursor: pointer;
            ">
            <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
              PNG, JPG veya WebP formatında, maksimum 5MB
            </small>
          </div>
          <div id="logoPreview" style="margin: 1rem 0; text-align: center;"></div>
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">✅ Yükle</button>
            <button type="button" class="btn btn-secondary" onclick="closeCompanyLogoUpload()" style="flex: 1;">❌ İptal</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Add logo preview listener
  const logoFileInput = document.getElementById('companyLogoFile');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          document.getElementById('logoPreview').innerHTML = `
            <img src="${event.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

/**
 * Render User Dashboard
 */
function renderUserDashboard(data) {
  const container = document.getElementById('overviewSection');
  if (!container) return;

  container.innerHTML = `
    <!-- Company Header (Read-only for users) -->
    <div class="company-header" style="
      background: linear-gradient(135deg, var(--brand-red) 0%, #c62828 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    ">
      <div class="company-logo-container" style="
        flex-shrink: 0;
        width: 120px;
        height: 120px;
        background: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      ">
        ${data.companyLogo 
          ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src=''; this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 3rem; color: var(--brand-red);">🏢</div>`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--brand-red);">🏢</div>`
        }
      </div>
      <div style="flex: 1;">
        <h1 style="margin: 0 0 0.5rem 0; font-size: 2.5rem; font-weight: 700;">${data.companyName}</h1>
        <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">
          📅 ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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

/**
 * Company Logo Upload Functions
 */
function openCompanyLogoUpload() {
  const modal = document.getElementById('companyLogoModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeCompanyLogoUpload() {
  const modal = document.getElementById('companyLogoModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('companyLogoForm').reset();
    document.getElementById('logoPreview').innerHTML = '';
  }
}

async function handleCompanyLogoUpload(event, companyId) {
  event.preventDefault();
  
  // Validate API key
  if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
    alert('❌ ImgBB API key ayarlanmamış!\n\n1. https://api.imgbb.com/ adresinden ücretsiz hesap oluşturun\n2. API key\'inizi alın\n3. web/js/imgbb-config.js dosyasında IMGBB_API_KEY değerini güncelleyin');
    return;
  }
  
  const fileInput = document.getElementById('companyLogoFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Lütfen bir dosya seçin');
    return;
  }
  
  // Validate file size (max 5MB for logo)
  if (file.size > MAX_FILE_SIZE) {
    alert(`Dosya boyutu ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB\'dan küçük olmalıdır`);
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Lütfen bir görsel dosyası seçin');
    return;
  }
  
  try {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Yükleniyor...';
    
    // Upload to ImgBB
    const formData = new FormData();
    formData.append('image', file);
    
    const imgbbResponse = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    if (!imgbbResponse.ok) {
      throw new Error('ImgBB yükleme hatası');
    }
    
    const imgbbData = await imgbbResponse.json();
    const logoUrl = imgbbData.data.url;
    
    // Update company document with logo URL
    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const companyRef = doc(db, 'companies', companyId);
    
    await updateDoc(companyRef, {
      logoUrl: logoUrl,
      updatedAt: new Date()
    });
    
    // Log activity
    const { addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const user = auth.currentUser;
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      action: 'UPDATE_COMPANY',
      description: 'Şirket logosu güncellendi',
      timestamp: new Date(),
      metadata: {
        companyId: companyId,
        logoUrl: logoUrl
      }
    });
    
    alert('✅ Logo başarıyla yüklendi!');
    closeCompanyLogoUpload();
    
    // Reload dashboard to show new logo
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Logo yükleme hatası:', error);
    alert('Logo yüklenirken bir hata oluştu: ' + error.message);
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Yükle';
  }
}

// Export logo functions
window.openCompanyLogoUpload = openCompanyLogoUpload;
window.closeCompanyLogoUpload = closeCompanyLogoUpload;
window.handleCompanyLogoUpload = handleCompanyLogoUpload;

/**
 * Render Client Dashboard
 */
function renderClientDashboard(data) {
  const container = document.getElementById('overviewSection');
  if (!container) return;

  const { clientInfo, projects, userName, message } = data;

  container.innerHTML = `
    <div class="section-header">
      <h3>🏢 Hoş Geldiniz, ${userName || 'Müşteri'}</h3>
      <div style="color: var(--text-secondary); font-size: 0.9rem;">
        ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    ${clientInfo.companyName ? `
    <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="font-size: 3rem;">🏢</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 0.5rem 0;">${clientInfo.companyName}</h3>
          ${clientInfo.contactPerson ? `<p style="margin: 0; opacity: 0.9;">👤 ${clientInfo.contactPerson}</p>` : ''}
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Statistics Cards -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-bottom: 2rem;">
      <!-- Total Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="stats-icon">🏗️</div>
        <div class="stats-content">
          <div class="stats-label">Dahil Olduğum Projeler</div>
          <div class="stats-value">${projects.length}</div>
        </div>
      </div>

      <!-- Active Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white;">
        <div class="stats-icon">✅</div>
        <div class="stats-content">
          <div class="stats-label">Devam Eden Projeler</div>
          <div class="stats-value">${projects.filter(p => p.status === 'Devam Ediyor').length}</div>
        </div>
      </div>

      <!-- Completed Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white;">
        <div class="stats-icon">🎯</div>
        <div class="stats-content">
          <div class="stats-label">Tamamlanan Projeler</div>
          <div class="stats-value">${projects.filter(p => p.status === 'Tamamlandı').length}</div>
        </div>
      </div>

      <!-- Pending Projects -->
      <div class="stats-card" style="background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); color: white;">
        <div class="stats-icon">⏳</div>
        <div class="stats-content">
          <div class="stats-label">Bekleyen Projeler</div>
          <div class="stats-value">${projects.filter(p => p.status === 'Beklemede').length}</div>
        </div>
      </div>
    </div>

    ${message ? `
    <div class="card" style="background: #FFF3CD; border-left: 4px solid #FFA500; padding: 1.5rem; margin-bottom: 2rem;">
      <h4 style="margin: 0 0 0.5rem 0; color: #856404;">ℹ️ Bilgilendirme</h4>
      <p style="margin: 0; color: #856404;">${message}</p>
    </div>
    ` : ''}

    ${projects.length > 0 ? `
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 1rem;">📁 Yetkili Projeleriniz (${projects.length})</h4>
      <div class="dashboard-grid">
        ${projects.map(project => {
          const status = project.status || 'Devam Ediyor';
          const statusColors = {
            'Devam Ediyor': '#4CAF50',
            'Tamamlandı': '#2196F3',
            'Beklemede': '#FFA500'
          };
          
          return `
            <div class="project-card" style="
              padding: 1.5rem;
              border: 1px solid var(--border-color);
              border-radius: 8px;
              background: var(--card-bg);
              cursor: pointer;
              transition: box-shadow 0.3s;
              position: relative;
            " onclick="window.location.href='project-detail.html?id=${project.id}'">
              <div style="position: absolute; top: 10px; right: 10px; background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">
                👁️ GÖRÜNTÜLEME
              </div>
              <h4 style="margin: 0 0 0.5rem 0; color: var(--brand-red);">${project.name || 'İsimsiz Proje'}</h4>
              <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">
                📍 ${project.location || 'Konum belirtilmemiş'}
              </p>
              ${project.description ? `
                <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                  ${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}
                </p>
              ` : ''}
              <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
                <span style="background: ${statusColors[status] || '#999'}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
                  ${status}
                </span>
                <small style="color: var(--text-secondary);">
                  ${project.createdAt ? new Date(project.createdAt.toDate()).toLocaleDateString('tr-TR') : ''}
                </small>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="card" style="background: #E3F2FD; border-left: 4px solid #2196F3; padding: 1.5rem;">
      <h4 style="margin: 0 0 0.5rem 0; color: #1976D2;">💡 İpucu</h4>
      <p style="margin: 0; color: #1976D2;">
        Proje detaylarını görüntülemek için proje kartına tıklayın. 
        Şantiye günlükleri, fotoğraflar ve ilerleme bilgilerini inceleyebilirsiniz.
      </p>
    </div>
    ` : ''}
  `;
}

console.log('✅ Dashboard Overview module loaded');
