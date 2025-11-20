/**
 * Teklif (Proposal) Page - Inline Editing System
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
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let currentProjectId = null;
let teklifItems = [];
let teklifMetadata = {};
window.isAddingNewRow = false;

// Category names
const categoryNames = {
  hafriyat: 'Hafriyat',
  kaba: 'Kaba İnşaat',
  ince: 'İnce İnşaat',
  tesisat: 'Tesisat',
  elektrik: 'Elektrik',
  diger: 'Diğer',
  earthwork: 'Hafriyat',
  concrete: 'Beton',
  steel: 'Demir',
  masonry: 'Duvar',
  plaster: 'Sıva',
  electrical: 'Elektrik',
  plumbing: 'Tesisat',
  finishing: 'Kaplama',
  other: 'Diğer'
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
 * Load Teklif Data
 */
export async function loadTeklif() {
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

    // Load teklif metadata
    const teklifDocRef = doc(db, 'teklif_metadata', projectId);
    const teklifDoc = await getDoc(teklifDocRef);
    
    if (teklifDoc.exists()) {
      teklifMetadata = teklifDoc.data();
      
      // Update UI with metadata
      document.getElementById('proposalNo').textContent = teklifMetadata.proposalNumber || `TKL-${projectId.substring(0, 8)}`;
      
      if (teklifMetadata.createdAt) {
        document.getElementById('proposalDate').textContent = teklifMetadata.createdAt.toDate().toLocaleDateString('tr-TR');
      }
      
      if (teklifMetadata.validUntil) {
        const validDate = teklifMetadata.validUntil.toDate();
        const today = new Date();
        const diffDays = Math.ceil((validDate - today) / (1000 * 60 * 60 * 24));
        document.getElementById('validUntil').textContent = diffDays > 0 ? `${diffDays} gün` : 'Süresi doldu';
      }
      
      const statusMap = {
        draft: 'Taslak',
        sent: 'Gönderildi',
        accepted: 'Kabul Edildi',
        rejected: 'Reddedildi'
      };
      document.getElementById('proposalStatus').textContent = statusMap[teklifMetadata.status] || 'Taslak';
      
      // Set calculation inputs
      if (teklifMetadata.overheadPercent !== undefined) {
        document.getElementById('overheadPercent').value = teklifMetadata.overheadPercent * 100;
      }
      if (teklifMetadata.profitMargin !== undefined) {
        document.getElementById('profitPercent').value = teklifMetadata.profitMargin * 100;
      }
      if (teklifMetadata.taxRate !== undefined) {
        document.getElementById('vatPercent').value = teklifMetadata.taxRate * 100;
      }
      if (teklifMetadata.paymentTerms) {
        document.getElementById('proposalTerms').value = teklifMetadata.paymentTerms;
      }
    }

    // Load teklif items
    const teklifQuery = query(
      collection(db, 'teklif_items'),
      where('projectId', '==', projectId),
      where('isDeleted', '==', false),
      orderBy('order', 'asc')
    );
    const teklifSnap = await getDocs(teklifQuery);
    teklifItems = [];

    teklifSnap.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      teklifItems.push(item);
    });

    renderTeklifTable();
    calculateProposal();

  } catch (error) {
    console.error('❌ Error loading teklif:', error);
    alert('Teklif verileri yüklenirken hata: ' + error.message);
  }
}

/**
 * Render Teklif Table
 */
