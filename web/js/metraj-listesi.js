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
 * Load from Contract
 */
async function loadFromContract() {
  if (!currentProjectId) {
    showAlert('Proje ID bulunamadı', 'danger');
    return;
  }

  if (!confirm('Sözleşme kalemleri metraj listesine yüklenecek. Devam etmek istiyor musunuz?')) {
    return;
  }

  try {
    showAlert('📥 Sözleşme kalemleri yükleniyor...', 'info');

    // Get contract items from contract_items collection
    const contractRef = collection(db, 'contract_items');
    const contractQuery = query(
      contractRef,
      where('projectId', '==', currentProjectId)
    );

    const contractSnap = await getDocs(contractQuery);

    if (contractSnap.empty) {
      showAlert('⚠️ Bu proje için sözleşme kalemi bulunamadı. Önce sözleşme oluşturun.', 'warning');
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Check each contract item
    for (const contractDoc of contractSnap.docs) {
      const contractItem = contractDoc.data();

      // Check if already exists in BOQ (by pozNo)
      const existingItem = boqItems.find(item => item.pozNo === contractItem.pozNo);

      if (existingItem) {
        skippedCount++;
        continue;
      }

      // Add to boq_items collection
      const boqRef = collection(db, 'boq_items');
      await addDoc(boqRef, {
        projectId: currentProjectId,
        pozNo: contractItem.pozNo || '',
        category: contractItem.category || 'Diğer',
        description: contractItem.description || contractItem.name || '',
        unit: contractItem.unit || 'Adet',
        quantity: parseFloat(contractItem.contractQuantity) || parseFloat(contractItem.quantity) || 0,
        unitPrice: parseFloat(contractItem.unitPrice) || 0,
        totalPrice: (parseFloat(contractItem.contractQuantity) || parseFloat(contractItem.quantity) || 0) * (parseFloat(contractItem.unitPrice) || 0),
        width: null,
        height: null,
        completedQuantity: 0,
        completedPercentage: 0,
        isDeleted: false,
        importedFrom: 'contract',
        importedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown'
      });

      importedCount++;
    }

    if (importedCount > 0) {
      showAlert(`✅ ${importedCount} sözleşme kalemi metraj listesine aktarıldı!${skippedCount > 0 ? ` (${skippedCount} kalem zaten mevcut, atlandı)` : ''}`, 'success');
      await loadBoqItems();
    } else if (skippedCount > 0) {
      showAlert(`⚠️ Tüm sözleşme kalemleri zaten metraj listesinde mevcut (${skippedCount} kalem)`, 'warning');
    }

  } catch (error) {
    console.error('❌ Sözleşme kalemleri yüklenirken hata:', error);
    showAlert('❌ Hata: ' + error.message, 'danger');
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
    
    // Update summary cards
    updateBoqSummaryCards();
    
    // Apply filters if any
    applyBoqFilters();

  } catch (error) {
    console.error('❌ BOQ kalemleri yüklenemedi:', error);
    showAlert('BOQ kalemleri yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Update BOQ Summary Cards
 */
function updateBoqSummaryCards() {
  if (boqItems.length === 0) {
    // Reset all cards to 0
    const totalItemsEl = document.getElementById('totalBoqItems');
    const totalContractEl = document.getElementById('totalContractValue');
    const totalCompletedEl = document.getElementById('totalCompletedValue');
    const totalRemainingEl = document.getElementById('totalRemainingValue');
    const completionPercentageEl = document.getElementById('completionPercentage');
    const progressBar = document.getElementById('completionProgressBar');
    
    if (totalItemsEl) totalItemsEl.textContent = '0';
    if (totalContractEl) totalContractEl.textContent = '₺0';
    if (totalCompletedEl) totalCompletedEl.textContent = '₺0';
    if (totalRemainingEl) totalRemainingEl.textContent = '₺0';
    if (completionPercentageEl) completionPercentageEl.textContent = '0%';
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.textContent = '0%';
    }
    
    // Clear category breakdown
    const categoryBreakdownEl = document.getElementById('categoryBreakdown');
    if (categoryBreakdownEl) {
      categoryBreakdownEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Henüz BOQ kalemi eklenmemiş</p>';
    }
    
    return;
  }
  
  // Calculate totals
  let totalContractValue = 0;
  let totalCompletedValue = 0;
  const categoryData = {};
  
  boqItems.forEach(item => {
    const totalPrice = parseFloat(item.totalPrice) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const completedQty = parseFloat(item.completedQuantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const completedValue = completedQty * unitPrice;
    
    totalContractValue += totalPrice;
    totalCompletedValue += completedValue;
    
    // Group by category
    const category = item.category || 'Diğer';
    if (!categoryData[category]) {
      categoryData[category] = {
        count: 0,
        totalValue: 0,
        completedValue: 0
      };
    }
    
    categoryData[category].count++;
    categoryData[category].totalValue += totalPrice;
    categoryData[category].completedValue += completedValue;
  });
  
  const totalRemainingValue = totalContractValue - totalCompletedValue;
  const completionPercentage = totalContractValue > 0 
    ? ((totalCompletedValue / totalContractValue) * 100).toFixed(1)
    : 0;
  
  // Update summary cards
  const totalItemsEl = document.getElementById('totalBoqItems');
  const totalContractEl = document.getElementById('totalContractValue');
  const totalCompletedEl = document.getElementById('totalCompletedValue');
  const totalRemainingEl = document.getElementById('totalRemainingValue');
  const completionPercentageEl = document.getElementById('completionPercentage');
  const progressBar = document.getElementById('completionProgressBar');
  
  if (totalItemsEl) totalItemsEl.textContent = boqItems.length.toString();
  if (totalContractEl) totalContractEl.textContent = formatCurrency(totalContractValue);
  if (totalCompletedEl) totalCompletedEl.textContent = formatCurrency(totalCompletedValue);
  if (totalRemainingEl) totalRemainingEl.textContent = formatCurrency(totalRemainingValue);
  if (completionPercentageEl) completionPercentageEl.textContent = completionPercentage + '%';
  
  if (progressBar) {
    progressBar.style.width = completionPercentage + '%';
    progressBar.textContent = completionPercentage + '%';
  }
  
  // Update category breakdown
  const categoryBreakdownEl = document.getElementById('categoryBreakdown');
  if (categoryBreakdownEl) {
    const categoryHTML = Object.entries(categoryData)
      .sort((a, b) => b[1].totalValue - a[1].totalValue) // Sort by value descending
      .map(([category, data]) => {
        const categoryPercentage = totalContractValue > 0
          ? ((data.completedValue / data.totalValue) * 100).toFixed(1)
          : 0;
        
        return `
          <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <strong style="color: var(--text-primary);">${category}</strong>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">${data.count} kalem</span>
            </div>
            <div style="font-size: 1.25rem; font-weight: bold; color: var(--brand-red); margin-bottom: 0.5rem;">
              ${formatCurrency(data.totalValue)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.25rem;">
              <span style="color: var(--text-secondary);">Tamamlanan:</span>
              <span style="color: #43e97b; font-weight: 600;">${formatCurrency(data.completedValue)}</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%); width: ${categoryPercentage}%; transition: width 0.3s;"></div>
            </div>
            <div style="text-align: right; margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-secondary);">
              %${categoryPercentage}
            </div>
          </div>
        `;
      }).join('');
    
    categoryBreakdownEl.innerHTML = categoryHTML;
  }
  
  console.log('✅ BOQ özet kartları güncellendi:', {
    totalItems: boqItems.length,
    totalContractValue,
    totalCompletedValue,
    completionPercentage: completionPercentage + '%'
  });
}

/**
 * Format currency helper
 */
function formatCurrency(amount) {
  return '₺' + parseFloat(amount || 0).toLocaleString('tr-TR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
    <div class="boq-header-actions">
      <div class="boq-info">
        <h3>📋 Metraj Listesi (BOQ)</h3>
        <p>${currentProject?.name || 'Proje'} - ${items.length} Kalem</p>
      </div>
      <div class="boq-action-buttons">
        <button class="btn btn-success" onclick="loadFromContract()" style="margin-right: 0.5rem;">
          📥 Sözleşmeden Yükle
        </button>
        <button class="btn btn-primary" onclick="addNewBoqItemInline()">
          ➕ Yeni Kalem Ekle
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="boq-filters">
      <input type="text" id="boqSearchInput" placeholder="🔍 Poz No, Açıklama veya Kategori ile ara..." 
        class="filter-input">
      <select id="boqCategoryFilter" class="filter-select">
        <option value="">Tüm Kategoriler</option>
        <option value="Hafriyat ve Temel">Hafriyat ve Temel</option>
        <option value="Kaba İnşaat">Kaba İnşaat</option>
        <option value="İnce İşler">İnce İşler</option>
        <option value="Tesisat">Tesisat</option>
        <option value="Elektrik">Elektrik</option>
        <option value="Dış Cephe">Dış Cephe</option>
        <option value="Çevre Düzenlemesi">Çevre Düzenlemesi</option>
        <option value="Diğer">Diğer</option>
      </select>
      <select id="boqSortFilter" class="filter-select">
        <option value="poz-asc">Poz No (A-Z)</option>
        <option value="poz-desc">Poz No (Z-A)</option>
        <option value="amount-asc">Tutar (Düşük-Yüksek)</option>
        <option value="amount-desc">Tutar (Yüksek-Düşük)</option>
      </select>
      <button class="btn btn-secondary" onclick="clearBoqFilters()">🔄</button>
    </div>

    <div class="table-responsive">
      <table class="boq-table">
        <thead>
          <tr>
            <th class="th-pozno">Poz No</th>
            <th class="th-category">Kategori</th>
            <th class="th-description">Açıklama</th>
            <th class="th-unit">Birim</th>
            <th class="th-quantity">Miktar</th>
            <th class="th-unitprice">Birim Fiyat</th>
            <th class="th-total">Toplam</th>
            <th class="th-actions">İşlemler</th>
          </tr>
        </thead>
        <tbody id="boqTableBody">
  `;

  if (items.length === 0 && !window.isAddingNewRow) {
    html += `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Henüz BOQ kalemi eklenmemiş</p>
          <button class="btn btn-primary" onclick="addNewBoqItemInline()">
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
        <tr id="boq-row-${item.id}" data-item-id="${item.id}" class="boq-data-row">
          <td class="td-pozno"><strong>${item.pozNo || '-'}</strong></td>
          <td class="td-category"><span class="badge">${item.category || '-'}</span></td>
          <td class="td-description">${item.description || '-'}</td>
          <td class="td-unit">${item.unit || '-'}</td>
          <td class="td-quantity">${quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          <td class="td-unitprice">₺${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
          <td class="td-total"><strong>₺${totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
          <td class="td-actions">
            <button class="btn-icon btn-edit" onclick="editBoqItemInline('${item.id}')" title="Düzenle">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteBoqItem('${item.id}', '${item.pozNo}')" title="Sil">🗑️</button>
          </td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4" class="total-label">TOPLAM:</td>
            <td class="total-quantity">${totalQuantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
            <td></td>
            <td class="total-amount">₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
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
 * Add New BOQ Item Inline
 */
function addNewBoqItemInline() {
  // Prevent multiple new rows
  if (window.isAddingNewRow) {
    showAlert('Lütfen önce mevcut eklemeyi tamamlayın', 'warning');
    return;
  }
  
  window.isAddingNewRow = true;
  
  const tbody = document.getElementById('boqTableBody');
  if (!tbody) {
    renderBoqTable();
    setTimeout(addNewBoqItemInline, 100);
    return;
  }
  
  // Remove empty state if exists
  const emptyState = tbody.querySelector('.empty-state');
  if (emptyState) {
    emptyState.closest('tr').remove();
  }
  
  // Create new row at top
  const newRow = document.createElement('tr');
  newRow.id = 'boq-row-new';
  newRow.className = 'boq-edit-row highlight-new';
  newRow.innerHTML = createEditableRowHTML('new', {
    pozNo: '',
    category: '',
    description: '',
    unit: '',
    quantity: 0,
    unitPrice: 0,
    width: '',
    height: ''
  });
  
  tbody.insertBefore(newRow, tbody.firstChild);
  
  // Focus first input
  setTimeout(() => {
    const firstInput = document.getElementById('edit-pozNo-new');
    if (firstInput) firstInput.focus();
  }, 100);
  
  setupInlineEditListeners('new');
}

/**
 * Edit BOQ Item Inline
 */
function editBoqItemInline(itemId) {
  const item = boqItems.find(i => i.id === itemId);
  if (!item) {
    showAlert('Kalem bulunamadı', 'danger');
    return;
  }
  
  const row = document.getElementById(`boq-row-${itemId}`);
  if (!row) return;
  
  row.className = 'boq-edit-row';
  row.innerHTML = createEditableRowHTML(itemId, item);
  
  setupInlineEditListeners(itemId);
}

/**
 * Create Editable Row HTML
 */
function createEditableRowHTML(itemId, item) {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const width = parseFloat(item.width) || '';
  const height = parseFloat(item.height) || '';
  const isMetrekare = item.unit === 'm²';
  
  const categories = [
    'Hafriyat ve Temel',
    'Kaba İnşaat',
    'İnce İşler',
    'Tesisat',
    'Elektrik',
    'Dış Cephe',
    'Çevre Düzenlemesi',
    'Diğer'
  ];
  
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
  
  return `
    <td class="td-pozno">
      <input type="text" id="edit-pozNo-${itemId}" value="${item.pozNo || ''}" 
        placeholder="01.01.001" class="inline-input">
    </td>
    <td class="td-category">
      <select id="edit-category-${itemId}" class="inline-select">
        <option value="">Seçiniz</option>
        ${categories.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
      </select>
    </td>
    <td class="td-description">
      <input type="text" id="edit-description-${itemId}" value="${item.description || ''}" 
        placeholder="İş kalemi açıklaması" class="inline-input">
    </td>
    <td class="td-unit">
      <select id="edit-unit-${itemId}" class="inline-select inline-unit-select">
        <option value="">Seçiniz</option>
        ${units.map(u => {
          const val = u.split(' ')[0];
          return `<option value="${val}" ${item.unit === val ? 'selected' : ''}>${u}</option>`;
        }).join('')}
      </select>
    </td>
    <td class="td-quantity">
      <div id="dimension-inputs-${itemId}" style="display: ${isMetrekare ? 'block' : 'none'};">
        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
          <input type="number" id="edit-width-${itemId}" value="${width}" 
            placeholder="En" step="0.01" class="inline-input-sm" style="width: 60px;">
          <span style="color: var(--text-secondary);">×</span>
          <input type="number" id="edit-height-${itemId}" value="${height}" 
            placeholder="Boy" step="0.01" class="inline-input-sm" style="width: 60px;">
        </div>
      </div>
      <input type="number" id="edit-quantity-${itemId}" value="${quantity}" 
        step="0.01" class="inline-input inline-number" ${isMetrekare ? 'readonly' : ''}>
    </td>
    <td class="td-unitprice">
      <input type="number" id="edit-unitPrice-${itemId}" value="${unitPrice}" 
        step="0.01" placeholder="0.00" class="inline-input inline-number">
    </td>
    <td class="td-total">
      <strong id="edit-total-${itemId}" class="inline-total">₺${(quantity * unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
    </td>
    <td class="td-actions">
      <button class="btn-icon btn-save" onclick="saveInlineEdit('${itemId}')" title="Kaydet">✓</button>
      <button class="btn-icon btn-cancel" onclick="cancelInlineEdit('${itemId}')" title="İptal">✕</button>
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
  const unitSelect = document.getElementById(`edit-unit-${itemId}`);
  const widthInput = document.getElementById(`edit-width-${itemId}`);
  const heightInput = document.getElementById(`edit-height-${itemId}`);
  const dimensionDiv = document.getElementById(`dimension-inputs-${itemId}`);
  
  function updateTotal() {
    const q = parseFloat(quantityInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalDisplay.textContent = '₺' + (q * p).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  }
  
  function updateQuantityFromDimensions() {
    const w = parseFloat(widthInput.value) || 0;
    const h = parseFloat(heightInput.value) || 0;
    const area = w * h;
    quantityInput.value = area.toFixed(2);
    updateTotal();
  }
  
  function handleUnitChange() {
    const selectedUnit = unitSelect.value;
    const isMetrekare = selectedUnit === 'm²';
    
    if (dimensionDiv) {
      dimensionDiv.style.display = isMetrekare ? 'block' : 'none';
    }
    
    if (isMetrekare) {
      quantityInput.setAttribute('readonly', 'readonly');
      quantityInput.style.background = 'var(--bg-tertiary)';
      if (widthInput && heightInput) {
        updateQuantityFromDimensions();
      }
    } else {
      quantityInput.removeAttribute('readonly');
      quantityInput.style.background = 'var(--input-bg)';
    }
  }
  
  if (quantityInput) quantityInput.addEventListener('input', updateTotal);
  if (priceInput) priceInput.addEventListener('input', updateTotal);
  if (unitSelect) unitSelect.addEventListener('change', handleUnitChange);
  if (widthInput) widthInput.addEventListener('input', updateQuantityFromDimensions);
  if (heightInput) heightInput.addEventListener('input', updateQuantityFromDimensions);
  
  // Initialize dimension visibility
  handleUnitChange();
}

/**
 * Save Inline Edit
 */
async function saveInlineEdit(itemId) {
  try {
    const pozNo = document.getElementById(`edit-pozNo-${itemId}`).value.trim();
    const category = document.getElementById(`edit-category-${itemId}`).value;
    const description = document.getElementById(`edit-description-${itemId}`).value.trim();
    const unit = document.getElementById(`edit-unit-${itemId}`).value;
    const quantity = parseFloat(document.getElementById(`edit-quantity-${itemId}`).value) || 0;
    const unitPrice = parseFloat(document.getElementById(`edit-unitPrice-${itemId}`).value) || 0;
    const totalPrice = quantity * unitPrice;
    
    // Get dimension data if unit is m²
    let width = null;
    let height = null;
    if (unit === 'm²') {
      const widthInput = document.getElementById(`edit-width-${itemId}`);
      const heightInput = document.getElementById(`edit-height-${itemId}`);
      if (widthInput && heightInput) {
        width = parseFloat(widthInput.value) || null;
        height = parseFloat(heightInput.value) || null;
      }
    }
    
    if (!pozNo || !description || !category || !unit) {
      showAlert('Zorunlu alanları doldurunuz (Poz No, Kategori, Açıklama, Birim)', 'danger');
      return;
    }
    
    if (itemId === 'new') {
      // Add new item to Firestore
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
        width,
        height,
        isDeleted: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown'
      });
      
      showAlert('✅ Yeni BOQ kalemi eklendi', 'success');
      window.isAddingNewRow = false;
    } else {
      // Update existing item in Firestore
      const itemRef = doc(db, 'boq_items', itemId);
      await updateDoc(itemRef, {
        pozNo,
        category,
        description,
        unit,
        quantity,
        unitPrice,
        totalPrice,
        width,
        height,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });
      
      showAlert('✅ BOQ kalemi güncellendi', 'success');
    }
    
    // Reload items
    await loadBoqItems();
    
  } catch (error) {
    console.error('❌ BOQ kalemi kaydedilirken hata:', error);
    showAlert('❌ Hata: ' + error.message, 'danger');
  }
}

/**
 * Cancel Inline Edit
 */
function cancelInlineEdit(itemId) {
  if (itemId === 'new') {
    window.isAddingNewRow = false;
  }
  
  // Reload items to restore original row
  loadBoqItems();
}

/**
 * Edit BOQ Item (Old modal version - keeping for compatibility)
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

// Export to window for global access IMMEDIATELY (before auth check)
console.log('📋 Metraj modülü yükleniyor - fonksiyonlar export ediliyor...');
window.initMetrajListesi = initMetrajListesi;
window.loadBoqItems = loadBoqItems;
window.updateBoqSummaryCards = updateBoqSummaryCards;
window.loadFromContract = loadFromContract;
window.applyBoqFilters = applyBoqFilters;
window.clearBoqFilters = clearBoqFilters;
window.addNewBoqItemInline = addNewBoqItemInline;
window.editBoqItemInline = editBoqItemInline;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.deleteBoqItem = deleteBoqItem;
window.openAddBoqItemModal = openAddBoqItemModal;
window.closeAddBoqItemModal = closeAddBoqItemModal;
window.saveBoqItem = saveBoqItem;
window.editBoqItem = editBoqItem;
window.openEditBoqItemModal = openEditBoqItemModal;
window.closeEditBoqItemModal = closeEditBoqItemModal;
window.updateBoqItem = updateBoqItem;
console.log('✅ Metraj modülü fonksiyonları export edildi:', {
  addNewBoqItemInline: !!window.addNewBoqItemInline,
  editBoqItemInline: !!window.editBoqItemInline,
  loadBoqItems: !!window.loadBoqItems,
  updateBoqSummaryCards: !!window.updateBoqSummaryCards,
  loadFromContract: !!window.loadFromContract,
  clearBoqFilters: !!window.clearBoqFilters
});

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
