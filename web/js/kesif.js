/**
 * Kesif Page - Inline Editing System
 * ADM İnşaat Proje Yönetim Sistemi
 */

import { db, auth } from './firebase-config.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let currentProjectId = null;
let kesifItems = [];
window.isAddingNewRow = false;

// Category names
const categoryNames = {
  hafriyat: 'Hafriyat',
  kaba: 'Kaba İnşaat',
  ince: 'İnce İnşaat',
  tesisat: 'Tesisat',
  elektrik: 'Elektrik',
  diger: 'Diğer'
};

// Risk badges
const riskBadges = {
  low: { class: 'status-approved', text: '🟢 Düşük' },
  medium: { class: 'status-sent', text: '🟡 Orta' },
  high: { class: 'status-rejected', text: '🔴 Yüksek' }
};

// Units
const units = [
  'm² (Metrekare)',
  'm³ (Metreküp)',
  'm (Metre)',
  'mtül (Metretül)',
  'Adet',
  'Kg (Kilogram)',
  'Ton',
  'Lt (Litre)',
  'Takım',
  'Komple'
];

/**
 * Load Kesif Data
 */
export async function loadKesif() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  if (!projectId) {
    window.location.href = '../projeler.html';
    return;
  }

  currentProjectId = projectId;

  try {
    // Load project
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      alert('❌ Proje bulunamadı');
      window.location.href = '../projeler.html';
      return;
    }

    const project = { id: projectDoc.id, ...projectDoc.data() };
    document.getElementById('projectName').textContent = project.name || 'Proje';
    document.getElementById('projectNameBreadcrumb').textContent = project.name || 'Proje';

    // Load kesif items
    const kesifQuery = query(
      collection(db, 'kesif_items'),
      where('projectId', '==', projectId),
      where('isDeleted', '==', false),
      orderBy('order', 'asc')
    );
    const kesifSnap = await getDocs(kesifQuery);
    kesifItems = [];
    let totalCost = 0;

    kesifSnap.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      kesifItems.push(item);
      totalCost += (item.quantity * item.unitPrice) || 0;
    });

    // Load kesif metadata
    const kesifDocRef = doc(db, 'kesif_metadata', projectId);
    const kesifDoc = await getDoc(kesifDocRef);
    const kesifData = kesifDoc.exists() ? kesifDoc.data() : {};

    const profitMargin = kesifData.profitMargin || 0.20;
    const proposalAmount = totalCost * (1 + profitMargin);

    document.getElementById('totalKesifItems').textContent = kesifItems.length;
    document.getElementById('estimatedCost').textContent = formatCurrency(totalCost);
    document.getElementById('profitMargin').textContent = `%${(profitMargin * 100).toFixed(0)}`;
    document.getElementById('proposalAmount').textContent = formatCurrency(proposalAmount);

    if (kesifData.notes) {
      document.getElementById('kesifNotes').value = kesifData.notes;
    }

    if (kesifData.createdAt) {
      document.getElementById('kesifDate').textContent = kesifData.createdAt.toDate().toLocaleDateString('tr-TR');
    }

    renderKesifTable();

  } catch (error) {
    console.error('❌ Error loading kesif:', error);
    alert('Keşif verileri yüklenirken hata: ' + error.message);
  }
}

/**
 * Render Kesif Table
 */
