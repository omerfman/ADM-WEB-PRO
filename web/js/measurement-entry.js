// Measurement Entry (Metraj Girişi) Module
import { auth, db } from './firebase-config.js';
import { IMGBB_API_KEY, IMGBB_UPLOAD_URL, MAX_FILE_SIZE } from './imgbb-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global state
let currentPaymentId = null;
let currentPayment = null;
let currentProjectId = null;
let currentProject = null;
let currentPaymentConfig = null;
let boqItems = [];
let measurementLines = [];
let previousMeasurements = {};

/**
 * Load payment detail and measurements
 */
async function loadPaymentDetail(paymentId) {
  console.log(`📊 Loading payment detail: ${paymentId}`);
  currentPaymentId = paymentId;

  try {
    // Get payment
    const paymentDoc = await getDoc(doc(db, 'progress_payments', paymentId));
    if (!paymentDoc.exists()) {
      alert('❌ Hakediş bulunamadı');
      return;
    }
    currentPayment = { id: paymentDoc.id, ...paymentDoc.data() };
    currentProjectId = currentPayment.projectId;

    // Get project
    const projectDoc = await getDoc(doc(db, 'projects', currentProjectId));
    if (projectDoc.exists()) {
      currentProject = { id: projectDoc.id, ...projectDoc.data() };
    }

    // Get payment config
    const configQuery = query(
      collection(db, 'payment_config'),
      where('projectId', '==', currentProjectId)
    );
    const configSnap = await getDocs(configQuery);
    if (!configSnap.empty) {
      currentPaymentConfig = { id: configSnap.docs[0].id, ...configSnap.docs[0].data() };
    }

    // Get BOQ items
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

    // Get measurement lines for this payment
    const measurementsQuery = query(
      collection(db, 'measurement_lines'),
      where('paymentId', '==', paymentId),
      orderBy('createdAt', 'asc')
    );
    const measurementsSnap = await getDocs(measurementsQuery);
    measurementLines = [];
    measurementsSnap.forEach(doc => {
      measurementLines.push({ id: doc.id, ...doc.data() });
    });

    // Get previous measurements (cumulative)
    await loadPreviousMeasurements();

    console.log(`✅ Loaded ${measurementLines.length} measurements, ${boqItems.length} BOQ items`);
    renderPaymentDetail();

  } catch (error) {
    console.error('❌ Payment detail loading error:', error);
    alert('Hakediş detay yüklenirken hata oluştu: ' + error.message);
  }
}

/**
 * Load previous measurements (cumulative up to current payment)
 */
async function loadPreviousMeasurements() {
  previousMeasurements = {};

  try {
    // Get all previous payments
    const previousPaymentsQuery = query(
      collection(db, 'progress_payments'),
      where('projectId', '==', currentProjectId),
      where('paymentNo', '<', currentPayment.paymentNo),
      orderBy('paymentNo', 'asc')
    );
    const previousPaymentsSnap = await getDocs(previousPaymentsQuery);
    const previousPaymentIds = previousPaymentsSnap.docs.map(doc => doc.id);

    if (previousPaymentIds.length === 0) return;

    // Get all measurements from previous payments
    const allPreviousMeasurementsQuery = query(
      collection(db, 'measurement_lines'),
      where('projectId', '==', currentProjectId)
    );
    const allMeasurementsSnap = await getDocs(allPreviousMeasurementsQuery);

    allMeasurementsSnap.forEach(doc => {
      const data = doc.data();
      if (previousPaymentIds.includes(data.paymentId)) {
        const boqItemId = data.boqItemId;
        if (!previousMeasurements[boqItemId]) {
          previousMeasurements[boqItemId] = 0;
        }
        previousMeasurements[boqItemId] += parseFloat(data.measuredQuantity || 0);
      }
    });

    console.log('✅ Previous measurements loaded:', previousMeasurements);
  } catch (error) {
    console.error('❌ Previous measurements loading error:', error);
  }
}

