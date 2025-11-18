// Project Detail Page - Main Logic

import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentProjectId = null;
let currentProject = null;

/**
 * Initialize Project Detail Page
 */
async function initProjectDetail() {
  try {
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');

    if (!currentProjectId) {
      showAlert('Proje ID bulunamadı', 'danger');
      setTimeout(() => {
        window.location.href = 'dashboard.html#projects';
      }, 2000);
      return;
    }

    console.log('📋 Proje detayı yükleniyor:', currentProjectId);

    // Load project data
    await loadProjectData();
    
    // Load project stats
    await loadProjectStats();
    
    // Load logs (default tab)
    await loadProjectLogs();

  } catch (error) {
    console.error('❌ Proje detayı yüklenirken hata:', error);
    showAlert('Proje yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Project Data
 */
async function loadProjectData() {
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
  document.title = `${currentProject.name} - ADM İnşaat`;
  document.getElementById('projectName').textContent = currentProject.name;
  document.getElementById('projectNameBreadcrumb').textContent = currentProject.name;
  document.getElementById('projectLocation').textContent = `📍 ${currentProject.location || 'Konum belirtilmemiş'}`;
  document.getElementById('projectDescription').textContent = currentProject.description || 'Açıklama yok';

  console.log('✅ Proje bilgileri yüklendi:', currentProject);
}

/**
 * Load Project Statistics
 */
async function loadProjectStats() {
  try {
    // Get logs count
    const logsSnap = await getDocs(collection(db, 'projects', currentProjectId, 'logs'));
    const logsCount = logsSnap.size;

    // Get stocks count
    const stocksSnap = await getDocs(collection(db, 'projects', currentProjectId, 'stocks'));
    const stocksCount = stocksSnap.size;

    // Get payments and calculate total
    const paymentsSnap = await getDocs(collection(db, 'projects', currentProjectId, 'payments'));
    const paymentsCount = paymentsSnap.size;
    let totalPayments = 0;
    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      totalPayments += parseFloat(payment.totalPrice || 0);
    });

    // Get budget usage
    const budget = parseFloat(currentProject.budget || 0);
    const budgetUsage = budget > 0 ? ((totalPayments / budget) * 100).toFixed(1) : 0;
    const budgetColor = budgetUsage < 70 ? '#10b981' : budgetUsage < 90 ? '#f59e0b' : '#ef4444';

    // Render stats cards
    const statsContainer = document.getElementById('projectStatsCards');
    statsContainer.innerHTML = `
      <div class="stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="stats-icon">📝</div>
        <div class="stats-content">
          <div class="stats-label">Günlük Kayıt</div>
          <div class="stats-value">${logsCount}</div>
        </div>
      </div>

      <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div class="stats-icon">📦</div>
        <div class="stats-content">
          <div class="stats-label">Stok Kalem</div>
          <div class="stats-value">${stocksCount}</div>
        </div>
      </div>

      <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
        <div class="stats-icon">💰</div>
        <div class="stats-content">
          <div class="stats-label">Hakediş</div>
          <div class="stats-value">${paymentsCount}</div>
          <div class="stats-detail">${formatCurrency(totalPayments)}</div>
        </div>
      </div>

      <div class="stats-card" style="background: linear-gradient(135deg, ${budgetColor} 0%, ${budgetColor}dd 100%); color: white;">
        <div class="stats-icon">💼</div>
        <div class="stats-content">
          <div class="stats-label">Bütçe Kullanımı</div>
          <div class="stats-value">${budgetUsage}%</div>
          <div class="stats-detail">${formatCurrency(totalPayments)} / ${formatCurrency(budget)}</div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('❌ İstatistikler yüklenemedi:', error);
  }
}

/**
 * Load Project Logs
 */
async function loadProjectLogs() {
  try {
    const logsRef = collection(db, 'projects', currentProjectId, 'logs');
    const logsQuery = query(logsRef, orderBy('date', 'desc'));
    const logsSnap = await getDocs(logsQuery);

    const logsList = document.getElementById('logsList');
    
    if (logsSnap.empty) {
      logsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Henüz günlük kaydı yok</p>';
      return;
    }

    const logs = [];
    logsSnap.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    logsList.innerHTML = logs.map(log => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.75rem;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--brand-red); margin-bottom: 0.25rem;">
              ${formatDate(log.date)}
            </div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">
              👤 ${log.performedBy || 'Bilinmeyen'}
            </div>
          </div>
          <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="deleteLog('${log.id}')">
            🗑️ Sil
          </button>
        </div>
        <div style="color: var(--text-primary); line-height: 1.6;">
          ${log.description || 'Açıklama yok'}
        </div>
        ${log.photoUrl ? `
          <div style="margin-top: 1rem;">
            <img src="${log.photoUrl}" alt="Şantiye Fotoğrafı" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" onclick="window.open('${log.photoUrl}', '_blank')">
          </div>
        ` : ''}
      </div>
    `).join('');

  } catch (error) {
    console.error('❌ Günlükler yüklenemedi:', error);
    showAlert('Günlükler yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Helper Functions
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDate(dateValue) {
  if (!dateValue) return 'Tarih yok';
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;
  alert.textContent = message;
  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 3000);
}

/**
 * Modal Functions
 */
function openAddLogModal() {
  document.getElementById('addLogModal').classList.add('show');
  // Set default date
  const logDate = document.getElementById('logDate');
  if (logDate && !logDate.value) {
    logDate.valueAsDate = new Date();
  }
}

function closeAddLogModal() {
  document.getElementById('addLogModal').classList.remove('show');
  document.getElementById('addLogForm').reset();
}

function openAddStockModal() {
  document.getElementById('addStockModal').classList.add('show');
}

function closeAddStockModal() {
  document.getElementById('addStockModal').classList.remove('show');
  document.getElementById('addStockForm').reset();
  document.getElementById('stockTotalPrice').textContent = '₺0.00';
}

function openAddPaymentModal() {
  document.getElementById('addPaymentModal').classList.add('show');
}

function closeAddPaymentModal() {
  document.getElementById('addPaymentModal').classList.remove('show');
  document.getElementById('addPaymentForm').reset();
  document.getElementById('paymentTotalPrice').textContent = '₺0.00';
}

function openBudgetModal() {
  if (window.openBudgetManagement) {
    window.openBudgetManagement(currentProjectId);
  } else {
    showAlert('Bütçe modülü yüklenmedi', 'danger');
  }
}

function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('show');
}

function openEditProjectModal() {
  if (window.openEditProjectModal) {
    window.openEditProjectModal(currentProjectId);
  } else {
    showAlert('Proje düzenleme modülü yüklenmedi', 'danger');
  }
}

function closeEditProjectModal() {
  document.getElementById('editProjectModal').classList.remove('show');
}

/**
 * Form Handlers
 */
async function handleAddLog(event) {
  event.preventDefault();
  
  try {
    const date = document.getElementById('logDate').value;
    const performedBy = document.getElementById('logPerformedBy').value;
    const description = document.getElementById('logDescription').value;
    const photoFile = document.getElementById('logPhoto').files[0];
    
    let photoUrl = null;
    
    // Upload photo if selected
    if (photoFile) {
      showAlert('Fotoğraf yükleniyor...', 'info');
      
      if (window.uploadPhotoToImgBB) {
        photoUrl = await window.uploadPhotoToImgBB(photoFile);
      } else {
        throw new Error('Fotoğraf yükleme modülü yüklenmedi');
      }
    }
    
    // Add log to Firestore
    const { addDoc, collection, serverTimestamp } = window.firestore;
    const logsRef = collection(db, 'projects', currentProjectId, 'logs');
    
    await addDoc(logsRef, {
      date: new Date(date),
      performedBy,
      description,
      photoUrl,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.email
    });
    
    showAlert('Günlük kaydı eklendi', 'success');
    closeAddLogModal();
    await loadProjectLogs();
    await loadProjectStats();
    
  } catch (error) {
    console.error('❌ Günlük eklenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

async function handleAddStock(event) {
  event.preventDefault();
  
  try {
    const name = document.getElementById('stockName').value;
    const unit = document.getElementById('stockUnit').value;
    const quantity = parseFloat(document.getElementById('stockQuantity').value);
    const unitPrice = parseFloat(document.getElementById('stockUnitPrice').value);
    
    const { addDoc, collection, serverTimestamp } = window.firestore;
    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    
    await addDoc(stocksRef, {
      name,
      unit,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.email
    });
    
    showAlert('Stok eklendi', 'success');
    closeAddStockModal();
    await loadProjectStats();
    
  } catch (error) {
    console.error('❌ Stok eklenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

async function handleAddPayment(event) {
  event.preventDefault();
  
  try {
    const description = document.getElementById('paymentDescription').value;
    const performedBy = document.getElementById('paymentPerformedBy').value;
    const unit = document.getElementById('paymentUnit').value;
    const quantity = parseFloat(document.getElementById('paymentQuantity').value);
    const unitPrice = parseFloat(document.getElementById('paymentUnitPrice').value);
    
    const { addDoc, collection, serverTimestamp } = window.firestore;
    const paymentsRef = collection(db, 'projects', currentProjectId, 'payments');
    
    await addDoc(paymentsRef, {
      description,
      performedBy,
      unit,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.email
    });
    
    showAlert('Hakediş eklendi', 'success');
    closeAddPaymentModal();
    await loadProjectStats();
    
  } catch (error) {
    console.error('❌ Hakediş eklenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

// Export functions globally
window.currentProjectId = currentProjectId;
window.loadProjectLogs = loadProjectLogs;
window.openAddLogModal = openAddLogModal;
window.closeAddLogModal = closeAddLogModal;
window.openAddStockModal = openAddStockModal;
window.closeAddStockModal = closeAddStockModal;
window.openAddPaymentModal = openAddPaymentModal;
window.closeAddPaymentModal = closeAddPaymentModal;
window.openBudgetModal = openBudgetModal;
window.closeBudgetModal = closeBudgetModal;
window.openEditProjectModal = openEditProjectModal;
window.closeEditProjectModal = closeEditProjectModal;
window.handleAddLog = handleAddLog;
window.handleAddStock = handleAddStock;
window.handleAddPayment = handleAddPayment;

// Initialize on page load
auth.onAuthStateChanged((user) => {
  if (user) {
    initProjectDetail();
  } else {
    window.location.href = 'login.html';
  }
});

console.log('✅ Project Detail module loaded');

