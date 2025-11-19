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
  
  // Prepare user data
  const userData = {
    email: email,
    password: password,
    fullName: fullName,
    role: role,
    companyId: window.userCompanyId
  };
  
  // If role is client, add client-specific info
  if (role === 'client') {
    const clientCompanyName = document.getElementById('clientCompanyName')?.value || '';
    const clientContactPerson = document.getElementById('clientContactPerson')?.value || '';
    const clientTaxId = document.getElementById('clientTaxId')?.value || '';
    const clientAddress = document.getElementById('clientAddress')?.value || '';
    
    userData.clientInfo = {
      companyName: clientCompanyName,
      contactPerson: clientContactPerson,
      taxId: clientTaxId,
      address: clientAddress
    };
    
    // Clients start with no authorized projects
    userData.authorizedProjects = [];
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    console.log('📤 Creating user via API...');
    console.log('   Email:', email);
    console.log('   Role:', role);
    console.log('   Company:', window.userCompanyId);
    if (role === 'client') {
      console.log('   Client Info:', userData.clientInfo);
    }

    // Get API base URL from config or use default
    const apiBaseUrl = window.API_BASE_URL || '';
    
    const response = await fetch(`${apiBaseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify(userData)
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
  
  // Role display mapping
  const roleIcons = {
    'super_admin': '👑',
    'company_admin': '🔧',
    'user': '👤',
    'client': '🏢'
  };
  
  const roleLabels = {
    'super_admin': 'Super Admin',
    'company_admin': 'Şirket Admin',
    'user': 'Kullanıcı',
    'client': 'Müşteri'
  };

  usersList.innerHTML = users.map(user => {
    const roleIcon = roleIcons[user.role] || '👤';
    const roleLabel = roleLabels[user.role] || user.role;
    const isClient = user.role === 'client';
    const clientInfo = user.clientInfo || {};
    
    return `
    <div class="user-card" style="
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 1.2rem;">${roleIcon}</span>
            <strong style="font-size: 1rem;">${user.fullName || user.email}</strong>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 30px;">
            ${user.email}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 30px; margin-top: 4px;">
            <span style="background: ${isClient ? '#FF9800' : '#2196F3'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
              ${roleLabel}
            </span>
            ${user.phone ? `• <span>📞 ${user.phone}</span>` : ''}
          </div>
          ${isClient && clientInfo.companyName ? `
            <div style="margin-top: 8px; padding: 8px; background: var(--input-bg); border-radius: 4px; font-size: 0.85rem;">
              <div><strong>🏢 Firma:</strong> ${clientInfo.companyName}</div>
              ${clientInfo.contactPerson ? `<div><strong>👤 Yetkili:</strong> ${clientInfo.contactPerson}</div>` : ''}
              ${clientInfo.taxId ? `<div><strong>🔖 Vergi No:</strong> ${clientInfo.taxId}</div>` : ''}
              ${(user.authorizedProjects && user.authorizedProjects.length > 0) ? 
                `<div style="margin-top: 4px;"><strong>📁 Yetkili Proje:</strong> ${user.authorizedProjects.length} proje</div>` : 
                '<div style="margin-top: 4px; color: #999;">⚠️ Henüz proje yetkisi yok</div>'
              }
            </div>
          ` : ''}
        </div>
        <div style="display: flex; gap: 5px;">
          ${isClient ? `
            <button onclick="manageClientProjects('${user.id}', '${user.fullName || user.email}')" style="
              background: #FF9800;
              color: white;
              border: none;
              padding: 5px 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.85rem;
            ">📁 Projeler</button>
          ` : ''}
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
    </div>
  `;
  }).join('');
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

// Manage client project access
async function manageClientProjects(clientId, clientName) {
  try {
    console.log('📁 Managing projects for client:', clientId);
    
    // Get client's current authorized projects
    const clientDoc = await window.firestore.getDoc(window.firestore.doc(db, 'users', clientId));
    const clientData = clientDoc.data();
    const authorizedProjects = clientData?.authorizedProjects || [];
    
    // Get all projects for current company
    const projectsRef = window.firestore.collection(db, 'projects');
    const q = window.userRole === 'super_admin' 
      ? window.firestore.query(projectsRef)
      : window.firestore.query(projectsRef, window.firestore.where('companyId', '==', window.userCompanyId));
    
    const projectsSnapshot = await window.firestore.getDocs(q);
    const projects = [];
    projectsSnapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    
    // Create modal HTML
    const modalHTML = `
      <div id="clientProjectsModal" class="modal active" style="display: block;">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2>📁 ${clientName} - Proje Yetkilendirme</h2>
            <button class="modal-close" onclick="closeClientProjectsModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
              Bu müşterinin görebileceği projeleri seçin:
            </p>
            ${projects.length === 0 ? 
              '<p style="text-align: center; color: #999;">Henüz proje yok</p>' :
              projects.map(project => `
                <div style="background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                  <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" 
                           class="client-project-checkbox" 
                           value="${project.id}" 
                           ${authorizedProjects.includes(project.id) ? 'checked' : ''}
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">${project.name}</div>
                      <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        📍 ${project.location || 'Konum belirtilmemiş'}
                      </div>
                    </div>
                  </label>
                </div>
              `).join('')
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeClientProjectsModal()">İptal</button>
            <button class="btn btn-primary" onclick="saveClientProjects('${clientId}')">💾 Kaydet</button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
  } catch (error) {
    console.error('❌ Error managing client projects:', error);
    alert('Hata: ' + error.message);
  }
}

// Close client projects modal
function closeClientProjectsModal() {
  const modal = document.getElementById('clientProjectsModal');
  if (modal) {
    modal.remove();
  }
}

// Save client project authorizations
async function saveClientProjects(clientId) {
  try {
    // Get selected project IDs
    const checkboxes = document.querySelectorAll('.client-project-checkbox:checked');
    const selectedProjects = Array.from(checkboxes).map(cb => cb.value);
    
    console.log('💾 Saving client project access:', selectedProjects);
    
    // Update client's authorizedProjects in Firestore
    const clientRef = window.firestore.doc(db, 'users', clientId);
    await window.firestore.updateDoc(clientRef, {
      authorizedProjects: selectedProjects,
      updatedAt: window.firestore.serverTimestamp()
    });
    
    // Also update projects' allowedClients arrays
    const projectsRef = window.firestore.collection(db, 'projects');
    const allProjectsSnapshot = await window.firestore.getDocs(projectsRef);
    
    const batch = window.firestore.writeBatch(db);
    
    allProjectsSnapshot.forEach(projectDoc => {
      const projectRef = projectDoc.ref;
      const currentAllowed = projectDoc.data().allowedClients || [];
      
      if (selectedProjects.includes(projectDoc.id)) {
        // Add client to project's allowedClients if not already there
        if (!currentAllowed.includes(clientId)) {
          batch.update(projectRef, {
            allowedClients: [...currentAllowed, clientId],
            updatedAt: window.firestore.serverTimestamp()
          });
        }
      } else {
        // Remove client from project's allowedClients
        if (currentAllowed.includes(clientId)) {
          batch.update(projectRef, {
            allowedClients: currentAllowed.filter(id => id !== clientId),
            updatedAt: window.firestore.serverTimestamp()
          });
        }
      }
    });
    
    await batch.commit();
    
    alert('✅ Proje yetkileri başarıyla güncellendi');
    closeClientProjectsModal();
    loadUsers(); // Refresh list to show updated count
    
  } catch (error) {
    console.error('❌ Error saving client projects:', error);
    alert('Hata: ' + error.message);
  }
}

// Export functions to window for global access
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.handleCreateUser = handleCreateUser;
window.loadUsers = loadUsers;
window.manageClientProjects = manageClientProjects;
window.closeClientProjectsModal = closeClientProjectsModal;
window.saveClientProjects = saveClientProjects;
window.deleteUser = deleteUser;
window.editUser = editUser;
