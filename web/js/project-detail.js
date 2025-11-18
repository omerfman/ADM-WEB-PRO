// Project Detail Page - Main Logic

import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, orderBy, getDocs, deleteDoc, addDoc, serverTimestamp
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
    
    // Load all tab data
    await loadProjectOverview();
    await loadProjectLogs();
    await loadProjectStocks();
    await loadProjectPayments();
    await loadBudgetTabSummary();

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
  const projectNameEl = document.getElementById('projectName');
  if (projectNameEl) {
    projectNameEl.textContent = currentProject.name;
  }

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
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
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
        <div style="color: var(--text-primary); line-height: 1.6; margin-bottom: ${log.photoUrl ? '1rem' : '0'};">
          ${log.description || 'Açıklama yok'}
        </div>
        ${log.photoUrl ? `
          <div style="margin-top: 1rem; position: relative;">
            <img src="${log.photoUrl}" alt="Şantiye Fotoğrafı" 
                 style="width: 100%; max-width: 600px; height: 300px; object-fit: cover; border-radius: 8px; cursor: pointer; display: block;" 
                 onclick="window.open('${log.photoUrl}', '_blank')">
            <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="window.open('${log.photoUrl}', '_blank')">
                🔍 Büyüt
              </button>
              <a href="${log.photoUrl}" download="santiye-fotograf-${log.id}.jpg" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; text-decoration: none;">
                📥 İndir
              </a>
            </div>
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
 * Load Project Stocks
 */
async function loadProjectStocks() {
  try {
    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    const stocksQuery = query(stocksRef, orderBy('createdAt', 'desc'));
    const stocksSnap = await getDocs(stocksQuery);

    const stocksList = document.getElementById('stocksList');
    
    if (stocksSnap.empty) {
      stocksList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Henüz stok kaydı yok</p>';
      return;
    }

    const stocks = [];
    stocksSnap.forEach(doc => {
      stocks.push({ id: doc.id, ...doc.data() });
    });

    let totalStockValue = 0;

    stocksList.innerHTML = stocks.map(stock => {
      const totalPrice = (stock.quantity || 0) * (stock.unitPrice || 0);
      totalStockValue += totalPrice;

      return `
        <div class="card" style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--brand-red); font-size: 1.1rem; margin-bottom: 0.5rem;">
                ${stock.name || 'Ürün'}
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                <div>📦 Miktar: <strong>${stock.quantity || 0} ${stock.unit || ''}</strong></div>
                <div>💰 Birim: <strong>${formatCurrency(stock.unitPrice || 0)}</strong></div>
                <div>📊 Toplam: <strong style="color: var(--brand-red);">${formatCurrency(totalPrice)}</strong></div>
              </div>
            </div>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="deleteStock('${stock.id}')">
              🗑️ Sil
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Stoklar yüklenemedi:', error);
    showAlert('Stoklar yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Project Payments
 */
async function loadProjectPayments() {
  try {
    const paymentsRef = collection(db, 'projects', currentProjectId, 'payments');
    const paymentsQuery = query(paymentsRef, orderBy('createdAt', 'desc'));
    const paymentsSnap = await getDocs(paymentsQuery);

    const paymentsList = document.getElementById('paymentsList');
    
    if (paymentsSnap.empty) {
      paymentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Henüz hakediş kaydı yok</p>';
      return;
    }

    const payments = [];
    paymentsSnap.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    let totalPayments = 0;

    paymentsList.innerHTML = payments.map(payment => {
      const totalPrice = (payment.quantity || 0) * (payment.unitPrice || 0);
      totalPayments += totalPrice;

      return `
        <div class="card" style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--brand-red); font-size: 1.1rem; margin-bottom: 0.5rem;">
                ${payment.description || 'Yapılan İş'}
              </div>
              <div style="margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                👤 ${payment.performedBy || 'Bilinmeyen'}
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                <div>⚙️ Birim: <strong>${payment.unit || ''}</strong></div>
                <div>📦 Miktar: <strong>${payment.quantity || 0}</strong></div>
                <div>💰 Birim Fiyat: <strong>${formatCurrency(payment.unitPrice || 0)}</strong></div>
                <div>📊 Toplam: <strong style="color: var(--brand-red);">${formatCurrency(totalPrice)}</strong></div>
              </div>
            </div>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="deletePayment('${payment.id}')">
              🗑️ Sil
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Hakediş yüklenemedi:', error);
    showAlert('Hakediş yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Project Overview
 */
async function loadProjectOverview() {
  try {
    // Update project info
    document.getElementById('overviewProjectName').textContent = currentProject.name || '-';
    document.getElementById('overviewCompany').textContent = currentProject.company || '-';
    
    // Status with color
    const statusEl = document.getElementById('overviewStatus');
    const statusText = currentProject.status || 'Devam Ediyor';
    const statusColors = {
      'Devam Ediyor': '#2196F3',
      'Tamamlandı': '#4caf50',
      'Beklemede': '#ff9800',
      'İptal': '#f44336'
    };
    statusEl.textContent = statusText;
    statusEl.style.color = statusColors[statusText] || '#2196F3';
    
    // Dates
    const startDate = currentProject.startDate?.toDate ? currentProject.startDate.toDate().toLocaleDateString('tr-TR') : '-';
    const endDate = currentProject.endDate?.toDate ? currentProject.endDate.toDate().toLocaleDateString('tr-TR') : '-';
    document.getElementById('overviewStartDate').textContent = startDate;
    document.getElementById('overviewEndDate').textContent = endDate;
    
    // Location and description
    document.getElementById('overviewLocation').textContent = currentProject.location || '-';
    document.getElementById('overviewDescription').textContent = currentProject.description || 'Açıklama eklenmemiş';

    // Load counts
    const logsRef = collection(db, 'projects', currentProjectId, 'logs');
    const logsSnap = await getDocs(logsRef);
    document.getElementById('overviewLogsCount').textContent = logsSnap.size;

    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    const stocksSnap = await getDocs(stocksRef);
    document.getElementById('overviewStocksCount').textContent = stocksSnap.size;

    const paymentsRef = collection(db, 'projects', currentProjectId, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    document.getElementById('overviewPaymentsCount').textContent = paymentsSnap.size;

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

    // Add payments total
    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      totalSpent += payment.amount || (payment.unitPrice || 0) * (payment.quantity || 1);
    });

    const budgetUsage = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;
    document.getElementById('overviewBudgetUsage').textContent = budgetUsage + '%';

  } catch (error) {
    console.error('❌ Proje özeti yüklenemedi:', error);
  }
}

/**
 * Load Budget Tab Summary
 */
async function loadBudgetTabSummary() {
  try {
    const budget = parseFloat(currentProject.budget || 0);
    
    // Calculate from budget expenses
    const expensesRef = collection(db, 'projects', currentProjectId, 'budget_expenses');
    const expensesSnap = await getDocs(expensesRef);
    let budgetExpenses = 0;
    expensesSnap.forEach(doc => {
      budgetExpenses += doc.data().amount || 0;
    });

    // Calculate from stocks
    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    const stocksSnap = await getDocs(stocksRef);
    let stocksTotal = 0;
    stocksSnap.forEach(doc => {
      const stock = doc.data();
      stocksTotal += (stock.quantity || 0) * (stock.unitPrice || 0);
    });

    // Calculate from payments
    const paymentsRef = collection(db, 'projects', currentProjectId, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    let paymentsTotal = 0;
    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      paymentsTotal += payment.amount || (payment.unitPrice || 0) * (payment.quantity || 1);
    });

    const totalSpent = budgetExpenses + stocksTotal + paymentsTotal;
    const remaining = budget - totalSpent;
    const percentage = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;

    // Update budget tab summary
    const totalEl = document.getElementById('budgetTabTotal');
    const spentEl = document.getElementById('budgetTabSpent');
    const remainingEl = document.getElementById('budgetTabRemaining');
    const percentageEl = document.getElementById('budgetTabPercentage');
    const progressBarEl = document.getElementById('budgetTabProgressBar');
    const progressLabelEl = document.getElementById('budgetTabProgressLabel');

    if (totalEl) totalEl.textContent = formatCurrency(budget);
    if (spentEl) spentEl.textContent = formatCurrency(totalSpent);
    if (remainingEl) {
      remainingEl.textContent = formatCurrency(remaining);
      remainingEl.style.color = remaining >= 0 ? 'white' : '#ff6b6b';
    }
    if (percentageEl) {
      percentageEl.textContent = percentage + '%';
      percentageEl.style.color = percentage > 100 ? '#ff6b6b' : percentage > 80 ? '#ffd93d' : 'white';
    }
    
    // Update progress bar
    if (progressBarEl) {
      const barColor = percentage > 100 ? '#f44336' : percentage > 80 ? '#ff9800' : '#4caf50';
      progressBarEl.style.background = barColor;
      progressBarEl.style.width = Math.min(percentage, 100) + '%';
    }
    if (progressLabelEl) {
      progressLabelEl.textContent = percentage + '%';
    }

  } catch (error) {
    console.error('❌ Bütçe özeti yüklenemedi:', error);
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

/**
 * Budget Modal Functions - Separate modals for better UX
 */
async function openBudgetCategoriesModal() {
  try {
    const modal = document.getElementById('budgetCategoriesModal');
    if (!modal) {
      showAlert('Kategori modalı bulunamadı', 'danger');
      return;
    }

    // Set currentProjectBudget for budget.js functions
    if (typeof window.setBudgetProject === 'function') {
      window.setBudgetProject(currentProjectId);
    }

    // Load categories using budget.js function
    if (typeof loadBudgetCategories === 'function') {
      await loadBudgetCategories(currentProjectId);
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('❌ Kategori modalı açılırken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

function closeBudgetCategoriesModal() {
  document.getElementById('budgetCategoriesModal').classList.remove('show');
}

async function openBudgetExpensesModal() {
  try {
    const modal = document.getElementById('budgetExpensesModal');
    if (!modal) {
      showAlert('Harcama modalı bulunamadı', 'danger');
      return;
    }

    // Set currentProjectBudget for budget.js functions
    if (typeof window.setBudgetProject === 'function') {
      window.setBudgetProject(currentProjectId);
    }

    // Load expenses using budget.js function
    if (typeof loadBudgetExpenses === 'function') {
      await loadBudgetExpenses(currentProjectId);
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('❌ Harcama modalı açılırken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

function closeBudgetExpensesModal() {
  document.getElementById('budgetExpensesModal').classList.remove('show');
}

async function openBudgetReportsModal() {
  try {
    const modal = document.getElementById('budgetReportsModal');
    if (!modal) {
      showAlert('Rapor modalı bulunamadı', 'danger');
      return;
    }

    // Set currentProjectBudget for budget.js functions
    if (typeof window.setBudgetProject === 'function') {
      window.setBudgetProject(currentProjectId);
    }

    // Load summary using budget.js function
    if (typeof calculateBudgetSummary === 'function') {
      await calculateBudgetSummary(currentProjectId);
    }

    // Load category breakdown
    if (typeof loadCategoryBreakdown === 'function') {
      await loadCategoryBreakdown(currentProjectId);
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('❌ Rapor modalı açılırken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

function closeBudgetReportsModal() {
  document.getElementById('budgetReportsModal').classList.remove('show');
}

/**
 * Open unified budget modal - All sections in one view
 */
async function openUnifiedBudgetModal() {
  try {
    const modal = document.getElementById('unifiedBudgetModal');
    if (!modal) {
      showAlert('Unified budget modal bulunamadı', 'danger');
      return;
    }

    // Set currentProjectBudget
    if (typeof window.setBudgetProject === 'function') {
      await window.setBudgetProject(currentProjectId);
    }

    // Load all data with unified element IDs
    if (typeof loadBudgetCategories === 'function') {
      // Temporarily replace the container ID
      const originalContainer = document.getElementById('budgetCategoriesList');
      const unifiedContainer = document.getElementById('unifiedBudgetCategoriesList');
      if (originalContainer && unifiedContainer) {
        originalContainer.id = 'tempCategoriesList';
        unifiedContainer.id = 'budgetCategoriesList';
        
        await loadBudgetCategories(currentProjectId);
        
        // Restore IDs
        unifiedContainer.id = 'unifiedBudgetCategoriesList';
        originalContainer.id = 'budgetCategoriesList';
      }
    }

    if (typeof loadBudgetExpenses === 'function') {
      const originalContainer = document.getElementById('budgetExpensesList');
      const unifiedContainer = document.getElementById('unifiedBudgetExpensesList');
      if (originalContainer && unifiedContainer) {
        originalContainer.id = 'tempExpensesList';
        unifiedContainer.id = 'budgetExpensesList';
        
        await loadBudgetExpenses(currentProjectId);
        
        unifiedContainer.id = 'unifiedBudgetExpensesList';
        originalContainer.id = 'budgetExpensesList';
      }
    }

    if (typeof calculateBudgetSummary === 'function') {
      // Temporarily swap summary element IDs
      const summaryElements = [
        'budgetSummaryTotal', 'budgetSummaryExpenses', 'budgetSummaryStocks',
        'budgetSummaryPayments', 'budgetSummaryGrandTotal', 'budgetSummaryRemaining',
        'budgetSummaryPercentage', 'budgetProgressBar'
      ];
      
      summaryElements.forEach(id => {
        const original = document.getElementById(id);
        const unified = document.getElementById('unified' + id.charAt(0).toUpperCase() + id.slice(1));
        if (original && unified) {
          original.id = 'temp' + id;
          unified.id = id;
        }
      });

      await calculateBudgetSummary(currentProjectId);

      // Restore IDs
      summaryElements.forEach(id => {
        const temp = document.getElementById('temp' + id);
        const unified = document.getElementById(id);
        if (temp && unified) {
          unified.id = 'unified' + id.charAt(0).toUpperCase() + id.slice(1);
          temp.id = id;
        }
      });
    }

    if (typeof loadCategoryBreakdown === 'function') {
      const originalContainer = document.getElementById('categoryBreakdown');
      const unifiedContainer = document.getElementById('unifiedCategoryBreakdown');
      if (originalContainer && unifiedContainer) {
        originalContainer.id = 'tempCategoryBreakdown';
        unifiedContainer.id = 'categoryBreakdown';
        
        await loadCategoryBreakdown(currentProjectId);
        
        unifiedContainer.id = 'unifiedCategoryBreakdown';
        originalContainer.id = 'categoryBreakdown';
      }
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('❌ Unified budget modal açılırken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

function closeUnifiedBudgetModal() {
  document.getElementById('unifiedBudgetModal').classList.remove('show');
}

function openBudgetModalFromProject() {
  // Legacy function - redirect to categories modal
  openBudgetCategoriesModal();
}

function closeBudgetModal() {
  // Legacy function - close all budget modals
  closeBudgetCategoriesModal();
  closeBudgetExpensesModal();
  closeBudgetReportsModal();
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
  document.getElementById('editProjectName').value = currentProject.name || '';
  document.getElementById('editProjectDesc').value = currentProject.description || '';
  document.getElementById('editProjectLocation').value = currentProject.location || '';
  document.getElementById('editProjectStatus').value = currentProject.status || 'active';

  // Show modal
  document.getElementById('editProjectModal').classList.add('show');
}

/**
 * Close edit project modal
 */
function closeEditProjectModal() {
  document.getElementById('editProjectModal').classList.remove('show');
  document.getElementById('editProjectForm').reset();
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

    // Import updateDoc
    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Update project in Firestore
    const projectRef = doc(db, 'projects', currentProjectId);
    await updateDoc(projectRef, {
      name,
      description,
      location,
      status,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email
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
 * Delete Functions
 */
async function deleteLog(logId) {
  if (!confirm('Bu günlük kaydını silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', currentProjectId, 'logs', logId));
    showAlert('Günlük kaydı silindi', 'success');
    loadProjectLogs();
    loadProjectStats();
  } catch (error) {
    console.error('❌ Günlük silinirken hata:', error);
    showAlert('Günlük silinirken hata: ' + error.message, 'danger');
  }
}

async function deleteStock(stockId) {
  if (!confirm('Bu stok kaydını silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', currentProjectId, 'stocks', stockId));
    showAlert('Stok kaydı silindi', 'success');
    loadProjectStocks();
    loadProjectStats();
  } catch (error) {
    console.error('❌ Stok silinirken hata:', error);
    showAlert('Stok silinirken hata: ' + error.message, 'danger');
  }
}

async function deletePayment(paymentId) {
  if (!confirm('Bu hakediş kaydını silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', currentProjectId, 'payments', paymentId));
    showAlert('Hakediş kaydı silindi', 'success');
    loadProjectPayments();
    loadProjectStats();
  } catch (error) {
    console.error('❌ Hakediş silinirken hata:', error);
    showAlert('Hakediş silinirken hata: ' + error.message, 'danger');
  }
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
        photoUrl = await window.uploadPhotoToImgBB(photoFile, currentProjectId);
      } else {
        throw new Error('Fotoğraf yükleme modülü yüklenmedi');
      }
    }
    
    // Add log to Firestore - use direct imports
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
    await loadProjectStocks();
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
    await loadProjectPayments();
    await loadProjectStats();
    
  } catch (error) {
    console.error('❌ Hakediş eklenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

// Export functions globally
window.getCurrentProjectId = () => currentProjectId;
window.loadProjectOverview = loadProjectOverview;
window.loadProjectLogs = loadProjectLogs;
window.loadProjectStocks = loadProjectStocks;
window.loadProjectPayments = loadProjectPayments;
window.deleteLog = deleteLog;
window.deleteStock = deleteStock;
window.deletePayment = deletePayment;
window.openAddLogModal = openAddLogModal;
window.closeAddLogModal = closeAddLogModal;
window.openAddStockModal = openAddStockModal;
window.closeAddStockModal = closeAddStockModal;
window.openAddPaymentModal = openAddPaymentModal;
window.closeAddPaymentModal = closeAddPaymentModal;
window.openBudgetCategoriesModal = openBudgetCategoriesModal;
window.closeBudgetCategoriesModal = closeBudgetCategoriesModal;
window.openBudgetExpensesModal = openBudgetExpensesModal;
window.closeBudgetExpensesModal = closeBudgetExpensesModal;
window.openBudgetReportsModal = openBudgetReportsModal;
window.closeBudgetReportsModal = closeBudgetReportsModal;
window.openUnifiedBudgetModal = openUnifiedBudgetModal;
window.closeUnifiedBudgetModal = closeUnifiedBudgetModal;
window.openBudgetModalFromProject = openBudgetModalFromProject;
window.closeBudgetModal = closeBudgetModal;
window.loadBudgetTabSummary = loadBudgetTabSummary;
window.openEditProjectModal = openEditProjectModal;
window.closeEditProjectModal = closeEditProjectModal;
window.handleUpdateProject = handleUpdateProject;
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

