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
    
    const response = await fetch('/api/users', {
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
    alert('Kullanıcı oluşturma işlemi başarısız oldu. Lütfen tekrar deneyin veya sistem yöneticinize başvurun.');
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

// Store original users for filtering
let allUsers = [];

// Render users list in modern table format
async function renderUsersList(users) {
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
  
  // Calculate project count for each client user
  const usersWithProjectCount = await Promise.all(users.map(async (user) => {
    if (user.role === 'client') {
      try {
        // Count projects where user has permissions
        const projectsRef = collection(db, 'projects');
        const projectsSnapshot = await getDocs(projectsRef);
        
        let projectCount = 0;
        
        for (const projectDoc of projectsSnapshot.docs) {
          const permissionsRef = collection(db, `projects/${projectDoc.id}/project_permissions`);
          const permQuery = query(permissionsRef, where('userId', '==', user.id));
          const permSnapshot = await getDocs(permQuery);
          
          if (!permSnapshot.empty) {
            projectCount++;
          }
        }
        
        return { ...user, projectCount };
      } catch (error) {
        console.error('Error counting projects for user:', user.id, error);
        return { ...user, projectCount: 0 };
      }
    }
    return user;
  }));

  // Store users for filtering
  allUsers = usersWithProjectCount;

  if (usersWithProjectCount.length === 0) {
    usersList.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
        <p style="font-size: 1.1rem; margin-bottom: 1rem;">Henüz müşteri kullanıcısı yok</p>
        <button class="btn btn-primary" onclick="openCreateUserModal()">➕ İlk Müşteriyi Ekle</button>
      </div>
    `;
    return;
  }
  
  // Modern table header with filters and search
  let html = `
    <div class="users-header-actions" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    ">
      <div class="users-info">
        <h3 style="margin: 0; font-size: 1.25rem; color: var(--text-primary);">👥 Müşteri Listesi</h3>
        <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${usersWithProjectCount.length} Müşteri</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateUserModal()">
        ➕ Yeni Müşteri Ekle
      </button>
    </div>

    <!-- Filters -->
    <div class="users-filters" style="
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--card-bg);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    ">
      <input 
        type="text" 
        id="userSearchInput" 
        placeholder="🔍 İsim, email, firma veya telefon ile ara..." 
        style="
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 0.9rem;
        "
      >
      <select id="userStatusFilter" style="
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--input-bg);
        color: var(--text-primary);
        font-size: 0.9rem;
      ">
        <option value="">Tüm Durumlar</option>
        <option value="active">Aktif</option>
        <option value="inactive">Pasif</option>
      </select>
      <select id="userSortFilter" style="
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--input-bg);
        color: var(--text-primary);
        font-size: 0.9rem;
      ">
        <option value="name-asc">İsim (A-Z)</option>
        <option value="name-desc">İsim (Z-A)</option>
        <option value="projects-desc">Proje Sayısı (Çok-Az)</option>
        <option value="projects-asc">Proje Sayısı (Az-Çok)</option>
        <option value="date-desc">Yeni Ekleneler</option>
        <option value="date-asc">Eski Ekleneler</option>
      </select>
      <button class="btn btn-secondary" onclick="clearUserFilters()" style="padding: 0.75rem 1rem;">🔄 Temizle</button>
    </div>

    <div class="table-responsive" style="
      background: var(--card-bg);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    ">
      <table class="users-table" style="
        width: 100%;
        border-collapse: collapse;
      ">
        <thead>
          <tr style="
            background: var(--bg-tertiary);
            border-bottom: 2px solid var(--border-color);
          ">
            <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">👤 Müşteri Bilgileri</th>
            <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">🏢 Firma</th>
            <th style="padding: 1rem; text-align: center; font-weight: 600; color: var(--text-primary);">📞 İletişim</th>
            <th style="padding: 1rem; text-align: center; font-weight: 600; color: var(--text-primary);">📁 Proje Sayısı</th>
            <th style="padding: 1rem; text-align: center; font-weight: 600; color: var(--text-primary);">✅ Durum</th>
            <th style="padding: 1rem; text-align: center; font-weight: 600; color: var(--text-primary);">⚙️ İşlemler</th>
          </tr>
        </thead>
        <tbody id="usersTableBody">
  `;

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

  usersWithProjectCount.forEach(user => {
    const roleIcon = roleIcons[user.role] || '👤';
    const roleLabel = roleLabels[user.role] || user.role;
    const isClient = user.role === 'client';
    const clientInfo = user.clientInfo || {};
    const projectCount = user.projectCount || 0;
    const status = user.status || 'active';
    const statusColor = status === 'active' ? '#4CAF50' : '#999';
    const statusText = status === 'active' ? 'Aktif' : 'Pasif';
    
    html += `
      <tr id="user-row-${user.id}" data-user-id="${user.id}" data-status="${status}" data-projects="${projectCount}" data-created="${user.createdAt?.toMillis() || Date.now()}" style="
        border-bottom: 1px solid var(--border-color);
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='var(--hover-bg)'" onmouseout="this.style.backgroundColor=''">
        <td data-label="👤 Müşteri Bilgileri" style="padding: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              flex-shrink: 0;
            ">${roleIcon}</div>
            <div>
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${user.fullName || user.email}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                📧 ${user.email}
              </div>
            </div>
          </div>
        </td>
        <td data-label="🏢 Firma" style="padding: 1rem;">
          ${clientInfo.companyName ? `
            <div>
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${clientInfo.companyName}
              </div>
              ${clientInfo.taxId ? `
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  🔖 ${clientInfo.taxId}
                </div>
              ` : ''}
              ${clientInfo.contactPerson ? `
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  👤 ${clientInfo.contactPerson}
                </div>
              ` : ''}
            </div>
          ` : '<span style="color: var(--text-secondary);">-</span>'}
        </td>
        <td data-label="📞 İletişim" style="padding: 1rem; text-align: center;">
          ${user.phone ? `
            <div style="font-size: 0.9rem; color: var(--text-primary);">
              📞 ${user.phone}
            </div>
          ` : '<span style="color: var(--text-secondary);">-</span>'}
        </td>
        <td data-label="📁 Proje Sayısı" style="padding: 1rem; text-align: center;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: ${projectCount > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-tertiary)'};
            color: ${projectCount > 0 ? 'white' : 'var(--text-secondary)'};
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.95rem;
          ">
            <span style="font-size: 1.2rem;">📁</span>
            <span>${projectCount}</span>
          </div>
        </td>
        <td data-label="✅ Durum" style="padding: 1rem; text-align: center;">
          <span style="
            display: inline-block;
            padding: 0.4rem 0.9rem;
            background: ${statusColor};
            color: white;
            border-radius: 15px;
            font-size: 0.85rem;
            font-weight: 600;
          ">
            ${statusText}
          </span>
        </td>
        <td data-label="⚙️ İşlemler" style="padding: 1rem;">
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button onclick="manageClientProjects('${user.id}', '${(user.fullName || user.email).replace(/'/g, "\\'")}')"
              class="btn-icon"
              style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Proje Yetkileri"
            >📁 Projeler</button>
            <button onclick="editUser('${user.id}')"
              class="btn-icon"
              style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Düzenle"
            >✏️</button>
            <button onclick="deleteUser('${user.id}')"
              class="btn-icon"
              style="
                background: #f44336;
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Sil"
            >🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  usersList.innerHTML = html;
  
  // Attach filter event listeners
  setTimeout(() => {
    const searchInput = document.getElementById('userSearchInput');
    const statusFilter = document.getElementById('userStatusFilter');
    const sortFilter = document.getElementById('userSortFilter');
    
    if (searchInput) searchInput.addEventListener('input', applyUserFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyUserFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyUserFilters);
  }, 100);
}