/**
 * Render payment detail page
 */
function renderPaymentDetail() {
  const container = document.getElementById('paymentDetailContainer');
  if (!container) return;

  const isEditable = currentPayment.status === 'draft';

  container.innerHTML = `
    <!-- Payment Header -->
    <div style="background: linear-gradient(135deg, var(--brand-red) 0%, #c62828 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="margin: 0 0 0.5rem 0;">${currentPayment.title}</h2>
          <p style="margin: 0; opacity: 0.9;">
            ${currentProject?.name || 'Proje'} - ${formatPeriod(currentPayment.periodStart, currentPayment.periodEnd)}
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${getStatusBadge(currentPayment.status)}
          <button class="btn" style="background: white; color: var(--brand-red);" onclick="window.history.back()">
            ← Geri Dön
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Brüt Tutar</div>
        <div id="summaryGross" style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(currentPayment.grossAmount)}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">KDV (%${currentPaymentConfig?.vatRate || 0})</div>
        <div id="summaryVat" style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(currentPayment.vatAmount)}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Toplam Kesintiler</div>
        <div id="summaryDeductions" style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(getTotalDeductions(currentPayment))}</div>
      </div>
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white;">
        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9;">Net Tutar</div>
        <div id="summaryNet" style="font-size: 1.5rem; font-weight: bold;">${formatCurrency(currentPayment.netAmount)}</div>
      </div>
    </div>

    <!-- Measurements Table -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="margin: 0;">📊 Metraj Girişi</h3>
        ${isEditable ? `
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" onclick="openBulkMeasurementModal()">
              📋 Toplu Giriş
            </button>
            <button class="btn btn-primary" onclick="openMeasurementModal()">
              ➕ Metraj Ekle
            </button>
          </div>
        ` : ''}
      </div>

      <div class="table-container" style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 100px;">Poz No</th>
              <th style="min-width: 300px;">İş Tanımı</th>
              <th style="width: 80px;">Birim</th>
              <th style="width: 120px; text-align: right;">Önceki Dönem</th>
              <th style="width: 120px; text-align: right;">Bu Dönem</th>
              <th style="width: 120px; text-align: right;">Kümülatif</th>
              <th style="width: 120px; text-align: right;">Birim Fiyat</th>
              <th style="width: 150px; text-align: right;">Tutar</th>
              <th style="width: 80px;">Fotoğraf</th>
              ${isEditable ? '<th style="width: 120px;">İşlemler</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${measurementLines.length > 0
              ? measurementLines.map(line => {
                  const boqItem = boqItems.find(b => b.id === line.boqItemId);
                  return `
                    <tr>
                      <td><strong>${boqItem?.pozNo || '-'}</strong></td>
                      <td>${boqItem?.description || '-'}</td>
                      <td style="text-align: center;">${boqItem?.unit || '-'}</td>
                      <td style="text-align: right; color: var(--text-secondary);">${formatNumber(line.previousQuantity || 0)}</td>
                      <td style="text-align: right;"><strong>${formatNumber(line.measuredQuantity)}</strong></td>
                      <td style="text-align: right; font-weight: 600;">${formatNumber(line.cumulativeQuantity)}</td>
                      <td style="text-align: right;">${formatCurrency(line.unitPrice)}</td>
                      <td style="text-align: right;"><strong style="color: var(--brand-red);">${formatCurrency(line.lineTotal)}</strong></td>
                      <td style="text-align: center;">
                        ${line.photos && line.photos.length > 0 
                          ? `<button class="btn btn-icon" onclick="viewPhotos('${line.id}')" title="${line.photos.length} fotoğraf">📸 ${line.photos.length}</button>`
                          : '-'
                        }
                      </td>
                      ${isEditable ? `
                        <td>
                          <div style="display: flex; gap: 0.25rem; justify-content: center;">
                            <button class="btn btn-icon" onclick="editMeasurement('${line.id}')" title="Düzenle">✏️</button>
                            <button class="btn btn-icon btn-danger" onclick="deleteMeasurement('${line.id}')" title="Sil">🗑️</button>
                          </div>
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')
              : `
                <tr>
                  <td colspan="${isEditable ? 10 : 9}" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <p style="margin: 0; font-size: 1.1rem;">Henüz metraj girişi yapılmamış</p>
                    <p style="margin: 0.5rem 0 0 0;">Metraj ekleyerek hakediş hesaplamasını başlatın</p>
                  </td>
                </tr>
              `
            }
          </tbody>
          ${measurementLines.length > 0 ? `
            <tfoot>
              <tr style="background: var(--bg-secondary); font-weight: bold;">
                <td colspan="7" style="text-align: right;">TOPLAM:</td>
                <td style="text-align: right; color: var(--brand-red);">
                  ${formatCurrency(measurementLines.reduce((sum, l) => sum + (l.lineTotal || 0), 0))}
                </td>
                <td colspan="${isEditable ? 2 : 1}"></td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>

    <!-- Calculation Details -->
    <div class="card" style="margin-top: 2rem;">
      <h3 style="margin-bottom: 1rem;">💼 Hakediş Hesaplama Detayı</h3>
      <div style="display: grid; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <span>Brüt Tutar:</span>
          <strong>${formatCurrency(currentPayment.grossAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <span>KDV (%${currentPaymentConfig?.vatRate || 0}):</span>
          <strong style="color: #10b981;">+${formatCurrency(currentPayment.vatAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <span>Stopaj (%${currentPaymentConfig?.withholdingRate || 0}):</span>
          <strong style="color: #ef4444;">-${formatCurrency(currentPayment.withholdingAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <span>Damga Vergisi (%${currentPaymentConfig?.stampTaxRate || 0}):</span>
          <strong style="color: #ef4444;">-${formatCurrency(currentPayment.stampTaxAmount)}</strong>
        </div>
        ${currentPayment.advanceDeduction > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
            <span>Avans Kesintisi:</span>
            <strong style="color: #ef4444;">-${formatCurrency(currentPayment.advanceDeduction)}</strong>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding: 1rem 0; font-size: 1.2rem; border-top: 2px solid var(--brand-red);">
          <span><strong>NET TUTAR:</strong></span>
          <strong style="color: var(--brand-red); font-size: 1.5rem;">${formatCurrency(currentPayment.netAmount)}</strong>
        </div>
      </div>
    </div>

    <!-- Actions -->
    ${isEditable ? `
      <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="saveDraft()">💾 Taslak Kaydet</button>
        <button class="btn btn-primary" onclick="submitForReview()">📤 İncelemeye Gönder</button>
      </div>
    ` : ''}

    <!-- Measurement Modal -->
    <div id="measurementModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 800px;">
        <h3 id="measurementModalTitle">➕ Metraj Girişi</h3>
        <form id="measurementForm" onsubmit="saveMeasurement(event)">
          <div class="form-group">
            <label>İş Kalemi <span style="color: red;">*</span></label>
            <select id="measurementBoqItem" required onchange="updateMeasurementBoqInfo()">
              <option value="">Seçiniz...</option>
              ${boqItems.map(item => `
                <option value="${item.id}" data-unit="${item.unit}" data-price="${item.unitPrice}">
                  ${item.pozNo} - ${item.description}
                </option>
              `).join('')}
            </select>
          </div>

          <div id="boqInfoDisplay" style="display: none; padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
              <div>
                <small style="color: var(--text-secondary);">Birim</small>
                <div id="boqInfoUnit" style="font-weight: 600;">-</div>
              </div>
              <div>
                <small style="color: var(--text-secondary);">Birim Fiyat</small>
                <div id="boqInfoPrice" style="font-weight: 600;">-</div>
              </div>
              <div>
                <small style="color: var(--text-secondary);">Önceki Dönem</small>
                <div id="boqInfoPrevious" style="font-weight: 600; color: var(--text-secondary);">-</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Bu Dönem Miktar <span style="color: red;">*</span></label>
            <input 
              type="number" 
              id="measurementQuantity" 
              required 
              step="0.01" 
              min="0.01"
              placeholder="0.00"
              onchange="calculateMeasurementTotal()"
            >
          </div>

          <div class="form-group">
            <label>Açıklama / Not</label>
            <textarea id="measurementNotes" rows="3" placeholder="İsteğe bağlı açıklama..."></textarea>
          </div>

          <div class="form-group">
            <label>Fotoğraflar</label>
            <input 
              type="file" 
              id="measurementPhotos" 
              accept="image/*" 
              multiple
              style="
                width: 100%;
                padding: 0.75rem;
                border: 2px dashed var(--border-color);
                border-radius: 8px;
                background: var(--input-bg);
                cursor: pointer;
              "
              onchange="previewMeasurementPhotos(event)"
            >
            <small style="color: var(--text-secondary);">Birden fazla fotoğraf seçebilirsiniz</small>
          </div>

          <div id="photoPreviewContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;"></div>

          <div class="form-group">
            <label>Tutar</label>
            <input 
              type="text" 
              id="measurementTotal" 
              readonly 
              style="background: var(--bg-secondary); font-weight: bold; font-size: 1.1rem;"
              value="0,00 TL"
            >
          </div>

          <input type="hidden" id="measurementLineId">

          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Kaydet</button>
            <button type="button" class="btn btn-secondary" onclick="closeMeasurementModal()" style="flex: 1;">❌ İptal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Photo Viewer Modal -->
    <div id="photoViewerModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 900px;">
        <h3>📸 Fotoğraflar</h3>
        <div id="photoViewerContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;"></div>
        <button class="btn btn-secondary" onclick="closePhotoViewer()" style="margin-top: 1.5rem; width: 100%;">Kapat</button>
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
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0);
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
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: ${config.color};
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
  ">${config.label}</span>`;
}

function getTotalDeductions(payment) {
  return (payment.withholdingAmount || 0) +
         (payment.stampTaxAmount || 0) +
         (payment.advanceDeduction || 0) +
         (payment.otherDeductions || 0);
}

// Export functions
window.loadPaymentDetail = loadPaymentDetail;

// Modal functions (stubs - will implement next)
window.openMeasurementModal = () => {
  const modal = document.getElementById('measurementModal');
  const form = document.getElementById('measurementForm');
  const lineId = document.getElementById('measurementLineId');
  const title = document.getElementById('measurementModalTitle');
  const boqInfo = document.getElementById('boqInfoDisplay');
  const photoPreview = document.getElementById('photoPreviewContainer');
  
  if (!modal) {
    console.error('❌ measurementModal element not found');
    return;
  }
  
  modal.style.display = 'flex';
  if (form) form.reset();
  if (lineId) lineId.value = '';
  if (title) title.textContent = '➕ Metraj Girişi';
  if (boqInfo) boqInfo.style.display = 'none';
  if (photoPreview) photoPreview.innerHTML = '';
};

window.closeMeasurementModal = () => {
  document.getElementById('measurementModal').style.display = 'none';
};

window.updateMeasurementBoqInfo = () => {
  const select = document.getElementById('measurementBoqItem');
  const selectedOption = select.options[select.selectedIndex];
  
  if (selectedOption.value) {
    const boqItem = boqItems.find(b => b.id === selectedOption.value);
    const previousQty = previousMeasurements[selectedOption.value] || 0;
    
    document.getElementById('boqInfoUnit').textContent = selectedOption.dataset.unit;
    document.getElementById('boqInfoPrice').textContent = formatCurrency(parseFloat(selectedOption.dataset.price));
    document.getElementById('boqInfoPrevious').textContent = formatNumber(previousQty);
    document.getElementById('boqInfoDisplay').style.display = 'block';
  } else {
    document.getElementById('boqInfoDisplay').style.display = 'none';
  }
  
  calculateMeasurementTotal();
};

window.calculateMeasurementTotal = () => {
  const select = document.getElementById('measurementBoqItem');
  const selectedOption = select.options[select.selectedIndex];
  const quantity = parseFloat(document.getElementById('measurementQuantity')?.value || 0);
  
  if (selectedOption && selectedOption.value) {
    const unitPrice = parseFloat(selectedOption.dataset.price || 0);
    const total = quantity * unitPrice;
    document.getElementById('measurementTotal').value = formatCurrency(total);
  }
};

window.previewMeasurementPhotos = (event) => {
  const files = event.target.files;
  const container = document.getElementById('photoPreviewContainer');
  container.innerHTML = '';
  
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; border: 2px solid var(--border-color);';
      div.innerHTML = `
        <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover;">
        <div style="padding: 0.5rem; background: var(--bg-secondary); font-size: 0.85rem; text-align: center;">
          ${file.name}
        </div>
      `;
      container.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
};

window.saveMeasurement = async (event) => {
  event.preventDefault();
  
  const lineId = document.getElementById('measurementLineId').value;
  const boqItemId = document.getElementById('measurementBoqItem').value;
  const measuredQuantity = parseFloat(document.getElementById('measurementQuantity').value);
  const notes = document.getElementById('measurementNotes').value;
  const photoFiles = document.getElementById('measurementPhotos').files;
  
  if (!boqItemId) {
    alert('❌ Lütfen iş kalemi seçiniz');
    return;
  }
  
  try {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Kaydediliyor...';
    
    // Get BOQ item details
    const boqItem = boqItems.find(b => b.id === boqItemId);
    if (!boqItem) {
      alert('❌ İş kalemi bulunamadı');
      return;
    }
    
    // Calculate values
    const previousQuantity = previousMeasurements[boqItemId] || 0;
    const cumulativeQuantity = previousQuantity + measuredQuantity;
    const unitPrice = boqItem.unitPrice;
    const lineTotal = measuredQuantity * unitPrice;
    
    // Upload photos to ImgBB
    let photoUrls = [];
    if (photoFiles.length > 0) {
      submitBtn.textContent = '📸 Fotoğraflar yükleniyor...';
      photoUrls = await uploadPhotos(photoFiles);
    }
    
    const measurementData = {
      projectId: currentProjectId,
      paymentId: currentPaymentId,
      boqItemId: boqItemId,
      pozNo: boqItem.pozNo,
      description: boqItem.description,
      unit: boqItem.unit,
      previousQuantity: previousQuantity,
      measuredQuantity: measuredQuantity,
      cumulativeQuantity: cumulativeQuantity,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
      notes: notes || '',
      photos: photoUrls,
      createdBy: auth.currentUser.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    if (lineId) {
      // Update existing
      await updateDoc(doc(db, 'measurement_lines', lineId), measurementData);
      console.log('✅ Measurement updated:', lineId);
    } else {
      // Create new
      const docRef = await addDoc(collection(db, 'measurement_lines'), measurementData);
      console.log('✅ Measurement created:', docRef.id);
    }
    
    // Recalculate payment totals
    await recalculatePaymentTotals();
    
    // Reload measurements
    await loadPaymentDetail(currentPaymentId);
    
    closeMeasurementModal();
    
  } catch (error) {
    console.error('❌ Save measurement error:', error);
    alert('Metraj kaydedilirken hata oluştu: ' + error.message);
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Kaydet';
  }
};

/**
 * Upload photos to ImgBB
 */
async function uploadPhotos(files) {
  const photoUrls = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`⚠️ File too large (${(file.size / 1024 / 1024).toFixed(2)}MB): ${file.name}`);
      continue;
    }
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        photoUrls.push({
          url: result.data.url,
          thumb: result.data.thumb.url,
          deleteUrl: result.data.delete_url,
          filename: file.name,
          uploadedAt: new Date().toISOString()
        });
        console.log(`✅ Photo uploaded: ${file.name}`);
      } else {
        console.error('❌ Photo upload failed:', result);
      }
    } catch (error) {
      console.error(`❌ Photo upload error for ${file.name}:`, error);
    }
  }
  
  return photoUrls;
}

/**
 * Recalculate payment totals from measurements
 */
async function recalculatePaymentTotals() {
  try {
    // Get all measurements for this payment
    const measurementsQuery = query(
      collection(db, 'measurement_lines'),
      where('paymentId', '==', currentPaymentId)
    );
    const measurementsSnap = await getDocs(measurementsQuery);
    
    let grossAmount = 0;
    measurementsSnap.forEach(doc => {
      grossAmount += (doc.data().lineTotal || 0);
    });
    
    // Get payment config for rates
    const vatRate = (currentPaymentConfig?.vatRate || 0) / 100;
    const withholdingRate = (currentPaymentConfig?.withholdingRate || 0) / 100;
    const stampTaxRate = (currentPaymentConfig?.stampTaxRate || 0) / 100;
    
    // Calculate amounts
    const vatAmount = grossAmount * vatRate;
    const withholdingAmount = grossAmount * withholdingRate;
    const stampTaxAmount = grossAmount * stampTaxRate;
    const advanceDeduction = currentPayment.advanceDeduction || 0;
    const otherDeductions = currentPayment.otherDeductions || 0;
    
    const netAmount = grossAmount + vatAmount - withholdingAmount - stampTaxAmount - advanceDeduction - otherDeductions;
    
    // Update payment
    await updateDoc(doc(db, 'progress_payments', currentPaymentId), {
      grossAmount: grossAmount,
      vatAmount: vatAmount,
      withholdingAmount: withholdingAmount,
      stampTaxAmount: stampTaxAmount,
      netAmount: netAmount,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser.uid
    });
    
    console.log('✅ Payment totals recalculated:', { grossAmount, netAmount });
    
    // Update current payment object
    currentPayment.grossAmount = grossAmount;
    currentPayment.vatAmount = vatAmount;
    currentPayment.withholdingAmount = withholdingAmount;
    currentPayment.stampTaxAmount = stampTaxAmount;
    currentPayment.netAmount = netAmount;
    
  } catch (error) {
    console.error('❌ Recalculate payment error:', error);
  }
}

window.editMeasurement = async (lineId) => {
  const line = measurementLines.find(l => l.id === lineId);
  if (!line) return;
  
  // Open modal
  document.getElementById('measurementModal').style.display = 'flex';
  document.getElementById('measurementModalTitle').textContent = '✏️ Metraj Düzenle';
  
  // Fill form
  document.getElementById('measurementLineId').value = lineId;
  document.getElementById('measurementBoqItem').value = line.boqItemId;
  document.getElementById('measurementQuantity').value = line.measuredQuantity;
  document.getElementById('measurementNotes').value = line.notes || '';
  
  // Update BOQ info
  updateMeasurementBoqInfo();
  
  // Show existing photos (if any)
  if (line.photos && line.photos.length > 0) {
    const container = document.getElementById('photoPreviewContainer');
    container.innerHTML = line.photos.map(photo => `
      <div style="position: relative; border-radius: 8px; overflow: hidden; border: 2px solid var(--border-color);">
        <img src="${photo.thumb || photo.url}" style="width: 100%; height: 150px; object-fit: cover;">
        <div style="padding: 0.5rem; background: var(--bg-secondary); font-size: 0.85rem; text-align: center;">
          ${photo.filename || 'Mevcut Fotoğraf'}
        </div>
      </div>
    `).join('');
  }
};

window.deleteMeasurement = async (lineId) => {
  if (!confirm('Bu metraj girişini silmek istediğinizden emin misiniz?')) return;
  
  try {
    await deleteDoc(doc(db, 'measurement_lines', lineId));
    console.log('✅ Measurement deleted:', lineId);
    
    // Recalculate payment totals
    await recalculatePaymentTotals();
    
    // Reload measurements
    await loadPaymentDetail(currentPaymentId);
    
  } catch (error) {
    console.error('❌ Delete measurement error:', error);
    alert('Metraj silinirken hata oluştu: ' + error.message);
  }
};

window.viewPhotos = (lineId) => {
  const line = measurementLines.find(l => l.id === lineId);
  if (!line || !line.photos || line.photos.length === 0) return;
  
  const container = document.getElementById('photoViewerContainer');
  container.innerHTML = line.photos.map(photo => `
    <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
      <img src="${photo.url}" style="width: 100%; height: 200px; object-fit: cover;">
      ${photo.caption ? `<div style="padding: 0.75rem; background: var(--bg-secondary);">${photo.caption}</div>` : ''}
    </div>
  `).join('');
  
  document.getElementById('photoViewerModal').style.display = 'flex';
};

window.closePhotoViewer = () => {
  document.getElementById('photoViewerModal').style.display = 'none';
};

window.openBulkMeasurementModal = () => {
  const modal = document.getElementById('measurementModal');
  const modalContent = modal.querySelector('.modal-content');
  
  // Create bulk measurement interface
  modalContent.innerHTML = `
    <h3>📋 Toplu Metraj Girişi</h3>
    <p style="margin-bottom: 1rem; color: var(--text-secondary);">
      Tüm iş kalemlerini listeden seçerek toplu metraj girişi yapabilirsiniz.
    </p>
    
    <div style="max-height: 60vh; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px;">
      <table class="data-table" style="margin: 0;">
        <thead style="position: sticky; top: 0; background: var(--bg-primary); z-index: 10;">
          <tr>
            <th style="width: 100px;">Poz No</th>
            <th style="min-width: 250px;">İş Tanımı</th>
            <th style="width: 80px;">Birim</th>
            <th style="width: 120px; text-align: right;">Önceki</th>
            <th style="width: 150px;">Bu Dönem Miktar</th>
            <th style="width: 120px; text-align: right;">Birim Fiyat</th>
          </tr>
        </thead>
        <tbody>
          ${boqItems.map(item => {
            const previousQty = previousMeasurements[item.id] || 0;
            const existingMeasurement = measurementLines.find(m => m.boqItemId === item.id);
            return `
              <tr>
                <td><strong>${item.pozNo}</strong></td>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.unit}</td>
                <td style="text-align: right; color: var(--text-secondary);">${formatNumber(previousQty)}</td>
                <td>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value="${existingMeasurement ? existingMeasurement.measuredQuantity : ''}"
                    data-boq-id="${item.id}"
                    data-unit-price="${item.unitPrice}"
                    data-previous="${previousQty}"
                    placeholder="0.00"
                    style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"
                  >
                </td>
                <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
      <button class="btn btn-primary" onclick="saveBulkMeasurements()" style="flex: 1;">💾 Toplu Kaydet</button>
      <button class="btn btn-secondary" onclick="closeMeasurementModal()" style="flex: 1;">❌ İptal</button>
    </div>
  `;
  
  modal.style.display = 'flex';
};

window.saveBulkMeasurements = async () => {
  const inputs = document.querySelectorAll('input[data-boq-id]');
  const measurementsToSave = [];
  
  inputs.forEach(input => {
    const quantity = parseFloat(input.value);
    if (quantity > 0) {
      const boqItemId = input.dataset.boqId;
      const unitPrice = parseFloat(input.dataset.unitPrice);
      const previousQty = parseFloat(input.dataset.previous);
      const boqItem = boqItems.find(b => b.id === boqItemId);
      
      measurementsToSave.push({
        boqItemId,
        boqItem,
        previousQuantity: previousQty,
        measuredQuantity: quantity,
        cumulativeQuantity: previousQty + quantity,
        unitPrice,
        lineTotal: quantity * unitPrice
      });
    }
  });
  
  if (measurementsToSave.length === 0) {
    alert('❌ Lütfen en az bir kalem için miktar giriniz');
    return;
  }
  
  if (!confirm(`${measurementsToSave.length} adet metraj kaydedilecek. Devam edilsin mi?`)) return;
  
  try {
    const saveBtn = event.target;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Kaydediliyor...';
    
    // Save all measurements
    for (const measurement of measurementsToSave) {
      // Check if measurement already exists
      const existingMeasurement = measurementLines.find(m => m.boqItemId === measurement.boqItemId);
      
      const measurementData = {
        projectId: currentProjectId,
        paymentId: currentPaymentId,
        boqItemId: measurement.boqItemId,
        pozNo: measurement.boqItem.pozNo,
        description: measurement.boqItem.description,
        unit: measurement.boqItem.unit,
        previousQuantity: measurement.previousQuantity,
        measuredQuantity: measurement.measuredQuantity,
        cumulativeQuantity: measurement.cumulativeQuantity,
        unitPrice: measurement.unitPrice,
        lineTotal: measurement.lineTotal,
        notes: '',
        photos: [],
        createdBy: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      if (existingMeasurement) {
        // Update existing
        await updateDoc(doc(db, 'measurement_lines', existingMeasurement.id), measurementData);
      } else {
        // Create new
        await addDoc(collection(db, 'measurement_lines'), measurementData);
      }
    }
    
    console.log(`✅ Saved ${measurementsToSave.length} bulk measurements`);
    
    // Recalculate payment totals
    await recalculatePaymentTotals();
    
    // Reload measurements
    await loadPaymentDetail(currentPaymentId);
    
    closeMeasurementModal();
    
  } catch (error) {
    console.error('❌ Bulk save error:', error);
    alert('Toplu kayıt sırasında hata oluştu: ' + error.message);
  }
};

window.saveDraft = async () => {
  if (!confirm('Hakediş taslak olarak kaydedilecek. Devam edilsin mi?')) return;
  
  try {
    // Just recalculate to make sure totals are up-to-date
    await recalculatePaymentTotals();
    
    alert('✅ Hakediş taslak olarak kaydedildi');
    
  } catch (error) {
    console.error('❌ Save draft error:', error);
    alert('Taslak kaydedilirken hata oluştu: ' + error.message);
  }
};

window.submitForReview = async () => {
  // Validation
  if (measurementLines.length === 0) {
    alert('❌ En az bir metraj girişi yapmalısınız');
    return;
  }
  
  if (!confirm('Hakediş incelemeye gönderilecek. Sonrasında düzenleme yapamazsınız. Devam edilsin mi?')) return;
  
  try {
    // Update payment status
    await updateDoc(doc(db, 'progress_payments', currentPaymentId), {
      status: 'pending_review',
      submittedAt: Timestamp.now(),
      submittedBy: auth.currentUser.uid,
      updatedAt: Timestamp.now()
    });
    
    // Create approval record
    await addDoc(collection(db, 'payment_approvals'), {
      paymentId: currentPaymentId,
      projectId: currentProjectId,
      action: 'submit',
      fromStatus: 'draft',
      toStatus: 'pending_review',
      performedBy: auth.currentUser.uid,
      performedAt: Timestamp.now(),
      notes: 'Hakediş incelemeye gönderildi'
    });
    
    console.log('✅ Payment submitted for review');
    alert('✅ Hakediş başarıyla incelemeye gönderildi');
    
    // Reload payment detail
    await loadPaymentDetail(currentPaymentId);
    
  } catch (error) {
    console.error('❌ Submit for review error:', error);
    alert('Hakediş gönderilirken hata oluştu: ' + error.message);
  }
};

console.log('✅ Measurement Entry module loaded');
