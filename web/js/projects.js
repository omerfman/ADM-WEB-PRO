// Projects Management - Firebase Modular SDK v10.7.1
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, deleteDoc, updateDoc, setDoc, serverTimestamp
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
    
    // Show create project button for admins and users (not clients)
    const createProjectBtn = document.getElementById('createProjectBtn');
    const createDemoProjectBtn = document.getElementById('createDemoProjectBtn');
    
    if (createProjectBtn) {
      if (userRole === 'super_admin' || userRole === 'company_admin' || userRole === 'user') {
        createProjectBtn.style.display = 'inline-block';
      } else {
        createProjectBtn.style.display = 'none';
      }
    }
    
    // Show demo project button for admins and users
    if (createDemoProjectBtn) {
      if (userRole === 'super_admin' || userRole === 'company_admin' || userRole === 'user') {
        createDemoProjectBtn.style.display = 'inline-block';
      } else {
        createDemoProjectBtn.style.display = 'none';
      }
    }
    
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
  // Redirect to new project overview page with full workflow
  window.location.href = `projects/proje-ozeti.html?id=${projectId}`;
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
 * Load project basic info for page header
 */
async function loadProjectBasicInfo(projectId) {
  if (!projectId) {
    console.error('❌ loadProjectBasicInfo: projectId is required');
    return;
  }

  try {
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (projectDoc.exists()) {
      const project = projectDoc.data();
      const projectName = project.name || 'Proje';
      
      // Update page elements if they exist
      const nameEl = document.getElementById('projectName');
      const breadcrumbEl = document.getElementById('projectNameBreadcrumb');
      
      if (nameEl) nameEl.textContent = projectName;
      if (breadcrumbEl) breadcrumbEl.textContent = projectName;
      
      console.log('✅ Project info loaded:', projectName);
      return project;
    } else {
      console.warn('⚠️ Project not found:', projectId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading project info:', error);
    return null;
  }
}

/**
 * Load project logs (moved to project-detail.js)
 */
async function loadProjectLogs(projectId) {
  if (!projectId) {
    console.error('❌ loadProjectLogs: projectId is required');
    return;
  }

  const logsListDiv = document.getElementById('logsList');
  if (!logsListDiv) {
    console.warn('⚠️ logsList element not found');
    return;
  }

  try {
    logsListDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">⏳ Günlükler yükleniyor...</div>';

    const logsRef = collection(db, 'projects', projectId, 'logs');
    const logsQuery = query(logsRef, orderBy('createdAt', 'desc'));
    const logsSnap = await getDocs(logsQuery);

    if (logsSnap.empty) {
      logsListDiv.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📔</div>
          <p style="font-size: 1.1rem; margin: 0;">Henüz günlük kaydı bulunmuyor</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">Yukarıdaki "Günlük Ekle" butonunu kullanarak yeni kayıt ekleyebilirsiniz</p>
        </div>
      `;
      return;
    }

    let logsHTML = '<div style="display: grid; gap: 1rem;">';
    
    logsSnap.forEach((docSnap) => {
      const log = docSnap.data();
      const logId = docSnap.id;
      
      // Format date
      let dateStr = 'Tarih belirtilmemiş';
      if (log.date) {
        const date = log.date.toDate ? log.date.toDate() : new Date(log.date);
        dateStr = date.toLocaleDateString('tr-TR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
      } else if (log.createdAt) {
        const date = log.createdAt.toDate();
        dateStr = date.toLocaleDateString('tr-TR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
      }

      const performedBy = log.performedBy || log.createdBy || 'Bilinmiyor';
      const description = log.description || 'Açıklama yok';
      const photoUrl = log.photoUrl || '';

      logsHTML += `
        <div class="card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <span style="font-size: 1.5rem;">📅</span>
                <h4 style="margin: 0; color: var(--brand-red);">${dateStr}</h4>
              </div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">
                👷 Yapan: <strong>${performedBy}</strong>
              </div>
            </div>
            <button 
              class="btn btn-danger" 
              style="padding: 0.5rem 1rem; font-size: 0.85rem;"
              onclick="deleteLog('${projectId}', '${logId}')">
              🗑️ Sil
            </button>
          </div>
          
          <div style="background: var(--card-bg); padding: 1rem; border-radius: 6px; border-left: 3px solid var(--brand-red); margin-bottom: ${photoUrl ? '1rem' : '0'};">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${description}</p>
          </div>
          
          ${photoUrl ? `
            <div style="margin-top: 1rem;">
              <img 
                src="${photoUrl}" 
                alt="Günlük fotoğrafı" 
                style="width: 100%; max-width: 500px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                onclick="window.open('${photoUrl}', '_blank')"
              />
            </div>
          ` : ''}
        </div>
      `;
    });

    logsHTML += '</div>';
    logsListDiv.innerHTML = logsHTML;

    console.log(`✅ Loaded ${logsSnap.size} logs for project ${projectId}`);

  } catch (error) {
    console.error('❌ Error loading logs:', error);
    logsListDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--danger);">
        <p>❌ Günlükler yüklenirken hata oluştu</p>
        <p style="font-size: 0.9rem; opacity: 0.7;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Load project stocks (moved to project-detail.js)
 */
async function loadProjectStocks(projectId) {
  if (!projectId) {
    projectId = window.currentProjectId;
  }
  
  if (!projectId) {
    console.error('❌ loadProjectStocks: projectId is required');
    return;
  }

  const stocksListDiv = document.getElementById('stocksList');
  if (!stocksListDiv) {
    console.warn('⚠️ stocksList element not found');
    return;
  }

  try {
    stocksListDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">⏳ Stoklar yükleniyor...</div>';

    const stocksRef = collection(db, 'projects', projectId, 'stocks');
    const stocksQuery = query(stocksRef, orderBy('createdAt', 'desc'));
    const stocksSnap = await getDocs(stocksQuery);

    if (stocksSnap.empty) {
      stocksListDiv.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
          <p style="font-size: 1.1rem; margin: 0;">Henüz stok kaydı bulunmuyor</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">Yukarıdaki "Stok Ekle" butonunu kullanarak yeni ürün ekleyebilirsiniz</p>
        </div>
      `;
      return;
    }

    let stocksHTML = '<div style="display: grid; gap: 1rem;">';
    
    stocksSnap.forEach((docSnap) => {
      const stock = docSnap.data();
      const stockId = docSnap.id;
      
      const name = stock.name || 'Ürün';
      const unit = stock.unit || 'Adet';
      const quantity = stock.quantity || 0;
      const usedQuantity = stock.usedQuantity || 0;
      const remaining = quantity - usedQuantity;
      const unitPrice = stock.unitPrice || 0;
      const totalValue = remaining * unitPrice;
      
      const statusColor = remaining > 0 ? 'var(--success)' : 'var(--danger)';
      const statusText = remaining > 0 ? 'Stokta' : 'Tükendi';

      stocksHTML += `
        <div class="card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 0.5rem 0; color: var(--brand-red);">
                📦 ${name}
              </h4>
              <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                <div style="display: flex; gap: 2rem;">
                  <span>📊 Toplam: <strong>${quantity} ${unit}</strong></span>
                  <span>✅ Kullanılan: <strong>${usedQuantity} ${unit}</strong></span>
                  <span style="color: ${statusColor};">📦 Kalan: <strong>${remaining} ${unit}</strong></span>
                </div>
                <div>
                  💰 Birim Fiyat: <strong>${unitPrice.toLocaleString('tr-TR')} ₺</strong>
                  | Toplam Değer: <strong>${totalValue.toLocaleString('tr-TR')} ₺</strong>
                </div>
                <div style="color: ${statusColor}; font-weight: 600;">
                  Durum: ${statusText}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${remaining > 0 ? `
                <button 
                  class="btn btn-primary" 
                  style="padding: 0.5rem 1rem; font-size: 0.85rem;"
                  onclick="openUseStockModal('${stockId}', ${JSON.stringify(stock).replace(/"/g, '&quot;')})">
                  ✏️ Kullan
                </button>
              ` : ''}
              <button 
                class="btn btn-secondary" 
                style="padding: 0.5rem 1rem; font-size: 0.85rem;"
                onclick="openStockUsageHistoryModal('${stockId}', ${JSON.stringify(stock).replace(/"/g, '&quot;')})">
                📋 Geçmiş
              </button>
              <button 
                class="btn btn-danger" 
                style="padding: 0.5rem 1rem; font-size: 0.85rem;"
                onclick="deleteStock('${projectId}', '${stockId}')">
                🗑️ Sil
              </button>
            </div>
          </div>
        </div>
      `;
    });

    stocksHTML += '</div>';
    stocksListDiv.innerHTML = stocksHTML;

    console.log(`✅ Loaded ${stocksSnap.size} stocks for project ${projectId}`);

  } catch (error) {
    console.error('❌ Error loading stocks:', error);
    stocksListDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--danger);">
        <p>❌ Stoklar yüklenirken hata oluştu</p>
        <p style="font-size: 0.9rem; opacity: 0.7;">${error.message}</p>
      </div>
    `;
  }
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
  
  const date = document.getElementById('logDate')?.value;
  const performedBy = document.getElementById('logPerformedBy')?.value;
  const description = document.getElementById('logDescription')?.value;
  const photoFile = document.getElementById('logPhoto')?.files[0];

  if (!date || !performedBy || !description) {
    showAlert('⚠️ Lütfen tüm zorunlu alanları doldurun', 'warning');
    return;
  }

  try {
    const user = auth.currentUser;
    const projectId = window.currentProjectId;
    
    if (!user) {
      showAlert('❌ Hata: Kullanıcı oturumu bulunamadı', 'danger');
      return;
    }
    
    if (!projectId) {
      showAlert('❌ Hata: Proje ID\'si bulunamadı. Lütfen sayfayı yenileyin.', 'danger');
      console.error('currentProjectId not found. window.currentProjectId:', window.currentProjectId);
      return;
    }

    let photoUrl = null;

    // Upload photo to ImgBB if selected
    if (photoFile) {
      try {
        showAlert('📸 Fotoğraf yükleniyor...', 'info');
        photoUrl = await uploadPhotoToImgBB(photoFile, projectId);
        console.log('✅ Photo uploaded to ImgBB:', photoUrl);
      } catch (error) {
        console.error('❌ Photo upload failed:', error);
        showAlert('⚠️ Fotoğraf yüklenemedi, günlük fotoğrafsız kaydedilecek', 'warning');
        // Continue without photo
      }
    }

    // Create log entry
    const logsRef = collection(db, 'projects', projectId, 'logs');
    await addDoc(logsRef, {
      date: new Date(date),
      title: `Günlük - ${date}`,
      description,
      performedBy,
      createdBy: performedBy,
      userId: user.uid,
      userEmail: user.email,
      createdAt: serverTimestamp(),
      photoUrl: photoUrl,
      status: 'completed'
    });

    showAlert('✅ Şantiye günlüğü başarıyla eklendi!', 'success');
    closeAddLogModal();
    await loadProjectLogs(projectId);
  } catch (error) {
    console.error('❌ Log eklenemedi:', error);
    showAlert('❌ Günlük eklenirken hata: ' + error.message, 'danger');
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
    const projectId = window.currentProjectId;
    
    if (!user) {
      showAlert('❌ Hata: Kullanıcı oturumu bulunamadı', 'danger');
      return;
    }
    
    if (!projectId) {
      showAlert('❌ Hata: Proje ID\'si bulunamadı. Lütfen sayfayı yenileyin.', 'danger');
      console.error('currentProjectId not found. window.currentProjectId:', window.currentProjectId);
      return;
    }

    // Create stock entry
    const stocksRef = collection(db, 'projects', projectId, 'stocks');
    await addDoc(stocksRef, {
      name,
      unit,
      quantity,
      unitPrice,
      usedQuantity: 0, // Track used quantity
      createdBy: user.uid,
      userEmail: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'in_stock'
    });

    showAlert('✅ Stok kaydı başarıyla eklendi!', 'success');
    closeAddStockModal();
    await loadProjectStocks(projectId);
  } catch (error) {
    console.error('❌ Stok eklenemedi:', error);
    showAlert('❌ Stok eklenirken hata: ' + error.message, 'danger');
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

// ========== STOCK USAGE FUNCTIONS ==========
async function handleUseStock(event) {
  event.preventDefault();
  
  const stockId = document.getElementById('useStockId').value;
  const quantity = parseFloat(document.getElementById('useStockQuantity').value);
  const usageDate = document.getElementById('useStockDate').value;
  const usedBy = document.getElementById('useStockUsedBy').value;
  const location = document.getElementById('useStockLocation').value;
  const notes = document.getElementById('useStockNotes').value;

  try {
    const user = auth.currentUser;
    const projectId = window.currentProjectId;
    
    if (!user) {
      showAlert('❌ Hata: Kullanıcı oturumu bulunamadı', 'danger');
      return;
    }
    
    if (!projectId) {
      showAlert('❌ Hata: Proje ID\'si bulunamadı. Lütfen sayfayı yenileyin.', 'danger');
      console.error('currentProjectId not found. window.currentProjectId:', window.currentProjectId);
      return;
    }

    if (!stockId) {
      showAlert('❌ Hata: Stok ID\'si bulunamadı', 'danger');
      return;
    }

    // Get current stock data
    const stockRef = doc(db, 'projects', projectId, 'stocks', stockId);
    const stockSnap = await getDoc(stockRef);
    
    if (!stockSnap.exists()) {
      showAlert('❌ Stok bulunamadı', 'danger');
      return;
    }

    const stockData = stockSnap.data();
    const currentUsed = stockData.usedQuantity || 0;
    const remaining = stockData.quantity - currentUsed;

    // Validate quantity
    if (quantity > remaining) {
      showAlert(`❌ Hata: Yetersiz stok! Kalan miktar: ${remaining} ${stockData.unit}`, 'danger');
      return;
    }

    if (quantity <= 0) {
      showAlert('⚠️ Lütfen geçerli bir miktar girin', 'warning');
      return;
    }

    // Update stock used quantity
    await updateDoc(stockRef, {
      usedQuantity: currentUsed + quantity,
      updatedAt: serverTimestamp()
    });

    // Create usage record
    const usageRef = collection(db, 'projects', projectId, 'stocks', stockId, 'usage');
    await addDoc(usageRef, {
      quantity,
      usageDate: new Date(usageDate),
      usedBy,
      location: location || '',
      notes: notes || '',
      recordedBy: user.uid,
      userEmail: user.email,
      createdAt: serverTimestamp()
    });

    showAlert('✅ Stok kullanımı başarıyla kaydedildi!', 'success');
    if (window.closeUseStockModal) window.closeUseStockModal();
    await loadProjectStocks(projectId);
  } catch (error) {
    console.error('❌ Stok kullanımı kaydedilemedi:', error);
    showAlert('❌ Kayıt hatası: ' + error.message, 'danger');
  }
}

async function loadStockUsageHistory(stockId) {
  try {
    const projectId = window.currentProjectId;
    
    if (!projectId) {
      console.warn('⚠️ currentProjectId not set');
      return;
    }

    const usageRef = collection(db, 'projects', projectId, 'stocks', stockId, 'usage');
    const q = query(usageRef, orderBy('usageDate', 'desc'));
    const usageSnap = await getDocs(q);

    const historyList = document.getElementById('stockUsageHistoryList');
    if (!historyList) return;

    if (usageSnap.empty) {
      historyList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <div>Henüz kullanım kaydı bulunmuyor</div>
        </div>
      `;
      return;
    }

    let html = '';
    usageSnap.forEach(docSnap => {
      const usage = docSnap.data();
      const date = usage.usageDate?.toDate?.() || new Date();
      
      html += `
        <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--brand-red);">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1;">
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <strong style="color: var(--brand-red); font-size: 1.2rem;">${usage.quantity}</strong>
                <span style="color: var(--text-secondary); font-size: 0.9rem; align-self: center;">birim kullanıldı</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                📅 ${date.toLocaleDateString('tr-TR')}
              </div>
              ${usage.usedBy ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                👤 ${usage.usedBy}
              </div>` : ''}
              ${usage.location ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                📍 ${usage.location}
              </div>` : ''}
              ${usage.notes ? `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.9rem;">
                ${usage.notes}
              </div>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    historyList.innerHTML = html;
  } catch (error) {
    console.error('❌ Kullanım geçmişi yüklenemedi:', error);
    const historyList = document.getElementById('stockUsageHistoryList');
    if (historyList) {
      historyList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-danger);">
          Kullanım geçmişi yüklenirken hata oluştu
        </div>
      `;
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

    // Delete all related data first (subcollections and related collections)
    console.log('🗑️ Deleting related data for project:', projectId);

    // Delete all related logs
    const logsQuery = query(collection(db, 'logs'), where('projectId', '==', projectId));
    const logsSnapshot = await getDocs(logsQuery);
    const logDeletePromises = logsSnapshot.docs.map(logDoc => deleteDoc(logDoc.ref));
    await Promise.all(logDeletePromises);
    console.log(`✅ Deleted ${logsSnapshot.size} logs`);

    // Delete all related stocks
    const stocksQuery = query(collection(db, 'stocks'), where('projectId', '==', projectId));
    const stocksSnapshot = await getDocs(stocksQuery);
    const stockDeletePromises = stocksSnapshot.docs.map(stockDoc => deleteDoc(stockDoc.ref));
    await Promise.all(stockDeletePromises);
    console.log(`✅ Deleted ${stocksSnapshot.size} stocks`);

    // Delete all related payments
    const paymentsQuery = query(collection(db, 'payments'), where('projectId', '==', projectId));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const paymentDeletePromises = paymentsSnapshot.docs.map(paymentDoc => deleteDoc(paymentDoc.ref));
    await Promise.all(paymentDeletePromises);
    console.log(`✅ Deleted ${paymentsSnapshot.size} payments`);

    // Delete all related budget categories
    const categoriesQuery = query(collection(db, 'budget_categories'), where('projectId', '==', projectId));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categoryDeletePromises = categoriesSnapshot.docs.map(categoryDoc => deleteDoc(categoryDoc.ref));
    await Promise.all(categoryDeletePromises);
    console.log(`✅ Deleted ${categoriesSnapshot.size} budget categories`);

    // Delete all related budget expenses
    const expensesQuery = query(collection(db, 'budget_expenses'), where('projectId', '==', projectId));
    const expensesSnapshot = await getDocs(expensesQuery);
    const expenseDeletePromises = expensesSnapshot.docs.map(expenseDoc => deleteDoc(expenseDoc.ref));
    await Promise.all(expenseDeletePromises);
    console.log(`✅ Deleted ${expensesSnapshot.size} budget expenses`);

    // Now delete the project itself
    await deleteDoc(doc(db, 'projects', projectId));
    console.log('✅ Project deleted:', projectId);

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

/**
 * Create Demo Project - "Deniz Manzaralı Villa"
 * Creates a complete demo project with all workflow stages filled
 */
async function createDemoProject() {
  if (!confirm('🎯 Örnek proje oluşturmak istediğinize emin misiniz?\n\n"Deniz Manzaralı Villa" adlı tamamlanmış bir demo proje oluşturulacak ve tüm aşamaları (Keşif, Teklif, Sözleşme, Metraj, Hakediş, Ödeme) doldurulacak.')) {
    return;
  }

  const loadingMsg = showAlert('🏗️ Demo proje oluşturuluyor... Lütfen bekleyin.', 'info', 0);

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kullanıcı giriş yapmamış');
    }

    // Get user's company ID
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data() || {};
    const companyId = userData.companyId || 'default-company';

    console.log('🏗️ Demo proje oluşturuluyor, şirket:', companyId);

    // ========================================================================
    // 1. CREATE PROJECT
    // ========================================================================
    const projectId = `demo-villa-${Date.now()}`;
    const projectRef = doc(db, 'projects', projectId);
    
    await setDoc(projectRef, {
      id: projectId,
      companyId: companyId,
      name: 'Deniz Manzaralı Villa (Demo)',
      description: 'Bodrum\'da deniz manzaralı lüks villa inşaatı. 250 m² brüt alan, modern tasarım. (Demo Proje)',
      client: {
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@example.com',
        phone: '+90 532 111 22 33',
        tcNo: '12345678901',
        address: 'İstanbul',
      },
      location: 'Gümbet Mahallesi, Deniz Sokak No:15, Bodrum, Muğla',
      coordinates: {
        latitude: 37.0333,
        longitude: 27.4289,
      },
      area: {
        gross: 250,
        net: 220,
        plot: 450,
        unit: 'm²',
      },
      status: 'completed',
      startDate: serverTimestamp(),
      plannedEndDate: serverTimestamp(),
      actualEndDate: serverTimestamp(),
      budget: {
        estimated: 437375,
        contract: 489246,
        actual: 412000,
        currency: 'TRY',
      },
      progress: 100,
      tags: ['demo', 'villa', 'residential', 'luxury', 'completed'],
      team: {
        projectManager: userData.name || 'Proje Müdürü',
        siteManager: 'Ali Kaya',
        accountant: 'Fatma Şahin',
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.email,
    });

    console.log('✅ Proje oluşturuldu:', projectId);

    // ========================================================================
    // 2. CREATE KESIF ITEMS
    // ========================================================================
    const kesifItems = [
      { name: 'Temel Kazısı', description: 'Eğimli arazide temel kazı işleri', category: 'earthwork', unit: 'm³', quantity: 180, unitPrice: 45, riskLevel: 'medium', order: 0 },
      { name: 'Temel Betonu C25', description: 'Hazır beton dökümü, vibrasyon dahil', category: 'concrete', unit: 'm³', quantity: 42, unitPrice: 850, riskLevel: 'high', order: 1 },
      { name: 'Demir Donatı', description: 'Nervürlü demir, kesim büküm montaj', category: 'steel', unit: 'Kg', quantity: 8500, unitPrice: 18, riskLevel: 'medium', order: 2 },
      { name: 'Duvar Örme', description: 'Briket duvar örme işleri', category: 'masonry', unit: 'm²', quantity: 420, unitPrice: 95, riskLevel: 'low', order: 3 },
      { name: 'İç Sıva', description: 'Alçı sıva uygulaması', category: 'plaster', unit: 'm²', quantity: 680, unitPrice: 35, riskLevel: 'low', order: 4 },
      { name: 'Elektrik Tesisatı', description: 'Komple elektrik tesisatı, malzeme dahil', category: 'electrical', unit: 'Adet', quantity: 1, unitPrice: 28000, riskLevel: 'high', order: 5 },
      { name: 'Sıhhi Tesisat', description: 'Su tesisatı ve kanalizasyon', category: 'plumbing', unit: 'Adet', quantity: 1, unitPrice: 32000, riskLevel: 'high', order: 6 },
      { name: 'Seramik Kaplama', description: 'İthal seramik kaplama işçilik', category: 'finishing', unit: 'm²', quantity: 245, unitPrice: 120, riskLevel: 'low', order: 7 },
    ];

    for (const item of kesifItems) {
      await addDoc(collection(db, 'kesif_items'), {
        ...item,
        projectId: projectId,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'kesif_metadata', projectId), {
      projectId: projectId,
      profitMargin: 0.25,
      notes: 'Demo proje: Eğimli arazi, ekstra hafriyat gerekebilir.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Keşif verileri eklendi');

    // ========================================================================
    // 3. CREATE TEKLIF ITEMS
    // ========================================================================
    for (const item of kesifItems) {
      await addDoc(collection(db, 'teklif_items'), {
        ...item,
        projectId: projectId,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'teklif_metadata', projectId), {
      projectId: projectId,
      proposalNumber: `DEMO-${Date.now()}`,
      validUntil: serverTimestamp(),
      paymentTerms: '%30 Avans, %40 Kaba İnşaat, %30 Teslim',
      discount: 0.05,
      taxRate: 0.18,
      notes: 'Demo teklif',
      status: 'accepted',
      acceptedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Teklif verileri eklendi');

    // ========================================================================
    // 4. CREATE SOZLESME
    // ========================================================================
    await setDoc(doc(db, 'sozlesme_metadata', projectId), {
      projectId: projectId,
      contractNumber: `SZL-DEMO-${Date.now()}`,
      contractDate: serverTimestamp(),
      contractAmount: 489246,
      currency: 'TRY',
      paymentPlan: [
        { name: 'Avans', percentage: 30, amount: 146774, status: 'paid' },
        { name: 'Kaba İnşaat', percentage: 40, amount: 195698, status: 'paid' },
        { name: 'Teslim', percentage: 30, amount: 146774, status: 'paid' },
      ],
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Sözleşme verileri eklendi');

    // ========================================================================
    // 5. CREATE METRAJ (BOQ) ITEMS
    // ========================================================================
    const metrajItems = [
      { name: 'Temel Kazısı', category: 'earthwork', unit: 'm³', quantity: 195, unitPrice: 45, progress: 100, order: 0 },
      { name: 'Temel Betonu C25', category: 'concrete', unit: 'm³', quantity: 42, unitPrice: 850, progress: 100, order: 1 },
      { name: 'Demir Donatı', category: 'steel', unit: 'Kg', quantity: 8200, unitPrice: 18, progress: 100, order: 2 },
      { name: 'Duvar Örme', category: 'masonry', unit: 'm²', quantity: 425, unitPrice: 95, progress: 100, width: 25.5, height: 16.7, order: 3 },
      { name: 'İç Sıva', category: 'plaster', unit: 'm²', quantity: 685, unitPrice: 35, progress: 100, width: 45, height: 15.2, order: 4 },
      { name: 'Elektrik Tesisatı', category: 'electrical', unit: 'Adet', quantity: 1, unitPrice: 28000, progress: 100, order: 5 },
      { name: 'Sıhhi Tesisat', category: 'plumbing', unit: 'Adet', quantity: 1, unitPrice: 32000, progress: 100, order: 6 },
      { name: 'Seramik Kaplama', category: 'finishing', unit: 'm²', quantity: 248, unitPrice: 120, progress: 100, width: 15.5, height: 16, order: 7 },
    ];

    for (const item of metrajItems) {
      await addDoc(collection(db, 'boq_items'), {
        ...item,
        projectId: projectId,
        description: 'Demo metraj',
        location: 'Demo',
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Metraj verileri eklendi');

    // ========================================================================
    // 6. CREATE HAKEDIS ITEMS
    // ========================================================================
    const hakedisItems = [
      { itemName: 'Temel Kazısı', category: 'earthwork', unit: 'm³', contractQuantity: 180, currentQuantity: 195, unitPrice: 45, order: 0 },
      { itemName: 'Temel Betonu C25', category: 'concrete', unit: 'm³', contractQuantity: 42, currentQuantity: 42, unitPrice: 850, order: 1 },
      { itemName: 'Demir Donatı', category: 'steel', unit: 'Kg', contractQuantity: 8500, currentQuantity: 8200, unitPrice: 18, order: 2 },
      { itemName: 'Duvar Örme', category: 'masonry', unit: 'm²', contractQuantity: 420, currentQuantity: 425, unitPrice: 95, order: 3 },
      { itemName: 'Elektrik Tesisatı', category: 'electrical', unit: 'Adet', contractQuantity: 1, currentQuantity: 1, unitPrice: 28000, order: 4 },
      { itemName: 'Sıhhi Tesisat', category: 'plumbing', unit: 'Adet', contractQuantity: 1, currentQuantity: 1, unitPrice: 32000, order: 5 },
    ];

    for (const item of hakedisItems) {
      const currentAmount = item.currentQuantity * item.unitPrice;
      await addDoc(collection(db, 'hakedis_items'), {
        ...item,
        projectId: projectId,
        period: 'demo-period',
        periodName: 'Demo Hakediş',
        previousQuantity: 0,
        totalQuantity: item.currentQuantity,
        previousAmount: 0,
        currentAmount: currentAmount,
        totalAmount: currentAmount,
        progress: (item.currentQuantity / item.contractQuantity) * 100,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'hakedis_metadata', `${projectId}-demo-period`), {
      projectId: projectId,
      period: 'demo-period',
      periodName: 'Demo Hakediş',
      grossAmount: 271650,
      deductions: { tax: 8150, other: 0 },
      netAmount: 263500,
      status: 'approved',
      approvedDate: serverTimestamp(),
      notes: 'Demo hakediş',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Hakediş verileri eklendi');

    // ========================================================================
    // 7. CREATE PAYMENT TRACKING
    // ========================================================================
    const payments = [
      { type: 'income', category: 'advance', description: 'Avans Ödemesi', amount: 146774, status: 'completed', paymentMethod: 'bank_transfer' },
      { type: 'income', category: 'progress_payment', description: 'Hakediş', amount: 263500, status: 'completed', paymentMethod: 'check' },
      { type: 'income', category: 'final_payment', description: 'Teslim Ödemesi', amount: 146774, status: 'completed', paymentMethod: 'bank_transfer' },
      { type: 'expense', category: 'material', description: 'Demir Alımı', amount: 155000, status: 'completed', paymentMethod: 'bank_transfer', supplier: 'Demir A.Ş.' },
      { type: 'expense', category: 'material', description: 'Tuğla & Beton', amount: 87500, status: 'completed', paymentMethod: 'check', supplier: 'İnşaat Malz.' },
      { type: 'expense', category: 'labor', description: 'İşçi Maaşları', amount: 62000, status: 'completed', paymentMethod: 'cash' },
    ];

    for (const payment of payments) {
      await addDoc(collection(db, 'payment_tracking'), {
        ...payment,
        projectId: projectId,
        currency: 'TRY',
        invoiceNumber: `DEMO-${Math.floor(Math.random() * 1000)}`,
        dueDate: serverTimestamp(),
        paidDate: serverTimestamp(),
        notes: 'Demo ödeme',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Ödeme takibi verileri eklendi');

    // ========================================================================
    // DONE
    // ========================================================================
    hideAlert(loadingMsg);
    showAlert('🎉 Demo proje başarıyla oluşturuldu!\n\n"Deniz Manzaralı Villa" projesi tüm aşamalarıyla birlikte hazır. Keşif, Teklif, Sözleşme, Metraj, Hakediş ve Ödeme Takibi sayfalarını inceleyebilirsiniz.', 'success', 8000);
    
    // Reload projects
    await loadProjects();

  } catch (error) {
    console.error('❌ Demo proje oluşturma hatası:', error);
    hideAlert(loadingMsg);
    showAlert(`❌ Demo proje oluşturulamadı: ${error.message}`, 'error');
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
window.loadProjectBasicInfo = loadProjectBasicInfo;
window.loadProjectLogs = loadProjectLogs;
window.addLog = addLog;
window.addStock = addStock;
window.addPayment = addPayment;
window.openAddLogModal = openAddLogModal;
window.closeAddLogModal = closeAddLogModal;
window.handleAddLog = handleAddLog;
window.deleteLog = deleteLog;
window.loadProjectStocks = loadProjectStocks;
window.openAddStockModal = openAddStockModal;
window.closeAddStockModal = closeAddStockModal;
window.handleAddStock = handleAddStock;
window.deleteStock = deleteStock;
window.handleUseStock = handleUseStock;
window.loadStockUsageHistory = loadStockUsageHistory;
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
window.createDemoProject = createDemoProject;