// Apply filters to user list
function applyUserFilters() {
  const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('userStatusFilter')?.value || '';
  const sortFilter = document.getElementById('userSortFilter')?.value || 'name-asc';
  
  let filtered = [...allUsers];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(user => {
      const searchFields = [
        user.fullName || '',
        user.email || '',
        user.phone || '',
        user.clientInfo?.companyName || '',
        user.clientInfo?.contactPerson || '',
        user.clientInfo?.taxId || ''
      ].map(f => f.toLowerCase());
      
      return searchFields.some(field => field.includes(searchTerm));
    });
  }
  
  // Apply status filter
  if (statusFilter) {
    filtered = filtered.filter(user => (user.status || 'active') === statusFilter);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortFilter) {
      case 'name-asc':
        return (a.fullName || a.email).localeCompare(b.fullName || b.email, 'tr');
      case 'name-desc':
        return (b.fullName || b.email).localeCompare(a.fullName || a.email, 'tr');
      case 'projects-desc':
        return (b.projectCount || 0) - (a.projectCount || 0);
      case 'projects-asc':
        return (a.projectCount || 0) - (b.projectCount || 0);
      case 'date-desc':
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      case 'date-asc':
        return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
      default:
        return 0;
    }
  });
  
  // Update table body only
  updateUsersTableBody(filtered);
}

