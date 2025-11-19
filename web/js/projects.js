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
let isLoadingProjects = false; // Prevent duplicate loading

// Export currentProjectId globally for budget module
window.currentProjectId = null;

/**
 * Load projects from Firestore
 */
async function loadProjects() {
  // Prevent duplicate simultaneous loads
  if (isLoadingProjects) {
    console.log('⚠️ Projeler zaten yükleniyor, bekleyin...');
    return;
  }
  
  isLoadingProjects = true;
  
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ Kullanıcı giriş yapmamış');
      isLoadingProjects = false;
      return;
    }

    // Get user's company ID and role
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data() || {};
    const companyId = userData.companyId || 'default-company';
    const userRole = window.userRole || userData.role;

    // Query projects
    const projectsRef = collection(db, 'projects');
    let q;
    
    // Super admin can see all projects
    if (userRole === 'super_admin') {
      q = query(projectsRef);
      console.log('🔑 Super admin: Tüm projeler yükleniyor');
    } 
    // Clients can only see authorized projects
    else if (userRole === 'client') {
      const authorizedProjects = userData.authorizedProjects || [];
      console.log('🏢 Client: Yetkili projeler yükleniyor:', authorizedProjects.length);
      
      if (authorizedProjects.length === 0) {
        projects = [];
        renderProjectsList();
        console.log('⚠️ Müşteriye henüz proje yetkisi verilmemiş');
        return;
      }
      
      // Load authorized projects one by one
      // Note: Firestore doesn't support 'in' with empty arrays, so we handle manually
      projects = [];
      for (const projectId of authorizedProjects) {
        try {
          const projectDoc = await getDoc(doc(db, 'projects', projectId));
          if (projectDoc.exists()) {
            projects.push({ id: projectDoc.id, ...projectDoc.data() });
          }
        } catch (err) {
          console.warn(`⚠️ Could not load project ${projectId}:`, err.message);
        }
      }
      
      // Sort and render
      projects.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      filteredProjects = [...projects]; // Set filtered to avoid duplication
      renderProjectsList();
      console.log(`✅ ${projects.length} yetkili proje yüklendi`);
      initializeProjectFilters();
      isLoadingProjects = false;
      return;
    } 
    // Regular users only see their company's projects
    else {
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
  } finally {
    isLoadingProjects = false;
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

    // Check if user can delete/edit (only super_admin and company_admin)
    const userRole = window.userRole;
    const canDelete = userRole === 'super_admin' || userRole === 'company_admin';
    const canEdit = userRole !== 'client'; // Clients cannot edit
    const isClient = userRole === 'client';

    projectCard.innerHTML = `
      ${isClient ? '<div style="position: absolute; top: 10px; right: 10px; background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">👁️ SADECE GÖRÜNTÜLEME</div>' : ''}
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
      ${!isClient ? `
      <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
        ${canEdit ? `
        <button 
          onclick="event.stopPropagation(); openEditProjectModal('${project.id}')" 
          class="btn btn-secondary" 
          style="flex: 1; min-width: 120px; padding: 0.5rem; font-size: 0.9rem;"
        >
          ✏️ Düzenle
        </button>
        ` : ''}
        ${canDelete ? `
        <button 
          onclick="event.stopPropagation(); deleteProject('${project.id}', '${project.name || 'Unnamed'}')" 
          class="btn btn-danger" 
          style="flex: 1; min-width: 100px; padding: 0.5rem; font-size: 0.9rem;"
        >
          🗑️ Sil
        </button>
        ` : ''}
      </div>
      ` : ''}
    `;
    projectsList.appendChild(projectCard);
  });
}

/**
 * Open project detail page
 */
function openProjectDetail(projectId) {
  // Redirect to project detail page with project ID
  window.location.href = `project-detail.html?id=${projectId}`;
}

/**
 * Close project detail modal (kept for backward compatibility)
 */
function closeProjectModal() {
  // Modal functionality removed - redirects to detail page instead
  window.location.href = 'dashboard.html#projects';
}

/**
 * Switch between tabs (kept for backward compatibility)
 */
function switchTab(tabName) {
  // This function is now handled in project-detail.html
  console.log('switchTab called:', tabName);
}

