// ========== COMPANY MANAGEMENT FUNCTIONS ==========
// Import Firestore functions (will be available globally from firebase-config.js)
// Using window.db and window.auth which are set up in firebase-config.js

const db = window.db;
const auth = window.auth;
const { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } = window.firestore;

// Open create company modal
function openCreateCompanyModal() {
  console.log('📢 openCreateCompanyModal called');
  const modal = document.getElementById('createCompanyModal');
  console.log('📌 Modal element:', modal);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');
    // Reset form
    const form = document.getElementById('createCompanyForm');
    if (form) form.reset();
    console.log('✅ Company modal opened');
  } else {
    console.warn('⚠️ Modal element not found: createCompanyModal');
  }
}

// Close create company modal
function closeCreateCompanyModal() {
  console.log('📢 closeCreateCompanyModal called');
  const modal = document.getElementById('createCompanyModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    console.log('✅ Company modal closed');
  }
}

// Handle create company form submission
async function handleCreateCompany(event) {
  event.preventDefault();
  console.log('📢 handleCreateCompany called');

  const name = document.getElementById('companyName').value;
  const email = document.getElementById('companyEmail').value;
  const phone = document.getElementById('companyPhone').value;
  const address = document.getElementById('companyAddress').value;

  console.log('📋 Form data:', { name, email, phone, address });

  if (!name || !email) {
    alert('Lütfen şirket adı ve email alanlarını doldurunuz');
    return;
  }

  try {
    console.log('💾 Creating company in Firestore...');
    // Create company in Firestore
    const companyRef = await addDoc(collection(db, 'companies'), {
      name: name,
      email: email,
      phone: phone || '',
      address: address || '',
      createdAt: new Date(),
      createdBy: auth.currentUser.uid,
      status: 'active'
    });

    console.log('✅ Company created:', companyRef.id);
    alert('✅ Şirket başarıyla oluşturuldu');
    closeCreateCompanyModal();
    loadCompanies(); // Refresh companies list
  } catch (error) {
    console.error('❌ Error creating company:', error);
    alert('Hata: ' + error.message);
  }
}

