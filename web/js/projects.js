// Projects Management - Firebase Modular SDK v10.7.1
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { uploadPhotoToImgBB } from "./upload.js";

let currentProjectId = null;
let projects = [];
let filteredProjects = [];

// Export currentProjectId globally for budget module
window.currentProjectId = null;

/**
 * Load projects from Firestore
 */
async function loadProjects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ Kullanıcı giriş yapmamış');
      return;
    }

    // Get user's company ID and role
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const companyId = userDocSnap.data()?.companyId || 'default-company';
    const userRole = window.userRole || userDocSnap.data()?.role;

    // Query projects
    const projectsRef = collection(db, 'projects');
    let q;
    
    // Super admin can see all projects
    if (userRole === 'super_admin') {
      q = query(projectsRef);
      console.log('🔑 Super admin: Tüm projeler yükleniyor');
    } else {
      // Regular users only see their company's projects
      q = query(
        projectsRef,
        where('companyId', '==', companyId)
      );
    }

    const snapshot = await getDocs(q);
    projects = [];
    snapshot.forEach(docSnap => {
      projects.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort projects by createdAt (newest first) - client-side sorting
    projects.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });

    renderProjectsList();
    console.log(`✅ ${projects.length} proje yüklendi`);
    
    // Initialize filters after projects are loaded
    initializeProjectFilters();
  } catch (error) {
    console.error('❌ Projeler yüklenirken hata:', error);
    showAlert('Projeler yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Render projects list
 */
function renderProjectsList() {
  const projectsList = document.getElementById('projectsList');
  projectsList.innerHTML = '';

  // Use filtered projects if filters are active, otherwise use all projects
  const projectsToRender = filteredProjects.length > 0 || isFilterActive() ? filteredProjects : projects;

  if (projectsToRender.length === 0) {
    projectsList.innerHTML = '<p style="color: #999; grid-column: 1/-1;">Henüz proje yok. + Yeni Proje butonuna tıklayın.</p>';
    updateFilterResults(0);
    return;
  }

  // Update filter results count
  updateFilterResults(projectsToRender.length);

  projectsToRender.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.style.cssText = 'padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--card-bg); transition: box-shadow 0.3s; position: relative;';
    projectCard.onmouseover = () => projectCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    projectCard.onmouseout = () => projectCard.style.boxShadow = 'none';

    const status = project.status || 'Devam Ediyor';
    const statusColors = {
      'Devam Ediyor': '#4CAF50',
      'Tamamlandı': '#2196F3',
      'Beklemede': '#FFA500'
    };

    projectCard.innerHTML = `
      <div onclick="openProjectDetail('${project.id}')" style="cursor: pointer;">
        <h4 style="margin: 0 0 0.5rem 0; color: var(--brand-red);">${project.name || 'Unnamed'}</h4>
        <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">${project.location || 'Lokasyon belirtilmemiş'}</p>
        <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.9rem;">${project.description || ''}</p>
        <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
          <span style="background: ${statusColors[status] || '#999'}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
            ${status}
          </span>
          <small style="color: var(--text-secondary);">${new Date(project.createdAt?.toDate?.() || new Date()).toLocaleDateString('tr-TR')}</small>
        </div>
      </div>
      <button 
        onclick="event.stopPropagation(); openEditProjectModal('${project.id}')" 
        class="btn btn-secondary" 
        style="margin-top: 1rem; width: 100%; padding: 0.5rem; font-size: 0.9rem;"
      >
        ✏️ Düzenle
      </button>
    `;
    projectsList.appendChild(projectCard);
  });
}

/**
 * Open project detail modal
 */