function renderKesifTable() {
  const container = document.getElementById('kesifTableContainer');
  if (!container) return;

  let totalCost = 0;
  kesifItems.forEach(item => {
    totalCost += (item.quantity * item.unitPrice) || 0;
  });

  let html = `
    <!-- Kesif Header Actions -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <h2 style="margin: 0;">📋 Keşif Kalemleri</h2>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <input type="text" id="searchKesif" placeholder="🔍 Ara..." 
          style="padding: 0.5rem 1rem; border: 1px solid var(--border-color); border-radius: 6px; min-width: 200px;">
        <select id="categoryFilter" 
          style="padding: 0.5rem 1rem; border: 1px solid var(--border-color); border-radius: 6px; min-width: 150px;">
          <option value="">Tüm Kategoriler</option>
          ${Object.entries(categoryNames).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="window.addNewKesifItemInline()">
          ➕ Yeni Kalem
        </button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="boq-table">
        <thead>
          <tr>
            <th style="min-width: 60px;">Sıra</th>
            <th style="min-width: 200px;">İş Kalemi</th>
            <th style="min-width: 120px;">Kategori</th>
            <th style="min-width: 80px;">Birim</th>
            <th style="text-align: right; min-width: 100px;">Miktar</th>
            <th style="text-align: right; min-width: 120px;">Birim Fiyat</th>
            <th style="text-align: right; min-width: 130px;">Toplam</th>
            <th style="min-width: 100px;">Risk</th>
            <th style="min-width: 100px;">İşlemler</th>
          </tr>
        </thead>
        <tbody id="kesifTableBody">
  `;

  if (kesifItems.length === 0 && !window.isAddingNewRow) {
    html += `
      <tr>
        <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <p>Henüz keşif kalemi eklenmemiş</p>
          <button class="btn btn-primary" onclick="window.addNewKesifItemInline()" style="margin-top: 1rem;">
            ➕ İlk Kalemi Ekle
          </button>
        </td>
      </tr>
    `;
  } else {
    kesifItems.forEach((item, index) => {
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      const risk = riskBadges[item.risk || 'medium'];

      html += `
        <tr id="kesif-row-${item.id}" data-item-id="${item.id}">
          <td>${index + 1}</td>
          <td>
            <strong>${item.name}</strong>
            ${item.description ? `<br><small style="color: var(--text-secondary);">${item.description}</small>` : ''}
          </td>
          <td><span class="badge">${categoryNames[item.category] || item.category}</span></td>
          <td>${item.unit}</td>
          <td style="text-align: right;">${formatNumber(item.quantity)}</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: right;"><strong>${formatCurrency(total)}</strong></td>
          <td><span class="status-badge ${risk.class}">${risk.text}</span></td>
          <td style="white-space: nowrap;">
            <button class="btn-icon btn-edit" onclick="window.editKesifItemInline('${item.id}')" title="Düzenle">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteKesifItem('${item.id}')" title="Sil">🗑️</button>
          </td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
        <tfoot>
          <tr style="background: var(--bg-secondary); font-weight: bold;">
            <td colspan="6" style="text-align: right; padding: 1rem;">TOPLAM TAHMİNİ MALİYET:</td>
            <td style="text-align: right; color: var(--brand-red); font-size: 1.2rem;">${formatCurrency(totalCost)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Re-attach filter listeners
  setTimeout(() => {
    const searchInput = document.getElementById('searchKesif');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) searchInput.addEventListener('input', applyKesifFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyKesifFilters);
  }, 100);
}

/**
 * Add New Kesif Item Inline
 */
window.addNewKesifItemInline = function() {
  if (window.isAddingNewRow) {
    alert('Lütfen önce mevcut ekleme işlemini tamamlayın');
    return;
  }

  window.isAddingNewRow = true;
  const tbody = document.getElementById('kesifTableBody');
  if (!tbody) return;

  const newRow = document.createElement('tr');
  newRow.id = 'kesif-row-new';
  newRow.className = 'boq-data-row new-row-highlight';
  newRow.innerHTML = createEditableRowHTML('new', {});
  
  // Insert at the beginning
  tbody.insertBefore(newRow, tbody.firstChild);
  
  setupInlineEditListeners('new');
  
  // Focus first input
  const firstInput = document.getElementById('edit-name-new');
  if (firstInput) firstInput.focus();
};

/**
 * Edit Kesif Item Inline
 */
window.editKesifItemInline = function(itemId) {
  const item = kesifItems.find(i => i.id === itemId);
  if (!item) return;

  const row = document.getElementById(`kesif-row-${itemId}`);
  if (!row) return;

  row.innerHTML = createEditableRowHTML(itemId, item);
  setupInlineEditListeners(itemId);
};

/**
 * Create Editable Row HTML
 */
function createEditableRowHTML(itemId, item = {}) {
  const isNew = itemId === 'new';
  const name = item.name || '';
  const category = item.category || '';
  const unit = item.unit || '';
  const quantity = item.quantity || 0;
  const unitPrice = item.unitPrice || 0;
  const risk = item.risk || 'medium';
  const description = item.description || '';

  return `
    <td>${isNew ? '➕' : kesifItems.findIndex(i => i.id === itemId) + 1}</td>
    <td>
      <input type="text" id="edit-name-${itemId}" value="${name}" 
        placeholder="İş kalemi adı" class="inline-input" style="margin-bottom: 0.25rem;">
      <input type="text" id="edit-description-${itemId}" value="${description}" 
        placeholder="Açıklama (opsiyonel)" class="inline-input" style="font-size: 0.85rem;">
    </td>
    <td>
      <select id="edit-category-${itemId}" class="inline-select">
        <option value="">Seçiniz</option>
        ${Object.entries(categoryNames).map(([key, name]) => 
          `<option value="${key}" ${category === key ? 'selected' : ''}>${name}</option>`
        ).join('')}
      </select>
    </td>
    <td>
      <select id="edit-unit-${itemId}" class="inline-select">
        <option value="">Seçiniz</option>
        ${units.map(u => {
          const val = u.split(' ')[0];
          return `<option value="${val}" ${unit === val ? 'selected' : ''}>${u}</option>`;
        }).join('')}
      </select>
    </td>
    <td>
      <input type="number" id="edit-quantity-${itemId}" value="${quantity}" 
        step="0.01" placeholder="0.00" class="inline-input inline-number">
    </td>
    <td>
      <input type="number" id="edit-unitPrice-${itemId}" value="${unitPrice}" 
        step="0.01" placeholder="0.00" class="inline-input inline-number">
    </td>
    <td>
      <strong id="edit-total-${itemId}" class="inline-total">${formatCurrency(quantity * unitPrice)}</strong>
    </td>
    <td>
      <select id="edit-risk-${itemId}" class="inline-select">
        <option value="low" ${risk === 'low' ? 'selected' : ''}>🟢 Düşük</option>
        <option value="medium" ${risk === 'medium' ? 'selected' : ''}>🟡 Orta</option>
        <option value="high" ${risk === 'high' ? 'selected' : ''}>🔴 Yüksek</option>
      </select>
    </td>
    <td style="white-space: nowrap;">
      <button class="btn-icon btn-save" onclick="window.saveInlineEdit('${itemId}')" title="Kaydet">✓</button>
      <button class="btn-icon btn-cancel" onclick="window.cancelInlineEdit('${itemId}')" title="İptal">✕</button>
    </td>
  `;
}

/**
 * Setup Inline Edit Listeners
 */
function setupInlineEditListeners(itemId) {
  const quantityInput = document.getElementById(`edit-quantity-${itemId}`);
  const priceInput = document.getElementById(`edit-unitPrice-${itemId}`);
  const totalDisplay = document.getElementById(`edit-total-${itemId}`);
  
  function updateTotal() {
    const q = parseFloat(quantityInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalDisplay.textContent = formatCurrency(q * p);
  }
  
  if (quantityInput) quantityInput.addEventListener('input', updateTotal);
  if (priceInput) priceInput.addEventListener('input', updateTotal);
}

/**
 * Save Inline Edit
 */
window.saveInlineEdit = async function(itemId) {
  try {
    const name = document.getElementById(`edit-name-${itemId}`).value.trim();
    const category = document.getElementById(`edit-category-${itemId}`).value;
    const unit = document.getElementById(`edit-unit-${itemId}`).value;
    const quantity = parseFloat(document.getElementById(`edit-quantity-${itemId}`).value) || 0;
    const unitPrice = parseFloat(document.getElementById(`edit-unitPrice-${itemId}`).value) || 0;
    const risk = document.getElementById(`edit-risk-${itemId}`).value;
    const description = document.getElementById(`edit-description-${itemId}`).value.trim();
    
    if (!name || !category || !unit) {
      alert('❌ Zorunlu alanları doldurunuz (İş Kalemi, Kategori, Birim)');
      return;
    }
    
    if (itemId === 'new') {
      // Add new item
      await addDoc(collection(db, 'kesif_items'), {
        projectId: currentProjectId,
        name,
        category,
        unit,
        quantity,
        unitPrice,
        risk,
        description,
        order: kesifItems.length,
        isDeleted: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'unknown'
      });
      
      // Create metadata if doesn't exist
      const kesifDocRef = doc(db, 'kesif_metadata', currentProjectId);
      const kesifDoc = await getDoc(kesifDocRef);
      
      if (!kesifDoc.exists()) {
        await setDoc(kesifDocRef, {
          projectId: currentProjectId,
          profitMargin: 0.20,
          status: 'draft',
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || 'unknown',
          updatedAt: serverTimestamp()
        });
      }
      
      window.isAddingNewRow = false;
      alert('✅ Keşif kalemi eklendi!');
    } else {
      // Update existing item
      const itemRef = doc(db, 'kesif_items', itemId);
      await updateDoc(itemRef, {
        name,
        category,
        unit,
        quantity,
        unitPrice,
        risk,
        description,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown'
      });
      
      alert('✅ Keşif kalemi güncellendi!');
    }
    
    await loadKesif();
    
  } catch (error) {
    console.error('❌ Error saving kesif item:', error);
    alert('❌ Hata: ' + error.message);
  }
};

/**
 * Cancel Inline Edit
 */
window.cancelInlineEdit = function(itemId) {
  if (itemId === 'new') {
    window.isAddingNewRow = false;
  }
  loadKesif();
};

/**
 * Delete Kesif Item
 */
window.deleteKesifItem = async function(itemId) {
  if (!confirm('Bu keşif kalemini silmek istediğinize emin misiniz?')) return;
  
  try {
    await updateDoc(doc(db, 'kesif_items', itemId), {
      isDeleted: true
    });
    alert('✅ Keşif kalemi silindi');
    loadKesif();
  } catch (error) {
    console.error('❌ Error deleting kesif item:', error);
    alert('Silme hatası: ' + error.message);
  }
};

/**
 * Update Kesif Notes
 */
window.updateKesifNotes = async function() {
  const notes = document.getElementById('kesifNotes').value;
  
  try {
    const kesifDocRef = doc(db, 'kesif_metadata', currentProjectId);
    const kesifDoc = await getDoc(kesifDocRef);
    
    if (kesifDoc.exists()) {
      await updateDoc(kesifDocRef, { notes });
    } else {
      await setDoc(kesifDocRef, {
        projectId: currentProjectId,
        notes,
        profitMargin: 0.20,
        status: 'draft',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'unknown'
      });
    }
    
    alert('✅ Notlar kaydedildi');
  } catch (error) {
    console.error('❌ Error saving notes:', error);
    alert('Not kaydetme hatası: ' + error.message);
  }
};

/**
 * Apply Kesif Filters
 */
function applyKesifFilters() {
  // Implement filtering logic
  loadKesif();
}

/**
 * Format Currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

/**
 * Format Number
 */
function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0);
}

/**
 * Open Profit Margin Modal
 */
window.openProfitMarginModal = async function() {
  try {
    const modal = document.getElementById('profitMarginModal');
    const slider = document.getElementById('profitMarginSlider');
    
    // Load current profit margin
    const kesifDocRef = doc(db, 'kesif_metadata', currentProjectId);
    const kesifDoc = await getDoc(kesifDocRef);
    const currentMargin = kesifDoc.exists() ? (kesifDoc.data().profitMargin || 0.20) : 0.20;
    
    // Set slider value
    slider.value = Math.round(currentMargin * 100);
    document.getElementById('profitMarginValue').textContent = slider.value;
    
    // Calculate amounts
    const totalCost = kesifItems.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) || 0), 0);
    updateModalCalculations(totalCost, currentMargin);
    
    // Show modal
    modal.style.display = 'block';
    
    // Update calculations on slider change
    slider.oninput = function() {
      document.getElementById('profitMarginValue').textContent = this.value;
      const margin = parseFloat(this.value) / 100;
      updateModalCalculations(totalCost, margin);
    };
    
  } catch (error) {
    console.error('❌ Error opening profit margin modal:', error);
    alert('Modal açılırken hata: ' + error.message);
  }
};

/**
 * Update Modal Calculations
 */
function updateModalCalculations(totalCost, margin) {
  const profitAmount = totalCost * margin;
  const proposalAmount = totalCost * (1 + margin);
  
  document.getElementById('modalEstimatedCost').textContent = formatCurrency(totalCost);
  document.getElementById('modalProfitAmount').textContent = formatCurrency(profitAmount);
  document.getElementById('modalProposalAmount').textContent = formatCurrency(proposalAmount);
}

/**
 * Close Profit Margin Modal
 */
window.closeProfitMarginModal = function() {
  document.getElementById('profitMarginModal').style.display = 'none';
};

/**
 * Save Profit Margin
 */
window.saveProfitMargin = async function() {
  try {
    const slider = document.getElementById('profitMarginSlider');
    const margin = parseFloat(slider.value) / 100;
    
    const kesifDocRef = doc(db, 'kesif_metadata', currentProjectId);
    const kesifDoc = await getDoc(kesifDocRef);
    
    if (kesifDoc.exists()) {
      await updateDoc(kesifDocRef, {
        profitMargin: margin,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(kesifDocRef, {
        projectId: currentProjectId,
        profitMargin: margin,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'unknown'
      });
    }
    
    // Update UI
    document.getElementById('profitMargin').textContent = `%${Math.round(margin * 100)}`;
    
    const totalCost = kesifItems.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) || 0), 0);
    const proposalAmount = totalCost * (1 + margin);
    document.getElementById('proposalAmount').textContent = formatCurrency(proposalAmount);
    
    window.closeProfitMarginModal();
    alert('✅ Kar marjı kaydedildi');
    
  } catch (error) {
    console.error('❌ Error saving profit margin:', error);
    alert('Kar marjı kaydetme hatası: ' + error.message);
  }
};

/**
 * Convert Kesif to Proposal (Teklif)
 */
window.convertToProposal = async function() {
  try {
    if (kesifItems.length === 0) {
      alert('❌ Önce keşif kalemleri eklemelisiniz!');
      return;
    }
    
    if (!confirm(`🎯 Keşif verilerini teklife dönüştürmek istediğinize emin misiniz?\n\n${kesifItems.length} kalem teklif sayfasına aktarılacak.`)) {
      return;
    }
    
    // Get profit margin
    const kesifDocRef = doc(db, 'kesif_metadata', currentProjectId);
    const kesifDoc = await getDoc(kesifDocRef);
    const profitMargin = kesifDoc.exists() ? (kesifDoc.data().profitMargin || 0.20) : 0.20;
    
    // Delete existing teklif items for this project
    const existingTeklifQuery = query(
      collection(db, 'teklif_items'),
      where('projectId', '==', currentProjectId)
    );
    const existingSnap = await getDocs(existingTeklifQuery);
    const deletePromises = existingSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Copy kesif items to teklif_items
    const addPromises = kesifItems.map(item => {
      return addDoc(collection(db, 'teklif_items'), {
        projectId: currentProjectId,
        name: item.name,
        description: item.description || '',
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        riskLevel: item.riskLevel || 'medium',
        order: item.order || 0,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fromKesifId: item.id
      });
    });
    
    await Promise.all(addPromises);
    
    // Create/Update teklif metadata
    const teklifMetaRef = doc(db, 'teklif_metadata', currentProjectId);
    const teklifMetaDoc = await getDoc(teklifMetaRef);
    
    const totalCost = kesifItems.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) || 0), 0);
    const proposalAmount = totalCost * (1 + profitMargin);
    
    if (teklifMetaDoc.exists()) {
      await updateDoc(teklifMetaRef, {
        profitMargin: profitMargin,
        estimatedCost: totalCost,
        proposalAmount: proposalAmount,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown'
      });
    } else {
      await setDoc(teklifMetaRef, {
        projectId: currentProjectId,
        profitMargin: profitMargin,
        estimatedCost: totalCost,
        proposalAmount: proposalAmount,
        discount: 0,
        taxRate: 0.18,
        validUntil: null,
        paymentTerms: '',
        notes: '',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'unknown'
      });
    }
    
    alert(`✅ Keşif başarıyla teklife dönüştürüldü!\n\n${kesifItems.length} kalem aktarıldı.\nToplam: ${formatCurrency(proposalAmount)}`);
    
    // Redirect to teklif page
    if (confirm('Teklif sayfasına gitmek ister misiniz?')) {
      window.location.href = `teklif.html?id=${currentProjectId}`;
    }
    
  } catch (error) {
    console.error('❌ Error converting to proposal:', error);
    alert('Teklife dönüştürme hatası: ' + error.message);
  }
};

/**
 * Export Kesif to Excel
 */
window.exportKesifToExcel = function() {
  try {
    if (kesifItems.length === 0) {
      alert('❌ Dışa aktarılacak keşif kalemi yok!');
      return;
    }

    // Prepare data for Excel
    const excelData = kesifItems.map((item, index) => ({
      'Sıra': index + 1,
      'İş Kalemi': item.name || '',
      'Açıklama': item.description || '',
      'Kategori': getCategoryName(item.category),
      'Birim': item.unit || '',
      'Miktar': item.quantity || 0,
      'Birim Fiyat (₺)': item.unitPrice || 0,
      'Toplam (₺)': (item.quantity * item.unitPrice) || 0,
      'Risk Seviyesi': getRiskName(item.riskLevel)
    }));

    // Add summary row
    const totalCost = kesifItems.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) || 0), 0);
    excelData.push({
      'Sıra': '',
      'İş Kalemi': '',
      'Açıklama': '',
      'Kategori': '',
      'Birim': '',
      'Miktar': '',
      'Birim Fiyat (₺)': 'TOPLAM:',
      'Toplam (₺)': totalCost,
      'Risk Seviyesi': ''
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // Sıra
      { wch: 25 }, // İş Kalemi
      { wch: 35 }, // Açıklama
      { wch: 15 }, // Kategori
      { wch: 12 }, // Birim
      { wch: 12 }, // Miktar
      { wch: 15 }, // Birim Fiyat
      { wch: 15 }, // Toplam
      { wch: 15 }  // Risk
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Keşif');

    // Get project name for filename
    const projectName = document.getElementById('projectName')?.textContent || 'Proje';
    const fileName = `Kesif_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    XLSX.writeFile(wb, fileName);
    
    console.log('✅ Excel exported:', fileName);

  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    alert('Excel\'e aktarma hatası: ' + error.message);
  }
};

/**
 * Export Kesif Template (Empty Excel Template)
 */
window.exportKesifTemplate = function() {
  try {
    // Create template data with example row
    const templateData = [
      {
        'İş Kalemi': 'Örnek: Temel Kazısı',
        'Açıklama': 'Örnek: Eğimli arazide kazı işleri',
        'Kategori': 'hafriyat',
        'Birim': 'm³',
        'Miktar': 100,
        'Birim Fiyat (₺)': 45,
        'Risk Seviyesi': 'medium'
      }
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // İş Kalemi
      { wch: 35 }, // Açıklama
      { wch: 15 }, // Kategori
      { wch: 12 }, // Birim
      { wch: 12 }, // Miktar
      { wch: 15 }, // Birim Fiyat
      { wch: 15 }  // Risk
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Keşif Şablonu');

    // Add instructions sheet
    const instructions = [
      { 'Talimatlar': 'Bu şablonu kullanarak keşif kalemlerini toplu olarak yükleyebilirsiniz.' },
      { 'Talimatlar': '' },
      { 'Talimatlar': '📋 Kategori Değerleri:' },
      { 'Talimatlar': 'hafriyat, kaba, ince, tesisat, elektrik, diger' },
      { 'Talimatlar': '' },
      { 'Talimatlar': '📏 Birim Değerleri:' },
      { 'Talimatlar': 'm², m³, m, mtül, Adet, Kg, Ton, Lt' },
      { 'Talimatlar': '' },
      { 'Talimatlar': '⚠️ Risk Seviyeleri:' },
      { 'Talimatlar': 'low (Düşük), medium (Orta), high (Yüksek)' },
      { 'Talimatlar': '' },
      { 'Talimatlar': '✅ Örnek satırı silin ve kendi verilerinizi girin.' },
      { 'Talimatlar': '✅ İlk satırdaki başlıkları değiştirmeyin.' }
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Talimatlar');

    // Download
    XLSX.writeFile(wb, 'Kesif_Sablonu.xlsx');
    
    console.log('✅ Template exported');

  } catch (error) {
    console.error('❌ Error exporting template:', error);
    alert('Şablon oluşturma hatası: ' + error.message);
  }
};

/**
 * Import Kesif from Excel
 */
window.importKesifFromExcel = async function(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          alert('❌ Excel dosyası boş!');
          return;
        }

        if (!confirm(`📤 ${jsonData.length} kalem içe aktarılacak.\n\nDevam etmek istiyor musunuz?`)) {
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Import each row
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty or summary rows
          if (!row['İş Kalemi'] || row['İş Kalemi'].toString().toLowerCase().includes('toplam')) {
            continue;
          }

          try {
            const kesifItem = {
              projectId: currentProjectId,
              name: row['İş Kalemi'] || '',
              description: row['Açıklama'] || '',
              category: row['Kategori'] || 'diger',
              unit: row['Birim'] || 'Adet',
              quantity: parseFloat(row['Miktar']) || 0,
              unitPrice: parseFloat(row['Birim Fiyat (₺)']) || parseFloat(row['Birim Fiyat']) || 0,
              riskLevel: row['Risk Seviyesi'] || 'medium',
              order: kesifItems.length + successCount,
              isDeleted: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'kesif_items'), kesifItem);
            successCount++;

          } catch (err) {
            console.error(`❌ Error importing row ${i + 1}:`, err);
            errorCount++;
          }
        }

        // Clear file input
        event.target.value = '';

        // Reload kesif
        await loadKesif();

        alert(`✅ İçe aktarma tamamlandı!\n\nBaşarılı: ${successCount}\nHata: ${errorCount}`);

      } catch (error) {
        console.error('❌ Error parsing Excel:', error);
        alert('Excel dosyası okunamadı: ' + error.message);
      }
    };

    reader.readAsArrayBuffer(file);

  } catch (error) {
    console.error('❌ Error importing Excel:', error);
    alert('İçe aktarma hatası: ' + error.message);
  }
};

/**
 * Get Category Name
 */
function getCategoryName(category) {
  const categories = {
    'earthwork': 'Hafriyat',
    'concrete': 'Beton',
    'steel': 'Demir',
    'masonry': 'Duvar',
    'plaster': 'Sıva',
    'electrical': 'Elektrik',
    'plumbing': 'Tesisat',
    'finishing': 'Kaplama',
    'other': 'Diğer',
    'hafriyat': 'Hafriyat',
    'kaba': 'Kaba İnşaat',
    'ince': 'İnce İnşaat',
    'tesisat': 'Tesisat',
    'elektrik': 'Elektrik',
    'diger': 'Diğer'
  };
  return categories[category] || category || 'Diğer';
}

/**
 * Get Risk Name
 */
function getRiskName(risk) {
  const risks = {
    'low': 'Düşük',
    'medium': 'Orta',
    'high': 'Yüksek'
  };
  return risks[risk] || 'Orta';
}

// Initialize
setTimeout(() => {
  loadKesif();
}, 200);
