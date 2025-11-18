// BOQ (Bill of Quantities) Management Module
import { auth, db } from './firebase-config.js';
import { IMGBB_API_KEY, IMGBB_UPLOAD_URL } from './imgbb-config.js';
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
    
    if (itemId) {
      // Update existing
      await updateDoc(doc(db, 'boq_items', itemId), itemData);
      console.log('✅ BOQ item updated:', itemId);
    } else {
      // Create new
      itemData.createdAt = Timestamp.now();
      itemData.createdBy = user.uid;
      const newDoc = await addDoc(collection(db, 'boq_items'), itemData);
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
        boqItemId: itemId || newDoc.id,
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

// Export functions
window.loadBoq = loadBoq;
window.openBoqItemModal = openBoqItemModal;
window.closeBoqItemModal = closeBoqItemModal;
window.saveBoqItem = saveBoqItem;
window.editBoqItem = editBoqItem;
window.deleteBoqItem = deleteBoqItem;
window.calculateBoqTotal = calculateBoqTotal;

// Stub functions (will implement next)
window.downloadBoqTemplate = () => alert('Şablon indirme özelliği yakında eklenecek');
window.exportBoqToExcel = () => alert('Excel export özelliği yakında eklenecek');
window.openBoqImportModal = () => alert('Excel import özelliği yakında eklenecek');
window.closeBoqImportModal = () => {};
window.previewBoqExcel = () => {};
window.importBoqFromExcel = () => {};

console.log('✅ BOQ module loaded');
