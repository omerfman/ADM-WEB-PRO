// Projects Management - Firebase Modular SDK v10.7.1
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentProjectId = null;
let projects = [];

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

    // Get user's company ID
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const companyId = userDocSnap.data()?.companyId || 'default-company';

    // Query projects
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    projects = [];
    snapshot.forEach(docSnap => {
      projects.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderProjectsList();
    console.log(`✅ ${projects.length} proje yüklendi`);
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

  if (projects.length === 0) {
    projectsList.innerHTML = '<p style="color: #999; grid-column: 1/-1;">Henüz proje yok. + Yeni Proje butonuna tıklayın.</p>';
    return;
  }

  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.style.cssText = 'padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--card-bg); cursor: pointer; transition: box-shadow 0.3s;';
    projectCard.onmouseover = () => projectCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    projectCard.onmouseout = () => projectCard.style.boxShadow = 'none';
    projectCard.onclick = () => openProjectDetail(project.id);

    const status = project.status || 'planning';
    const statusColors = {
      'planning': '#FFA500',
      'active': '#4CAF50',
      'paused': '#FF9800',
      'completed': '#2196F3'
    };

    projectCard.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">${project.name || 'Unnamed'}</h4>
      <p style="margin: 0.5rem 0; color: #666; font-size: 0.9rem;">${project.location || 'No location'}</p>
      <p style="margin: 0.5rem 0; color: #666; font-size: 0.9rem;">${project.description || ''}</p>
      <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
        <span style="background: ${statusColors[status]}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
          ${status.toUpperCase()}
        </span>
        <small style="color: #999;">${new Date(project.createdAt?.toDate?.() || new Date()).toLocaleDateString('tr-TR')}</small>
      </div>
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

    // Update modal
    document.getElementById('projectTitle').textContent = project.name;
    document.getElementById('projectDetailDesc').textContent = project.description || 'Açıklama yok';
    document.getElementById('projectDetailLocation').textContent = project.location || 'Lokasyon belirtilmemiş';

    // Load tab contents
    await loadProjectLogs(projectId);
    await loadProjectStocks(projectId);
    await loadProjectPayments(projectId);

    // Show modal
    document.getElementById('projectDetailModal').classList.add('show');
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
  }
}

/**
 * Load project logs
 */
async function loadProjectLogs(projectId) {
  try {
    const logsRef = collection(db, 'projects', projectId, 'logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';

    if (snapshot.empty) {
      logsList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz log yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const log = docSnap.data();
      const logItem = document.createElement('div');
      logItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      logItem.innerHTML = `
        <strong style="color: var(--primary-color);">${log.title || 'Untitled'}</strong>
        <br>${log.description || ''}
        <br><small style="color: #999;">
          ${new Date(log.createdAt?.toDate?.() || new Date()).toLocaleDateString('tr-TR')} — ${log.createdBy || 'Unknown'}
        </small>
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
    const q = query(stocksRef, orderBy('lastUpdated', 'desc'));
    const snapshot = await getDocs(q);

    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = '';

    if (snapshot.empty) {
      stocksList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz malzeme kaydı yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const stock = docSnap.data();
      const stockItem = document.createElement('div');
      stockItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      stockItem.innerHTML = `
        <strong>${stock.name || 'Unnamed'}</strong>
        <br>Miktar: ${stock.quantity || 0} ${stock.unit || ''} | Birim Fiyat: ₺${(stock.unitPrice || 0).toLocaleString('tr-TR')}
        <br>Tedarikçi: ${stock.supplier || 'N/A'} | Durum: <span style="color: ${stock.status === 'in_stock' ? 'green' : 'orange'}">${stock.status || 'unknown'}</span>
      `;
      stocksList.appendChild(stockItem);
    });

    console.log(`✅ ${snapshot.size} malzeme yüklendi`);
  } catch (error) {
    console.error('❌ Malzemeler yüklenirken hata:', error);
    document.getElementById('stocksList').innerHTML = '<p style="color: red;">Malzemeler yüklenemedi</p>';
  }
}

/**
 * Load project payments
 */
async function loadProjectPayments(projectId) {
  try {
    const paymentsRef = collection(db, 'projects', projectId, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const paymentsList = document.getElementById('paymentsList');
    paymentsList.innerHTML = '';

    if (snapshot.empty) {
      paymentsList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz ödeme kaydı yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const payment = docSnap.data();
      const paymentItem = document.createElement('div');
      paymentItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      paymentItem.innerHTML = `
        <strong>${payment.description || 'Unnamed'}</strong>
        <br>Tutar: ₺${(payment.amount || 0).toLocaleString('tr-TR')} | Tarih: ${new Date(payment.createdAt?.toDate?.() || new Date()).toLocaleDateString('tr-TR')}
        <br>Durum: <span style="color: ${payment.status === 'paid' ? 'green' : 'orange'}">${payment.status || 'pending'}</span>
      `;
      paymentsList.appendChild(paymentItem);
    });

    console.log(`✅ ${snapshot.size} ödeme yüklendi`);
  } catch (error) {
    console.error('❌ Ödemeler yüklenirken hata:', error);
    document.getElementById('paymentsList').innerHTML = '<p style="color: red;">Ödemeler yüklenemedi</p>';
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

// Export functions for global use
window.loadProjects = loadProjects;
window.openProjectDetail = openProjectDetail;
window.closeProjectModal = closeProjectModal;
window.switchTab = switchTab;
window.openCreateProjectModal = openCreateProjectModal;
window.closeCreateProjectModal = closeCreateProjectModal;
window.handleCreateProject = handleCreateProject;