/**
 * Load project logs (moved to project-detail.js)
 */
async function loadProjectLogs(projectId) {
  console.log('loadProjectLogs called - now handled in project-detail.js');
  return Promise.resolve();
}

/**
 * Load project stocks (moved to project-detail.js)
 */
async function loadProjectStocks(projectId) {
  console.log('loadProjectStocks called - now handled in project-detail.js');
  return Promise.resolve();
}

/**
 * Load project payments (moved to project-detail.js)
 */
async function loadProjectPayments(projectId) {
  console.log('loadProjectPayments called - now handled in project-detail.js');
  return Promise.resolve();
}

/**
 * Open create project modal
 */
function openCreateProjectModal() {
  const userRole = window.userRole;
  
  // Check permissions
  if (userRole !== 'super_admin' && userRole !== 'company_admin') {
    showAlert('Yetkiniz yok! Sadece yöneticiler proje oluşturabilir.', 'danger');
    return;
  }
  
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

/**
 * Delete project
 */
async function deleteProject(projectId, projectName) {
  const userRole = window.userRole;
  
  // Check permissions
  if (userRole !== 'super_admin' && userRole !== 'company_admin') {
    showAlert('Yetkiniz yok! Sadece yöneticiler proje silebilir.', 'danger');
    return;
  }

  const confirmMsg = `"${projectName}" projesini kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem:\n- Projenin tüm günlük kayıtlarını\n- Tüm stok kayıtlarını\n- Tüm ödeme kayıtlarını\n- Tüm bütçe verilerini\nsilecektir ve GERİ ALINAMAZ!`;
  
  if (!confirm(confirmMsg)) return;

  // Double confirmation for critical action
  const doubleConfirm = confirm('⚠️ SON UYARI: Bu işlem geri alınamaz! Devam edilsin mi?');
  if (!doubleConfirm) return;

  try {
    const user = auth.currentUser;
    if (!user) {
      showAlert('Oturum açmanız gerekiyor', 'danger');
      return;
    }

    // Get user data for logging
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data();

    // Delete project
    await deleteDoc(doc(db, 'projects', projectId));

    // Delete all related logs
    const logsQuery = query(collection(db, 'logs'), where('projectId', '==', projectId));
    const logsSnapshot = await getDocs(logsQuery);
    logsSnapshot.forEach(async (logDoc) => {
      await deleteDoc(logDoc.ref);
    });

    // Delete all related stocks
    const stocksQuery = query(collection(db, 'stocks'), where('projectId', '==', projectId));
    const stocksSnapshot = await getDocs(stocksQuery);
    stocksSnapshot.forEach(async (stockDoc) => {
      await deleteDoc(stockDoc.ref);
    });

    // Delete all related payments
    const paymentsQuery = query(collection(db, 'payments'), where('projectId', '==', projectId));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    paymentsSnapshot.forEach(async (paymentDoc) => {
      await deleteDoc(paymentDoc.ref);
    });

    // Delete all related budget categories
    const categoriesQuery = query(collection(db, 'budget_categories'), where('projectId', '==', projectId));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    categoriesSnapshot.forEach(async (categoryDoc) => {
      await deleteDoc(categoryDoc.ref);
    });

    // Delete all related budget expenses
    const expensesQuery = query(collection(db, 'budget_expenses'), where('projectId', '==', projectId));
    const expensesSnapshot = await getDocs(expensesQuery);
    expensesSnapshot.forEach(async (expenseDoc) => {
      await deleteDoc(expenseDoc.ref);
    });

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId: user.uid,
      userName: userData?.displayName || user.email,
      companyId: userData?.companyId || 'default-company',
      action: 'delete',
      description: `"${projectName}" projesi silindi`,
      timestamp: serverTimestamp()
    });

    showAlert('✅ Proje ve tüm ilgili veriler başarıyla silindi', 'success');
    await loadProjects(); // Refresh project list

  } catch (error) {
    console.error('❌ Proje silinirken hata:', error);
    showAlert('Proje silinirken hata: ' + error.message, 'danger');
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
window.deleteProject = deleteProject;
window.handleUpdateProject = handleUpdateProject;
