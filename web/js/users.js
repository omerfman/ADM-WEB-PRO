// ========== USER MANAGEMENT FUNCTIONS ==========
// Import Firestore functions (will be available globally from firebase-config.js)
// Using window.db and window.auth which are set up in firebase-config.js

const db = window.db;
const auth = window.auth;
const { collection, query, where, getDocs, addDoc, deleteDoc, doc } = window.firestore;

// Open create user modal
function openCreateUserModal() {
  const modal = document.getElementById('createUserModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');
    // Reset form
    const form = document.getElementById('createUserForm');
    if (form) form.reset();
    console.log('✅ User modal opened');
  } else {
    console.warn('⚠️ Modal element not found: createUserModal');
  }
}

// Close create user modal
function closeCreateUserModal() {
  const modal = document.getElementById('createUserModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    console.log('✅ User modal closed');
  }
}

// Handle create user form submission
async function handleCreateUser(event) {
  event.preventDefault();

  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const fullName = document.getElementById('userFullName').value;
  const role = document.getElementById('userRole').value;

  if (!email || !password || !fullName || !role) {
    alert('Lütfen tüm alanları doldurunuz');
    return;
  }

  if (password.length < 6) {
    alert('Şifre en az 6 karakter olmalıdır');
    return;
  }

  if (!window.userCompanyId) {
    alert('Hata: Şirket bilgisi bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.');
    return;
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    console.log('📤 Creating user via API...');
    console.log('   Email:', email);
    console.log('   Role:', role);
    console.log('   Company:', window.userCompanyId);

    // Get API base URL from config or use default
    const apiBaseUrl = window.API_BASE_URL || '';
    
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
        companyId: window.userCompanyId
      })
    });

    const data = await response.json();
    console.log('📥 API Response:', data);

    if (!response.ok) {
      const errorMsg = data.error || data.message || 'Bilinmeyen hata';
      console.error('❌ Error response:', errorMsg);
      alert('Hata: ' + errorMsg);
      return;
    }

    alert('✅ Kullanıcı başarıyla oluşturuldu');
    closeCreateUserModal();
    loadUsers(); // Refresh users list
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Fallback: If API is not available, show helpful message
    alert('Backend API bağlantı hatası: ' + error.message + '\n\nNot: Kullanıcı oluşturma işlemi için backend API\'nin çalışıyor olması gerekir.');
  }
}

// Load users for current company
async function loadUsers() {
  try {
    const userId = auth.currentUser.uid;
    const companyId = window.userCompanyId;
    const userRole = window.userRole;

    console.log('📥 Loading users for company:', companyId, '| Role:', userRole);

    if (!companyId && userRole !== 'super_admin') {
      console.log('❌ No company ID for user');
      const usersSection = document.getElementById('usersSection');
      if (usersSection) {
        const usersList = usersSection.querySelector('#usersList') || 
                         usersSection.querySelector('.users-list');
        if (usersList) {
          usersList.innerHTML = '<p style="text-align: center; color: #999;">Şirket bilgisi bulunamadı</p>';
        }
      }
      return;
    }

    // Get users from Firestore
    const usersRef = collection(db, 'users');
    let q;
    
    // Super admin can see all users
    if (userRole === 'super_admin') {
      q = query(usersRef);
      console.log('🔑 Super admin: Tüm kullanıcılar yükleniyor');
    } else {
      q = query(usersRef, where('companyId', '==', companyId));
    }

    const snapshot = await getDocs(q);
    const users = [];

    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Loaded users:', users.length);
    renderUsersList(users);
  } catch (error) {
    console.error('❌ Error loading users:', error);
    const usersSection = document.getElementById('usersSection');
    if (usersSection) {
      const usersList = usersSection.querySelector('#usersList') || 
                       usersSection.querySelector('.users-list');
      if (usersList) {
        usersList.innerHTML = '<p style="text-align: center; color: #f44336;">Kullanıcılar yüklenirken hata: ' + error.message + '</p>';
      }
    }
  }
}

// Render users list in table
function renderUsersList(users) {
  const usersSection = document.getElementById('usersSection');
  if (!usersSection) return;

  // usersList is inside usersSection in new dashboard.html
  let usersList = usersSection.querySelector('#usersList');
  
  // Fallback to .users-list class if #usersList not found
  if (!usersList) {
    usersList = usersSection.querySelector('.users-list');
  }
  
  if (!usersList) {
    console.warn('⚠️ users list container not found');
    return;
  }

  if (users.length === 0) {
    usersList.innerHTML = '<p style="text-align: center; color: #999;">Henüz kullanıcı yok</p>';
    return;
  }

  usersList.innerHTML = users.map(user => `
    <div class="user-card" style="
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
        <button onclick="editUser('${user.id}')" style="
          background: #2196F3;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        ">Düzenle</button>
        <button onclick="deleteUser('${user.id}')" style="
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
}

// Delete user
async function deleteUser(userId) {
  if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + (await auth.currentUser.getIdToken())
      }
    });

    if (!response.ok) {
      alert('Hata: Kullanıcı silinemedi');
      return;
    }

    alert('✅ Kullanıcı başarıyla silindi');
    loadUsers();
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    alert('Hata: ' + error.message);
  }
}

// Edit user (for future implementation)
function editUser(userId) {
  console.log('Editing user:', userId);
  alert('Kullanıcı düzenleme özelliği yakında eklenecek');
}

// Export functions to window for global access
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.handleCreateUser = handleCreateUser;
window.loadUsers = loadUsers;
window.deleteUser = deleteUser;
window.editUser = editUser;