// Load all companies (super_admin only)
async function loadCompanies() {
  try {
    // Check if user is super_admin
    console.log('🔍 Checking user role:', window.userRole);
    
    if (window.userRole !== 'super_admin') {
      console.log('❌ Only super_admin can view all companies');
      const companiesSection = document.getElementById('companiesSection');
      if (companiesSection) {
        const companiesList = companiesSection.querySelector('#companiesList') || 
                             companiesSection.querySelector('.companies-list');
        if (companiesList) {
          companiesList.innerHTML = '<p style="text-align: center; color: #f44336;">❌ Yalnızca super admin şirketleri görüntüleyebilir</p>';
        }
      }
      return;
    }

    console.log('📥 Loading all companies...');

    // Get all companies from Firestore
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    const companies = [];

    snapshot.forEach(doc => {
      companies.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Loaded companies:', companies.length);
    renderCompaniesList(companies);
  } catch (error) {
    console.error('❌ Error loading companies:', error);
    const companiesSection = document.getElementById('companiesSection');
    if (companiesSection) {
      const companiesList = companiesSection.querySelector('#companiesList') || 
                           companiesSection.querySelector('.companies-list');
      if (companiesList) {
        companiesList.innerHTML = '<p style="text-align: center; color: #f44336;">Şirketler yüklenirken hata: ' + error.message + '</p>';
      }
    }
  }
}

// Render companies list
function renderCompaniesList(companies) {
  const companiesSection = document.getElementById('companiesSection');
  if (!companiesSection) return;

  // companiesList is inside companiesSection in new dashboard.html
  let companiesList = companiesSection.querySelector('#companiesList');
  
  // Fallback to .companies-list class if #companiesList not found
  if (!companiesList) {
    companiesList = companiesSection.querySelector('.companies-list');
  }
  
  if (!companiesList) {
    console.warn('⚠️ companies list container not found');
    return;
  }

  if (companies.length === 0) {
    companiesList.innerHTML = '<p style="text-align: center; color: #999;">Henüz şirket yok</p>';
    return;
  }

  companiesList.innerHTML = companies.map(company => {
    const createdDate = company.createdAt 
      ? new Date(company.createdAt.toDate()).toLocaleDateString('tr-TR') 
      : '-';

    return `
      <div class="company-card" data-company-id="${company.id}" style="
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 15px;
      ">
        <div>
          <strong style="font-size: 1.1rem;">${company.name}</strong>
          <div style="font-size: 0.9rem; color: #999; margin-top: 5px;">
            <div>📧 ${company.email}</div>
            ${company.phone ? `<div>📱 ${company.phone}</div>` : ''}
            ${company.address ? `<div>📍 ${company.address}</div>` : ''}
            <div style="margin-top: 5px; font-size: 0.85rem;">
              Oluşturulma: ${createdDate}
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <button onclick="editCompany('${company.id}')" style="
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            white-space: nowrap;
          ">Düzenle</button>
          <button onclick="deleteCompany('${company.id}')" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            white-space: nowrap;
          ">Sil</button>
          <button onclick="viewCompanyUsers('${company.id}')" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            white-space: nowrap;
          ">Kullanıcılar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Delete company
async function deleteCompany(companyId) {
  console.log('📢 deleteCompany called for:', companyId);
  if (!confirm('Bu şirketi silmek istediğinize emin misiniz?\n\n⚠️ Tüm ilişkili veriler (kullanıcılar, projeler) de silinecektir.')) {
    return;
  }

  try {
    console.log('🗑️ Deleting company:', companyId);
    // Delete company
    await deleteDoc(doc(db, 'companies', companyId));

    alert('✅ Şirket başarıyla silindi');
    loadCompanies();
  } catch (error) {
    console.error('❌ Error deleting company:', error);
    alert('Hata: ' + error.message);
  }
}

// Edit company (for future implementation)
function editCompany(companyId) {
  console.log('📢 editCompany called for:', companyId);
  
  // Load company data
  getDoc(doc(db, 'companies', companyId)).then(snapshot => {
    if (!snapshot.exists()) {
      alert('Şirket bulunamadı');
      return;
    }
    
    const company = snapshot.data();
    console.log('📋 Company data:', company);
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editCompanyModal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>✏️ Şirketi Düzenle</h2>
          <button class="modal-close" onclick="document.getElementById('editCompanyModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editCompanyForm" onsubmit="handleEditCompany(event, '${companyId}')">
            <div class="form-group">
              <label for="editCompanyName">Şirket Adı *</label>
              <input type="text" id="editCompanyName" value="${company.name || ''}" placeholder="Şirket adı" required>
            </div>
            <div class="form-group">
              <label for="editCompanyEmail">Şirket E-posta *</label>
              <input type="email" id="editCompanyEmail" value="${company.email || ''}" placeholder="contact@company.com" required>
            </div>
            <div class="form-group">
              <label for="editCompanyPhone">Telefon</label>
              <input type="tel" id="editCompanyPhone" value="${company.phone || ''}" placeholder="+90 XXX XXX XXXX">
            </div>
            <div class="form-group">
              <label for="editCompanyAddress">Adres</label>
              <textarea id="editCompanyAddress" placeholder="Şirket adresi" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; height: 80px;">${company.address || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Kaydet</button>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }).catch(error => {
    console.error('❌ Error loading company:', error);
    alert('Hata: ' + error.message);
  });
}

// Handle edit company form submission
async function handleEditCompany(event, companyId) {
  event.preventDefault();
  console.log('📢 handleEditCompany called for:', companyId);
  
  const name = document.getElementById('editCompanyName').value;
  const email = document.getElementById('editCompanyEmail').value;
  const phone = document.getElementById('editCompanyPhone').value;
  const address = document.getElementById('editCompanyAddress').value;
  
  try {
    console.log('💾 Updating company:', companyId);
    const { updateDoc } = window.firestore;
    await updateDoc(doc(db, 'companies', companyId), {
      name: name,
      email: email,
      phone: phone || '',
      address: address || '',
      updatedAt: new Date(),
      updatedBy: auth.currentUser.uid
    });
    
    console.log('✅ Company updated');
    alert('✅ Şirket başarıyla güncellendi');
    
    // Close modal
    const modal = document.getElementById('editCompanyModal');
    if (modal) modal.remove();
    
    // Reload companies
    loadCompanies();
  } catch (error) {
    console.error('❌ Error updating company:', error);
    alert('Hata: ' + error.message);
  }
}

// View company users
function viewCompanyUsers(companyId) {
  console.log('📢 viewCompanyUsers called for:', companyId);
  
  // Get company name
  const companyCard = document.querySelector(`[data-company-id="${companyId}"]`);
  const companyName = companyCard ? companyCard.querySelector('strong').textContent : companyId;
  
  // Create a modal to show company users
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'companyUsersModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>📋 ${companyName} - Kullanıcılar</h2>
        <button class="modal-close" onclick="document.getElementById('companyUsersModal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <button class="btn btn-primary" onclick="openAddCompanyUserModal('${companyId}')" style="width: auto;">+ Yeni Kullanıcı</button>
        </div>
        <div id="companyUsersList" style="max-height: 400px; overflow-y: auto;">
          <p style="text-align: center; color: #999;">Yükleniyor...</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load company users
  loadCompanyUsersList(companyId);
}

// Load company users list
async function loadCompanyUsersList(companyId) {
  try {
    console.log('📥 Loading users for company:', companyId);
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    
    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('✅ Loaded users:', users.length);
    
    const usersList = document.getElementById('companyUsersList');
    if (!usersList) return;
    
    if (users.length === 0) {
      usersList.innerHTML = '<p style="text-align: center; color: #999;">Bu şirkette henüz kullanıcı yok</p>';
      return;
    }
    
    usersList.innerHTML = users.map(user => `
      <div style="
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <strong>${user.fullName || user.email}</strong>
          <div style="font-size: 0.85rem; color: #999;">
            ${user.email} • ${user.role}
          </div>
        </div>
        <div style="display: flex; gap: 5px;">
          <button onclick="deleteUserFromCompany('${user.id}')" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
          ">Sil</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('❌ Error loading company users:', error);
    const usersList = document.getElementById('companyUsersList');
    if (usersList) {
      usersList.innerHTML = '<p style="text-align: center; color: #f44336;">Hata: ' + error.message + '</p>';
    }
  }
}

// Delete user from company
async function deleteUserFromCompany(userId) {
  if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
    return;
  }
  
  try {
    console.log('🗑️ Deleting user:', userId);
    await deleteDoc(doc(db, 'users', userId));
    
    alert('✅ Kullanıcı başarıyla silindi');
    
    // Refresh the list
    const companyCard = document.querySelector('[data-company-id]');
    if (companyCard) {
      const companyId = companyCard.getAttribute('data-company-id');
      loadCompanyUsersList(companyId);
    }
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    alert('Hata: ' + error.message);
  }
}

// Open add company user modal
function openAddCompanyUserModal(companyId) {
  console.log('📢 openAddCompanyUserModal called for:', companyId);
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'addCompanyUserModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h2>➕ Yeni Kullanıcı Ekle</h2>
        <button class="modal-close" onclick="document.getElementById('addCompanyUserModal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="addCompanyUserForm" onsubmit="handleAddCompanyUser(event, '${companyId}')">
          <div class="form-group">
            <label for="newUserEmail">E-posta *</label>
            <input type="email" id="newUserEmail" placeholder="kullanici@example.com" required>
          </div>
          <div class="form-group">
            <label for="newUserPassword">Şifre *</label>
            <input type="password" id="newUserPassword" placeholder="En az 6 karakter" required minlength="6">
          </div>
          <div class="form-group">
            <label for="newUserFullName">Ad Soyad *</label>
            <input type="text" id="newUserFullName" placeholder="Tam adı girin" required>
          </div>
          <div class="form-group">
            <label for="newUserRole">Rol *</label>
            <select id="newUserRole" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
              <option value="">Seçiniz</option>
              <option value="user">Kullanıcı</option>
              <option value="company_admin">Şirket Admin</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Kullanıcı Oluştur</button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Handle add company user form submission
async function handleAddCompanyUser(event, companyId) {
  event.preventDefault();
  console.log('📢 handleAddCompanyUser called for company:', companyId);
  
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const fullName = document.getElementById('newUserFullName').value;
  const role = document.getElementById('newUserRole').value;
  
  if (!email || !password || !fullName || !role) {
    alert('Lütfen tüm alanları doldurunuz');
    return;
  }
  
  if (password.length < 6) {
    alert('Şifre en az 6 karakter olmalıdır');
    return;
  }
  
  try {
    console.log('📤 Creating user via backend API for company:', companyId);
    
    const idToken = await auth.currentUser.getIdToken();
    
    // Get API base URL from config or use default
    const apiBaseUrl = window.API_BASE_URL || '';
    
    if (!apiBaseUrl) {
      alert('❌ Backend API yapılandırılmamış!\n\nKullanıcı oluşturmak için backend API sunucusu gereklidir.\n\nLütfen admin-api sunucusunu başlatın veya Vercel\'a deploy edin.');
      return;
    }
    
    console.log('🔗 API URL:', `${apiBaseUrl}/api/users`);
    
    const response = await fetch(`${apiBaseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify({
        email: email,
        password: password,
        fullName: fullName,
        role: role,
        companyId: companyId
      })
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    // Get response text first to handle non-JSON errors
    const responseText = await response.text();
    console.log('📥 Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', responseText);
      alert('Sunucu hatası: ' + responseText.substring(0, 200));
      return;
    }
    
    console.log('📥 API Response:', data);
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || 'Bilinmeyen hata';
      console.error('❌ Error response:', errorMsg);
      alert('Hata: ' + errorMsg);
      return;
    }
    
    console.log('✅ User created via API:', data.id);
    alert('✅ Kullanıcı başarıyla oluşturuldu');
    
    // Close modal
    const modal = document.getElementById('addCompanyUserModal');
    if (modal) modal.remove();
    
    // Reload company users list
    loadCompanyUsersList(companyId);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Check if it's a network error (API server not running)
    if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
      alert('❌ Backend API sunucusuna erişilemiyor!\n\n' +
            'Lütfen admin-api sunucusunu başlatın:\n' +
            '1. Terminal\'de: cd admin-api\n' +
            '2. npm install (ilk seferinde)\n' +
            '3. npm start\n\n' +
            'Veya Vercel\'a deploy edin.');
    } else {
      alert('Hata: ' + error.message);
    }
  }
}

// Export functions to window for global access
window.openCreateCompanyModal = openCreateCompanyModal;
window.closeCreateCompanyModal = closeCreateCompanyModal;
window.handleCreateCompany = handleCreateCompany;
window.loadCompanies = loadCompanies;
window.deleteCompany = deleteCompany;
window.editCompany = editCompany;
window.handleEditCompany = handleEditCompany;
window.viewCompanyUsers = viewCompanyUsers;
window.loadCompanyUsersList = loadCompanyUsersList;
window.deleteUserFromCompany = deleteUserFromCompany;
window.openAddCompanyUserModal = openAddCompanyUserModal;
window.handleAddCompanyUser = handleAddCompanyUser;
