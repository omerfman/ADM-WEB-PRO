// ========== EMPLOYEE MANAGEMENT FUNCTIONS ==========
// Employees are essentially users with additional fields

const db = window.db;
const auth = window.auth;
const { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } = window.firestore;

// Open create employee modal
function openCreateEmployeeModal() {
  const modal = document.getElementById('createEmployeeModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('active');
    const form = document.getElementById('createEmployeeForm');
    if (form) form.reset();
    console.log('✅ Employee modal opened');
  }
}

// Close create employee modal
function closeCreateEmployeeModal() {
  const modal = document.getElementById('createEmployeeModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
}

// Handle create employee
async function handleCreateEmployee(event) {
  event.preventDefault();

  const email = document.getElementById('empEmail').value;
  const password = document.getElementById('empPassword').value;
  const fullName = document.getElementById('empFullName').value;
  const role = document.getElementById('empRole').value;
  const phone = document.getElementById('empPhone').value;
  const position = document.getElementById('empPosition').value;

  if (!email || !password || !fullName || !role) {
    alert('Lütfen zorunlu alanları doldurunuz');
    return;
  }

  if (password.length < 6) {
    alert('Şifre en az 6 karakter olmalıdır');
    return;
  }

  if (!window.userCompanyId) {
    alert('Hata: Şirket bilgisi bulunamadı');
    return;
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const apiBaseUrl = window.API_BASE_URL || '';
    
    const response = await fetch(`${apiBaseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role,
        companyId: window.userCompanyId,
        phone: phone || '',
        position: position || ''
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert('Hata: ' + (data.error || data.message || 'Bilinmeyen hata'));
      return;
    }

    alert('✅ Çalışan başarıyla eklendi');
    closeCreateEmployeeModal();
    loadEmployees();
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    alert('Backend API bağlantı hatası: ' + error.message);
  }
}

// Load employees (same as users but displayed differently)
async function loadEmployees() {
  try {
    const companyId = window.userCompanyId;

    if (!companyId) {
      console.log('❌ No company ID');
      const employeesSection = document.getElementById('employeesSection');
      if (employeesSection) {
        const employeesList = employeesSection.querySelector('#employeesList');
        if (employeesList) {
          employeesList.innerHTML = '<p style="text-align: center; color: #999;">Şirket bilgisi bulunamadı</p>';
        }
      }
      return;
    }

    console.log('📥 Loading employees for company:', companyId);

    // Get users/employees from Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    
    const employees = [];
    snapshot.forEach(doc => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Loaded employees:', employees.length);
    renderEmployeesList(employees);
  } catch (error) {
    console.error('❌ Error loading employees:', error);
    const employeesSection = document.getElementById('employeesSection');
    if (employeesSection) {
      const employeesList = employeesSection.querySelector('#employeesList');
      if (employeesList) {
        employeesList.innerHTML = '<p style="text-align: center; color: #f44336;">Çalışanlar yüklenirken hata: ' + error.message + '</p>';
      }
    }
  }
}

// Render employees list
function renderEmployeesList(employees) {
  const employeesSection = document.getElementById('employeesSection');
  if (!employeesSection) return;

  const employeesList = employeesSection.querySelector('#employeesList');
  if (!employeesList) {
    console.warn('⚠️ employees list container not found');
    return;
  }

  if (employees.length === 0) {
    employeesList.innerHTML = '<p style="text-align: center; color: #999;">Henüz çalışan yok</p>';
    return;
  }

  // Apply filters
  const searchTerm = document.getElementById('employeeSearchInput')?.value.toLowerCase() || '';
  const roleFilter = document.getElementById('employeeRoleFilter')?.value || '';
  const statusFilter = document.getElementById('employeeStatusFilter')?.value || '';

  let filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchTerm || 
      (emp.fullName && emp.fullName.toLowerCase().includes(searchTerm)) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm));
    
    const matchesRole = !roleFilter || emp.role === roleFilter;
    const matchesStatus = !statusFilter || emp.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  employeesList.innerHTML = filteredEmployees.map(emp => {
    const roleDisplay = {
      'super_admin': 'Super Admin',
      'company_admin': 'Şirket Yöneticisi',
      'user': 'Kullanıcı'
    };

    const statusColor = emp.status === 'active' ? '#10b981' : '#999';
    const statusText = emp.status === 'active' ? 'Aktif' : 'Pasif';

    return `
      <div class="employee-card" style="
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.25rem;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div>
            <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${emp.fullName || emp.email}</h4>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              📧 ${emp.email}
            </div>
            ${emp.phone ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">📱 ${emp.phone}</div>` : ''}
            ${emp.position ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">💼 ${emp.position}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <span style="
              background: ${statusColor};
              color: white;
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 600;
            ">${statusText}</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
          <div style="font-size: 0.85rem;">
            <strong>Yetki:</strong> ${roleDisplay[emp.role] || emp.role}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="editEmployee('${emp.id}')" class="btn btn-secondary" style="
              padding: 0.5rem 1rem;
              font-size: 0.85rem;
              width: auto;
            ">✏️ Düzenle</button>
            <button onclick="toggleEmployeeStatus('${emp.id}', '${emp.status}')" class="btn ${emp.status === 'active' ? 'btn-secondary' : 'btn-success'}" style="
              padding: 0.5rem 1rem;
              font-size: 0.85rem;
              width: auto;
            ">${emp.status === 'active' ? '🚫 Pasifleştir' : '✅ Aktifleştir'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Edit employee
async function editEmployee(employeeId) {
  try {
    const empDoc = await getDoc(doc(db, 'users', employeeId));
    if (!empDoc.exists()) {
      alert('Çalışan bulunamadı');
      return;
    }

    const empData = empDoc.data();

    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editEmployeeModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>✏️ Çalışan Düzenle</h2>
          <button class="modal-close" onclick="document.getElementById('editEmployeeModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editEmployeeForm" onsubmit="handleEditEmployee(event, '${employeeId}')">
            <div class="form-group">
              <label>Ad Soyad *</label>
              <input type="text" id="editEmpFullName" value="${empData.fullName || ''}" required>
            </div>
            <div class="form-group">
              <label>E-posta</label>
              <input type="email" value="${empData.email}" disabled style="background: var(--bg-tertiary);">
            </div>
            <div class="form-group">
              <label>Telefon</label>
              <input type="tel" id="editEmpPhone" value="${empData.phone || ''}" placeholder="+90 XXX XXX XXXX">
            </div>
            <div class="form-group">
              <label>Pozisyon</label>
              <input type="text" id="editEmpPosition" value="${empData.position || ''}" placeholder="Örn: Şantiye Şefi">
            </div>
            <div class="form-group">
              <label>Yetki Seviyesi *</label>
              <select id="editEmpRole" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                <option value="user" ${empData.role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                <option value="company_admin" ${empData.role === 'company_admin' ? 'selected' : ''}>Şirket Yöneticisi</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ Error loading employee:', error);
    alert('Hata: ' + error.message);
  }
}

// Handle edit employee
async function handleEditEmployee(event, employeeId) {
  event.preventDefault();

  const fullName = document.getElementById('editEmpFullName').value;
  const phone = document.getElementById('editEmpPhone').value;
  const position = document.getElementById('editEmpPosition').value;
  const role = document.getElementById('editEmpRole').value;

  try {
    const updateData = {
      fullName,
      phone: phone || '',
      position: position || '',
      role,
      updatedAt: new Date(),
      updatedBy: auth.currentUser.uid
    };

    await updateDoc(doc(db, 'users', employeeId), updateData);

    // Update custom claims if role changed
    const idToken = await auth.currentUser.getIdToken();
    const apiBaseUrl = window.API_BASE_URL || '';
    
    await fetch(`${apiBaseUrl}/api/users/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify(updateData)
    });

    alert('✅ Çalışan bilgileri güncellendi');
    document.getElementById('editEmployeeModal').remove();
    loadEmployees();
  } catch (error) {
    console.error('❌ Error updating employee:', error);
    alert('Hata: ' + error.message);
  }
}

// Toggle employee status
async function toggleEmployeeStatus(employeeId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const confirmMsg = newStatus === 'active' 
    ? 'Bu çalışanı aktifleştirmek istediğinize emin misiniz?' 
    : 'Bu çalışanı pasifleştirmek istediğinize emin misiniz?';

  if (!confirm(confirmMsg)) return;

  try {
    await updateDoc(doc(db, 'users', employeeId), {
      status: newStatus,
      updatedAt: new Date(),
      updatedBy: auth.currentUser.uid
    });

    alert(`✅ Çalışan ${newStatus === 'active' ? 'aktifleştirildi' : 'pasifleştirildi'}`);
    loadEmployees();
  } catch (error) {
    console.error('❌ Error updating employee status:', error);
    alert('Hata: ' + error.message);
  }
}

// Filter employees
function filterEmployees() {
  loadEmployees();
}

// Setup event listeners for employee filters
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('employeeSearchInput');
  const roleFilter = document.getElementById('employeeRoleFilter');
  const statusFilter = document.getElementById('employeeStatusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      setTimeout(filterEmployees, 300);
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', filterEmployees);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', filterEmployees);
  }
});

// Export functions to window
window.openCreateEmployeeModal = openCreateEmployeeModal;
window.closeCreateEmployeeModal = closeCreateEmployeeModal;
window.handleCreateEmployee = handleCreateEmployee;
window.loadEmployees = loadEmployees;
window.editEmployee = editEmployee;
window.handleEditEmployee = handleEditEmployee;
window.toggleEmployeeStatus = toggleEmployeeStatus;
window.filterEmployees = filterEmployees;
