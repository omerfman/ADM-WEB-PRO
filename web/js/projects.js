// Projects Management

let currentProjectId = null;
let projects = [];

/**
 * Load projects from Firestore
 */
async function loadProjects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ User not authenticated');
      return;
    }

    // Get user's company ID (for demo, use 'default-company')
    const userDoc = await db.collection('users').doc(user.uid).get();
    const companyId = userDoc.data()?.companyId || 'default-company';

    // Query projects for user's company
    const snapshot = await db.collection('projects')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    projects = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ${projects.length} projects loaded for company: ${companyId}`);
    renderProjectsList(projects);
  } catch (error) {
    console.error('❌ Error loading projects:', error);
    showAlert('Projeler yüklenemedi: ' + error.message, 'danger');
  }
}

/**
 * Render projects list in the dashboard
 */
function renderProjectsList(projectsList) {
  const container = document.getElementById('projectsList');
  container.innerHTML = '';

  if (projectsList.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Henüz proje oluşturulmamış</p>';
    return;
  }

  projectsList.forEach(project => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer';
    
    const progressBarColor = project.progress >= 75 ? '#27ae60' : 
                            project.progress >= 50 ? '#f39c12' : '#e74c3c';
    
    card.innerHTML = `
      <h3>${project.name}</h3>
      <p><strong>Konum:</strong> ${project.location}</p>
      <p style="color: #7f8c8d; font-size: 0.9rem;">${project.description}</p>
      <div style="margin: 1rem 0;">
        <small>İlerleme: ${project.progress}%</small>
        <div style="width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; margin-top: 0.5rem; overflow: hidden;">
          <div style="width: ${project.progress}%; height: 100%; background: ${progressBarColor};"></div>
        </div>
      </div>
      <small style="color: #999;">Durum: <strong>${project.status}</strong></small>
    `;
    card.onclick = () => openProjectDetail(project);
    container.appendChild(card);
  });
}

/**
 * Open project detail modal
 */
function openProjectDetail(project) {
  currentProjectId = project.id;
  document.getElementById('projectTitle').textContent = project.name;

  // Show first tab (logs)
  switchTab('logs');

  // Load project details
  loadProjectLogs(project.id);
  loadProjectStocks(project.id);
  loadProjectPayments(project.id);

  document.getElementById('projectDetailModal').classList.add('show');
}

/**
 * Close project detail modal
 */
function closeProjectModal() {
  document.getElementById('projectDetailModal').classList.remove('show');
  currentProjectId = null;
}

/**
 * Switch between tabs in project detail
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active state from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.style.borderBottom = 'none';
  });

  // Show selected tab
  const tabElement = document.getElementById(tabName + '-tab');
  if (tabElement) {
    tabElement.classList.remove('hidden');
  }
  
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
    const snapshot = await db.collection('projects').doc(projectId)
      .collection('logs')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';

    if (snapshot.empty) {
      logsList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz log yok</p>';
      return;
    }

    snapshot.forEach(doc => {
      const log = doc.data();
      const logItem = document.createElement('div');
      logItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      logItem.innerHTML = `
        <strong style="color: var(--primary-color);">${log.title}</strong>
        <br>${log.description}
        <br><small style="color: #999;">
          ${new Date(log.createdAt.toDate()).toLocaleDateString('tr-TR')} — ${log.createdBy}
        </small>
      `;
      logsList.appendChild(logItem);
    });

    console.log(`✅ ${snapshot.size} logs loaded`);
  } catch (error) {
    console.error('❌ Error loading logs:', error);
    document.getElementById('logsList').innerHTML = '<p style="color: red;">Loglar yüklenemedi</p>';
  }
}

/**
 * Load project stocks
 */
async function loadProjectStocks(projectId) {
  try {
    const snapshot = await db.collection('projects').doc(projectId)
      .collection('stocks')
      .orderBy('lastUpdated', 'desc')
      .get();

    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = '';

    if (snapshot.empty) {
      stocksList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz malzeme kaydı yok</p>';
      return;
    }

    snapshot.forEach(doc => {
      const stock = doc.data();
      const stockItem = document.createElement('div');
      stockItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      stockItem.innerHTML = `
        <strong>${stock.name}</strong>
        <br>Miktar: ${stock.quantity} ${stock.unit} | Birim Fiyat: ₺${stock.unitPrice.toLocaleString('tr-TR')}
        <br>Tedarikçi: ${stock.supplier} | Durum: <span style="color: ${stock.status === 'in_stock' ? 'green' : 'orange'}">${stock.status}</span>
      `;
      stocksList.appendChild(stockItem);
    });

    console.log(`✅ ${snapshot.size} stocks loaded`);
  } catch (error) {
    console.error('❌ Error loading stocks:', error);
    document.getElementById('stocksList').innerHTML = '<p style="color: red;">Malzemeler yüklenemedi</p>';
  }
}

/**
 * Load project payments
 */
async function loadProjectPayments(projectId) {
  try {
    const snapshot = await db.collection('projects').doc(projectId)
      .collection('payments')
      .orderBy('dueDate', 'desc')
      .get();

    const paymentsList = document.getElementById('paymentsList');
    paymentsList.innerHTML = '';

    if (snapshot.empty) {
      paymentsList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz ödeme kaydı yok</p>';
      return;
    }

    snapshot.forEach(doc => {
      const payment = doc.data();
      const statusColor = payment.status === 'paid' ? 'green' : 
                         payment.status === 'pending' ? 'orange' : 'red';
      
      const paymentItem = document.createElement('div');
      paymentItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      paymentItem.innerHTML = `
        <strong>₺${payment.amount.toLocaleString('tr-TR')} — ${payment.description}</strong>
        <br>Durum: <span style="color: ${statusColor}; font-weight: bold;">${payment.status}</span> | Fatura: ${payment.invoiceNumber}
        <br><small style="color: #999;">
          Vade: ${new Date(payment.dueDate.toDate()).toLocaleDateString('tr-TR')}
          ${payment.status === 'paid' ? ' | Ödeme: ' + new Date(payment.paidDate.toDate()).toLocaleDateString('tr-TR') : ''}
        </small>
      `;
      paymentsList.appendChild(paymentItem);
    });

    console.log(`✅ ${snapshot.size} payments loaded`);
  } catch (error) {
    console.error('❌ Error loading payments:', error);
    document.getElementById('paymentsList').innerHTML = '<p style="color: red;">Ödemeler yüklenemedi</p>';
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
    const userDoc = await db.collection('users').doc(user.uid).get();
    const companyId = userDoc.data()?.companyId || 'default-company';

    // Create project in Firestore
    const projectRef = await db.collection('projects').add({
      name,
      description: desc,
      location,
      companyId,
      status: 'planning',
      budget: 0,
      currency: 'TRY',
      startDate: admin.firestore.Timestamp.now(),
      createdBy: user.uid,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      progress: 0,
      tags: [],
    });

    // Write to audit log
    await db.collection('audit_logs').add({
      action: 'create',
      entity: 'project',
      entityId: projectRef.id,
      entityName: name,
      companyId,
      performedBy: user.uid,
      performedByName: user.displayName || user.email,
      performedByEmail: user.email,
      timestamp: admin.firestore.Timestamp.now(),
      changes: {},
    });

    console.log('✅ Project created:', projectRef.id);
    showAlert('Proje başarıyla oluşturuldu!', 'success');
    closeCreateProjectModal();
    await loadProjects();
  } catch (error) {
    console.error('❌ Error creating project:', error);
    showAlert('Proje oluşturulamadı: ' + error.message, 'danger');
  }
}

