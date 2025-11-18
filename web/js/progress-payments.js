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

// Export functions
window.loadProgressPayments = loadProgressPayments;
window.openPaymentConfigModal = openPaymentConfigModal;
window.closePaymentConfigModal = closePaymentConfigModal;
window.savePaymentConfig = savePaymentConfig;
window.openCreatePaymentModal = openCreatePaymentModal;
window.closeCreatePaymentModal = closeCreatePaymentModal;
window.createPaymentPeriod = createPaymentPeriod;
window.viewPaymentDetail = viewPaymentDetail;
window.editPayment = editPayment;
window.exportPaymentToPDF = exportPaymentToPDF;

console.log('✅ Progress Payments module loaded');
