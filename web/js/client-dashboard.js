// Client Dashboard - Müşteri Proje Yönetimi
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let clientProjects = [];
let filteredProjects = [];

/**
 * Initialize Client Dashboard
 */
async function initClientDashboard() {
  try {
    console.log('🎨 Müşteri Dashboard başlatılıyor...');

    // Ensure user data is loaded
    if (!window.userRole && window.loadUserData) {
      console.log('⏳ Kullanıcı verileri yükleniyor...');
      await window.loadUserData();
    }

    // Verify user is a client
    if (window.userRole !== 'client') {
      console.warn('⚠️ Bu sayfa sadece müşteriler içindir');
      showAlert('Bu sayfa sadece müşteri kullanıcıları içindir', 'warning');
      setTimeout(() => {
        window.location.href = 'projeler.html';
      }, 2000);
      return;
    }

    // Load client projects
    await loadClientProjects();

    // Setup event listeners
    setupEventListeners();

    console.log('✅ Müşteri Dashboard başarıyla yüklendi');

  } catch (error) {
    console.error('❌ Dashboard başlatma hatası:', error);
    showAlert('Dashboard yüklenirken hata oluştu: ' + error.message, 'danger');
  }
}

/**
 * Load Client's Projects
 */
async function loadClientProjects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kullanıcı giriş yapmamış');
    }

    console.log('📊 Müşteri projeleri yükleniyor...');

    // Get user data
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data() || {};

    // Update welcome message
    const welcomeUserName = document.getElementById('welcomeUserName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userName = userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : user.email?.split('@')[0] || 'Değerli Müşterimiz';
    
    if (welcomeUserName) welcomeUserName.textContent = userName;
    if (welcomeMessage) welcomeMessage.textContent = `Toplam ${clientProjects.length} projeniz var`;

    // Get all projects first
    const allProjectsSnapshot = await getDocs(collection(db, 'projects'));
    
    clientProjects = [];
    
    // Check each project for permissions
    console.log(`🔍 ${allProjectsSnapshot.docs.length} proje kontrol ediliyor...`);
    
    for (const projectDoc of allProjectsSnapshot.docs) {
      const projectId = projectDoc.id;
      
      // Check if user has permission to this project
      const permissionsRef = collection(db, `projects/${projectId}/project_permissions`);
      const permQuery = query(permissionsRef, where('userId', '==', user.uid));
      const permSnapshot = await getDocs(permQuery);
      
      if (!permSnapshot.empty) {
        // User has access to this project
        const projectData = projectDoc.data();
        console.log(`✅ Yetkili proje: ${projectData.name || projectId}`);
        
        // Enrich project data
        clientProjects.push({
          id: projectDoc.id,
          ...projectData,
          progress: await calculateProjectProgress(projectId),
          lastPayment: await getLastPaymentInfo(projectId),
          totalBudget: await getTotalBudget(projectId)
        });
      }
    }

    console.log(`✅ ${clientProjects.length} yetkili proje yüklendi`);

    // Update statistics
    calculateStatistics();

    // Apply filters and render
    filteredProjects = [...clientProjects];
    renderProjects();

  } catch (error) {
    console.error('❌ Proje yükleme hatası:', error);
    showAlert('Projeler yüklenirken hata oluştu: ' + error.message, 'danger');
    showEmptyState('Projeler yüklenirken hata oluştu');
  }
}

/**
 * Calculate Project Progress
 */
async function calculateProjectProgress(projectId) {
  try {
    // Get BOQ items
    const boqRef = collection(db, `projects/${projectId}/boq`);
    const boqSnapshot = await getDocs(boqRef);
    
    if (boqSnapshot.empty) return 0;

    let totalValue = 0;
    let completedValue = 0;

    boqSnapshot.forEach(doc => {
      const item = doc.data();
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const itemCompleted = (item.completedQuantity || 0) * (item.unitPrice || 0);
      
      totalValue += itemTotal;
      completedValue += itemCompleted;
    });

    return totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0;
  } catch (error) {
    console.error('İlerleme hesaplama hatası:', error);
    return 0;
  }
}

/**
 * Get Last Payment Info
 */
async function getLastPaymentInfo(projectId) {
  try {
    const paymentsRef = collection(db, `projects/${projectId}/hakedisler`);
    const paymentsSnapshot = await getDocs(paymentsRef);
    
    if (paymentsSnapshot.empty) return null;

    let lastPayment = null;
    let lastDate = null;

    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      const paymentDate = payment.createdAt?.toDate?.() || payment.date?.toDate?.();
      
      if (!lastDate || (paymentDate && paymentDate > lastDate)) {
        lastDate = paymentDate;
        lastPayment = payment;
      }
    });

    return lastPayment;
  } catch (error) {
    console.error('Son hakediş bilgisi hatası:', error);
    return null;
  }
}

/**
 * Get Total Budget
 */
async function getTotalBudget(projectId) {
  try {
    const boqRef = collection(db, `projects/${projectId}/boq`);
    const boqSnapshot = await getDocs(boqRef);
    
    let total = 0;
    boqSnapshot.forEach(doc => {
      const item = doc.data();
      total += (item.quantity || 0) * (item.unitPrice || 0);
    });

    return total;
  } catch (error) {
    console.error('Bütçe hesaplama hatası:', error);
    return 0;
  }
}