// Update only table body (keep headers and filters)
function updateUsersTableBody(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 3rem; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔍</div>
          <p style="font-size: 1.1rem;">Filtrelere uygun müşteri bulunamadı</p>
          <button class="btn btn-secondary" onclick="clearUserFilters()" style="margin-top: 1rem;">🔄 Filtreleri Temizle</button>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  users.forEach(user => {
    const roleIcon = '🏢';
    const clientInfo = user.clientInfo || {};
    const projectCount = user.projectCount || 0;
    const status = user.status || 'active';
    const statusColor = status === 'active' ? '#4CAF50' : '#999';
    const statusText = status === 'active' ? 'Aktif' : 'Pasif';
    
    html += `
      <tr id="user-row-${user.id}" data-user-id="${user.id}" style="
        border-bottom: 1px solid var(--border-color);
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='var(--hover-bg)'" onmouseout="this.style.backgroundColor=''">
        <td data-label="👤 Müşteri Bilgileri" style="padding: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              flex-shrink: 0;
            ">${roleIcon}</div>
            <div>
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${user.fullName || user.email}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                📧 ${user.email}
              </div>
            </div>
          </div>
        </td>
        <td data-label="🏢 Firma" style="padding: 1rem;">
          ${clientInfo.companyName ? `
            <div>
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${clientInfo.companyName}
              </div>
              ${clientInfo.taxId ? `
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  🔖 ${clientInfo.taxId}
                </div>
              ` : ''}
              ${clientInfo.contactPerson ? `
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  👤 ${clientInfo.contactPerson}
                </div>
              ` : ''}
            </div>
          ` : '<span style="color: var(--text-secondary);">-</span>'}
        </td>
        <td data-label="📞 İletişim" style="padding: 1rem; text-align: center;">
          ${user.phone ? `
            <div style="font-size: 0.9rem; color: var(--text-primary);">
              📞 ${user.phone}
            </div>
          ` : '<span style="color: var(--text-secondary);">-</span>'}
        </td>
        <td data-label="📁 Proje Sayısı" style="padding: 1rem; text-align: center;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: ${projectCount > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-tertiary)'};
            color: ${projectCount > 0 ? 'white' : 'var(--text-secondary)'};
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.95rem;
          ">
            <span style="font-size: 1.2rem;">📁</span>
            <span>${projectCount}</span>
          </div>
        </td>
        <td data-label="✅ Durum" style="padding: 1rem; text-align: center;">
          <span style="
            display: inline-block;
            padding: 0.4rem 0.9rem;
            background: ${statusColor};
            color: white;
            border-radius: 15px;
            font-size: 0.85rem;
            font-weight: 600;
          ">
            ${statusText}
          </span>
        </td>
        <td data-label="⚙️ İşlemler" style="padding: 1rem;">
          <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
            <button onclick="manageClientProjects('${user.id}', '${(user.fullName || user.email).replace(/'/g, "\\'")}')"
              style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Proje Yetkileri"
            >📁 Projeler</button>
            <button onclick="editUser('${user.id}')"
              style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Düzenle"
            >✏️</button>
            <button onclick="deleteUser('${user.id}')"
              style="
                background: #f44336;
                color: white;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: transform 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'"
              title="Sil"
            >🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// Clear all filters
function clearUserFilters() {
  const searchInput = document.getElementById('userSearchInput');
  const statusFilter = document.getElementById('userStatusFilter');
  const sortFilter = document.getElementById('userSortFilter');
  
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = '';
  if (sortFilter) sortFilter.value = 'name-asc';
  
  applyUserFilters();
}

// Export functions to window
window.applyUserFilters = applyUserFilters;
window.clearUserFilters = clearUserFilters;// Delete user
async function deleteUser(userId) {
  if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000/api/users' : '/api/users';
    const response = await fetch(`${apiUrl}/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + (await auth.currentUser.getIdToken())
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      alert('Hata: ' + (errorData.error || 'Kullanıcı silinemedi'));
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
