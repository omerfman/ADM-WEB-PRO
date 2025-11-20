// Progress Payments (Hakediş) Management Module
import { auth, db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global state
let currentProjectId = null;
let currentProject = null;
let currentPaymentConfig = null;
let progressPayments = [];
let boqItems = [];

/**
 * Load progress payments for a project
 */
async function loadProgressPayments(projectId) {
  console.log(`💰 Loading progress payments for project: ${projectId}`);
  currentProjectId = projectId;

  // Show list view, hide detail view
  const listContainer = document.getElementById('progressPaymentsContainer');
  const detailContainer = document.getElementById('paymentDetailContainer');
  if (listContainer) listContainer.style.display = 'block';
  if (detailContainer) detailContainer.style.display = 'none';

  try {
    // Get project details
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      alert('❌ Proje bulunamadı');
      return;
    }
    currentProject = { id: projectDoc.id, ...projectDoc.data() };

    // Get payment config
    const configQuery = query(
      collection(db, 'payment_config'),
      where('projectId', '==', projectId),
      limit(1)
    );
    const configSnap = await getDocs(configQuery);
    
    if (!configSnap.empty) {
      currentPaymentConfig = { id: configSnap.docs[0].id, ...configSnap.docs[0].data() };
    } else {
      // Create default config
      currentPaymentConfig = await createDefaultPaymentConfig(projectId);
    }

    // Get BOQ items
    const boqQuery = query(
      collection(db, 'boq_items'),
      where('projectId', '==', projectId),
      where('isDeleted', '==', false),
      orderBy('pozNo', 'asc')
    );
    const boqSnap = await getDocs(boqQuery);
    boqItems = [];
    boqSnap.forEach(doc => {
      boqItems.push({ id: doc.id, ...doc.data() });
    });

    // Get progress payments
    const paymentsQuery = query(
      collection(db, 'progress_payments'),
      where('projectId', '==', projectId),
      orderBy('paymentNo', 'desc')
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    progressPayments = [];
    paymentsSnap.forEach(doc => {
      progressPayments.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Loaded ${progressPayments.length} payments, ${boqItems.length} BOQ items`);
    renderProgressPaymentsList();

  } catch (error) {
    console.error('❌ Progress payments loading error:', error);
    alert('Hakediş yüklenirken hata oluştu: ' + error.message);
  }
}

/**
 * Create default payment config
 */
async function createDefaultPaymentConfig(projectId) {
  const user = auth.currentUser;
  const configData = {
    projectId: projectId,
    companyId: currentProject.companyId,
    vatRate: 20,
    withholdingRate: 3,
    stampTaxRate: 0.825,
    retentionRate: 0,
    advanceAmount: 0,
    advanceDeductionPercentage: 0,
    autoCalculate: true,
    allowManualAdjustment: false,
    createdAt: Timestamp.now(),
    createdBy: user.uid,
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, 'payment_config'), configData);
  console.log('✅ Default payment config created:', docRef.id);
  
  return { id: docRef.id, ...configData };
}

/**
 * Render progress payments list
 */
function renderProgressPaymentsList() {
  const container = document.getElementById('progressPaymentsContainer');
  if (!container) return;

  // Calculate totals
  const totalGross = progressPayments.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
  const totalNet = progressPayments.reduce((sum, p) => sum + (p.netAmount || 0), 0);

  container.innerHTML = `
    <div class="payment-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h3 style="margin: 0;">💰 Hakediş Dönemleri</h3>
        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">
          ${currentProject?.name || 'Proje'} - ${progressPayments.length} Hakediş
        </p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" onclick="openPaymentConfigModal()">
          ⚙️ Hakediş Ayarları
        </button>
        <button class="btn btn-primary" onclick="openCreatePaymentModal()">
          ➕ Yeni Hakediş Dönemi
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Toplam Brüt Hakediş</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(totalGross)}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Toplam Net Ödeme</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(totalNet)}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Sözleşme Bedeli</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatCurrency(currentProject?.budget || 0)}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Hakediş Oranı</div>
        <div style="font-size: 1.8rem; font-weight: bold;">
          ${currentProject?.budget > 0 ? ((totalGross / currentProject.budget) * 100).toFixed(1) : 0}%
        </div>
      </div>
    </div>

    <!-- Payments Table -->
    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 80px;">Hakediş No</th>
            <th style="width: 200px;">Dönem</th>
            <th style="width: 150px;">Durum</th>
            <th style="width: 150px; text-align: right;">Brüt Tutar</th>
            <th style="width: 150px; text-align: right;">KDV</th>
            <th style="width: 150px; text-align: right;">Kesintiler</th>
            <th style="width: 150px; text-align: right;">Net Tutar</th>
            <th style="width: 150px;">Onay Tarihi</th>
            <th style="width: 150px;">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${progressPayments.length > 0
            ? progressPayments.map(payment => `
              <tr>
                <td style="text-align: center;"><strong>${payment.paymentNo}</strong></td>
                <td>${payment.title || formatPeriod(payment.periodStart, payment.periodEnd)}</td>
                <td>${getStatusBadge(payment.status)}</td>
                <td style="text-align: right;">${formatCurrency(payment.grossAmount)}</td>
                <td style="text-align: right;">${formatCurrency(payment.vatAmount)}</td>
                <td style="text-align: right;">${formatCurrency(getTotalDeductions(payment))}</td>
                <td style="text-align: right;"><strong>${formatCurrency(payment.netAmount)}</strong></td>
                <td>${payment.approvedAt ? formatDate(payment.approvedAt) : '-'}</td>
                <td>
                  <div style="display: flex; gap: 0.25rem; justify-content: center;">
                    <button 
                      class="btn btn-icon" 
                      onclick="viewPaymentDetail('${payment.id}')"
                      title="Görüntüle"
                    >👁️</button>
                    ${payment.status === 'draft' ? `
                      <button 
                        class="btn btn-icon" 
                        onclick="editPayment('${payment.id}')"
                        title="Düzenle"
                      >✏️</button>
                    ` : ''}
                    <button 
                      class="btn btn-icon" 
                      onclick="exportPaymentToPDF('${payment.id}')"
                      title="PDF İndir"
                    >📄</button>
                  </div>
                </td>
              </tr>
            `).join('')
            : `
              <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">💰</div>
                  <p style="margin: 0; font-size: 1.1rem;">Henüz hakediş dönemi eklenmemiş</p>
                  <p style="margin: 0.5rem 0 0 0;">Yeni hakediş dönemi oluşturarak başlayın</p>
                </td>
              </tr>
            `
          }
        </tbody>
      </table>
    </div>

    <!-- Payment Config Modal -->
    <div id="paymentConfigModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 700px;">
        <h3>⚙️ Hakediş Hesaplama Ayarları</h3>
        <form id="paymentConfigForm" onsubmit="savePaymentConfig(event)">
          <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="form-group">
              <label>KDV Oranı (%)</label>
              <input type="number" id="configVatRate" step="0.01" min="0" max="100" required>
            </div>
            <div class="form-group">
              <label>Stopaj Oranı (%)</label>
              <input type="number" id="configWithholdingRate" step="0.01" min="0" max="100" required>
            </div>
            <div class="form-group">
              <label>Damga Vergisi (%)</label>
              <input type="number" id="configStampTaxRate" step="0.001" min="0" max="100" required>
            </div>
          </div>
          
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label>Avans Tutarı (TL)</label>
              <input type="number" id="configAdvanceAmount" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Avans Kesinti Oranı (%)</label>
              <input type="number" id="configAdvanceDeductionPercentage" step="0.01" min="0" max="100">
              <small style="color: var(--text-secondary);">Her hakedişten kesilecek oran</small>
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Kaydet</button>
            <button type="button" class="btn btn-secondary" onclick="closePaymentConfigModal()" style="flex: 1;">❌ İptal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Payment Modal -->
    <div id="createPaymentModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 600px;">
        <h3>➕ Yeni Hakediş Dönemi Oluştur</h3>
        <form id="createPaymentForm" onsubmit="createPaymentPeriod(event)">
          <div class="form-group">
            <label>Hakediş Başlığı <span style="color: red;">*</span></label>
            <input type="text" id="paymentTitle" required placeholder="örn: 1. Hakediş - Ocak 2025">
          </div>
          
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label>Dönem Başlangıcı</label>
              <input type="date" id="paymentPeriodStart" required>
            </div>
            <div class="form-group">
              <label>Dönem Sonu</label>
              <input type="date" id="paymentPeriodEnd" required>
            </div>
          </div>
          
          <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin-top: 1rem;">
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
              ℹ️ Hakediş dönemi oluşturulduktan sonra metraj girişi yapabilirsiniz.
            </p>
          </div>
          
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">✅ Oluştur</button>
            <button type="button" class="btn btn-secondary" onclick="closeCreatePaymentModal()" style="flex: 1;">❌ İptal</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Load config values
  if (currentPaymentConfig) {
    const configForm = document.getElementById('paymentConfigForm');
    if (configForm) {
      document.getElementById('configVatRate').value = currentPaymentConfig.vatRate || 20;
      document.getElementById('configWithholdingRate').value = currentPaymentConfig.withholdingRate || 3;
      document.getElementById('configStampTaxRate').value = currentPaymentConfig.stampTaxRate || 0.825;
      document.getElementById('configAdvanceAmount').value = currentPaymentConfig.advanceAmount || 0;
      document.getElementById('configAdvanceDeductionPercentage').value = currentPaymentConfig.advanceDeductionPercentage || 0;
    }
  }
}

/**
 * Helper functions
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0);
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('tr-TR');
}

function formatPeriod(start, end) {
  const startDate = start?.toDate ? start.toDate() : new Date(start);
  const endDate = end?.toDate ? end.toDate() : new Date(end);
  return `${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`;
}

function getStatusBadge(status) {
  const statusConfig = {
    'draft': { label: 'Taslak', color: '#6c757d' },
    'pending_review': { label: 'İncelemede', color: '#f59e0b' },
    'pending_approval': { label: 'Onay Bekliyor', color: '#3b82f6' },
    'approved': { label: 'Onaylandı', color: '#10b981' },
    'rejected': { label: 'Reddedildi', color: '#ef4444' },
    'paid': { label: 'Ödendi', color: '#8b5cf6' }
  };
  
  const config = statusConfig[status] || statusConfig['draft'];
  return `<span style="
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    background: ${config.color};
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
  ">${config.label}</span>`;
}

function getTotalDeductions(payment) {
  return (payment.withholdingAmount || 0) +
         (payment.stampTaxAmount || 0) +
         (payment.advanceDeduction || 0) +
         (payment.otherDeductions || 0);
}

// Modal functions
function openPaymentConfigModal() {
  document.getElementById('paymentConfigModal').style.display = 'flex';
}

function closePaymentConfigModal() {
  document.getElementById('paymentConfigModal').style.display = 'none';
}

function openCreatePaymentModal() {
  document.getElementById('createPaymentModal').style.display = 'flex';
  // Set next payment number
  const nextPaymentNo = progressPayments.length > 0 
    ? Math.max(...progressPayments.map(p => p.paymentNo)) + 1 
    : 1;
  document.getElementById('paymentTitle').value = `${nextPaymentNo}. Hakediş - ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
}

function closeCreatePaymentModal() {
  document.getElementById('createPaymentModal').style.display = 'none';
  document.getElementById('createPaymentForm').reset();
}

/**
 * Save payment config
 */
async function savePaymentConfig(event) {
  event.preventDefault();
  
  try {
    const configData = {
      vatRate: parseFloat(document.getElementById('configVatRate').value),
      withholdingRate: parseFloat(document.getElementById('configWithholdingRate').value),
      stampTaxRate: parseFloat(document.getElementById('configStampTaxRate').value),
      advanceAmount: parseFloat(document.getElementById('configAdvanceAmount').value),
      advanceDeductionPercentage: parseFloat(document.getElementById('configAdvanceDeductionPercentage').value),
      updatedAt: Timestamp.now()
    };

    await updateDoc(doc(db, 'payment_config', currentPaymentConfig.id), configData);
    
    currentPaymentConfig = { ...currentPaymentConfig, ...configData };
    
    console.log('✅ Payment config updated');
    alert('✅ Hakediş ayarları kaydedildi');
    closePaymentConfigModal();
    
  } catch (error) {
    console.error('❌ Config save error:', error);
    alert('Ayar kaydetme hatası: ' + error.message);
  }
}

/**
 * Create payment period
 */
async function createPaymentPeriod(event) {
  event.preventDefault();
  
  try {
    const user = auth.currentUser;
    const nextPaymentNo = progressPayments.length > 0 
      ? Math.max(...progressPayments.map(p => p.paymentNo)) + 1 
      : 1;

    const paymentData = {
      projectId: currentProjectId,
      companyId: currentProject.companyId,
      paymentNo: nextPaymentNo,
      title: document.getElementById('paymentTitle').value.trim(),
      periodStart: Timestamp.fromDate(new Date(document.getElementById('paymentPeriodStart').value)),
      periodEnd: Timestamp.fromDate(new Date(document.getElementById('paymentPeriodEnd').value)),
      status: 'draft',
      grossAmount: 0,
      vatAmount: 0,
      withholdingAmount: 0,
      stampTaxAmount: 0,
      advanceDeduction: 0,
      otherDeductions: 0,
      netAmount: 0,
      createdAt: Timestamp.now(),
      createdBy: user.uid,
      updatedAt: Timestamp.now(),
      updatedBy: user.uid
    };

    const docRef = await addDoc(collection(db, 'progress_payments'), paymentData);
    
    // Log activity
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      action: 'CREATE_PAYMENT',
      description: `Yeni hakediş dönemi oluşturuldu: ${paymentData.title}`,
      timestamp: Timestamp.now(),
      metadata: {
        projectId: currentProjectId,
        paymentId: docRef.id,
        paymentNo: nextPaymentNo
      }
    });

    console.log('✅ Payment period created:', docRef.id);
    alert('✅ Hakediş dönemi oluşturuldu!');
    
    closeCreatePaymentModal();
    await loadProgressPayments(currentProjectId);
    
    // Navigate to payment detail
    viewPaymentDetail(docRef.id);
    
  } catch (error) {
    console.error('❌ Payment creation error:', error);
    alert('Hakediş oluşturma hatası: ' + error.message);
  }
}