/**
 * Calculate Statistics
 */
function calculateStatistics() {
  const total = clientProjects.length;
  const active = clientProjects.filter(p => p.status === 'Devam Ediyor').length;
  const completed = clientProjects.filter(p => p.status === 'Tamamlandı').length;
  const totalValue = clientProjects.reduce((sum, p) => sum + (p.totalBudget || 0), 0);

  // Update stat cards
  document.getElementById('totalProjects').textContent = total;
  document.getElementById('activeProjects').textContent = active;
  document.getElementById('completedProjects').textContent = completed;
  document.getElementById('totalValue').textContent = formatCurrency(totalValue);

  // Update welcome message
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.textContent = `Toplam ${total} projeniz var, ${active} tanesi devam ediyor`;
  }
}

/**
 * Render Projects
 */
function renderProjects() {
  const projectsGrid = document.getElementById('projectsGrid');
  
  if (!filteredProjects || filteredProjects.length === 0) {
    showEmptyState();
    return;
  }

  projectsGrid.innerHTML = '';

  filteredProjects.forEach(project => {
    const card = createProjectCard(project);
    projectsGrid.appendChild(card);
  });
}

/**
 * Create Project Card
 */
function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'client-project-card';
  card.onclick = () => openProjectDetail(project.id);

  const status = project.status || 'Devam Ediyor';
  const statusClass = status === 'Tamamlandı' ? 'status-completed' : 
                     status === 'Beklemede' ? 'status-pending' : 'status-active';

  const progress = project.progress || 0;
  const budget = formatCurrency(project.totalBudget || 0);
  const lastPayment = project.lastPayment ? 
    formatCurrency(project.lastPayment.amount || 0) : 'Henüz yok';
  
  const startDate = project.startDate?.toDate?.() || project.createdAt?.toDate?.() || new Date();
  const endDate = project.endDate?.toDate?.() || new Date();

  card.innerHTML = `
    <div class="project-card-header">
      <h3 class="project-card-title">
        <span>🏗️</span>
        <span>${project.name || 'İsimsiz Proje'}</span>
      </h3>
      <div class="project-card-location">
        <span>📍</span>
        <span>${project.location || 'Lokasyon belirtilmemiş'}</span>
      </div>
    </div>

    <div class="project-card-body">
      <span class="project-status-badge ${statusClass}">
        ${status}
      </span>

      <div class="project-progress">
        <div class="progress-label">
          <span>İlerleme</span>
          <span style="font-weight: 600; color: var(--brand-red);">${progress}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
      </div>

      <div class="project-info-grid">
        <div class="info-item">
          <div class="info-label">Toplam Bütçe</div>
          <div class="info-value">${budget}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Son Hakediş</div>
          <div class="info-value">${lastPayment}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Başlangıç</div>
          <div class="info-value">${formatDate(startDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Bitiş</div>
          <div class="info-value">${formatDate(endDate)}</div>
        </div>
      </div>
    </div>

    <div class="project-card-footer">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        Son güncelleme: ${formatDate(project.updatedAt?.toDate?.() || startDate)}
      </div>
      <button class="view-details-btn" onclick="event.stopPropagation(); openProjectDetail('${project.id}')">
        Detayları Gör →
      </button>
    </div>
  `;

  return card;
}

/**
 * Open Project Detail
 */
function openProjectDetail(projectId) {
  window.location.href = `projects/proje-ozeti.html?id=${projectId}`;
}

/**
 * Show Empty State
 */
function showEmptyState(message) {
  const projectsGrid = document.getElementById('projectsGrid');
  projectsGrid.innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1;">
      <div class="empty-state-icon">📂</div>
      <h3>${message || 'Henüz size atanmış proje bulunmuyor'}</h3>
      <p>Lütfen yöneticiniz ile iletişime geçin</p>
    </div>
  `;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', applyFilters);
  }

  // Sort by
  const sortBy = document.getElementById('sortBy');
  if (sortBy) {
    sortBy.addEventListener('change', applyFilters);
  }
}

/**
 * Apply Filters
 */
function applyFilters() {
  const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const sortBy = document.getElementById('sortBy')?.value || 'newest';

  // Filter projects
  filteredProjects = clientProjects.filter(project => {
    // Search filter
    const matchesSearch = !searchTerm || 
      project.name?.toLowerCase().includes(searchTerm) ||
      project.location?.toLowerCase().includes(searchTerm);

    // Status filter
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort projects
  filteredProjects.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
      case 'oldest':
        return (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'progress':
        return (b.progress || 0) - (a.progress || 0);
      default:
        return 0;
    }
  });

  // Re-render
  renderProjects();
}

/**
 * Format Currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

/**
 * Format Date
 */
function formatDate(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Show Alert
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    alert(message);
    return;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} show`;
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}

// Export functions to window
window.initClientDashboard = initClientDashboard;
window.openProjectDetail = openProjectDetail;

export { initClientDashboard, openProjectDetail };
