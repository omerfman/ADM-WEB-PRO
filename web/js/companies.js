// ========== COMPANY MANAGEMENT FUNCTIONS ==========
// Import Firestore functions (will be available globally from firebase-config.js)
// Using window.db and window.auth which are set up in firebase-config.js

const db = window.db;
const auth = window.auth;
const { collection, query, where, getDocs, addDoc, deleteDoc, doc } = window.firestore;

// Open create company modal
function openCreateCompanyModal() {
  const modal = document.getElementById('createCompanyModal');
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

  const name = document.getElementById('companyName').value;
  const email = document.getElementById('companyEmail').value;
  const phone = document.getElementById('companyPhone').value;
  const address = document.getElementById('companyAddress').value;

  if (!name || !email) {
    alert('Lütfen şirket adı ve email alanlarını doldurunuz');
    return;
  }

  try {
    // Check if email is already used
    try {
      await db.collection('companies').where('email', '==', email).limit(1).get();
    } catch (e) {
      // Firestore doesn't support where on non-indexed fields in some cases
    }

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
      const companiesList = document.querySelector('.companies-list');
      if (companiesList) {
        companiesList.innerHTML = '<p style="text-align: center; color: #f44336;">❌ Yalnızca super admin şirketleri görüntüleyebilir</p>';
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
    const companiesList = document.querySelector('.companies-list');
    if (companiesList) {
      companiesList.innerHTML = '<p style="text-align: center; color: #f44336;">Şirketler yüklenirken hata: ' + error.message + '</p>';
    }
  }
}

// Render companies list
function renderCompaniesList(companies) {
  const companiesSection = document.getElementById('companiesSection');
  if (!companiesSection) return;

  const companiesList = companiesSection.querySelector('.companies-list');
  if (!companiesList) {
    console.warn('⚠️ companies-list element not found');
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
      <div class="company-card" style="
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
  if (!confirm('Bu şirketi silmek istediğinize emin misiniz?\n\n⚠️ Tüm ilişkili veriler (kullanıcılar, projeler) de silinecektir.')) {
    return;
  }

  try {
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
  console.log('Editing company:', companyId);
  alert('Şirket düzenleme özelliği yakında eklenecek');
}

// View company users
function viewCompanyUsers(companyId) {
  console.log('Viewing users for company:', companyId);
  alert('Şirket kullanıcılarını görüntüleme özelliği yakında eklenecek');
}

// Export functions to window for global access
window.openCreateCompanyModal = openCreateCompanyModal;
window.closeCreateCompanyModal = closeCreateCompanyModal;
window.handleCreateCompany = handleCreateCompany;
window.loadCompanies = loadCompanies;
window.deleteCompany = deleteCompany;
window.editCompany = editCompany;
window.viewCompanyUsers = viewCompanyUsers;
