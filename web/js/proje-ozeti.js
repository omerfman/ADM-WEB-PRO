// Proje Özeti Page - Standalone Logic

import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentProjectId = null;
let currentProject = null;

/**
 * Initialize Proje Özeti Page
 */
async function initProjeOzeti() {
  try {
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');

    if (!currentProjectId) {
      showAlert('Proje ID bulunamadı', 'danger');
      setTimeout(() => {
        window.location.href = '../projeler.html';
      }, 2000);
      return;
    }

    console.log('📋 Proje özeti yükleniyor:', currentProjectId);

    // Ensure user data is loaded first
    if (!window.userRole && window.loadUserData) {
      console.log('⏳ Kullanıcı verileri yükleniyor...');
      await window.loadUserData();
    }
    
    console.log('👤 Mevcut rol:', window.userRole);

    // Load project data
    await loadProjectData();
    
    // Load project overview
    await loadProjectOverview();
    
    console.log('✅ Proje özeti yüklendi');

  } catch (error) {
    console.error('❌ Proje özeti yüklenirken hata:', error);
    showAlert('Proje yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Project Data
 */
async function loadProjectData() {
  try {
    const projectRef = doc(db, 'projects', currentProjectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      throw new Error('Proje bulunamadı');
    }

    currentProject = {
      id: projectSnap.id,
      ...projectSnap.data()
    };

    // Update page title and header
    document.title = `${currentProject.name} - Proje Özeti - ADM İnşaat`;
    
    const projectNameEl = document.getElementById('projectName');
    if (projectNameEl) {
      projectNameEl.textContent = currentProject.name;
    }
    
    const breadcrumbEl = document.getElementById('projectNameBreadcrumb');
    if (breadcrumbEl) {
      breadcrumbEl.textContent = currentProject.name;
    }

    console.log('✅ Proje bilgileri yüklendi:', currentProject);
  } catch (error) {
    console.error('❌ Proje verileri yüklenemedi:', error);
    throw error;
  }
}

/**
 * Load Project Overview
 */
async function loadProjectOverview() {
  if (!currentProjectId || !currentProject) {
    console.warn('⚠️ loadProjectOverview: currentProjectId or currentProject is null');
    return;
  }
  
  try {
    console.log('📊 Proje özeti verileri yükleniyor...');
    
    // Check if user is client
    const isClient = window.userRole === 'client';
    console.log('👤 İstemci modu:', isClient);
    
    // Update project info
    const overviewProjectName = document.getElementById('overviewProjectName');
    if (overviewProjectName) {
      overviewProjectName.textContent = currentProject.name || '-';
    }
    
    const overviewCompany = document.getElementById('overviewCompany');
    if (overviewCompany) {
      overviewCompany.textContent = currentProject.company || '-';
    }
    
    // Status with color
    const statusEl = document.getElementById('overviewStatus');
    if (statusEl) {
      const statusText = currentProject.status || 'active';
      const statusMap = {
        'active': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'on-hold': 'Beklemede',
        'cancelled': 'İptal'
      };
      const statusColors = {
        'active': '#2196F3',
        'completed': '#4caf50',
        'on-hold': '#ff9800',
        'cancelled': '#f44336'
      };
      const displayStatus = statusMap[statusText] || statusText;
      statusEl.textContent = displayStatus;
      statusEl.style.color = statusColors[statusText] || '#2196F3';
    }
    
    // Dates
    const startDateEl = document.getElementById('overviewStartDate');
    if (startDateEl) {
      const startDate = currentProject.startDate?.toDate ? currentProject.startDate.toDate().toLocaleDateString('tr-TR') : '-';
      startDateEl.textContent = startDate;
    }
    
    const endDateEl = document.getElementById('overviewEndDate');
    if (endDateEl) {
      const endDate = currentProject.endDate?.toDate ? currentProject.endDate.toDate().toLocaleDateString('tr-TR') : '-';
      endDateEl.textContent = endDate;
    }
    
    // Location and description
    const overviewLocation = document.getElementById('overviewLocation');
    if (overviewLocation) {
      overviewLocation.textContent = currentProject.location || '-';
    }
    
    // Render based on user role
    if (isClient) {
      await renderClientView();
    } else {
      await renderAdminView();
    }
    
    const overviewDescription = document.getElementById('overviewDescription');
    if (overviewDescription) {
      overviewDescription.textContent = currentProject.description || 'Açıklama eklenmemiş';
    }

    // Load counts
    const logsRef = collection(db, 'projects', currentProjectId, 'logs');
    const logsSnap = await getDocs(logsRef);
    const logsCountEl = document.getElementById('overviewLogsCount');
    if (logsCountEl) {
      logsCountEl.textContent = logsSnap.size;
    }

    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    const stocksSnap = await getDocs(stocksRef);
    const stocksCountEl = document.getElementById('overviewStocksCount');
    if (stocksCountEl) {
      stocksCountEl.textContent = stocksSnap.size;
    }

    // Progress payments (new collection)
    const progressPaymentsRef = collection(db, 'progress_payments');
    const progressPaymentsQuery = await getDocs(progressPaymentsRef);
    let projectPaymentsCount = 0;
    progressPaymentsQuery.forEach(doc => {
      if (doc.data().projectId === currentProjectId) {
        projectPaymentsCount++;
      }
    });
    const paymentsCountEl = document.getElementById('overviewPaymentsCount');
    if (paymentsCountEl) {
      paymentsCountEl.textContent = projectPaymentsCount;
    }

    // Budget usage
    const budget = parseFloat(currentProject.budget || 0);
    let totalSpent = 0;

    // Calculate from budget expenses
    const expensesRef = collection(db, 'projects', currentProjectId, 'budget_expenses');
    const expensesSnap = await getDocs(expensesRef);
    expensesSnap.forEach(doc => {
      totalSpent += doc.data().amount || 0;
    });

    // Add stocks total
    stocksSnap.forEach(doc => {
      const stock = doc.data();
      totalSpent += (stock.quantity || 0) * (stock.unitPrice || 0);
    });

    // Add progress payments total (netAmount)
    progressPaymentsQuery.forEach(doc => {
      if (doc.data().projectId === currentProjectId) {
        totalSpent += doc.data().netAmount || 0;
      }
    });

    const budgetUsage = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;
    const budgetUsageEl = document.getElementById('overviewBudgetUsage');
    if (budgetUsageEl) {
      budgetUsageEl.textContent = budgetUsage + '%';
    }

    console.log('✅ Proje özeti verileri yüklendi');

  } catch (error) {
    console.error('❌ Proje özeti yüklenemedi:', error);
    showAlert('Proje özeti yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Render Client View - Müşteri için özelleştirilmiş görünüm
 */
async function renderClientView() {
  console.log('👁️ Müşteri görünümü render ediliyor...');
  
  try {
    // Hide edit button for clients
    const editBtn = document.getElementById('editProjectBtn');
    if (editBtn) editBtn.style.display = 'none';
    
    // Update description
    const overviewDescription = document.getElementById('overviewDescription');
    if (overviewDescription) {
      overviewDescription.textContent = currentProject.description || 'Açıklama eklenmemiş';
    }
    
    // Try to load client-specific data (with permission handling)
    let logsCount = 0;
    try {
      const logsRef = collection(db, 'projects', currentProjectId, 'logs');
      const logsSnap = await getDocs(logsRef);
      logsCount = logsSnap.size;
    } catch (err) {
      console.warn('⚠️ Logs erişim izni yok:', err.message);
      logsCount = 0;
    }
    
    const logsCountEl = document.getElementById('overviewLogsCount');
    if (logsCountEl) {
      logsCountEl.textContent = logsCount;
      logsCountEl.parentElement.querySelector('div').textContent = 'Günlük Rapor';
    }
    
    // Load payment info (this should be accessible)
    let projectPaymentsCount = 0;
    let totalPaidByClient = 0;
    
    try {
      const progressPaymentsRef = collection(db, 'progress_payments');
      const progressPaymentsQuery = await getDocs(progressPaymentsRef);
      
      progressPaymentsQuery.forEach(doc => {
        if (doc.data().projectId === currentProjectId) {
          projectPaymentsCount++;
          totalPaidByClient += doc.data().netAmount || 0;
        }
      });
    } catch (err) {
      console.warn('⚠️ Payments erişim izni yok:', err.message);
    }
    
    const paymentsCountEl = document.getElementById('overviewPaymentsCount');
    if (paymentsCountEl) paymentsCountEl.textContent = projectPaymentsCount;
    
    // Calculate progress percentage
    const budget = parseFloat(currentProject.budget || 0);
    const progressPercentage = budget > 0 ? ((totalPaidByClient / budget) * 100).toFixed(1) : 
                                (currentProject.progress || 0);
    
    const budgetUsageEl = document.getElementById('overviewBudgetUsage');
    if (budgetUsageEl) {
      budgetUsageEl.textContent = progressPercentage + '%';
      const labelEl = budgetUsageEl.parentElement.querySelector('div');
      if (labelEl) labelEl.textContent = 'Proje İlerlemesi';
    }
    
    // Hide stock count for clients (private info)
    const stocksCard = document.getElementById('overviewStocksCount')?.parentElement;
    if (stocksCard) stocksCard.style.display = 'none';
    
    // Update quick actions for clients (hide admin actions)
    const quickActionsCard = document.querySelector('.card h3')?.parentElement;
    if (quickActionsCard && quickActionsCard.querySelector('h3')?.textContent.includes('Hızlı İşlemler')) {
      quickActionsCard.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: var(--brand-red);">📊 Proje Görüntüleme</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <button class="btn btn-primary" onclick="window.location.href='santiye-gunlugu.html' + window.location.search" style="padding: 1rem;">
            📔 Şantiye Günlüğü
          </button>
          <button class="btn btn-primary" onclick="window.location.href='hakedis-takibi.html' + window.location.search" style="padding: 1rem;">
            💰 Hakediş Takibi
          </button>
        </div>
      `;
    }
    
    // Add client message if exists
    const clientMessage = currentProject.clientMessage || currentProject.clientNote;
    if (clientMessage) {
      const projectInfoCard = document.querySelector('.card');
      if (projectInfoCard) {
        const messageHTML = `
          <div style="margin-top: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); border-radius: 8px; border-left: 4px solid #2196F3;">
            <h4 style="margin: 0 0 0.75rem 0; color: #1976D2; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.5rem;">💬</span>
              Sizin İçin Özel Bilgilendirme
            </h4>
            <p style="margin: 0; line-height: 1.6; color: #1565C0; white-space: pre-wrap;">${clientMessage}</p>
          </div>
        `;
        projectInfoCard.insertAdjacentHTML('beforeend', messageHTML);
      }
    }
    
    // Add project timeline/milestones
    await renderProjectTimeline();
    
    console.log('✅ Müşteri görünümü hazır');
    
  } catch (error) {
    console.error('❌ Müşteri görünümü render hatası:', error);
    showAlert('Görünüm yüklenirken hata: ' + error.message, 'warning');
  }
}

/**
 * Render Admin View - Yönetici için tam görünüm
 */
async function renderAdminView() {
  console.log('🔧 Yönetici görünümü render ediliyor...');
  
  const overviewDescription = document.getElementById('overviewDescription');
  if (overviewDescription) {
    overviewDescription.textContent = currentProject.description || 'Açıklama eklenmemiş';
  }

  // Load counts
  const logsRef = collection(db, 'projects', currentProjectId, 'logs');
  const logsSnap = await getDocs(logsRef);
  const logsCountEl = document.getElementById('overviewLogsCount');
  if (logsCountEl) {
    logsCountEl.textContent = logsSnap.size;
  }

  const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
  const stocksSnap = await getDocs(stocksRef);
  const stocksCountEl = document.getElementById('overviewStocksCount');
  if (stocksCountEl) {
    stocksCountEl.textContent = stocksSnap.size;
  }

  // Progress payments (new collection)
  const progressPaymentsRef = collection(db, 'progress_payments');
  const progressPaymentsQuery = await getDocs(progressPaymentsRef);
  let projectPaymentsCount = 0;
  progressPaymentsQuery.forEach(doc => {
    if (doc.data().projectId === currentProjectId) {
      projectPaymentsCount++;
    }
  });
  const paymentsCountEl = document.getElementById('overviewPaymentsCount');
  if (paymentsCountEl) {
    paymentsCountEl.textContent = projectPaymentsCount;
  }

  // Budget usage
  const budget = parseFloat(currentProject.budget || 0);
  let totalSpent = 0;

  // Calculate from budget expenses
  const expensesRef = collection(db, 'projects', currentProjectId, 'budget_expenses');
  const expensesSnap = await getDocs(expensesRef);
  expensesSnap.forEach(doc => {
    totalSpent += doc.data().amount || 0;
  });

  // Add stocks total
  stocksSnap.forEach(doc => {
    const stock = doc.data();
    totalSpent += (stock.quantity || 0) * (stock.unitPrice || 0);
  });

  // Add progress payments total (netAmount)
  progressPaymentsQuery.forEach(doc => {
    if (doc.data().projectId === currentProjectId) {
      totalSpent += doc.data().netAmount || 0;
    }
  });

  const budgetUsage = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;
  const budgetUsageEl = document.getElementById('overviewBudgetUsage');
  if (budgetUsageEl) {
    budgetUsageEl.textContent = budgetUsage + '%';
  }
  
  console.log('✅ Yönetici görünümü hazır');
}

/**
 * Render Project Timeline for Clients
 */
async function renderProjectTimeline() {
  try {
    // Try to get project logs (may fail due to permissions)
    let logs = [];
    
    try {
      const logsRef = collection(db, 'projects', currentProjectId, 'logs');
      const logsSnap = await getDocs(logsRef);
      
      logsSnap.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by date descending
      logs.sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(0);
        const dateB = b.date?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } catch (err) {
      console.warn('⚠️ Timeline logs erişim izni yok:', err.message);
      // Continue with empty logs
    }
    
    // Create timeline HTML
    const timelineHTML = `
      <div class="card" style="margin-top: 1.5rem;">
        <h3 style="margin-bottom: 1rem; color: var(--brand-red); display: flex; align-items: center; gap: 0.5rem;">
          <span>📅</span> Proje Güncellemeleri
        </h3>
        ${logs.length > 0 ? `
          <div style="max-height: 400px; overflow-y: auto;">
            ${logs.slice(0, 10).map(log => `
              <div style="padding: 1rem; margin-bottom: 0.75rem; background: var(--hover-bg); border-radius: 8px; border-left: 3px solid #2196F3;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                  <span style="font-weight: 600; color: var(--text-primary);">
                    ${log.title || 'Günlük Rapor'}
                  </span>
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    ${log.date?.toDate?.() ? log.date.toDate().toLocaleDateString('tr-TR') : 'Tarih yok'}
                  </span>
                </div>
                ${log.description ? `
                  <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                    ${log.description}
                  </p>
                ` : ''}
                ${log.weather ? `
                  <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                    🌤️ Hava: ${log.weather}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : `
          <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            ${window.userRole === 'client' ? 
              'Proje güncellemeleri için firma yetkiliniz ile iletişime geçin.' : 
              'Henüz günlük rapor eklenmemiş'
            }
          </p>
        `}
      </div>
    `;
    
    // Insert after quick actions
    const quickActionsCard = document.querySelector('.card:last-of-type');
    if (quickActionsCard) {
      quickActionsCard.insertAdjacentHTML('afterend', timelineHTML);
    }
    
  } catch (error) {
    console.error('❌ Timeline render hatası:', error);
    // Don't throw, just log
  }
}

/**
 * Open edit project modal
 */
function openEditProjectModal() {
  if (!currentProject) {
    showAlert('Proje verisi bulunamadı', 'danger');
    return;
  }

  // Populate form with current project data
  const editProjectName = document.getElementById('editProjectName');
  const editProjectDesc = document.getElementById('editProjectDesc');
  const editProjectLocation = document.getElementById('editProjectLocation');
  const editProjectStatus = document.getElementById('editProjectStatus');
  
  if (editProjectName) editProjectName.value = currentProject.name || '';
  if (editProjectDesc) editProjectDesc.value = currentProject.description || '';
  if (editProjectLocation) editProjectLocation.value = currentProject.location || '';
  if (editProjectStatus) editProjectStatus.value = currentProject.status || 'active';

  // Show modal
  const modal = document.getElementById('editProjectModal');
  if (modal) {
    modal.classList.add('show');
  }
}

/**
 * Close edit project modal
 */
function closeEditProjectModal() {
  const modal = document.getElementById('editProjectModal');
  if (modal) {
    modal.classList.remove('show');
  }
  
  const form = document.getElementById('editProjectForm');
  if (form) {
    form.reset();
  }
}

/**
 * Handle project update
 */
async function handleUpdateProject(event) {
  event.preventDefault();

  if (!currentProjectId) {
    showAlert('Proje ID bulunamadı', 'danger');
    return;
  }

  try {
    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();
    const location = document.getElementById('editProjectLocation').value.trim();
    const status = document.getElementById('editProjectStatus').value;

    if (!name || !location) {
      showAlert('Proje adı ve konum gereklidir', 'danger');
      return;
    }

    // Update project in Firestore
    const projectRef = doc(db, 'projects', currentProjectId);
    await updateDoc(projectRef, {
      name,
      description,
      location,
      status,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    });

    showAlert('Proje güncellendi', 'success');
    closeEditProjectModal();

    // Reload project data
    await loadProjectData();
    await loadProjectOverview();

  } catch (error) {
    console.error('❌ Proje güncellenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    console.warn('Alert container not found');
    alert(message);
    return;
  }

  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.style.cssText = `
    padding: 1rem 1.5rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    background-color: ${type === 'success' ? '#d4edda' : type === 'danger' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'danger' ? '#721c24' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'danger' ? '#f5c6cb' : '#bee5eb'};
  `;
  alertEl.textContent = message;

  alertContainer.appendChild(alertEl);

  setTimeout(() => {
    alertEl.remove();
  }, 5000);
}

// Export to window for global access
window.initProjeOzeti = initProjeOzeti;
window.loadProjectOverview = loadProjectOverview;
window.openEditProjectModal = openEditProjectModal;
window.closeEditProjectModal = closeEditProjectModal;
window.handleUpdateProject = handleUpdateProject;

// Auto-initialize when auth state changes
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Auth state changed - user logged in');
    // Wait a bit for auth.js to load user data
    setTimeout(() => {
      if (window.initProjeOzeti) {
        initProjeOzeti();
      }
    }, 500);
  } else {
    console.log('❌ No user logged in, redirecting...');
    window.location.href = '../login.html';
  }
});