async function openProjectDetail(projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      showAlert('Proje bulunamadı', 'danger');
      return;
    }

    const project = projectSnap.data();
    currentProjectId = projectId;
    window.currentProjectId = projectId; // Make it globally available

    // Update modal
    document.getElementById('projectTitle').textContent = project.name;
    document.getElementById('projectDetailDesc').textContent = project.description || 'Açıklama yok';
    document.getElementById('projectDetailLocation').textContent = project.location || 'Lokasyon belirtilmemiş';

    // Load tab contents
    await loadProjectLogs(projectId);
    await loadProjectStocks(projectId);
    await loadProjectPayments(projectId);

    // Show modal and activate first tab
    document.getElementById('projectDetailModal').classList.add('show');
    switchTab('logs');
    console.log(`✅ Proje açıldı: ${projectId}`);
  } catch (error) {
    console.error('❌ Proje açılırken hata:', error);
    showAlert('Proje yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Close project detail modal
 */
function closeProjectModal() {
  document.getElementById('projectDetailModal').classList.remove('show');
  currentProjectId = null;
  window.currentProjectId = null;
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.style.borderBottom = 'none';
    btn.style.color = 'inherit';
  });

  // Show selected tab
  const tabElement = document.getElementById(tabName + '-tab');
  if (tabElement) {
    tabElement.classList.remove('hidden');
  }

  // Mark button as active
  const btnElement = document.querySelector('[data-tab="' + tabName + '"]');
  if (btnElement) {
    btnElement.style.borderBottom = '3px solid var(--accent-color)';
    btnElement.style.color = 'var(--primary-color)';
  }
}

/**
 * Load project logs
 */
async function loadProjectLogs(projectId) {
  try {
    const logsRef = collection(db, 'projects', projectId, 'logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';

    if (snapshot.empty) {
      logsList.innerHTML = '<p style="color: #999; font-size: 0.9rem; padding: 1rem; text-align: center;">Henüz log yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const log = docSnap.data();
      const logItem = document.createElement('div');
      logItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); background: var(--card-bg); margin-bottom: 0.5rem; border-radius: 4px;';
      
      // Photo display
      let photoHtml = '';
      if (log.photoUrl) {
        photoHtml = `
          <div style="margin-top: 0.75rem;">
            <img src="${log.photoUrl}" 
                 alt="Şantiye Fotoğrafı" 
                 style="max-width: 200px; max-height: 200px; border-radius: 8px; cursor: pointer; border: 2px solid var(--border-color);"
                 onclick="window.open('${log.photoUrl}', '_blank')">
          </div>
        `;
      }
      
      logItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong style="color: var(--primary-color); font-size: 1rem;">${log.title || 'Başlıksız'}</strong>
            <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">${log.description || ''}</p>
          </div>
          <button style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem;" onclick="deleteLog('${projectId}', '${docSnap.id}')">×</button>
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.85rem;">
          <span style="color: #666;">👤 ${log.createdBy || 'Bilinmiyor'}</span> • 
          <span style="color: #999;">${new Date(log.createdAt?.toDate?.() || new Date()).toLocaleDateString('tr-TR')} ${new Date(log.createdAt?.toDate?.() || new Date()).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        ${photoHtml}
      `;
      logsList.appendChild(logItem);
    });

    console.log(`✅ ${snapshot.size} log yüklendi`);
  } catch (error) {
    console.error('❌ Loglar yüklenirken hata:', error);
    document.getElementById('logsList').innerHTML = '<p style="color: red;">Loglar yüklenemedi</p>';
  }
}

/**
 * Load project stocks
 */
async function loadProjectStocks(projectId) {
  try {
    const stocksRef = collection(db, 'projects', projectId, 'stocks');
    const q = query(stocksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = '';

    if (snapshot.empty) {
      stocksList.innerHTML = '<p style="color: #999; font-size: 0.9rem; padding: 1rem; text-align: center;">Henüz ürün yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const stock = docSnap.data();
      const totalPrice = (stock.quantity || 0) * (stock.unitPrice || 0);
      const stockItem = document.createElement('div');
      stockItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); background: var(--card-bg); margin-bottom: 0.5rem; border-radius: 4px;';
      stockItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong style="color: var(--primary-color); font-size: 1rem;">${stock.name || 'Ürün'}</strong>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
              <div>📦 Miktar: <strong>${stock.quantity || 0}</strong> ${stock.unit || ''}</div>
              <div>💰 Birim Fiyatı: <strong>₺${(stock.unitPrice || 0).toLocaleString('tr-TR')}</strong></div>
              <div>📊 Toplam: <strong>₺${totalPrice.toLocaleString('tr-TR')}</strong></div>
            </div>
          </div>
          <button style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem;" onclick="deleteStock('${projectId}', '${docSnap.id}')">×</button>
        </div>
      `;
      stocksList.appendChild(stockItem);
    });

    console.log(`✅ ${snapshot.size} ürün yüklendi`);
  } catch (error) {
    console.error('❌ Ürünler yüklenirken hata:', error);
    document.getElementById('stocksList').innerHTML = '<p style="color: red;">Ürünler yüklenemedi</p>';
  }
}

