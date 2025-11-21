// Templates Management - Centralized dropdown values
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let templates = {
  boq_categories: [],
  boq_units: [],
  payment_methods: [],
  project_statuses: [],
  stock_categories: [],
  stock_units: []
};

let currentCompanyId = null;

/**
 * Initialize Templates Page
 */
async function initTemplates() {
  try {
    // Ensure user data is loaded first
    if (!window.userRole && window.loadUserData) {
      console.log('⏳ Kullanıcı verileri yükleniyor...');
      await window.loadUserData();
    }

    // Get company ID
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kullanıcı giriş yapmamış');
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data() || {};
    currentCompanyId = userData.companyId || 'default-company';

    console.log('⚙️ Şablonlar yükleniyor, şirket:', currentCompanyId);

    // Load all templates
    await loadAllTemplates();

    console.log('✅ Şablonlar yüklendi');

  } catch (error) {
    console.error('❌ Şablonlar yüklenirken hata:', error);
    showAlert('Şablonlar yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load All Templates
 */
async function loadAllTemplates() {
  await Promise.all([
    loadTemplatesByType('boq_categories'),
    loadTemplatesByType('boq_units'),
    loadTemplatesByType('payment_methods'),
    loadTemplatesByType('project_statuses'),
    loadTemplatesByType('stock_categories'),
    loadTemplatesByType('stock_units')
  ]);
}

/**
 * Load Templates by Type
 */
async function loadTemplatesByType(type) {
  try {
    const templatesRef = collection(db, 'templates');
    const q = query(
      templatesRef,
      where('type', '==', type),
      where('companyId', '==', currentCompanyId),
      where('isDeleted', '==', false),
      orderBy('order', 'asc'),
      orderBy('value', 'asc')
    );

    const snapshot = await getDocs(q);
    
    templates[type] = [];
    snapshot.forEach(doc => {
      templates[type].push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ${type}: ${templates[type].length} şablon yüklendi`);
    
    renderTemplateList(type);

  } catch (error) {
    console.error(`❌ ${type} yüklenirken hata:`, error);
    
    // If no index yet, initialize with defaults
    if (error.code === 'failed-precondition') {
      console.log(`⚠️ ${type} için index bulunamadı, varsayılan değerler yükleniyor...`);
      await initializeDefaultTemplates(type);
      await loadTemplatesByType(type);
    } else {
      showAlert(`${type} yüklenemedi: ${error.message}`, 'danger');
    }
  }
}

/**
 * Initialize Default Templates
 */
async function initializeDefaultTemplates(type) {
  const defaults = {
    boq_categories: [
      'Hafriyat ve Temel',
      'Kaba İnşaat',
      'İnce İşler',
      'Tesisat',
      'Elektrik',
      'Dış Cephe',
      'Çevre Düzenlemesi',
      'Diğer'
    ],
    boq_units: [
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
    ],
    payment_methods: [
      'Nakit',
      'Banka Transferi',
      'Çek',
      'Senet',
      'Kredi Kartı'
    ],
    project_statuses: [
      'Devam Ediyor',
      'Tamamlandı',
      'Beklemede',
      'İptal'
    ],
    stock_categories: [
      'İnşaat Malzemeleri',
      'Elektrik Malzemeleri',
      'Tesisat Malzemeleri',
      'Boya ve Kimyasallar',
      'Ahşap Malzemeler',
      'Metal ve Demir',
      'Diğer'
    ],
    stock_units: [
      'Adet',
      'Kg',
      'Ton',
      'Lt',
      'm',
      'm²',
      'm³',
      'Paket',
      'Koli',
      'Takım'
    ]
  };

  const values = defaults[type] || [];
  
  for (let i = 0; i < values.length; i++) {
    await addDoc(collection(db, 'templates'), {
      type,
      value: values[i],
      description: '',
      isDefault: true,
      isDeleted: false,
      order: i,
      companyId: currentCompanyId,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'system'
    });
  }

  console.log(`✅ ${type} için varsayılan değerler oluşturuldu`);
}

/**
 * Render Template List
 */
function renderTemplateList(type) {
  const listId = type.replace('_', '') + 'List';
  const listEl = document.getElementById(listId);
  
  if (!listEl) {
    console.warn(`⚠️ Liste elementi bulunamadı: ${listId}`);
    return;
  }

  const items = templates[type] || [];

  if (items.length === 0) {
    listEl.innerHTML = `
      <p style="text-align: center; color: var(--text-secondary); padding: 1rem;">
        Henüz şablon eklenmemiş
      </p>
    `;
    return;
  }

  let html = '<div style="display: grid; gap: 0.75rem;">';
  
  items.forEach((item, index) => {
    html += `
      <div class="template-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <strong style="color: var(--text-primary);">${item.value}</strong>
            ${item.isDefault ? '<span style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: var(--brand-red); color: white; border-radius: 4px;">Varsayılan</span>' : ''}
          </div>
          ${item.description ? `<p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">${item.description}</p>` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${index > 0 ? `<button class="btn-icon" onclick="moveTemplateUp('${type}', '${item.id}')" title="Yukarı">⬆️</button>` : ''}
          ${index < items.length - 1 ? `<button class="btn-icon" onclick="moveTemplateDown('${type}', '${item.id}')" title="Aşağı">⬇️</button>` : ''}
          <button class="btn-icon btn-edit" onclick="editTemplate('${type}', '${item.id}')" title="Düzenle">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteTemplate('${type}', '${item.id}', '${item.value}')" title="Sil">🗑️</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  listEl.innerHTML = html;
}

/**
 * Open Add Template Modal
 */
function openAddTemplateModal(type) {
  const modal = document.getElementById('templateModal');
  const title = document.getElementById('templateModalTitle');
  const form = document.getElementById('templateForm');
  
  // Reset form
  form.reset();
  document.getElementById('templateType').value = type;
  document.getElementById('templateId').value = '';
  
  // Set title
  const typeNames = {
    boq_categories: 'BOQ Kategorisi',
    boq_units: 'BOQ Birimi',
    payment_methods: 'Ödeme Yöntemi',
    project_statuses: 'Proje Durumu',
    stock_categories: 'Stok Kategorisi',
    stock_units: 'Stok Birimi'
  };
  
  title.textContent = `Yeni ${typeNames[type]} Ekle`;
  
  modal.style.display = 'block';
  
  // Focus input
  setTimeout(() => {
    document.getElementById('templateValue').focus();
  }, 100);
}

/**
 * Edit Template
 */
function editTemplate(type, templateId) {
  const item = templates[type].find(t => t.id === templateId);
  
  if (!item) {
    showAlert('Şablon bulunamadı', 'danger');
    return;
  }
  
  const modal = document.getElementById('templateModal');
  const title = document.getElementById('templateModalTitle');
  
  // Set title
  const typeNames = {
    boq_categories: 'BOQ Kategorisi',
    boq_units: 'BOQ Birimi',
    payment_methods: 'Ödeme Yöntemi',
    project_statuses: 'Proje Durumu',
    stock_categories: 'Stok Kategorisi',
    stock_units: 'Stok Birimi'
  };
  
  title.textContent = `${typeNames[type]} Düzenle`;
  
  // Populate form
  document.getElementById('templateType').value = type;
  document.getElementById('templateId').value = templateId;
  document.getElementById('templateValue').value = item.value;
  document.getElementById('templateDescription').value = item.description || '';
  document.getElementById('templateIsDefault').checked = item.isDefault || false;
  
  modal.style.display = 'block';
  
  // Focus input
  setTimeout(() => {
    document.getElementById('templateValue').focus();
  }, 100);
}

/**
 * Close Template Modal
 */
function closeTemplateModal() {
  const modal = document.getElementById('templateModal');
  modal.style.display = 'none';
  
  const form = document.getElementById('templateForm');
  form.reset();
}

/**
 * Save Template
 */
async function handleSaveTemplate(event) {
  event.preventDefault();
  
  try {
    const type = document.getElementById('templateType').value;
    const templateId = document.getElementById('templateId').value;
    const value = document.getElementById('templateValue').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const isDefault = document.getElementById('templateIsDefault').checked;
    
    if (!value) {
      showAlert('Değer alanı boş olamaz', 'danger');
      return;
    }
    
    if (templateId) {
      // Update existing
      const templateRef = doc(db, 'templates', templateId);
      await updateDoc(templateRef, {
        value,
        description,
        isDefault,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown'
      });
      
      showAlert('✅ Şablon güncellendi', 'success');
    } else {
      // Add new
      const order = templates[type].length;
      
      await addDoc(collection(db, 'templates'), {
        type,
        value,
        description,
        isDefault,
        isDeleted: false,
        order,
        companyId: currentCompanyId,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown'
      });
      
      showAlert('✅ Şablon eklendi', 'success');
    }
    
    closeTemplateModal();
    await loadTemplatesByType(type);
    
  } catch (error) {
    console.error('❌ Şablon kaydedilirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Delete Template
 */
async function deleteTemplate(type, templateId, value) {
  if (!confirm(`"${value}" şablonunu silmek istediğinize emin misiniz?\n\nBu değeri kullanan mevcut kayıtlar etkilenmeyecek, ancak yeni kayıtlarda bu değer görünmeyecek.`)) {
    return;
  }
  
  try {
    // Soft delete
    const templateRef = doc(db, 'templates', templateId);
    await updateDoc(templateRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.email || 'unknown'
    });
    
    showAlert('✅ Şablon silindi', 'success');
    await loadTemplatesByType(type);
    
  } catch (error) {
    console.error('❌ Şablon silinirken hata:', error);
    showAlert('Hata: ' + error.message, 'danger');
  }
}

/**
 * Move Template Up
 */
async function moveTemplateUp(type, templateId) {
  const items = templates[type];
  const index = items.findIndex(t => t.id === templateId);
  
  if (index <= 0) return;
  
  try {
    // Swap order values
    const currentItem = items[index];
    const previousItem = items[index - 1];
    
    await updateDoc(doc(db, 'templates', currentItem.id), { order: index - 1 });
    await updateDoc(doc(db, 'templates', previousItem.id), { order: index });
    
    await loadTemplatesByType(type);
    
  } catch (error) {
    console.error('❌ Sıralama hatası:', error);
    showAlert('Sıralama değiştirilemedi', 'danger');
  }
}

/**
 * Move Template Down
 */
async function moveTemplateDown(type, templateId) {
  const items = templates[type];
  const index = items.findIndex(t => t.id === templateId);
  
  if (index < 0 || index >= items.length - 1) return;
  
  try {
    // Swap order values
    const currentItem = items[index];
    const nextItem = items[index + 1];
    
    await updateDoc(doc(db, 'templates', currentItem.id), { order: index + 1 });
    await updateDoc(doc(db, 'templates', nextItem.id), { order: index });
    
    await loadTemplatesByType(type);
    
  } catch (error) {
    console.error('❌ Sıralama hatası:', error);
    showAlert('Sıralama değiştirilemedi', 'danger');
  }
}

/**
 * Get Templates by Type (for use in other modules)
 */
async function getTemplatesByType(type, companyId) {
  try {
    const templatesRef = collection(db, 'templates');
    const q = query(
      templatesRef,
      where('type', '==', type),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false),
      orderBy('order', 'asc'),
      orderBy('value', 'asc')
    );

    const snapshot = await getDocs(q);
    const results = [];
    
    snapshot.forEach(doc => {
      results.push(doc.data().value);
    });

    return results;
    
  } catch (error) {
    console.error(`❌ ${type} yüklenemedi:`, error);
    
    // Return defaults if error
    return getDefaultTemplates(type);
  }
}

/**
 * Get Default Templates (fallback)
 */
function getDefaultTemplates(type) {
  const defaults = {
    boq_categories: [
      'Hafriyat ve Temel',
      'Kaba İnşaat',
      'İnce İşler',
      'Tesisat',
      'Elektrik',
      'Dış Cephe',
      'Çevre Düzenlemesi',
      'Diğer'
    ],
    boq_units: [
      'm²', 'm³', 'm', 'mtül', 'Adet', 'Kg', 'Ton', 'Lt', 'Takım', 'Komple'
    ],
    payment_methods: [
      'Nakit', 'Banka Transferi', 'Çek', 'Senet', 'Kredi Kartı'
    ],
    project_statuses: [
      'Devam Ediyor', 'Tamamlandı', 'Beklemede', 'İptal'
    ],
    stock_categories: [
      'İnşaat Malzemeleri',
      'Elektrik Malzemeleri',
      'Tesisat Malzemeleri',
      'Boya ve Kimyasallar',
      'Ahşap Malzemeler',
      'Metal ve Demir',
      'Diğer'
    ],
    stock_units: [
      'Adet', 'Kg', 'Ton', 'Lt', 'm', 'm²', 'm³', 'Paket', 'Koli', 'Takım'
    ]
  };

  return defaults[type] || [];
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

// Export functions
window.initTemplates = initTemplates;
window.openAddTemplateModal = openAddTemplateModal;
window.editTemplate = editTemplate;
window.closeTemplateModal = closeTemplateModal;
window.handleSaveTemplate = handleSaveTemplate;
window.deleteTemplate = deleteTemplate;
window.moveTemplateUp = moveTemplateUp;
window.moveTemplateDown = moveTemplateDown;
window.getTemplatesByType = getTemplatesByType;
window.getDefaultTemplates = getDefaultTemplates;

// Auto-initialize when auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Auth state changed - user logged in');
    // Wait a bit for auth.js to load user data
    setTimeout(() => {
      if (window.initTemplates) {
        initTemplates();
      }
    }, 500);
  } else {
    console.log('❌ No user logged in, redirecting...');
    window.location.href = 'login.html';
  }
});