// Stub functions
function viewPaymentDetail(paymentId) {
  console.log(`👁️ View payment detail: ${paymentId}`);
  
  // Hide list view, show detail view
  const listContainer = document.getElementById('progressPaymentsContainer');
  const detailContainer = document.getElementById('paymentDetailContainer');
  
  if (listContainer) listContainer.style.display = 'none';
  if (detailContainer) {
    detailContainer.style.display = 'block';
    // Load payment detail from measurement-entry module
    if (window.loadPaymentDetail) {
      window.loadPaymentDetail(paymentId);
    }
  }
}

function editPayment(paymentId) {
  viewPaymentDetail(paymentId);
}

function exportPaymentToPDF(paymentId) {
  alert('PDF export özelliği yakında eklenecek');
}

/**
 * NEW PAGE FUNCTIONS - For hakedis-takibi.html
 */

/**
 * Load progress payments for new standalone page
 */
async function loadProgressPaymentsPage() {
  // Get project ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  if (!projectId) {
    console.error('❌ Project ID not found in URL');
    window.location.href = '../projeler.html';
    return;
  }
  
  currentProjectId = projectId;
  window.currentProjectId = projectId;
  
  try {
    // Get project details
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      alert('❌ Proje bulunamadı');
      window.location.href = '../projeler.html';
      return;
    }
    
    currentProject = { id: projectDoc.id, ...projectDoc.data() };
    
    // Update page title and breadcrumb
    const projectNameEl = document.getElementById('projectName');
    const breadcrumbEl = document.getElementById('projectNameBreadcrumb');
    if (projectNameEl) projectNameEl.textContent = currentProject.name || 'Proje';
    if (breadcrumbEl) breadcrumbEl.textContent = currentProject.name || 'Proje';
    
    // Get BOQ items for contract amount
    const boqQuery = query(
      collection(db, 'boq_items'),
      where('projectId', '==', projectId),
      where('isDeleted', '==', false)
    );
    const boqSnap = await getDocs(boqQuery);
    boqItems = [];
    let totalContractAmount = 0;
    
    boqSnap.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      boqItems.push(item);
      totalContractAmount += (item.totalPrice || 0);
    });
    
    // Get progress payments
    const paymentsQuery = query(
      collection(db, 'progress_payments'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    progressPayments = [];
    
    let totalPaymentAmount = 0;
    let totalPaidAmount = 0;
    let totalPendingAmount = 0;
    
    paymentsSnap.forEach(docSnap => {
      const payment = { id: docSnap.id, ...docSnap.data() };
      progressPayments.push(payment);
      
      const netAmount = payment.netAmount || 0;
      totalPaymentAmount += netAmount;
      
      if (payment.status === 'paid') {
        totalPaidAmount += netAmount;
      } else if (payment.status === 'approved' || payment.status === 'pending') {
        totalPendingAmount += netAmount;
      }
    });
    
    // Apply filters
    const searchInput = document.getElementById('paymentSearchInput');
    const statusFilter = document.getElementById('paymentStatusFilter');
    const sortFilter = document.getElementById('paymentSortFilter');
    
    let filteredPayments = [...progressPayments];
    
    if (searchInput?.value) {
      const searchTerm = searchInput.value.toLowerCase();
      filteredPayments = filteredPayments.filter(payment => 
        payment.paymentNo?.toLowerCase().includes(searchTerm) ||
        payment.period?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (statusFilter?.value) {
      filteredPayments = filteredPayments.filter(payment => payment.status === statusFilter.value);
    }
    
    if (sortFilter?.value) {
      switch (sortFilter.value) {
        case 'date-asc':
          filteredPayments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateA - dateB;
          });
          break;
        case 'amount-asc':
          filteredPayments.sort((a, b) => (a.netAmount || 0) - (b.netAmount || 0));
          break;
        case 'amount-desc':
          filteredPayments.sort((a, b) => (b.netAmount || 0) - (a.netAmount || 0));
          break;
        default: // date-desc
          filteredPayments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
      }
    }
    
    // Update summary cards
    const totalPaymentsEl = document.getElementById('totalProgressPayments');
    const totalPaymentAmountEl = document.getElementById('totalPaymentAmount');
    const totalPaidEl = document.getElementById('totalPaidAmount');
    const totalPendingEl = document.getElementById('totalPendingAmount');
    
    if (totalPaymentsEl) totalPaymentsEl.textContent = progressPayments.length;
    if (totalPaymentAmountEl) totalPaymentAmountEl.textContent = formatCurrency(totalPaymentAmount);
    if (totalPaidEl) totalPaidEl.textContent = formatCurrency(totalPaidAmount);
    if (totalPendingEl) totalPendingEl.textContent = formatCurrency(totalPendingAmount);
    
    // Update progress summary
    const contractAmountEl = document.getElementById('contractAmount');
    const totalInvoicedEl = document.getElementById('totalInvoiced');
    const remainingWorkEl = document.getElementById('remainingWork');
    const completionRateEl = document.getElementById('completionRate');
    const progressBarEl = document.getElementById('progressBar');
    
    const remainingWork = totalContractAmount - totalPaymentAmount;
    const completionRate = totalContractAmount > 0 ? ((totalPaymentAmount / totalContractAmount) * 100) : 0;
    
    if (contractAmountEl) contractAmountEl.textContent = formatCurrency(totalContractAmount);
    if (totalInvoicedEl) totalInvoicedEl.textContent = formatCurrency(totalPaymentAmount);
    if (remainingWorkEl) remainingWorkEl.textContent = formatCurrency(remainingWork);
    if (completionRateEl) completionRateEl.textContent = completionRate.toFixed(1) + '%';
    
    if (progressBarEl) {
      progressBarEl.style.width = completionRate + '%';
      progressBarEl.textContent = completionRate.toFixed(1) + '%';
      
      // Change color based on completion
      if (completionRate >= 80) {
        progressBarEl.style.background = 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)';
      } else if (completionRate >= 50) {
        progressBarEl.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
      } else {
        progressBarEl.style.background = 'linear-gradient(90deg, #fa709a 0%, #fee140 100%)';
      }
    }
    
    // Render payments list
    renderProgressPaymentsPage(filteredPayments);
    
    console.log(`✅ Loaded ${progressPayments.length} progress payments`);
    
  } catch (error) {
    console.error('❌ Error loading progress payments:', error);
    alert('Hakediş verileri yüklenirken hata: ' + error.message);
  }
}

