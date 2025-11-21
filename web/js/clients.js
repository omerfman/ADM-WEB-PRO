// Clients Management (Customer Users)
import { auth, db, app } from "./firebase-config.js";
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Create a second Firebase app instance for user creation
// This prevents logging out the current admin user
let secondaryApp;
let secondaryAuth;

try {
  secondaryApp = initializeApp({
    apiKey: "AIzaSyAvGQjx51AJZQnQQvLJcB6Onel-M84FhLw",
    authDomain: "adm-web-pro.firebaseapp.com",
    projectId: "adm-web-pro",
    storageBucket: "adm-web-pro.firebasestorage.app",
    messagingSenderId: "877194069372",
    appId: "1:877194069372:web:6e9a5320fafdc20cbb90f9"
  }, "Secondary");
  
  secondaryAuth = getAuth(secondaryApp);
  console.log('✅ Secondary auth instance created');
} catch (error) {
  console.error('❌ Secondary auth creation error:', error);
}

let clients = [];
let filteredClients = [];
let currentCompanyId = null;
let deleteClientId = null;
let sortField = 'createdAt';
let sortDirection = 'desc';

/**
 * Initialize Clients Page
 */
async function initClients() {
  try {
    // Ensure user data is loaded
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

    console.log('👥 Müşteriler yükleniyor, şirket:', currentCompanyId);

    // Load clients
    await loadClients();

    // Setup event listeners
    setupEventListeners();

    console.log('✅ Müşteriler sayfası hazır');

  } catch (error) {
    console.error('❌ Müşteriler yüklenirken hata:', error);
    showAlert('Müşteriler yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Clients from Firestore
 */
async function loadClients() {
  try {
    const clientsRef = collection(db, 'users');
    const userRole = window.userRole;

    let q;
    if (userRole === 'super_admin') {
      // Super admin sees all clients
      q = query(
        clientsRef,
        where('role', '==', 'client'),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Company admin sees only their company's clients
      q = query(
        clientsRef,
        where('role', '==', 'client'),
        where('companyId', '==', currentCompanyId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    
    clients = [];
    snapshot.forEach(docSnap => {
      clients.push({ id: docSnap.id, ...docSnap.data() });
    });

    filteredClients = [...clients];
    renderClientsTable();

    console.log(`✅ ${clients.length} müşteri yüklendi`);

  } catch (error) {
    console.error('❌ Müşteriler yüklenirken hata:', error);
    showAlert('Müşteriler yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Render Clients Table
 */
function renderClientsTable() {
  const tbody = document.getElementById('clientsTableBody');
  
  // Update statistics
  updateStatistics();
  
  if (!filteredClients || filteredClients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
          <p style="color: var(--text-secondary);">Henüz müşteri eklenmemiş</p>
          <button class="btn btn-primary" onclick="openAddClientModal()" style="margin-top: 1rem;">
            ➕ İlk Müşteriyi Ekle
          </button>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredClients.forEach(client => {
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'İsimsiz';
    const createdDate = client.createdAt?.toDate?.() ? 
      new Date(client.createdAt.toDate()).toLocaleDateString('tr-TR') : '-';
    const statusBadge = client.isActive ? 
      '<span class="badge badge-success">✅ Aktif</span>' : 
      '<span class="badge badge-danger">❌ Pasif</span>';
    
    // Project count (will be loaded separately)
    const projectCount = client.projectCount || 0;

    html += `
      <tr>
        <td><strong>${fullName}</strong></td>
        <td>${client.email || '-'}</td>
        <td>${client.phone || '-'}</td>
        <td>${client.company || '-'}</td>
        <td>
          <span class="badge badge-info" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            🏗️ ${projectCount}
          </span>
        </td>
        <td>${createdDate}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons" style="display: flex; gap: 0.5rem; justify-content: center;">
            <button class="btn btn-sm btn-secondary" onclick="viewClientDetails('${client.id}')" title="Detaylar">
              👁️
            </button>
            <button class="btn btn-sm btn-secondary" onclick="editClient('${client.id}')" title="Düzenle">
              ✏️
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClient('${client.id}', '${fullName}')" title="Sil">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * Filter Clients
 */
function filterClients() {
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const sortBySelect = document.getElementById('sortBy');
  
  if (sortBySelect) {
    sortField = sortBySelect.value;
  }

  filteredClients = clients.filter(client => {
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
    const email = (client.email || '').toLowerCase();
    const company = (client.company || '').toLowerCase();
    
    const matchesSearch = fullName.includes(searchText) || 
                         email.includes(searchText) || 
                         company.includes(searchText);
    
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && client.isActive) ||
                         (statusFilter === 'inactive' && !client.isActive);
    
    return matchesSearch && matchesStatus;
  });
  
  // Apply sorting
  sortClients();
  renderClientsTable();
}

/**
 * Open Add Client Modal
 */
function openAddClientModal() {
  document.getElementById('modalTitle').textContent = 'Yeni Müşteri Ekle';
  document.getElementById('clientForm').reset();
  document.getElementById('clientId').value = '';
  document.getElementById('password').required = true;
  document.getElementById('passwordHint').textContent = '(yeni kullanıcı için gerekli)';
  document.getElementById('isActive').checked = true;
  document.getElementById('clientModal').style.display = 'block';
}

/**
 * Edit Client
 */
async function editClient(clientId) {
  try {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Müşteri bulunamadı');
    }

    document.getElementById('modalTitle').textContent = 'Müşteri Düzenle';
    document.getElementById('clientId').value = client.id;
    document.getElementById('firstName').value = client.firstName || '';
    document.getElementById('lastName').value = client.lastName || '';
    document.getElementById('email').value = client.email || '';
    document.getElementById('phone').value = client.phone || '';
    document.getElementById('company').value = client.company || '';
    document.getElementById('taxId').value = client.taxId || '';
    document.getElementById('address').value = client.address || '';
    document.getElementById('notes').value = client.notes || '';
    document.getElementById('isActive').checked = client.isActive !== false;
    document.getElementById('password').required = false;
    document.getElementById('password').value = '';
    document.getElementById('passwordHint').textContent = '(değiştirmek için doldurun)';
    
    document.getElementById('clientModal').style.display = 'block';

  } catch (error) {
    console.error('❌ Müşteri düzenleme hatası:', error);
    showAlert('Müşteri bilgileri yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Handle Save Client
 */
async function handleSaveClient(event) {
  event.preventDefault();

  const clientId = document.getElementById('clientId').value;
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const company = document.getElementById('company').value.trim();
  const taxId = document.getElementById('taxId').value.trim();
  const address = document.getElementById('address').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const password = document.getElementById('password').value;
  const isActive = document.getElementById('isActive').checked;

  try {
    const user = auth.currentUser;

    if (clientId) {
      // UPDATE existing client
      const clientData = {
        firstName,
        lastName,
        email,
        phone,
        company,
        taxId,
        address,
        notes,
        isActive,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };

      await updateDoc(doc(db, 'users', clientId), clientData);
      
      showAlert('✅ Müşteri bilgileri güncellendi', 'success');
      console.log('✅ Müşteri güncellendi:', clientId);

    } else {
      // CREATE new client
      if (!password || password.length < 6) {
        showAlert('❌ Şifre en az 6 karakter olmalıdır', 'danger');
        return;
      }

      if (!secondaryAuth) {
        showAlert('❌ İkincil auth instance oluşturulamadı', 'danger');
        return;
      }

      // Use secondary auth instance to create user (doesn't affect main session)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUserId = userCredential.user.uid;

      console.log('✅ Firebase Auth kullanıcısı oluşturuldu:', newUserId);

      // Create Firestore user document using main auth (admin is still logged in)
      const clientData = {
        uid: newUserId,
        firstName,
        lastName,
        email,
        phone,
        company,
        taxId,
        address,
        notes,
        role: 'client',
        companyId: currentCompanyId,
        isActive,
        isDeleted: false,
        projectCount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await setDoc(doc(db, 'users', newUserId), clientData);
      
      // Sign out from secondary auth immediately
      await secondaryAuth.signOut();
      
      showAlert('✅ Yeni müşteri oluşturuldu', 'success');
      console.log('✅ Yeni müşteri oluşturuldu:', newUserId);
    }

    closeClientModal();
    await loadClients();

  } catch (error) {
    console.error('❌ Müşteri kaydetme hatası:', error);
    
    let errorMessage = 'Müşteri kaydedilemedi';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz e-posta adresi';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Şifre çok zayıf';
    } else {
      errorMessage += ': ' + error.message;
    }
    
    showAlert(errorMessage, 'danger');
  }
}

/**
 * Delete Client (Soft Delete)
 */
function deleteClient(clientId, clientName) {
  deleteClientId = clientId;
  document.getElementById('deleteClientName').textContent = clientName;
  document.getElementById('deleteModal').style.display = 'block';
}

/**
 * Confirm Delete
 */
async function confirmDelete() {
  if (!deleteClientId) return;

  try {
    const user = auth.currentUser;

    await updateDoc(doc(db, 'users', deleteClientId), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: user.uid
    });

    showAlert('✅ Müşteri silindi', 'success');
    console.log('✅ Müşteri silindi:', deleteClientId);

    closeDeleteModal();
    await loadClients();

  } catch (error) {
    console.error('❌ Müşteri silme hatası:', error);
    showAlert('Müşteri silinemedi: ' + error.message, 'danger');
  }
}

/**
 * Close Client Modal
 */
function closeClientModal() {
  document.getElementById('clientModal').style.display = 'none';
  document.getElementById('clientForm').reset();
  document.getElementById('clientId').value = '';
}

/**
 * Close Delete Modal
 */
function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  deleteClientId = null;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  const addBtn = document.getElementById('addClientBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddClientModal);
  }
}

/**
 * Show Alert
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    alert(message);
    return;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} show`;
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}

/**
 * Update Statistics
 */
function updateStatistics() {
  const total = clients.length;
  const active = clients.filter(c => c.isActive).length;
  const inactive = clients.filter(c => !c.isActive).length;
  
  // Calculate monthly additions
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthly = clients.filter(c => {
    if (!c.createdAt?.toDate) return false;
    const createdDate = c.createdAt.toDate();
    return createdDate >= firstDayOfMonth;
  }).length;
  
  document.getElementById('totalClients').textContent = total;
  document.getElementById('activeClients').textContent = active;
  document.getElementById('inactiveClients').textContent = inactive;
  document.getElementById('monthlyClients').textContent = monthly;
}

/**
 * Sort Clients
 */
function sortClients() {
  filteredClients.sort((a, b) => {
    let aVal, bVal;
    
    if (sortField === 'name') {
      aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
      bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
    } else if (sortField === 'company') {
      aVal = (a.company || '').toLowerCase();
      bVal = (b.company || '').toLowerCase();
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt?.toDate?.() || new Date(0);
      bVal = b.createdAt?.toDate?.() || new Date(0);
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Sort Table
 */
function sortTable(field) {
  if (sortField === field) {
    // Toggle direction
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = 'asc';
  }
  
  // Update sort icons
  document.getElementById('sortIconName').textContent = sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '';
  document.getElementById('sortIconCompany').textContent = sortField === 'company' ? (sortDirection === 'asc' ? '▲' : '▼') : '';
  document.getElementById('sortIconCreatedAt').textContent = sortField === 'createdAt' ? (sortDirection === 'asc' ? '▲' : '▼') : '';
  
  sortClients();
  renderClientsTable();
}

/**
 * Clear Filters
 */
function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  if (document.getElementById('sortBy')) {
    document.getElementById('sortBy').value = 'createdAt';
  }
  sortField = 'createdAt';
  sortDirection = 'desc';
  filterClients();
}

/**
 * Export Clients to Excel
 */
function exportClientsToExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      showAlert('❌ Excel kütüphanesi yüklenemedi', 'danger');
      return;
    }
    
    // Prepare data for export
    const exportData = filteredClients.map((client, index) => ({
      'Sıra': index + 1,
      'Ad': client.firstName || '',
      'Soyad': client.lastName || '',
      'E-posta': client.email || '',
      'Telefon': client.phone || '',
      'Şirket': client.company || '',
      'Vergi No': client.taxId || '',
      'Adres': client.address || '',
      'Durum': client.isActive ? 'Aktif' : 'Pasif',
      'Proje Sayısı': client.projectCount || 0,
      'Kayıt Tarihi': client.createdAt?.toDate?.() ? 
        new Date(client.createdAt.toDate()).toLocaleDateString('tr-TR') : '',
      'Notlar': client.notes || ''
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // Sıra
      { wch: 15 }, // Ad
      { wch: 15 }, // Soyad
      { wch: 25 }, // E-posta
      { wch: 15 }, // Telefon
      { wch: 20 }, // Şirket
      { wch: 15 }, // Vergi No
      { wch: 30 }, // Adres
      { wch: 10 }, // Durum
      { wch: 12 }, // Proje Sayısı
      { wch: 15 }, // Kayıt Tarihi
      { wch: 30 }  // Notlar
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
    
    // Generate filename with date
    const filename = `Musteriler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    showAlert(`✅ ${filteredClients.length} müşteri Excel'e aktarıldı`, 'success');
    
  } catch (error) {
    console.error('❌ Excel export hatası:', error);
    showAlert('Excel export hatası: ' + error.message, 'danger');
  }
}

/**
 * View Client Details
 */
async function viewClientDetails(clientId) {
  try {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Müşteri bulunamadı');
    }
    
    // Show client details in a modal or redirect to detail page
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    const details = `
📋 MÜŞTERİ DETAYLARI

👤 Ad Soyad: ${fullName}
📧 E-posta: ${client.email || '-'}
📞 Telefon: ${client.phone || '-'}
🏢 Şirket: ${client.company || '-'}
🆔 Vergi No: ${client.taxId || '-'}
📍 Adres: ${client.address || '-'}
📝 Notlar: ${client.notes || '-'}
✅ Durum: ${client.isActive ? 'Aktif' : 'Pasif'}
🏗️ Proje Sayısı: ${client.projectCount || 0}
📅 Kayıt Tarihi: ${client.createdAt?.toDate?.() ? new Date(client.createdAt.toDate()).toLocaleString('tr-TR') : '-'}
    `;
    
    alert(details);
    
  } catch (error) {
    console.error('❌ Müşteri detay hatası:', error);
    showAlert('Müşteri detayları yüklenemedi: ' + error.message, 'danger');
  }
}

// Export functions to window
window.initClients = initClients;
window.filterClients = filterClients;
window.openAddClientModal = openAddClientModal;
window.editClient = editClient;
window.handleSaveClient = handleSaveClient;
window.deleteClient = deleteClient;
window.confirmDelete = confirmDelete;
window.closeClientModal = closeClientModal;
window.closeDeleteModal = closeDeleteModal;
window.sortTable = sortTable;
window.clearFilters = clearFilters;
window.exportClientsToExcel = exportClientsToExcel;
window.viewClientDetails = viewClientDetails;

export { initClients };
