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