/**
 * Render progress payments list for page
 */
function renderProgressPaymentsPage(payments) {
  const container = document.getElementById('progressPaymentsList');
  if (!container) return;
  
  if (payments.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">💰</div>
        <p style="margin: 0; font-size: 1.1rem;">Henüz hakediş kaydı bulunmuyor</p>
        <p style="margin: 0.5rem 0 0 0;">Yeni hakediş oluşturarak başlayın</p>
      </div>
    `;
    return;
  }
  
  const statusColors = {
    draft: { bg: '#95a5a6', text: 'Taslak', icon: '📝' },
    pending: { bg: '#f39c12', text: 'Onay Bekliyor', icon: '⏳' },
    approved: { bg: '#3498db', text: 'Onaylandı', icon: '✅' },
    paid: { bg: '#27ae60', text: 'Ödendi', icon: '💵' },
    cancelled: { bg: '#e74c3c', text: 'İptal', icon: '❌' }
  };
  
  let html = '';
  
  payments.forEach(payment => {
    const status = statusColors[payment.status] || statusColors.draft;
    const createdDate = payment.createdAt?.toDate?.() || new Date();
    const startDate = payment.startDate?.toDate?.() || null;
    const endDate = payment.endDate?.toDate?.() || null;
    
    html += `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${status.bg};">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.5rem;">${status.icon}</span>
              <div>
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--brand-red);">
                  ${payment.paymentNo || 'Hakediş'}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  ${payment.period || 'Dönem belirtilmemiş'}
                </div>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Brüt Tutar</div>
                <div style="font-weight: 600;">${formatCurrency(payment.grossAmount || 0)}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">KDV</div>
                <div style="font-weight: 600;">${formatCurrency(payment.vatAmount || 0)}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Kesintiler</div>
                <div style="font-weight: 600; color: #e74c3c;">${formatCurrency((payment.withholdingAmount || 0) + (payment.stampTaxAmount || 0))}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Net Ödeme</div>
                <div style="font-weight: 600; font-size: 1.1rem; color: #27ae60;">${formatCurrency(payment.netAmount || 0)}</div>
              </div>
            </div>
            
            ${startDate && endDate ? `
              <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
                📅 ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}
              </div>
            ` : ''}
            
            <div style="margin-top: 0.5rem;">
              <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${status.bg}; color: white; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                ${status.text}
              </span>
            </div>
          </div>
          
          <div style="display: flex; gap: 0.5rem; flex-direction: column; align-items: flex-end;">
            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; white-space: nowrap;" onclick="viewProgressPaymentDetail('${payment.id}')">
              👁️ Detay
            </button>
            ${payment.status === 'draft' ? `
              <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: #3498db; color: white;" onclick="editProgressPayment('${payment.id}')">
                ✏️ Düzenle
              </button>
            ` : ''}
            ${payment.status === 'approved' || payment.status === 'paid' ? `
              <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: #e74c3c; color: white;" onclick="downloadProgressPaymentPDF('${payment.id}')">
                📄 PDF
              </button>
            ` : ''}
            ${payment.status === 'draft' || payment.status === 'pending' ? `
              <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="deleteProgressPayment('${payment.id}')">
                🗑️ Sil
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Open create progress payment modal
 */
function openCreateProgressPaymentModal() {
  // Generate next payment number
  const nextNo = progressPayments.length + 1;
  const paymentNo = `HAK-${String(nextNo).padStart(3, '0')}`;
  
  document.getElementById('paymentNo').value = paymentNo;
  
  // Set current month as default period
  const now = new Date();
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  document.getElementById('paymentPeriod').value = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  
  // Set default dates (first and last day of current month)
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  document.getElementById('paymentStartDate').value = firstDay.toISOString().split('T')[0];
  document.getElementById('paymentEndDate').value = lastDay.toISOString().split('T')[0];
  
  document.getElementById('createProgressPaymentModal').style.display = 'block';
}

function closeCreateProgressPaymentModal() {
  document.getElementById('createProgressPaymentModal').style.display = 'none';
  document.getElementById('createProgressPaymentForm').reset();
}

/**
 * Load BOQ items for payment
 */
async function loadBoqItemsForPayment() {
  const container = document.getElementById('paymentItemsContainer');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <p>Metraj kalemleri yükleniyor...</p>
    </div>
  `;
  
  // If boqItems is empty, try to load it
  if (boqItems.length === 0 && currentProjectId) {
    try {
      console.log('📋 Loading BOQ items for payment...');
      const boqQuery = query(
        collection(db, 'boq_items'),
        where('projectId', '==', currentProjectId),
        where('isDeleted', '==', false),
        orderBy('pozNo', 'asc')
      );
      const boqSnap = await getDocs(boqQuery);
      boqItems = [];
      boqSnap.forEach(doc => {
        boqItems.push({ id: doc.id, ...doc.data() });
      });
      console.log(`✅ Loaded ${boqItems.length} BOQ items`);
    } catch (error) {
      console.error('❌ Error loading BOQ items:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
          <p>Metraj kalemleri yüklenirken hata oluştu</p>
          <p style="font-size: 0.85rem; color: #e74c3c;">${error.message}</p>
        </div>
      `;
      return;
    }
  }
  
  if (boqItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
        <p>Metraj listesinde iş kalemi bulunmuyor</p>
        <a href="metraj-listesi.html${window.location.search}" class="btn btn-primary" style="margin-top: 1rem;">
          Metraj Listesine Git
        </a>
      </div>
    `;
    return;
  }
  
  // Calculate completed quantities from previous payments
  const completedQuantities = {};
  progressPayments.forEach(payment => {
    if (payment.status !== 'cancelled' && payment.items) {
      payment.items.forEach(item => {
        if (!completedQuantities[item.boqItemId]) {
          completedQuantities[item.boqItemId] = 0;
        }
        completedQuantities[item.boqItemId] += (item.currentQuantity || 0);
      });
    }
  });
  
  let html = `
    <div style="max-height: 400px; overflow-y: auto;">
      <table class="data-table" style="width: 100%;">
        <thead style="position: sticky; top: 0; background: var(--bg-secondary); z-index: 1;">
          <tr>
            <th style="width: 100px;">Poz No</th>
            <th style="min-width: 200px;">İş Kalemi</th>
            <th style="width: 80px;">Birim</th>
            <th style="width: 100px;">Sözleşme</th>
            <th style="width: 100px;">Yapılan</th>
            <th style="width: 100px;">Kalan</th>
            <th style="width: 120px;">Bu Dönem</th>
            <th style="width: 120px;">Birim Fiyat</th>
            <th style="width: 120px;">Tutar</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  boqItems.forEach(item => {
    const completedQty = completedQuantities[item.id] || 0;
    const remainingQty = (item.quantity || 0) - completedQty;
    
    html += `
      <tr data-boq-item-id="${item.id}">
        <td><strong>${item.pozNo}</strong></td>
        <td>${item.name || item.description}</td>
        <td>${item.unit}</td>
        <td style="text-align: right;">${formatNumber(item.quantity)}</td>
        <td style="text-align: right;">${formatNumber(completedQty)}</td>
        <td style="text-align: right; color: ${remainingQty > 0 ? '#27ae60' : '#e74c3c'};">${formatNumber(remainingQty)}</td>
        <td>
          <input 
            type="number" 
            class="payment-item-quantity" 
            data-boq-item-id="${item.id}"
            data-unit-price="${item.unitPrice || 0}"
            min="0" 
            max="${remainingQty}" 
            step="0.01" 
            value="0"
            style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; text-align: right;"
            oninput="calculatePaymentItemTotal(this)"
          >
        </td>
        <td style="text-align: right;">${formatCurrency(item.unitPrice || 0)}</td>
        <td style="text-align: right;">
          <strong class="payment-item-total" data-boq-item-id="${item.id}">₺0.00</strong>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
        <tfoot>
          <tr style="background: var(--bg-secondary); font-weight: bold;">
            <td colspan="8" style="text-align: right;">TOPLAM:</td>
            <td style="text-align: right;" id="paymentItemsTotal">₺0.00</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
  updatePaymentSummary();
}

/**
 * Calculate payment item total
 */
function calculatePaymentItemTotal(input) {
  const boqItemId = input.dataset.boqItemId;
  const quantity = parseFloat(input.value) || 0;
  const unitPrice = parseFloat(input.dataset.unitPrice) || 0;
  const total = quantity * unitPrice;
  
  const totalEl = document.querySelector(`.payment-item-total[data-boq-item-id="${boqItemId}"]`);
  if (totalEl) {
    totalEl.textContent = formatCurrency(total);
  }
  
  updatePaymentSummary();
}

/**
 * Update payment summary
 */
function updatePaymentSummary() {
  // Calculate total from all items
  let grossAmount = 0;
  document.querySelectorAll('.payment-item-quantity').forEach(input => {
    const quantity = parseFloat(input.value) || 0;
    const unitPrice = parseFloat(input.dataset.unitPrice) || 0;
    grossAmount += quantity * unitPrice;
  });
  
  // Get rates
  const vatRate = parseFloat(document.getElementById('vatRate')?.value || 20) / 100;
  const withholdingRate = parseFloat(document.getElementById('withholdingRate')?.value || 3) / 100;
  const stampTaxRate = parseFloat(document.getElementById('stampTaxRate')?.value || 0.948) / 100;
  
  // Calculate amounts
  const vatAmount = grossAmount * vatRate;
  const subtotal = grossAmount + vatAmount;
  const withholdingAmount = grossAmount * withholdingRate;
  const stampTaxAmount = grossAmount * stampTaxRate;
  const deductions = withholdingAmount + stampTaxAmount;
  const netAmount = subtotal - deductions;
  
  // Update summary
  const itemsTotalEl = document.getElementById('paymentItemsTotal');
  const summaryGrossEl = document.getElementById('summaryGrossAmount');
  const summaryVatEl = document.getElementById('summaryVatAmount');
  const summaryDeductionsEl = document.getElementById('summaryDeductions');
  const summaryNetEl = document.getElementById('summaryNetAmount');
  
  if (itemsTotalEl) itemsTotalEl.textContent = formatCurrency(grossAmount);
  if (summaryGrossEl) summaryGrossEl.textContent = formatCurrency(grossAmount);
  if (summaryVatEl) summaryVatEl.textContent = formatCurrency(vatAmount);
  if (summaryDeductionsEl) summaryDeductionsEl.textContent = formatCurrency(deductions);
  if (summaryNetEl) summaryNetEl.textContent = formatCurrency(netAmount);
}

/**
 * Handle create progress payment
 */
async function handleCreateProgressPayment(event) {
  event.preventDefault();
  
  const paymentNo = document.getElementById('paymentNo').value;
  const period = document.getElementById('paymentPeriod').value;
  const startDate = document.getElementById('paymentStartDate').value;
  const endDate = document.getElementById('paymentEndDate').value;
  const notes = document.getElementById('paymentNotes').value;
  
  const vatRate = parseFloat(document.getElementById('vatRate').value) / 100;
  const withholdingRate = parseFloat(document.getElementById('withholdingRate').value) / 100;
  const stampTaxRate = parseFloat(document.getElementById('stampTaxRate').value) / 100;
  
  // Collect payment items
  const items = [];
  let grossAmount = 0;
  
  document.querySelectorAll('.payment-item-quantity').forEach(input => {
    const quantity = parseFloat(input.value) || 0;
    if (quantity > 0) {
      const boqItemId = input.dataset.boqItemId;
      const unitPrice = parseFloat(input.dataset.unitPrice) || 0;
      const currentAmount = quantity * unitPrice;
      
      const boqItem = boqItems.find(item => item.id === boqItemId);
      if (boqItem) {
        items.push({
          boqItemId: boqItemId,
          pozNo: boqItem.pozNo,
          name: boqItem.name || boqItem.description,
          unit: boqItem.unit,
          contractQuantity: boqItem.quantity,
          currentQuantity: quantity,
          unitPrice: unitPrice,
          currentAmount: currentAmount
        });
        
        grossAmount += currentAmount;
      }
    }
  });
  
  if (items.length === 0) {
    alert('❌ Lütfen en az bir iş kalemi için miktar girin');
    return;
  }
  
  // Calculate amounts
  const vatAmount = grossAmount * vatRate;
  const subtotal = grossAmount + vatAmount;
  const withholdingAmount = grossAmount * withholdingRate;
  const stampTaxAmount = grossAmount * stampTaxRate;
  const netAmount = subtotal - withholdingAmount - stampTaxAmount;
  
  try {
    const user = auth.currentUser;
    
    const paymentData = {
      projectId: currentProjectId,
      paymentNo: paymentNo,
      period: period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      items: items,
      grossAmount: grossAmount,
      vatRate: vatRate,
      vatAmount: vatAmount,
      subtotal: subtotal,
      withholdingRate: withholdingRate,
      withholdingAmount: withholdingAmount,
      stampTaxRate: stampTaxRate,
      stampTaxAmount: stampTaxAmount,
      netAmount: netAmount,
      notes: notes,
      status: 'draft',
      createdAt: Timestamp.now(),
      createdBy: user.uid,
      updatedAt: Timestamp.now()
    };
    
    await addDoc(collection(db, 'progress_payments'), paymentData);
    
    alert('✅ Hakediş başarıyla oluşturuldu!');
    closeCreateProgressPaymentModal();
    loadProgressPaymentsPage();
    
  } catch (error) {
    console.error('❌ Error creating progress payment:', error);
    alert('Hakediş oluşturulurken hata: ' + error.message);
  }
}

/**
 * View progress payment detail
 */
function viewProgressPaymentDetail(paymentId) {
  const payment = progressPayments.find(p => p.id === paymentId);
  if (!payment) return;
  
  const modal = document.getElementById('viewProgressPaymentModal');
  const titleEl = document.getElementById('viewPaymentTitle');
  const contentEl = document.getElementById('viewPaymentContent');
  
  if (titleEl) titleEl.textContent = `${payment.paymentNo} - ${payment.period}`;
  
  const statusColors = {
    draft: { bg: '#95a5a6', text: 'Taslak', icon: '📝' },
    pending: { bg: '#f39c12', text: 'Onay Bekliyor', icon: '⏳' },
    approved: { bg: '#3498db', text: 'Onaylandı', icon: '✅' },
    paid: { bg: '#27ae60', text: 'Ödendi', icon: '💵' },
    cancelled: { bg: '#e74c3c', text: 'İptal', icon: '❌' }
  };
  
  const status = statusColors[payment.status] || statusColors.draft;
  const startDate = payment.startDate?.toDate?.();
  const endDate = payment.endDate?.toDate?.();
  
  let html = `
    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <div>
          <h3 style="margin: 0 0 0.5rem 0;">${payment.paymentNo}</h3>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">${payment.period}</div>
          ${startDate && endDate ? `
            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
              📅 ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}
            </div>
          ` : ''}
        </div>
        <span style="padding: 0.5rem 1rem; background: ${status.bg}; color: white; border-radius: 12px; font-weight: 600;">
          ${status.icon} ${status.text}
        </span>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Brüt Tutar</div>
          <div style="font-weight: 600; font-size: 1.1rem;">${formatCurrency(payment.grossAmount || 0)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">KDV (%${((payment.vatRate || 0) * 100).toFixed(0)})</div>
          <div style="font-weight: 600; font-size: 1.1rem;">${formatCurrency(payment.vatAmount || 0)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Ara Toplam</div>
          <div style="font-weight: 600; font-size: 1.1rem;">${formatCurrency(payment.subtotal || 0)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Stopaj (%${((payment.withholdingRate || 0) * 100).toFixed(2)})</div>
          <div style="font-weight: 600; font-size: 1.1rem; color: #e74c3c;">-${formatCurrency(payment.withholdingAmount || 0)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Damga V. (%${((payment.stampTaxRate || 0) * 100).toFixed(3)})</div>
          <div style="font-weight: 600; font-size: 1.1rem; color: #e74c3c;">-${formatCurrency(payment.stampTaxAmount || 0)}</div>
        </div>
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 1rem; border-radius: 8px; color: white;">
          <div style="font-size: 0.75rem; opacity: 0.9;">Net Ödeme</div>
          <div style="font-weight: bold; font-size: 1.3rem;">${formatCurrency(payment.netAmount || 0)}</div>
        </div>
      </div>
    </div>
  `;
  
  if (payment.items && payment.items.length > 0) {
    html += `
      <div class="card">
        <h3 style="margin-bottom: 1rem;">🔨 İş Kalemleri</h3>
        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th>Poz No</th>
                <th>İş Kalemi</th>
                <th>Birim</th>
                <th style="text-align: right;">Bu Dönem</th>
                <th style="text-align: right;">Birim Fiyat</th>
                <th style="text-align: right;">Tutar</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    payment.items.forEach(item => {
      html += `
        <tr>
          <td><strong>${item.pozNo}</strong></td>
          <td>${item.name}</td>
          <td>${item.unit}</td>
          <td style="text-align: right;">${formatNumber(item.currentQuantity)}</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: right;"><strong>${formatCurrency(item.currentAmount)}</strong></td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  if (payment.notes) {
    html += `
      <div class="card" style="margin-top: 1.5rem;">
        <h4 style="margin: 0 0 0.5rem 0;">📝 Notlar</h4>
        <p style="margin: 0; color: var(--text-secondary);">${payment.notes}</p>
      </div>
    `;
  }
  
  if (contentEl) contentEl.innerHTML = html;
  if (modal) modal.style.display = 'block';
}

function closeViewProgressPaymentModal() {
  const modal = document.getElementById('viewProgressPaymentModal');
  if (modal) modal.style.display = 'none';
}

async function editProgressPayment(paymentId) {
  try {
    // Get payment data
    const paymentDoc = await getDoc(doc(db, 'progress_payments', paymentId));
    if (!paymentDoc.exists()) {
      alert('❌ Hakediş bulunamadı');
      return;
    }

    const payment = { id: paymentDoc.id, ...paymentDoc.data() };

    // Populate form
    document.getElementById('editPaymentId').value = payment.id;
    document.getElementById('editPaymentNo').value = payment.paymentNo || '';
    document.getElementById('editPaymentPeriod').value = payment.period || '';
    
    // Format dates
    if (payment.startDate) {
      const startDate = payment.startDate.toDate ? payment.startDate.toDate() : new Date(payment.startDate);
      document.getElementById('editPaymentStartDate').value = startDate.toISOString().split('T')[0];
    }
    if (payment.endDate) {
      const endDate = payment.endDate.toDate ? payment.endDate.toDate() : new Date(payment.endDate);
      document.getElementById('editPaymentEndDate').value = endDate.toISOString().split('T')[0];
    }

    document.getElementById('editVatRate').value = payment.vatRate || 20;
    document.getElementById('editWithholdingRate').value = payment.withholdingRate || 3;
    document.getElementById('editStampTaxRate').value = payment.stampTaxRate || 0.948;
    document.getElementById('editPaymentNotes').value = payment.notes || '';

    // Show modal
    openEditProgressPaymentModal();

  } catch (error) {
    console.error('❌ Error loading payment for edit:', error);
    alert('Hakediş yüklenirken hata oluştu: ' + error.message);
  }
}

function openEditProgressPaymentModal() {
  const modal = document.getElementById('editProgressPaymentModal');
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeEditProgressPaymentModal() {
  const modal = document.getElementById('editProgressPaymentModal');
  if (modal) {
    modal.style.display = 'none';
  }
  const form = document.getElementById('editProgressPaymentForm');
  if (form) {
    form.reset();
  }
}

async function handleEditProgressPayment(event) {
  event.preventDefault();

  const paymentId = document.getElementById('editPaymentId').value;
  if (!paymentId) {
    alert('❌ Hakediş ID bulunamadı');
    return;
  }

  try {
    const period = document.getElementById('editPaymentPeriod').value.trim();
    const startDate = new Date(document.getElementById('editPaymentStartDate').value);
    const endDate = new Date(document.getElementById('editPaymentEndDate').value);
    const vatRate = parseFloat(document.getElementById('editVatRate').value) || 20;
    const withholdingRate = parseFloat(document.getElementById('editWithholdingRate').value) || 3;
    const stampTaxRate = parseFloat(document.getElementById('editStampTaxRate').value) || 0.948;
    const notes = document.getElementById('editPaymentNotes').value.trim();

    if (!period) {
      alert('⚠️ Lütfen dönem bilgisini girin');
      return;
    }

    // Get current payment data to recalculate
    const paymentDoc = await getDoc(doc(db, 'progress_payments', paymentId));
    const currentPayment = paymentDoc.data();

    // Recalculate with new rates
    const grossAmount = currentPayment.grossAmount || 0;
    const vatAmount = grossAmount * (vatRate / 100);
    const withholdingAmount = grossAmount * (withholdingRate / 100);
    const stampTaxAmount = grossAmount * (stampTaxRate / 100);
    const netAmount = grossAmount + vatAmount - withholdingAmount - stampTaxAmount;

    // Update in Firestore
    await updateDoc(doc(db, 'progress_payments', paymentId), {
      period,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      vatRate,
      withholdingRate,
      stampTaxRate,
      vatAmount,
      withholdingAmount,
      stampTaxAmount,
      netAmount,
      notes,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.email || 'unknown'
    });

    alert('✅ Hakediş başarıyla güncellendi');
    closeEditProgressPaymentModal();

    // Reload page
    if (window.loadProgressPaymentsPage) {
      await loadProgressPaymentsPage();
    }

  } catch (error) {
    console.error('❌ Error updating payment:', error);
    alert('❌ Güncelleme hatası: ' + error.message);
  }
}

function deleteProgressPayment(paymentId) {
  if (!confirm('Bu hakediş kaydını silmek istediğinize emin misiniz?')) return;
  
  // TODO: Implement delete
  alert('Silme işlemi yakında eklenecek');
}

function downloadProgressPaymentPDF(paymentId) {
  alert('PDF indirme özelliği yakında eklenecek');
}

async function exportProgressPaymentsToExcel() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (!projectId) {
      alert('Proje ID bulunamadı');
      return;
    }

    // Get project name
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    const projectName = projectDoc.exists() ? projectDoc.data().name : 'Proje';

    // Get all payments for this project
    const paymentsQuery = query(
      collection(db, 'progress_payments'),
      where('projectId', '==', projectId),
      orderBy('periodNumber', 'asc')
    );
    
    const snapshot = await getDocs(paymentsQuery);
    
    if (snapshot.empty) {
      alert('Henüz hakediş kaydı bulunmamaktadır.');
      return;
    }

    // Create CSV content
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Turkish character support
    csv += 'Dönem No,Hakediş Tarihi,Açıklama,Durum,Ara Toplam,KDV,Stopaj,Damga Vergisi,Net Tutar\n';
    
    snapshot.forEach(doc => {
      const payment = doc.data();
      const date = payment.periodDate ? new Date(payment.periodDate.seconds * 1000).toLocaleDateString('tr-TR') : '-';
      const status = payment.status === 'approved' ? 'Onaylandı' : 
                     payment.status === 'pending' ? 'Bekliyor' : 
                     payment.status === 'draft' ? 'Taslak' : 'İptal';
      
      csv += `${payment.periodNumber || '-'},`;
      csv += `${date},`;
      csv += `"${payment.description || '-'}",`;
      csv += `${status},`;
      csv += `${payment.subtotal?.toFixed(2) || '0.00'},`;
      csv += `${payment.vatAmount?.toFixed(2) || '0.00'},`;
      csv += `${payment.withholdingAmount?.toFixed(2) || '0.00'},`;
      csv += `${payment.stampTaxAmount?.toFixed(2) || '0.00'},`;
      csv += `${payment.netTotal?.toFixed(2) || '0.00'}\n`;
    });

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectName}_Hakedisler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Excel export completed');
  } catch (error) {
    console.error('❌ Excel export error:', error);
    alert('Excel export sırasında hata oluştu: ' + error.message);
  }
}

