// Metraj Listesi (BOQ) Page - Standalone Logic

import { auth, db } from "./firebase-config.js";
import {
  doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentProjectId = null;
let currentProject = null;
let boqItems = [];

/**
 * Initialize Metraj Listesi Page
 */
async function initMetrajListesi() {
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

    console.log('📋 Metraj listesi yükleniyor:', currentProjectId);

    // Ensure user data is loaded first
    if (!window.userRole && window.loadUserData) {
      console.log('⏳ Kullanıcı verileri yükleniyor...');
      await window.loadUserData();
    }

    // Load project data
    await loadProjectData();
    
    // Load BOQ items
    await loadBoqItems();
    
    console.log('✅ Metraj listesi yüklendi');

  } catch (error) {
    console.error('❌ Metraj listesi yüklenirken hata:', error);
    showAlert('Metraj listesi yüklenemedi: ' + error.message, 'danger');
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
    document.title = `${currentProject.name} - Metraj Listesi - ADM İnşaat`;
    
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
 * Load BOQ Items
 */
async function loadBoqItems() {
  if (!currentProjectId) {
    console.warn('⚠️ loadBoqItems: currentProjectId is null');
    return;
  }
  
  try {
    console.log('📊 BOQ kalemleri yükleniyor...');
    
    // Get BOQ items from boq_items collection
    const boqRef = collection(db, 'boq_items');
    const boqQuery = query(
      boqRef,
      where('projectId', '==', currentProjectId),
      where('isDeleted', '==', false),
      orderBy('pozNo', 'asc')
    );
    
    const boqSnap = await getDocs(boqQuery);
    
    boqItems = [];
    boqSnap.forEach(doc => {
      boqItems.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ${boqItems.length} BOQ kalemi yüklendi`);
    
    // Apply filters if any
    applyBoqFilters();

  } catch (error) {
    console.error('❌ BOQ kalemleri yüklenemedi:', error);
    showAlert('BOQ kalemleri yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Apply BOQ Filters
 */
function applyBoqFilters() {
  const searchInput = document.getElementById('boqSearchInput');
  const categoryFilter = document.getElementById('boqCategoryFilter');
  const sortFilter = document.getElementById('boqSortFilter');
  
  let filteredItems = [...boqItems];
  
  // Search filter
  if (searchInput && searchInput.value.trim()) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.pozNo?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.category?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Category filter
  if (categoryFilter && categoryFilter.value) {
    filteredItems = filteredItems.filter(item => item.category === categoryFilter.value);
  }
  
  // Sort
  if (sortFilter) {
    const sortValue = sortFilter.value || 'poz-asc';
    switch (sortValue) {
      case 'poz-asc':
        filteredItems.sort((a, b) => (a.pozNo || '').localeCompare(b.pozNo || ''));
        break;
      case 'poz-desc':
        filteredItems.sort((a, b) => (b.pozNo || '').localeCompare(a.pozNo || ''));
        break;
      case 'amount-asc':
        filteredItems.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
        break;
      case 'amount-desc':
        filteredItems.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
        break;
    }
  }
  
  renderBoqTable(filteredItems);
}

/**
 * Render BOQ Table
 */
function renderBoqTable(items = boqItems) {
  const container = document.getElementById('boqTableContainer');
  if (!container) {
    console.warn('⚠️ boqTableContainer element not found');
    return;
  }

  // Calculate totals
  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h3 style="margin: 0;">📋 Metraj Listesi (BOQ)</h3>
        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">
          ${currentProject?.name || 'Proje'} - ${items.length} Kalem
        </p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-primary" onclick="openAddBoqItemModal()">
          ➕ Yeni Kalem Ekle
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; margin-bottom: 1.5rem;">
      <input type="text" id="boqSearchInput" placeholder="🔍 Poz No, Açıklama veya Kategori ile ara..." 
        style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
      <select id="boqCategoryFilter" style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
        <option value="">Tüm Kategoriler</option>
        <option value="Kazı">Kazı</option>
        <option value="Beton">Beton</option>
        <option value="Demir">Demir</option>
        <option value="Duvar">Duvar</option>
        <option value="Sıva">Sıva</option>
        <option value="Elektrik">Elektrik</option>
        <option value="Tesisat">Tesisat</option>
        <option value="Diğer">Diğer</option>
      </select>
      <select id="boqSortFilter" style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
        <option value="poz-asc">Poz No (A-Z)</option>
        <option value="poz-desc">Poz No (Z-A)</option>
        <option value="amount-asc">Tutar (Düşük-Yüksek)</option>
        <option value="amount-desc">Tutar (Yüksek-Düşük)</option>
      </select>
      <button class="btn btn-secondary" onclick="clearBoqFilters()">🔄 Temizle</button>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Poz No</th>
            <th>Kategori</th>
            <th style="text-align: left; min-width: 250px;">Açıklama</th>
            <th>Birim</th>
            <th style="text-align: right;">Miktar</th>
            <th style="text-align: right;">Birim Fiyat</th>
            <th style="text-align: right;">Toplam Tutar</th>
            <th style="text-align: center;">İşlemler</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (items.length === 0) {
    html += `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <p>Henüz BOQ kalemi eklenmemiş</p>
          <button class="btn btn-primary" onclick="openAddBoqItemModal()" style="margin-top: 1rem;">
            ➕ İlk Kalemi Ekle
          </button>
        </td>
      </tr>
    `;
  } else {
    items.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalPrice = parseFloat(item.totalPrice) || (quantity * unitPrice);
      
      html += `
        <tr>
          <td><strong>${item.pozNo || '-'}</strong></td>
          <td><span class="badge" style="background: var(--brand-red); color: white;">${item.category || '-'}</span></td>
          <td style="text-align: left;">${item.description || '-'}</td>
          <td>${item.unit || '-'}</td>
          <td style="text-align: right;">${quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">₺${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;"><strong>₺${totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
          <td style="text-align: center;">
            <button class="btn btn-sm" onclick="editBoqItem('${item.id}')" title="Düzenle">✏️</button>
            <button class="btn btn-sm" onclick="deleteBoqItem('${item.id}', '${item.pozNo}')" title="Sil">🗑️</button>
          </td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
        <tfoot>
          <tr style="background: var(--bg-secondary); font-weight: bold;">
            <td colspan="4" style="text-align: right;">TOPLAM:</td>
            <td style="text-align: right;">${totalQuantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            <td></td>
            <td style="text-align: right; color: var(--brand-red);">₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  container.innerHTML = html;
  
  // Re-attach filter event listeners
  setTimeout(() => {
    const searchInput = document.getElementById('boqSearchInput');
    const categoryFilter = document.getElementById('boqCategoryFilter');
    const sortFilter = document.getElementById('boqSortFilter');
    
    if (searchInput) searchInput.addEventListener('input', applyBoqFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyBoqFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyBoqFilters);
  }, 100);
}

/**
 * Open Add BOQ Item Modal
 */
function openAddBoqItemModal() {
  const modal = document.getElementById('addBoqItemModal');
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Close Add BOQ Item Modal
 */
function closeAddBoqItemModal() {
  const modal = document.getElementById('addBoqItemModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  const form = document.getElementById('addBoqItemForm');
  if (form) {
    form.reset();
  }
  
  const totalPrice = document.getElementById('boqTotalPrice');
  if (totalPrice) {
    totalPrice.textContent = '₺0.00';
  }
}

/**
 * Save BOQ Item
 */
async function saveBoqItem(event) {
  event.preventDefault();
  
  if (!currentProjectId) {
    showAlert('Proje ID bulunamadı', 'danger');
    return;
  }
  
  try {
    const pozNo = document.getElementById('boqPozNo').value.trim();
    const category = document.getElementById('boqCategory').value;
    const description = document.getElementById('boqDescription').value.trim();
    const unit = document.getElementById('boqUnit').value;
    const quantity = parseFloat(document.getElementById('boqQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('boqUnitPrice').value) || 0;
    const totalPrice = quantity * unitPrice;
    
    if (!pozNo || !description || !category || !unit) {
      showAlert('Tüm alanları doldurunuz', 'danger');
      return;
    }
    
    // Add to Firestore
    const boqRef = collection(db, 'boq_items');
    await addDoc(boqRef, {
      projectId: currentProjectId,
      pozNo,
      category,
      description,
      unit,
      quantity,
      unitPrice,
      totalPrice,
      isDeleted: false,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'unknown'
    });
    
    showAlert('BOQ kalemi eklendi', 'success');
    closeAddBoqItemModal();
    
    // Reload items
    await loadBoqItems();
    
  } catch (error) {
    console.error('❌ BOQ kalemi eklenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Edit BOQ Item
 */
function editBoqItem(itemId) {
  const item = boqItems.find(i => i.id === itemId);
  if (!item) {
    showAlert('Kalem bulunamadı', 'danger');
    return;
  }
  
  // Populate edit form
  document.getElementById('editBoqId').value = item.id;
  document.getElementById('editBoqPozNo').value = item.pozNo || '';
  document.getElementById('editBoqCategory').value = item.category || '';
  document.getElementById('editBoqDescription').value = item.description || '';
  document.getElementById('editBoqUnit').value = item.unit || '';
  document.getElementById('editBoqQuantity').value = item.quantity || 0;
  document.getElementById('editBoqUnitPrice').value = item.unitPrice || 0;
  
  // Calculate and show total
  const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
  document.getElementById('editBoqTotalPrice').textContent = '₺' + totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  
  // Show modal
  openEditBoqItemModal();
}

/**
 * Open Edit BOQ Item Modal
 */
function openEditBoqItemModal() {
  const modal = document.getElementById('editBoqItemModal');
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Close Edit BOQ Item Modal
 */
function closeEditBoqItemModal() {
  const modal = document.getElementById('editBoqItemModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  const form = document.getElementById('editBoqItemForm');
  if (form) {
    form.reset();
  }
}

/**
 * Update BOQ Item
 */
async function updateBoqItem(event) {
  event.preventDefault();
  
  try {
    const itemId = document.getElementById('editBoqId').value;
    const pozNo = document.getElementById('editBoqPozNo').value.trim();
    const category = document.getElementById('editBoqCategory').value;
    const description = document.getElementById('editBoqDescription').value.trim();
    const unit = document.getElementById('editBoqUnit').value;
    const quantity = parseFloat(document.getElementById('editBoqQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('editBoqUnitPrice').value) || 0;
    const totalPrice = quantity * unitPrice;
    
    if (!pozNo || !description || !category || !unit) {
      showAlert('Tüm alanları doldurunuz', 'danger');
      return;
    }
    
    // Update in Firestore
    const itemRef = doc(db, 'boq_items', itemId);
    await updateDoc(itemRef, {
      pozNo,
      category,
      description,
      unit,
      quantity,
      unitPrice,
      totalPrice,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    });
    
    showAlert('BOQ kalemi güncellendi', 'success');
    closeEditBoqItemModal();
    
    // Reload items
    await loadBoqItems();
    
  } catch (error) {
    console.error('❌ BOQ kalemi güncellenirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Delete BOQ Item
 */
async function deleteBoqItem(itemId, pozNo) {
  if (!confirm(`"${pozNo}" numaralı kalemi silmek istediğinize emin misiniz?`)) {
    return;
  }
  
  try {
    // Soft delete
    const itemRef = doc(db, 'boq_items', itemId);
    await updateDoc(itemRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.email || 'unknown'
    });
    
    showAlert('BOQ kalemi silindi', 'success');
    
    // Reload items
    await loadBoqItems();
    
  } catch (error) {
    console.error('❌ BOQ kalemi silinirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Clear BOQ Filters
 */
function clearBoqFilters() {
  const searchInput = document.getElementById('boqSearchInput');
  const categoryFilter = document.getElementById('boqCategoryFilter');
  const sortFilter = document.getElementById('boqSortFilter');
  
  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (sortFilter) sortFilter.value = 'poz-asc';
  
  applyBoqFilters();
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
window.initMetrajListesi = initMetrajListesi;
window.loadBoqItems = loadBoqItems;
window.applyBoqFilters = applyBoqFilters;
window.clearBoqFilters = clearBoqFilters;
window.openAddBoqItemModal = openAddBoqItemModal;
window.closeAddBoqItemModal = closeAddBoqItemModal;
window.saveBoqItem = saveBoqItem;
window.editBoqItem = editBoqItem;
window.openEditBoqItemModal = openEditBoqItemModal;
window.closeEditBoqItemModal = closeEditBoqItemModal;
window.updateBoqItem = updateBoqItem;
window.deleteBoqItem = deleteBoqItem;

// Auto-initialize when auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Auth state changed - user logged in');
    // Wait a bit for auth.js to load user data
    setTimeout(() => {
      if (window.initMetrajListesi) {
        initMetrajListesi();
      }
    }, 500);
  } else {
    console.log('❌ No user logged in, redirecting...');
    window.location.href = '../login.html';
  }
});
