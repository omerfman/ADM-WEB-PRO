// BOQ (Bill of Quantities) Management Module
import { auth, db } from './firebase-config.js';
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
  writeBatch,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global state
let currentProjectId = null;
let currentProject = null;
let boqItems = [];

/**
 * Load BOQ for a specific project
 */
async function loadBoq(projectId) {
  console.log(`📋 Loading BOQ for project: ${projectId}`);
  currentProjectId = projectId;

  try {
    // Get project details
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      alert('❌ Proje bulunamadı');
      return;
    }
    currentProject = { id: projectDoc.id, ...projectDoc.data() };

    // Get BOQ items
    const boqRef = collection(db, 'boq_items');
    const boqQuery = query(
      boqRef,
      where('projectId', '==', projectId),
      where('isDeleted', '==', false),
      orderBy('pozNo', 'asc')
    );
    const boqSnap = await getDocs(boqQuery);
    
    boqItems = [];
    boqSnap.forEach(doc => {
      boqItems.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Loaded ${boqItems.length} BOQ items`);
    renderBoqTable();

  } catch (error) {
    console.error('❌ BOQ loading error:', error);
    alert('BOQ yüklenirken hata oluştu: ' + error.message);
  }
}

/**
 * Render BOQ table
 */
function renderBoqTable() {
  const container = document.getElementById('boqTableContainer');
  if (!container) return;

  // Calculate totals
  const totalQuantity = boqItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalAmount = boqItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);

  container.innerHTML = `
    <div class="boq-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h3 style="margin: 0;">📋 Metraj Listesi</h3>
        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">
          ${currentProject?.name || 'Proje'} - ${boqItems.length} Kalem
        </p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" onclick="downloadBoqTemplate()">
          📥 Şablon İndir
        </button>
        <button class="btn btn-secondary" onclick="exportBoqToExcel()">
          📊 Excel İndir
        </button>
        <button class="btn btn-secondary" onclick="openBoqImportModal()">
          📤 Excel İçe Aktar
        </button>
        <button class="btn btn-primary" onclick="openBoqItemModal()">
          ➕ Yeni Kalem Ekle
        </button>
      </div>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 100px;">Poz No</th>
            <th style="width: 150px;">Kategori</th>
            <th style="width: 150px;">Alt Kategori</th>
            <th style="min-width: 300px;">İş Tanımı</th>
            <th style="width: 80px;">Birim</th>
            <th style="width: 120px; text-align: right;">Miktar</th>
            <th style="width: 120px; text-align: right;">Birim Fiyat</th>
            <th style="width: 150px; text-align: right;">Toplam Tutar</th>
            <th style="width: 120px;">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${boqItems.length > 0
            ? boqItems.map(item => `
              <tr>
                <td><strong>${item.pozNo}</strong></td>
                <td>${item.category}</td>
                <td>${item.subCategory || '-'}</td>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.unit}</td>
                <td style="text-align: right;">${formatNumber(item.quantity)}</td>
                <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                <td style="text-align: right;"><strong>${formatCurrency(item.totalPrice)}</strong></td>
                <td>
                  <div style="display: flex; gap: 0.25rem; justify-content: center;">
                    <button 
                      class="btn btn-icon" 
                      onclick="editBoqItem('${item.id}')"
                      title="Düzenle"
                    >✏️</button>
                    <button 
                      class="btn btn-icon btn-danger" 
                      onclick="deleteBoqItem('${item.id}', '${item.pozNo}')"
                      title="Sil"
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')
            : `
              <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                  <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                  <p style="margin: 0; font-size: 1.1rem;">Henüz metraj kalemi eklenmemiş</p>
                  <p style="margin: 0.5rem 0 0 0;">Excel içe aktararak veya manuel ekleyerek başlayın</p>
                </td>
              </tr>
            `
          }
        </tbody>
        ${boqItems.length > 0 ? `
          <tfoot>
            <tr style="background: var(--bg-secondary); font-weight: bold;">
              <td colspan="5">TOPLAM</td>
              <td style="text-align: right;">${formatNumber(totalQuantity)}</td>
              <td></td>
              <td style="text-align: right;">${formatCurrency(totalAmount)}</td>
              <td></td>
            </tr>
          </tfoot>
        ` : ''}
      </table>
    </div>

    <!-- BOQ Item Modal -->
    <div id="boqItemModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 700px;">
        <h3 id="boqModalTitle">➕ Yeni Metraj Kalemi</h3>
        <form id="boqItemForm" onsubmit="saveBoqItem(event)">
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label>Poz No <span style="color: red;">*</span></label>
              <input type="text" id="boqPozNo" required placeholder="örn: 01.01.001">
            </div>
            <div class="form-group">
              <label>Kategori <span style="color: red;">*</span></label>
              <input type="text" id="boqCategory" required placeholder="örn: İnşaat İşleri">
            </div>
          </div>
          
          <div class="form-group">
            <label>Alt Kategori</label>
            <input type="text" id="boqSubCategory" placeholder="örn: Kazı ve Temel">
          </div>
          
          <div class="form-group">
            <label>İş Tanımı <span style="color: red;">*</span></label>
            <textarea id="boqDescription" required rows="3" placeholder="Detaylı iş tanımı..."></textarea>
          </div>
          
          <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="form-group">
              <label>Birim <span style="color: red;">*</span></label>
              <select id="boqUnit" required>
                <option value="">Seçin</option>
                <option value="m">m (metre)</option>
                <option value="m²">m² (metrekare)</option>
                <option value="m³">m³ (metreküp)</option>
                <option value="Ad">Ad (adet)</option>
                <option value="Kg">Kg (kilogram)</option>
                <option value="Ton">Ton</option>
                <option value="Lt">Lt (litre)</option>
                <option value="Takım">Takım</option>
                <option value="Gt">Gt (gün)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Miktar <span style="color: red;">*</span></label>
              <input 
                type="number" 
                id="boqQuantity" 
                required 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                onchange="calculateBoqTotal()"
              >
            </div>
            <div class="form-group">
              <label>Birim Fiyat (TL) <span style="color: red;">*</span></label>
              <input 
                type="number" 
                id="boqUnitPrice" 
                required 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                onchange="calculateBoqTotal()"
              >
            </div>
          </div>
          
          <div class="form-group">
            <label>Toplam Tutar (TL)</label>
            <input 
              type="text" 
              id="boqTotalPrice" 
              readonly 
              style="background: var(--bg-secondary); font-weight: bold;"
              value="0,00 TL"
            >
          </div>
          
          <input type="hidden" id="boqItemId">
          
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Kaydet</button>
            <button type="button" class="btn btn-secondary" onclick="closeBoqItemModal()" style="flex: 1;">❌ İptal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- BOQ Import Modal -->
    <div id="boqImportModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 900px;">
        <h3>📤 Excel İçe Aktar</h3>
        <div class="form-group">
          <label>Excel Dosyası Seç (.xlsx, .xls)</label>
          <input 
            type="file" 
            id="boqExcelFile" 
            accept=".xlsx,.xls" 
            onchange="previewBoqExcel(event)"
            style="
              width: 100%;
              padding: 1rem;
              border: 2px dashed var(--border-color);
              border-radius: 8px;
              background: var(--input-bg);
              cursor: pointer;
            "
          >
          <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
            Maksimum dosya boyutu: 10MB. Şablon formatında olmalıdır.
          </small>
        </div>
        
        <div id="boqImportPreview" style="margin-top: 1.5rem;"></div>
        
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
          <button 
            id="boqImportBtn" 
            class="btn btn-primary" 
            onclick="importBoqFromExcel()" 
            disabled
            style="flex: 1;"
          >📥 İçe Aktar</button>
          <button class="btn btn-secondary" onclick="closeBoqImportModal()" style="flex: 1;">❌ İptal</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate BOQ total price
 */
function calculateBoqTotal() {
  const quantity = parseFloat(document.getElementById('boqQuantity')?.value || 0);
  const unitPrice = parseFloat(document.getElementById('boqUnitPrice')?.value || 0);
  const totalPrice = quantity * unitPrice;
  
  const totalPriceInput = document.getElementById('boqTotalPrice');
  if (totalPriceInput) {
    totalPriceInput.value = formatCurrency(totalPrice);
  }
}

/**
 * Open BOQ item modal (create/edit)
 */
function openBoqItemModal(itemId = null) {
  const modal = document.getElementById('boqItemModal');
  const form = document.getElementById('boqItemForm');
  const title = document.getElementById('boqModalTitle');
  
  form.reset();
  document.getElementById('boqTotalPrice').value = '0,00 TL';
  
  if (itemId) {
    const item = boqItems.find(b => b.id === itemId);
    if (item) {
      title.textContent = '✏️ Metraj Kalemi Düzenle';
      document.getElementById('boqItemId').value = item.id;
      document.getElementById('boqPozNo').value = item.pozNo;
      document.getElementById('boqCategory').value = item.category;
      document.getElementById('boqSubCategory').value = item.subCategory || '';
      document.getElementById('boqDescription').value = item.description;
      document.getElementById('boqUnit').value = item.unit;
      document.getElementById('boqQuantity').value = item.quantity;
      document.getElementById('boqUnitPrice').value = item.unitPrice;
      calculateBoqTotal();
    }
  } else {
    title.textContent = '➕ Yeni Metraj Kalemi';
    document.getElementById('boqItemId').value = '';
  }
  
  modal.style.display = 'flex';
}

function closeBoqItemModal() {
  document.getElementById('boqItemModal').style.display = 'none';
}

/**
 * Save BOQ item
 */
async function saveBoqItem(event) {
  event.preventDefault();
  
  const itemId = document.getElementById('boqItemId').value;
  const pozNo = document.getElementById('boqPozNo').value.trim();
  const category = document.getElementById('boqCategory').value.trim();
  const subCategory = document.getElementById('boqSubCategory').value.trim();
  const description = document.getElementById('boqDescription').value.trim();
  const unit = document.getElementById('boqUnit').value;
  const quantity = parseFloat(document.getElementById('boqQuantity').value);
  const unitPrice = parseFloat(document.getElementById('boqUnitPrice').value);
  const totalPrice = quantity * unitPrice;
  
  try {
    const user = auth.currentUser;
    const itemData = {
      projectId: currentProjectId,
      companyId: currentProject.companyId,
      pozNo,
      category,
      subCategory: subCategory || null,
      description,
      unit,
      quantity,
      unitPrice,
      totalPrice,
      updatedAt: Timestamp.now(),
      updatedBy: user.uid,
      isDeleted: false
    };
    
    let savedItemId = itemId;
    
    if (itemId) {
      // Update existing
      await updateDoc(doc(db, 'boq_items', itemId), itemData);
      console.log('✅ BOQ item updated:', itemId);
    } else {
      // Create new
      itemData.createdAt = Timestamp.now();
      itemData.createdBy = user.uid;
      const newDoc = await addDoc(collection(db, 'boq_items'), itemData);
      savedItemId = newDoc.id;
      console.log('✅ BOQ item created:', newDoc.id);
    }
    
    // Log activity
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      action: itemId ? 'UPDATE_BOQ_ITEM' : 'CREATE_BOQ_ITEM',
      description: `Metraj kalemi ${itemId ? 'güncellendi' : 'eklendi'}: ${pozNo}`,
      timestamp: Timestamp.now(),
      metadata: {
        projectId: currentProjectId,
        boqItemId: savedItemId,
        pozNo
      }
    });
    
    closeBoqItemModal();
    await loadBoq(currentProjectId);
    
  } catch (error) {
    console.error('❌ BOQ save error:', error);
    alert('Kaydetme hatası: ' + error.message);
  }
}

/**
 * Edit BOQ item
 */
function editBoqItem(itemId) {
  openBoqItemModal(itemId);
}

/**
 * Delete BOQ item
 */
async function deleteBoqItem(itemId, pozNo) {
  if (!confirm(`"${pozNo}" kalemini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
    return;
  }
  
  try {
    const user = auth.currentUser;
    
    // Soft delete
    await updateDoc(doc(db, 'boq_items', itemId), {
      isDeleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: user.uid
    });
    
    // Log activity
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      action: 'DELETE_BOQ_ITEM',
      description: `Metraj kalemi silindi: ${pozNo}`,
      timestamp: Timestamp.now(),
      metadata: {
        projectId: currentProjectId,
        boqItemId: itemId,
        pozNo
      }
    });
    
    console.log('✅ BOQ item deleted:', itemId);
    await loadBoq(currentProjectId);
    
  } catch (error) {
    console.error('❌ BOQ delete error:', error);
    alert('Silme hatası: ' + error.message);
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

function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0);
}

/**
 * Download BOQ Template
 */
function downloadBoqTemplate() {
  const templateData = [
    {
      'Poz No': '01.01.001',
      'Kategori': 'İnşaat İşleri',
      'Alt Kategori': 'Kazı ve Temel',
      'İş Tanımı': 'Kazı işleri - Temel kazısı',
      'Birim': 'm³',
      'Miktar': 1500,
      'Birim Fiyat': 125.50,
      'Toplam Tutar': 188250
    },
    {
      'Poz No': '01.01.002',
      'Kategori': 'İnşaat İşleri',
      'Alt Kategori': 'Kazı ve Temel',
      'İş Tanımı': 'Dolgu işleri - Kontrollü dolgu',
      'Birim': 'm³',
      'Miktar': 800,
      'Birim Fiyat': 95.00,
      'Toplam Tutar': 76000
    },
    {
      'Poz No': '01.02.001',
      'Kategori': 'İnşaat İşleri',
      'Alt Kategori': 'Beton İşleri',
      'İş Tanımı': 'C25/30 beton - Temel betonu',
      'Birim': 'm³',
      'Miktar': 350,
      'Birim Fiyat': 850.00,
      'Toplam Tutar': 297500
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Metraj Listesi');

  // Column widths
  worksheet['!cols'] = [
    { width: 12 },  // Poz No
    { width: 20 },  // Kategori
    { width: 20 },  // Alt Kategori
    { width: 50 },  // İş Tanımı
    { width: 10 },  // Birim
    { width: 12 },  // Miktar
    { width: 15 },  // Birim Fiyat
    { width: 15 }   // Toplam Tutar
  ];

  XLSX.writeFile(workbook, `BOQ_Sablon_${new Date().getTime()}.xlsx`);
  console.log('✅ Template downloaded');
}

/**
 * Export BOQ to Excel
 */
function exportBoqToExcel() {
  if (boqItems.length === 0) {
    alert('📋 İçe aktarılacak metraj kalemi yok');
    return;
  }

  const exportData = boqItems.map(item => ({
    'Poz No': item.pozNo,
    'Kategori': item.category,
    'Alt Kategori': item.subCategory || '',
    'İş Tanımı': item.description,
    'Birim': item.unit,
    'Miktar': item.quantity,
    'Birim Fiyat': item.unitPrice,
    'Toplam Tutar': item.totalPrice
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Metraj Listesi');

  // Column widths
  worksheet['!cols'] = [
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 50 },
    { width: 10 },
    { width: 12 },
    { width: 15 },
    { width: 15 }
  ];

  const fileName = `BOQ_${currentProject?.name || 'Proje'}_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log('✅ BOQ exported to Excel:', fileName);
}

/**
 * Open BOQ Import Modal
 */
function openBoqImportModal() {
  const modal = document.getElementById('boqImportModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('boqExcelFile').value = '';
    document.getElementById('boqImportPreview').innerHTML = '';
    document.getElementById('boqImportBtn').disabled = true;
  }
}

/**
 * Close BOQ Import Modal
 */
function closeBoqImportModal() {
  const modal = document.getElementById('boqImportModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('boqExcelFile').value = '';
    document.getElementById('boqImportPreview').innerHTML = '';
    document.getElementById('boqImportBtn').disabled = true;
  }
}

/**
 * Preview BOQ Excel
 */
let importPreviewData = [];

function previewBoqExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        alert('❌ Excel dosyası boş');
        return;
      }

      // Validate and prepare data
      const validUnits = ['m', 'm²', 'm³', 'Ad', 'Kg', 'Ton', 'Lt', 'Takım', 'Gt'];
      importPreviewData = [];
      const errors = [];

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel row (header is 1)
        const rowErrors = [];

        // Validate required fields
        if (!row['Poz No'] || String(row['Poz No']).trim() === '') {
          rowErrors.push('Poz No boş');
        }
        if (!row['Kategori'] || String(row['Kategori']).trim().length < 2) {
          rowErrors.push('Kategori geçersiz');
        }
        if (!row['İş Tanımı'] || String(row['İş Tanımı']).trim().length < 5) {
          rowErrors.push('İş Tanımı çok kısa');
        }
        if (!row['Birim'] || !validUnits.includes(String(row['Birim']).trim())) {
          rowErrors.push('Birim geçersiz');
        }
        if (!row['Miktar'] || parseFloat(row['Miktar']) <= 0) {
          rowErrors.push('Miktar geçersiz');
        }
        if (!row['Birim Fiyat'] || parseFloat(row['Birim Fiyat']) <= 0) {
          rowErrors.push('Birim Fiyat geçersiz');
        }

        const quantity = parseFloat(row['Miktar']) || 0;
        const unitPrice = parseFloat(row['Birim Fiyat']) || 0;

        importPreviewData.push({
          pozNo: String(row['Poz No']).trim(),
          category: String(row['Kategori']).trim(),
          subCategory: row['Alt Kategori'] ? String(row['Alt Kategori']).trim() : '',
          description: String(row['İş Tanımı']).trim(),
          unit: String(row['Birim']).trim(),
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: quantity * unitPrice,
          rowNum: rowNum,
          errors: rowErrors,
          isValid: rowErrors.length === 0
        });

        if (rowErrors.length > 0) {
          errors.push(`Satır ${rowNum}: ${rowErrors.join(', ')}`);
        }
      });

      // Display preview
      const validCount = importPreviewData.filter(d => d.isValid).length;
      const invalidCount = importPreviewData.length - validCount;

      let previewHTML = `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <div class="stats-badge" style="background: #10b981;">
              ✅ Geçerli: ${validCount}
            </div>
            <div class="stats-badge" style="background: #ef4444;">
              ❌ Hatalı: ${invalidCount}
            </div>
          </div>
        </div>
        
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px;">
          <table class="data-table">
            <thead style="position: sticky; top: 0; background: var(--bg-secondary); z-index: 1;">
              <tr>
                <th style="width: 50px;">Durum</th>
                <th style="width: 100px;">Poz No</th>
                <th style="width: 150px;">Kategori</th>
                <th style="min-width: 250px;">İş Tanımı</th>
                <th style="width: 80px;">Birim</th>
                <th style="width: 100px;">Miktar</th>
                <th style="width: 120px;">Birim Fiyat</th>
                <th style="width: 150px;">Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${importPreviewData.map(item => `
                <tr style="${!item.isValid ? 'background: rgba(239, 68, 68, 0.1);' : ''}">
                  <td style="text-align: center;">
                    ${item.isValid 
                      ? '<span style="color: #10b981; font-size: 1.2rem;">✅</span>' 
                      : '<span style="color: #ef4444; font-size: 1.2rem;" title="' + item.errors.join(', ') + '">❌</span>'
                    }
                  </td>
                  <td>${item.pozNo}</td>
                  <td>${item.category}</td>
                  <td>${item.description}</td>
                  <td>${item.unit}</td>
                  <td style="text-align: right;">${formatNumber(item.quantity)}</td>
                  <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                  <td style="text-align: right;"><strong>${formatCurrency(item.totalPrice)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      if (errors.length > 0) {
        previewHTML += `
          <div style="margin-top: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 4px;">
            <strong style="color: #ef4444;">⚠️ Hatalar:</strong>
            <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; color: #ef4444;">
              ${errors.slice(0, 10).map(err => `<li>${err}</li>`).join('')}
              ${errors.length > 10 ? `<li>... ve ${errors.length - 10} hata daha</li>` : ''}
            </ul>
          </div>
        `;
      }

      document.getElementById('boqImportPreview').innerHTML = previewHTML;
      document.getElementById('boqImportBtn').disabled = validCount === 0;

    } catch (error) {
      console.error('❌ Excel parse error:', error);
      alert('Excel dosyası okunamadı: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * Import BOQ from Excel
 */
async function importBoqFromExcel() {
  const validItems = importPreviewData.filter(item => item.isValid);
  
  if (validItems.length === 0) {
    alert('❌ İçe aktarılacak geçerli kayıt yok');
    return;
  }

  if (!confirm(`${validItems.length} adet metraj kalemi içe aktarılacak. Onaylıyor musunuz?`)) {
    return;
  }

  try {
    const importBtn = document.getElementById('boqImportBtn');
    importBtn.disabled = true;
    importBtn.textContent = '📥 İçe aktarılıyor...';

    const user = auth.currentUser;
    const batch = writeBatch(db);
    let batchCount = 0;
    let totalImported = 0;

    for (const item of validItems) {
      const boqRef = doc(collection(db, 'boq_items'));
      batch.set(boqRef, {
        projectId: currentProjectId,
        companyId: currentProject.companyId,
        pozNo: item.pozNo,
        category: item.category,
        subCategory: item.subCategory || null,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
        isDeleted: false
      });

      batchCount++;
      totalImported++;

      // Firestore batch limit is 500
      if (batchCount === 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    // Log activity
    await addDoc(collection(db, 'audit_logs'), {
      userId: user.uid,
      action: 'IMPORT_BOQ',
      description: `${totalImported} metraj kalemi Excel'den içe aktarıldı`,
      timestamp: Timestamp.now(),
      metadata: {
        projectId: currentProjectId,
        itemCount: totalImported
      }
    });

    console.log(`✅ ${totalImported} BOQ items imported`);
    alert(`✅ ${totalImported} metraj kalemi başarıyla içe aktarıldı!`);
    
    closeBoqImportModal();
    await loadBoq(currentProjectId);

  } catch (error) {
    console.error('❌ Import error:', error);
    alert('İçe aktarma hatası: ' + error.message);
    
    const importBtn = document.getElementById('boqImportBtn');
    importBtn.disabled = false;
    importBtn.textContent = '📥 İçe Aktar';
  }
}

// Export functions
window.loadBoq = loadBoq;
window.openBoqItemModal = openBoqItemModal;
window.closeBoqItemModal = closeBoqItemModal;
window.saveBoqItem = saveBoqItem;
window.editBoqItem = editBoqItem;
window.deleteBoqItem = deleteBoqItem;
window.calculateBoqTotal = calculateBoqTotal;
window.downloadBoqTemplate = downloadBoqTemplate;
window.exportBoqToExcel = exportBoqToExcel;
window.openBoqImportModal = openBoqImportModal;
window.closeBoqImportModal = closeBoqImportModal;
window.previewBoqExcel = previewBoqExcel;
window.importBoqFromExcel = importBoqFromExcel;

console.log('✅ BOQ module loaded');