function renderTeklifTable() {
  const tbody = document.getElementById('proposalTableBody');
  const footer = document.getElementById('proposalTableFooter');

  if (!tbody) return;

  let totalCost = 0;
  teklifItems.forEach(item => {
    totalCost += (item.quantity * item.unitPrice) || 0;
  });

  let html = '';

  if (teklifItems.length === 0 && !window.isAddingNewRow) {
    html = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">💼</div>
          <p>Henüz teklif kalemi eklenmemiş</p>
          <button class="btn btn-primary" onclick="window.addNewTeklifItemInline()" style="margin-top: 1rem;">
            ➕ İlk Kalemi Ekle
          </button>
        </td>
      </tr>
    `;
    if (footer) footer.style.display = 'none';
  } else {
    teklifItems.forEach((item, index) => {
      const total = (item.quantity || 0) * (item.unitPrice || 0);

      html += `
        <tr id="teklif-row-${item.id}" data-item-id="${item.id}">
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
          <td style="white-space: nowrap;">
            <button class="btn-icon btn-edit" onclick="window.editTeklifItemInline('${item.id}')" title="Düzenle">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteTeklifItem('${item.id}')" title="Sil">🗑️</button>
          </td>
        </tr>
      `;
    });

    if (footer) {
      footer.style.display = 'table-footer-group';
      document.getElementById('footerTotal').textContent = formatCurrency(totalCost);
    }
  }

  tbody.innerHTML = html;
}

/**
 * Add New Teklif Item Inline
 */
window.addNewTeklifItemInline = function() {
  if (window.isAddingNewRow) {
    alert('Lütfen önce mevcut ekleme işlemini tamamlayın');
    return;
  }

  window.isAddingNewRow = true;
  const tbody = document.getElementById('proposalTableBody');
  if (!tbody) return;

  const newRow = document.createElement('tr');
  newRow.id = 'teklif-row-new';
  newRow.className = 'boq-data-row new-row-highlight';
  newRow.innerHTML = createEditableRowHTML('new', {});
  
  tbody.insertBefore(newRow, tbody.firstChild);
  setupInlineEditListeners('new');
  
  const firstInput = document.getElementById('edit-name-new');
  if (firstInput) firstInput.focus();
};

/**
 * Edit Teklif Item Inline
 */
window.editTeklifItemInline = function(itemId) {
  const item = teklifItems.find(i => i.id === itemId);
  if (!item) return;

  const row = document.getElementById(`teklif-row-${itemId}`);
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
  const description = item.description || '';

  return `
    <td>${isNew ? '➕' : teklifItems.findIndex(i => i.id === itemId) + 1}</td>
    <td>
      <input type="text" id="edit-name-${itemId}" value="${name}" 
        placeholder="İş kalemi adı" class="inline-input" style="margin-bottom: 0.25rem;">
      <input type="text" id="edit-description-${itemId}" value="${description}" 
        placeholder="Açıklama (opsiyonel)" class="inline-input" style="font-size: 0.85rem;">
    </td>
    <td>
      <select id="edit-category-${itemId}" class="inline-select">
        <option value="">Seçiniz</option>
        ${Object.entries(categoryNames).filter(([k]) => !k.includes('earthwork')).map(([key, name]) => 
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
    const description = document.getElementById(`edit-description-${itemId}`).value.trim();
    
    if (!name || !category || !unit) {
      alert('❌ Zorunlu alanları doldurunuz (İş Kalemi, Kategori, Birim)');
      return;
    }
    
    if (itemId === 'new') {
      await addDoc(collection(db, 'teklif_items'), {
        projectId: currentProjectId,
        name,
        category,
        unit,
        quantity,
        unitPrice,
        description,
        order: teklifItems.length,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'unknown'
      });
      
      window.isAddingNewRow = false;
      alert('✅ Teklif kalemi eklendi!');
    } else {
      const itemRef = doc(db, 'teklif_items', itemId);
      await updateDoc(itemRef, {
        name,
        category,
        unit,
        quantity,
        unitPrice,
        description,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown'
      });
      
      alert('✅ Teklif kalemi güncellendi!');
    }
    
    await loadTeklif();
    
  } catch (error) {
    console.error('❌ Error saving teklif item:', error);
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
  loadTeklif();
};

/**
 * Delete Teklif Item
 */
window.deleteTeklifItem = async function(itemId) {
  if (!confirm('Bu teklif kalemini silmek istediğinize emin misiniz?')) return;
  
  try {
    await updateDoc(doc(db, 'teklif_items', itemId), {
      isDeleted: true,
      updatedAt: serverTimestamp()
    });
    alert('✅ Teklif kalemi silindi');
    loadTeklif();
  } catch (error) {
    console.error('❌ Error deleting teklif item:', error);
    alert('Silme hatası: ' + error.message);
  }
};

/**
 * Calculate Proposal (Teklif Hesaplama)
 */
window.calculateProposal = function() {
  let subtotal = 0;
  teklifItems.forEach(item => {
    subtotal += (item.quantity || 0) * (item.unitPrice || 0);
  });

  const overheadPercent = parseFloat(document.getElementById('overheadPercent').value) || 0;
  const profitPercent = parseFloat(document.getElementById('profitPercent').value) || 0;
  const vatPercent = parseFloat(document.getElementById('vatPercent').value) || 0;

  const overheadCost = subtotal * (overheadPercent / 100);
  const costWithOverhead = subtotal + overheadCost;
  const profitAmount = costWithOverhead * (profitPercent / 100);
  const priceBeforeVat = costWithOverhead + profitAmount;
  const vatAmount = priceBeforeVat * (vatPercent / 100);
  const grandTotal = priceBeforeVat + vatAmount;

  document.getElementById('subtotalCost').textContent = formatCurrency(subtotal);
  document.getElementById('overheadCost').textContent = formatCurrency(overheadCost);
  document.getElementById('costWithOverhead').textContent = formatCurrency(costWithOverhead);
  document.getElementById('profitAmount').textContent = formatCurrency(profitAmount);
  document.getElementById('priceBeforeVat').textContent = formatCurrency(priceBeforeVat);
  document.getElementById('vatAmount').textContent = formatCurrency(vatAmount);
  document.getElementById('grandTotal').textContent = formatCurrency(grandTotal);
};

/**
 * Update Proposal Terms
 */
window.updateProposalTerms = async function(terms) {
  try {
    const teklifDocRef = doc(db, 'teklif_metadata', currentProjectId);
    const teklifDoc = await getDoc(teklifDocRef);
    
    if (teklifDoc.exists()) {
      await updateDoc(teklifDocRef, { 
        paymentTerms: terms,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(teklifDocRef, {
        projectId: currentProjectId,
        paymentTerms: terms,
        proposalNumber: `TKL-${currentProjectId.substring(0, 8)}`,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    alert('✅ Teklif şartları kaydedildi');
  } catch (error) {
    console.error('❌ Error saving terms:', error);
    alert('Şartlar kaydedilirken hata: ' + error.message);
  }
};

/**
 * Mark Proposal as Sent
 */
window.markProposalAsSent = async function() {
  try {
    const teklifDocRef = doc(db, 'teklif_metadata', currentProjectId);
    await updateDoc(teklifDocRef, {
      status: 'sent',
      sentAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    alert('✅ Teklif gönderildi olarak işaretlendi');
    loadTeklif();
  } catch (error) {
    console.error('❌ Error updating status:', error);
    alert('Durum güncellenirken hata: ' + error.message);
  }
};

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

// Initialize
setTimeout(() => {
  loadTeklif();
}, 200);