function downloadPaymentPDF() {
  alert('PDF indirme özelliği yakında eklenecek');
}

// Export functions
window.loadProgressPayments = loadProgressPayments;
window.loadProgressPaymentsPage = loadProgressPaymentsPage;
window.openPaymentConfigModal = openPaymentConfigModal;
window.closePaymentConfigModal = closePaymentConfigModal;
window.savePaymentConfig = savePaymentConfig;
window.openCreatePaymentModal = openCreatePaymentModal;
window.closeCreatePaymentModal = closeCreatePaymentModal;
window.createPaymentPeriod = createPaymentPeriod;
window.viewPaymentDetail = viewPaymentDetail;
window.editPayment = editPayment;
window.exportPaymentToPDF = exportPaymentToPDF;
window.openCreateProgressPaymentModal = openCreateProgressPaymentModal;
window.closeCreateProgressPaymentModal = closeCreateProgressPaymentModal;
window.loadBoqItemsForPayment = loadBoqItemsForPayment;
window.calculatePaymentItemTotal = calculatePaymentItemTotal;
window.updatePaymentSummary = updatePaymentSummary;
window.handleCreateProgressPayment = handleCreateProgressPayment;
window.viewProgressPaymentDetail = viewProgressPaymentDetail;
window.closeViewProgressPaymentModal = closeViewProgressPaymentModal;
window.editProgressPayment = editProgressPayment;
window.openEditProgressPaymentModal = openEditProgressPaymentModal;
window.closeEditProgressPaymentModal = closeEditProgressPaymentModal;
window.handleEditProgressPayment = handleEditProgressPayment;
window.deleteProgressPayment = deleteProgressPayment;
window.downloadProgressPaymentPDF = downloadProgressPaymentPDF;
window.exportProgressPaymentsToExcel = exportProgressPaymentsToExcel;
window.exportPaymentsToExcel = exportProgressPaymentsToExcel; // Alias
window.downloadPaymentPDF = downloadPaymentPDF;

console.log('✅ Progress Payments module loaded');