/**
 * Load project payments (Hakediş)
 */
async function loadProjectPayments(projectId) {
  try {
    const paymentsRef = collection(db, 'projects', projectId, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const paymentsList = document.getElementById('paymentsList');
    paymentsList.innerHTML = '';

    let totalAmount = 0;

    if (snapshot.empty) {
      paymentsList.innerHTML = '<p style="color: #999; font-size: 0.9rem; padding: 1rem; text-align: center;">Henüz hakediş yok</p>';
      document.getElementById('totalPayments').textContent = '0';
      return;
    }

    snapshot.forEach(docSnap => {
      const payment = docSnap.data();
      const unitPrice = payment.unitPrice || payment.amount || 0; // Support both field names
      const quantity = payment.quantity || 1;
      const rowTotal = unitPrice * quantity;
      totalAmount += rowTotal;

      const paymentItem = document.createElement('div');
      paymentItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); background: var(--card-bg); margin-bottom: 0.5rem; border-radius: 4px;';
      paymentItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong style="color: var(--primary-color); font-size: 1rem;">${payment.description || 'Yapılan İş'}</strong>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
              <div>👤 Yapan: <strong>${payment.createdBy || 'Bilinmiyor'}</strong></div>
              <div>⚙️ Birim: <strong>${payment.unit || 'Adet'}</strong></div>
              <div>💵 Birim Fiyatı: <strong>₺${unitPrice.toLocaleString('tr-TR')}</strong> × ${quantity} = <span style="color: var(--accent-color); font-weight: bold;">₺${rowTotal.toLocaleString('tr-TR')}</span></div>
            </div>
          </div>
          <button style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem;" onclick="deletePayment('${projectId}', '${docSnap.id}')">×</button>
        </div>
      `;
      paymentsList.appendChild(paymentItem);
    });

    // Update total
    document.getElementById('totalPayments').textContent = totalAmount.toLocaleString('tr-TR');
    console.log(`✅ ${snapshot.size} hakediş yüklendi. Toplam: ₺${totalAmount.toLocaleString('tr-TR')}`);
  } catch (error) {
    console.error('❌ Hakediş yüklenirken hata:', error);
    document.getElementById('paymentsList').innerHTML = '<p style="color: red;">Hakediş yüklenemedi</p>';
  }
}

/**
 * Open create project modal
 */
function openCreateProjectModal() {
  document.getElementById('createProjectModal').classList.add('show');
}

/**
 * Close create project modal
 */
function closeCreateProjectModal() {
  document.getElementById('createProjectModal').classList.remove('show');
  document.getElementById('createProjectForm').reset();
}

/**
 * Handle project creation
 */
async function handleCreateProject(event) {
  event.preventDefault();

  const name = document.getElementById('projectName').value;
  const desc = document.getElementById('projectDesc').value;
  const location = document.getElementById('projectLocation').value;

  try {
    const user = auth.currentUser;
    if (!user) {
      showAlert('Kullanıcı oturumu kapanmış', 'danger');
      return;
    }

    // Get user's company ID
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const companyId = userDocSnap.data()?.companyId || 'default-company';

    // Create project
    const projectRef = collection(db, 'projects');
    const newProjectRef = await addDoc(projectRef, {
      name,
      description: desc,
      location,
      companyId,
      status: 'planning',
      budget: 0,
      currency: 'TRY',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      progress: 0,
      tags: []
    });

    // Log action
    const auditRef = collection(db, 'audit_logs');
    await addDoc(auditRef, {
      action: 'CREATE_PROJECT',
      userId: user.uid,
      projectId: newProjectRef.id,
      details: { projectName: name },
      timestamp: serverTimestamp()
    });

    showAlert('Proje başarıyla oluşturuldu!', 'success');
    closeCreateProjectModal();
    await loadProjects();
  } catch (error) {
    console.error('❌ Proje oluşturulamadı:', error);
    showAlert('Proje oluşturulamadı: ' + error.message, 'danger');
  }
}

/**
 * Add log entry
 */
function addLog() {
  const text = prompt('Log metnini girin:');
  if (text) {
    console.log('📝 New log would be added:', text);
    showAlert('Log ekleme özelliği yakında gelecek', 'warning');
  }
}

/**
 * Add stock entry
 */
function addStock() {
  const name = prompt('Malzeme adı:');
  if (name) {
    console.log('📦 New stock would be added:', name);
    showAlert('Malzeme ekleme özelliği yakında gelecek', 'warning');
  }
}

/**
 * Add payment entry
 */
function addPayment() {
  const amount = prompt('Ödeme tutarı:');
  if (amount) {
    console.log('💰 New payment would be added:', amount);
    showAlert('Ödeme ekleme özelliği yakında gelecek', 'warning');
  }
}

// ========== ADD LOG MODAL FUNCTIONS ==========
function openAddLogModal() {
  document.getElementById('addLogModal').classList.add('show');
}

function closeAddLogModal() {
  document.getElementById('addLogModal').classList.remove('show');
  document.getElementById('addLogForm').reset();
}

async function handleAddLog(event) {
  event.preventDefault();
  
  const title = document.getElementById('logTitle').value;
  const description = document.getElementById('logDescription').value;
  const worker = document.getElementById('logWorker').value;
  const photoFile = document.getElementById('logPhoto').files[0];

  try {
    const user = auth.currentUser;
    if (!user || !currentProjectId) {
      showAlert('Hata: Proje seçilmemiş', 'danger');
      return;
    }

    let photoUrl = null;

    // Upload photo to ImgBB if selected
    if (photoFile) {
      try {
        showAlert('Fotoğraf yükleniyor...', 'warning');
        photoUrl = await uploadPhotoToImgBB(photoFile, currentProjectId);
        console.log('✅ Photo uploaded to ImgBB:', photoUrl);
      } catch (error) {
        console.error('❌ Photo upload failed:', error);
        showAlert('Fotoğraf yüklenemedi, günlük fotoğrafsız kaydedilecek', 'warning');
        // Continue without photo
      }
    }

    // Create log entry
    const logsRef = collection(db, 'projects', currentProjectId, 'logs');
    await addDoc(logsRef, {
      title,
      description,
      createdBy: worker,
      userId: user.uid,
      createdAt: serverTimestamp(),
      photoUrl: photoUrl,
      status: 'completed'
    });

    showAlert('✅ Günlük kaydı eklendi!', 'success');
    closeAddLogModal();
    await loadProjectLogs(currentProjectId);
  } catch (error) {
    console.error('❌ Log eklenemedi:', error);
    showAlert('Log eklenirken hata: ' + error.message, 'danger');
  }
}

async function deleteLog(projectId, logId) {
  if (confirm('Bu günlük kaydını silmek istediğinize emin misiniz?')) {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'logs', logId));
      showAlert('Günlük kaydı silindi', 'success');
      await loadProjectLogs(projectId);
    } catch (error) {
      showAlert('Silme işlemi başarısız: ' + error.message, 'danger');
    }
  }
}

// ========== ADD STOCK MODAL FUNCTIONS ==========
function openAddStockModal() {
  document.getElementById('addStockModal').classList.add('show');
}

function closeAddStockModal() {
  document.getElementById('addStockModal').classList.remove('show');
  document.getElementById('addStockForm').reset();
}

async function handleAddStock(event) {
  event.preventDefault();
  
  const name = document.getElementById('stockName').value;
  const unit = document.getElementById('stockUnit').value;
  const quantity = parseFloat(document.getElementById('stockQuantity').value);
  const unitPrice = parseFloat(document.getElementById('stockUnitPrice').value);

  try {
    const user = auth.currentUser;
    if (!user || !currentProjectId) {
      showAlert('Hata: Proje seçilmemiş', 'danger');
      return;
    }

    // Create stock entry
    const stocksRef = collection(db, 'projects', currentProjectId, 'stocks');
    await addDoc(stocksRef, {
      name,
      unit,
      quantity,
      unitPrice,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'in_stock'
    });

    showAlert('Ürün kaydı eklendi!', 'success');
    closeAddStockModal();
    await loadProjectStocks(currentProjectId);
  } catch (error) {
    console.error('❌ Stok eklenemedi:', error);
    showAlert('Ürün eklenirken hata: ' + error.message, 'danger');
  }
}

async function deleteStock(projectId, stockId) {
  if (confirm('Bu ürün kaydını silmek istediğinize emin misiniz?')) {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'stocks', stockId));
      showAlert('Ürün kaydı silindi', 'success');
      await loadProjectStocks(projectId);
    } catch (error) {
      showAlert('Silme işlemi başarısız: ' + error.message, 'danger');
    }
  }
}

// ========== ADD PAYMENT MODAL FUNCTIONS ==========
function openAddPaymentModal() {
  document.getElementById('addPaymentModal').classList.add('show');
}

function closeAddPaymentModal() {
  document.getElementById('addPaymentModal').classList.remove('show');
  document.getElementById('addPaymentForm').reset();
}

async function handleAddPayment(event) {
  event.preventDefault();
  
  const description = document.getElementById('paymentDescription').value;
  const worker = document.getElementById('paymentWorker').value;
  const unit = document.getElementById('paymentUnit').value;
  const unitPrice = parseFloat(document.getElementById('paymentAmount').value);
  const quantity = parseFloat(document.getElementById('paymentQuantity').value);
  const totalAmount = unitPrice * quantity;

  try {
    const user = auth.currentUser;
    if (!user || !currentProjectId) {
      showAlert('Hata: Proje seçilmemiş', 'danger');
      return;
    }

    // Create payment entry
    const paymentsRef = collection(db, 'projects', currentProjectId, 'payments');
    await addDoc(paymentsRef, {
      description,
      createdBy: worker,
      unit,
      unitPrice,
      quantity,
      amount: totalAmount,
      userId: user.uid,
      createdAt: serverTimestamp(),
      status: 'pending'
    });

    showAlert('Hakediş kaydı eklendi!', 'success');
    closeAddPaymentModal();
    await loadProjectPayments(currentProjectId);
  } catch (error) {
    console.error('❌ Hakediş eklenemedi:', error);
    showAlert('Hakediş eklenirken hata: ' + error.message, 'danger');
  }
}

async function deletePayment(projectId, paymentId) {
  if (confirm('Bu hakediş kaydını silmek istediğinize emin misiniz?')) {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'payments', paymentId));
      showAlert('Hakediş kaydı silindi', 'success');
      await loadProjectPayments(projectId);
    } catch (error) {
      showAlert('Silme işlemi başarısız: ' + error.message, 'danger');
    }
  }
}

// ========== PROJECT FILTERS ==========

/**
 * Initialize project filters
 */
function initializeProjectFilters() {
  const searchInput = document.getElementById('projectSearchInput');
  const statusFilter = document.getElementById('projectStatusFilter');
  const companyFilter = document.getElementById('projectCompanyFilter');

  if (searchInput) {
    searchInput.addEventListener('input', applyProjectFilters);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', applyProjectFilters);
  }
  if (companyFilter) {
    companyFilter.addEventListener('change', applyProjectFilters);
    // Load companies for super admin
    if (window.userRole === 'super_admin') {
      loadCompaniesForFilter();
      companyFilter.classList.remove('hidden');
    }
  }

  // Initial filter results
  updateFilterResults(projects.length);
}

/**
 * Load companies for super admin filter
 */
async function loadCompaniesForFilter() {
  try {
    const companiesSnap = await getDocs(collection(db, 'companies'));
    const companyFilter = document.getElementById('projectCompanyFilter');
    
    if (companyFilter) {
      // Clear existing options except first
      companyFilter.innerHTML = '<option value="">Tüm Şirketler</option>';
      
      companiesSnap.forEach(doc => {
        const company = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = company.name || doc.id;
        companyFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('❌ Şirketler yüklenemedi:', error);
  }
}

/**
 * Check if any filter is active
 */
function isFilterActive() {
  const searchInput = document.getElementById('projectSearchInput');
  const statusFilter = document.getElementById('projectStatusFilter');
  const companyFilter = document.getElementById('projectCompanyFilter');

  return (searchInput && searchInput.value.trim()) ||
         (statusFilter && statusFilter.value) ||
         (companyFilter && companyFilter.value);
}

/**
 * Apply project filters
 */
function applyProjectFilters() {
  const searchTerm = document.getElementById('projectSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('projectStatusFilter')?.value || '';
  const companyFilter = document.getElementById('projectCompanyFilter')?.value || '';

  filteredProjects = projects.filter(project => {
    // Search filter (project name)
    const matchesSearch = !searchTerm || 
      project.name?.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm);

    // Status filter
    const matchesStatus = !statusFilter || project.status === statusFilter;

    // Company filter (super admin only)
    const matchesCompany = !companyFilter || project.companyId === companyFilter;

    return matchesSearch && matchesStatus && matchesCompany;
  });

  renderProjectsList();
}

/**
 * Clear all filters
 */
function clearProjectFilters() {
  const searchInput = document.getElementById('projectSearchInput');
  const statusFilter = document.getElementById('projectStatusFilter');
  const companyFilter = document.getElementById('projectCompanyFilter');

  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = '';
  if (companyFilter) companyFilter.value = '';

  filteredProjects = [];
  renderProjectsList();
  updateFilterResults(projects.length);
}

/**
 * Update filter results count
 */
function updateFilterResults(count) {
  const resultsDiv = document.getElementById('projectFilterResults');
  if (resultsDiv) {
    if (isFilterActive()) {
      resultsDiv.textContent = `${count} sonuç bulundu`;
      resultsDiv.style.color = 'var(--brand-red)';
    } else {
      resultsDiv.textContent = `Toplam ${count} proje`;
      resultsDiv.style.color = 'var(--text-secondary)';
    }
  }
}

// ========== PROJECT EDIT FUNCTIONS ==========

/**
 * Open edit project modal
 */
async function openEditProjectModal(projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      showAlert('Proje bulunamadı', 'danger');
      return;
    }

    const project = projectSnap.data();
    
    // Fill form with project data
    document.getElementById('editProjectId').value = projectId;
    document.getElementById('editProjectName').value = project.name || '';
    document.getElementById('editProjectDesc').value = project.description || '';
    document.getElementById('editProjectLocation').value = project.location || '';
    document.getElementById('editProjectBudget').value = project.budget || '';
    document.getElementById('editProjectStatus').value = project.status || 'Devam Ediyor';
    document.getElementById('editProjectClient').value = project.client || '';
    
    // Handle dates
    if (project.startDate) {
      const startDate = project.startDate.toDate ? project.startDate.toDate() : new Date(project.startDate);
      document.getElementById('editProjectStartDate').value = startDate.toISOString().split('T')[0];
    }
    if (project.endDate) {
      const endDate = project.endDate.toDate ? project.endDate.toDate() : new Date(project.endDate);
      document.getElementById('editProjectEndDate').value = endDate.toISOString().split('T')[0];
    }

    // Show modal
    document.getElementById('editProjectModal').classList.add('show');
    
  } catch (error) {
    console.error('❌ Proje düzenleme modal açılamadı:', error);
    showAlert('Proje yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Close edit project modal
 */
function closeEditProjectModal() {
  document.getElementById('editProjectModal').classList.remove('show');
  document.getElementById('editProjectForm').reset();
}

/**
 * Handle update project
 */
async function handleUpdateProject(event) {
  event.preventDefault();

  try {
    const projectId = document.getElementById('editProjectId').value;
    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();
    const location = document.getElementById('editProjectLocation').value.trim();
    const budget = parseFloat(document.getElementById('editProjectBudget').value) || 0;
    const status = document.getElementById('editProjectStatus').value;
    const client = document.getElementById('editProjectClient').value.trim();
    const startDate = document.getElementById('editProjectStartDate').value;
    const endDate = document.getElementById('editProjectEndDate').value;

    if (!name || !location) {
      showAlert('Proje adı ve konum zorunludur', 'warning');
      return;
    }

    // Prepare update data
    const updateData = {
      name,
      description,
      location,
      budget,
      status,
      client,
      updatedAt: serverTimestamp()
    };

    // Add dates if provided
    if (startDate) {
      updateData.startDate = new Date(startDate);
    }
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }

    // Update project
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, updateData);

    // Log activity
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        userName: userData?.displayName || user.email,
        companyId: userData?.companyId || 'default-company',
        action: 'update',
        description: `"${name}" projesi güncellendi`,
        timestamp: serverTimestamp()
      });
    }

    showAlert('Proje başarıyla güncellendi!', 'success');
    closeEditProjectModal();
    await loadProjects(); // Refresh project list

  } catch (error) {
    console.error('❌ Proje güncellenemedi:', error);
    showAlert('Proje güncellenirken hata: ' + error.message, 'danger');
  }
}

// Export functions for global use
window.loadProjects = loadProjects;
window.openProjectDetail = openProjectDetail;
window.closeProjectModal = closeProjectModal;
window.switchTab = switchTab;
window.openCreateProjectModal = openCreateProjectModal;
window.closeCreateProjectModal = closeCreateProjectModal;
window.handleCreateProject = handleCreateProject;
window.addLog = addLog;
window.addStock = addStock;
window.addPayment = addPayment;
window.openAddLogModal = openAddLogModal;
window.closeAddLogModal = closeAddLogModal;
window.handleAddLog = handleAddLog;
window.deleteLog = deleteLog;
window.openAddStockModal = openAddStockModal;
window.closeAddStockModal = closeAddStockModal;
window.handleAddStock = handleAddStock;
window.deleteStock = deleteStock;
window.openAddPaymentModal = openAddPaymentModal;
window.closeAddPaymentModal = closeAddPaymentModal;
window.handleAddPayment = handleAddPayment;
window.deletePayment = deletePayment;
window.clearProjectFilters = clearProjectFilters;
window.applyProjectFilters = applyProjectFilters;
window.openEditProjectModal = openEditProjectModal;
window.closeEditProjectModal = closeEditProjectModal;
window.handleUpdateProject = handleUpdateProject;
