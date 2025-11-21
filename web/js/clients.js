// Clients Management (Customer Users)
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let clients = [];
let filteredClients = [];
let currentCompanyId = null;
let deleteClientId = null;

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
  
  if (!filteredClients || filteredClients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem;">
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
      '<span class="badge badge-success">Aktif</span>' : 
      '<span class="badge badge-danger">Pasif</span>';

    html += `
      <tr>
        <td><strong>${fullName}</strong></td>
        <td>${client.email || '-'}</td>
        <td>${client.phone || '-'}</td>
        <td>${client.company || '-'}</td>
        <td>${createdDate}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons">
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

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;

      // Create Firestore user document
      const clientData = {
        uid: newUserId,
        firstName,
        lastName,
        email,
        phone,
        company,
        role: 'client',
        companyId: currentCompanyId,
        isActive,
        isDeleted: false,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await setDoc(doc(db, 'users', newUserId), clientData);
      
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

export { initClients };
