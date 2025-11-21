// Client Permissions Management
import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentCompanyId = null;
let currentProjectId = null;

/**
 * Initialize Client Permissions Page
 */
async function initClientPermissions() {
  try {
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');
    
    if (!currentProjectId) {
      console.error('❌ Project ID not found');
      alert('❌ Proje ID bulunamadı');
      window.location.href = '../projeler.html';
      return;
    }

    // Ensure user data is loaded
    if (!window.userRole && window.loadUserData) {
      console.log('⏳ Kullanıcı verileri yükleniyor...');
      await window.loadUserData();
    }

    // Get company ID
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kullanıcı giriş yapmamış');
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data() || {};
    currentCompanyId = userData.companyId || 'default-company';

    console.log('👥 Müşteri yetkileri yükleniyor, proje:', currentProjectId);

    // Load project details
    await loadProjectDetails();

    // Load client users for this company
    await loadClientUsers();

    console.log('✅ Müşteri yetkileri başarıyla yüklendi');

  } catch (error) {
    console.error('❌ Müşteri yetkileri yüklenirken hata:', error);
    showAlert('Müşteri yetkileri yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Load Project Details
 */
async function loadProjectDetails() {
  try {
    const projectDocRef = doc(db, 'projects', currentProjectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (!projectDocSnap.exists()) {
      throw new Error('Proje bulunamadı');
    }

    const project = { id: projectDocSnap.id, ...projectDocSnap.data() };
    
    // Update page title and breadcrumb
    const projectNameEl = document.getElementById('projectName');
    const breadcrumbEl = document.getElementById('projectNameBreadcrumb');
    
    if (projectNameEl) {
      projectNameEl.textContent = `${project.name || 'Proje'} - Müşteri Yetkileri`;
    }
    if (breadcrumbEl) {
      breadcrumbEl.textContent = project.name || 'Proje';
    }

    console.log('📋 Proje yüklendi:', project.name);

  } catch (error) {
    console.error('❌ Proje yüklenirken hata:', error);
    throw error;
  }
}

/**
 * Load Client Users
 */
async function loadClientUsers() {
  try {
    // Get all client users from this company
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('companyId', '==', currentCompanyId),
      where('role', '==', 'client'),
      where('isDeleted', '==', false)
    );

    const snapshot = await getDocs(q);
    
    const clients = [];
    for (const docSnap of snapshot.docs) {
      const client = { id: docSnap.id, ...docSnap.data() };
      
      // Check if this client has access to current project
      client.hasAccess = await checkProjectAccess(currentProjectId, client.id);
      
      clients.push(client);
    }

    console.log(`👥 ${clients.length} müşteri kullanıcısı bulundu`);
    
    renderClientList(clients);

  } catch (error) {
    console.error('❌ Müşteri kullanıcıları yüklenirken hata:', error);
    showAlert('Müşteri listesi yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Check if client has access to project
 */
async function checkProjectAccess(projectId, clientId) {
  try {
    const permissionsRef = collection(db, `projects/${projectId}/project_permissions`);
    const q = query(permissionsRef, where('userId', '==', clientId));
    const snapshot = await getDocs(q);
    
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ Yetki kontrolü hatası:', error);
    return false;
  }
}

/**
 * Render Client List
 */
function renderClientList(clients) {
  const container = document.getElementById('clientsList');
  
  if (!clients || clients.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
        <p style="margin: 0; font-size: 1.1rem;">Henüz müşteri kullanıcısı eklenmemiş</p>
        <p style="margin: 0.5rem 0 0 0;">Önce "Kullanıcılar" sayfasından müşteri rolünde kullanıcı oluşturun</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="window.location.href='../kullanicilar.html'">
          👥 Kullanıcılar Sayfasına Git
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  clients.forEach(client => {
    const initials = getInitials(client.firstName, client.lastName, client.email);
    const fullName = getFullName(client.firstName, client.lastName, client.email);
    const statusClass = client.isActive ? 'status-active' : 'status-inactive';
    const statusText = client.isActive ? '✅ Aktif' : '❌ Pasif';

    html += `
      <div class="client-item">
        <div class="client-avatar">${initials}</div>
        <div class="client-info">
          <div class="client-name">${fullName}</div>
          <div class="client-email">${client.email || '-'}</div>
          ${client.phone ? `<div class="client-email">📱 ${client.phone}</div>` : ''}
        </div>
        <div class="client-status ${statusClass}">${statusText}</div>
        <div>
          <label class="switch" title="${client.hasAccess ? 'Erişimi Kaldır' : 'Erişim Ver'}">
            <input type="checkbox" 
                   ${client.hasAccess ? 'checked' : ''}
                   ${!client.isActive ? 'disabled' : ''}
                   onchange="toggleClientAccess('${client.id}', '${client.email}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Toggle Client Access to Project
 */
async function toggleClientAccess(clientId, clientEmail, hasAccess) {
  try {
    const user = auth.currentUser;
    
    if (hasAccess) {
      // GRANT ACCESS
      console.log(`✅ Erişim veriliyor: ${clientEmail}`);
      
      const permissionData = {
        userId: clientId,
        userEmail: clientEmail,
        projectId: currentProjectId,
        grantedAt: serverTimestamp(),
        grantedBy: user.uid,
        grantedByEmail: user.email
      };
      
      await addDoc(
        collection(db, `projects/${currentProjectId}/project_permissions`),
        permissionData
      );
      
      showAlert(`✅ ${clientEmail} kullanıcısına proje erişimi verildi`, 'success');
      console.log('✅ Erişim verildi');
      
    } else {
      // REVOKE ACCESS
      console.log(`❌ Erişim kaldırılıyor: ${clientEmail}`);
      
      const permissionsRef = collection(db, `projects/${currentProjectId}/project_permissions`);
      const q = query(permissionsRef, where('userId', '==', clientId));
      const snapshot = await getDocs(q);
      
      console.log(`🔍 ${snapshot.size} izin kaydı bulundu, siliniyor...`);
      
      for (const docSnap of snapshot.docs) {
        console.log(`🗑️ Siliniyor: ${docSnap.id}`);
        await deleteDoc(docSnap.ref);
      }
      
      showAlert(`❌ ${clientEmail} kullanıcısının proje erişimi kaldırıldı`, 'success');
      console.log(`✅ Erişim kaldırıldı. ${snapshot.size} kayıt silindi.`);
    }

    // Reload the list to reflect changes
    await loadClientUsers();

  } catch (error) {
    console.error('❌ Erişim değiştirme hatası:', error);
    showAlert('Erişim değiştirilemedi: ' + error.message, 'danger');
    
    // Reload to reset toggle state
    await loadClientUsers();
  }
}

/**
 * Helper: Get initials from name
 */
function getInitials(firstName, lastName, email) {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  } else if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  } else if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'CL';
}

/**
 * Helper: Get full name
 */
function getFullName(firstName, lastName, email) {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (email) {
    return email.split('@')[0];
  }
  return 'İsimsiz Kullanıcı';
}

/**
 * Show Alert
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    alert(message);
    return;
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} show`;
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}

// Export functions to window
window.initClientPermissions = initClientPermissions;
window.toggleClientAccess = toggleClientAccess;

export { initClientPermissions, toggleClientAccess };
