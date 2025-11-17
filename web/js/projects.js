// Projects Management

let currentProjectId = null;
const projects = [];

async function loadProjects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ User not authenticated');
      return;
    }

    // TODO: Firestore'dan gerçek verileri yükle
    // const snapshot = await db.collection('projects').where('companyId', '==', userCompanyId).get();
    
    // Şimdilik local mock data kullanıyoruz
    const mockProjects = [
      { id: '1', name: 'Yazlık Villa', location: 'Bodrum', description: 'Denize yakın yazlık villa projesi', createdAt: new Date() },
      { id: '2', name: 'Otel Kompleksi', location: 'Cappadocia', description: 'Turizm kompleksi inşaatı', createdAt: new Date() },
    ];
    
    renderProjectsList(mockProjects);
  } catch (error) {
    console.error('❌ Projeler yüklenirken hata:', error);
    showAlert('Projeler yüklenemedi', 'danger');
  }
}

function renderProjectsList(projectsList) {
  const container = document.getElementById('projectsList');
  container.innerHTML = '';
  
  projectsList.forEach(project => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${project.name}</h3>
      <p><strong>Konum:</strong> ${project.location}</p>
      <p>${project.description}</p>
      <small style="color: #999;">Oluşturulma: ${new Date(project.createdAt).toLocaleDateString('tr-TR')}</small>
    `;
    card.onclick = () => openProjectDetail(project);
    container.appendChild(card);
  });
}

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

function closeProjectModal() {
  document.getElementById('projectDetailModal').classList.remove('show');
  currentProjectId = null;
}

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
  document.getElementById(tabName + '-tab').classList.remove('hidden');
  document.querySelector('[data-tab="' + tabName + '"]').style.borderBottom = '3px solid var(--accent-color)';
}

async function loadProjectLogs(projectId) {
  try {
    // Mock logs
    const mockLogs = [
      { date: new Date(), text: 'Temelleme başlandı', user: 'Admin' },
      { date: new Date(), text: 'İnşaat izni alındı', user: 'Mühendis' },
    ];
    
    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';
    
    mockLogs.forEach(log => {
      const logItem = document.createElement('div');
      logItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      logItem.innerHTML = `
        <strong>${log.date.toLocaleDateString('tr-TR')}</strong> - ${log.text}
        <br><small style="color: #999;">Tarafından: ${log.user}</small>
      `;
      logsList.appendChild(logItem);
    });
  } catch (error) {
    console.error('❌ Loglar yüklenirken hata:', error);
  }
}

async function loadProjectStocks(projectId) {
  try {
    // Mock stocks
    const mockStocks = [
      { name: 'Çimento', quantity: 500, unit: 'çuval' },
      { name: 'Demir', quantity: 2000, unit: 'kg' },
    ];
    
    const stocksList = document.getElementById('stocksList');
    stocksList.innerHTML = '';
    
    mockStocks.forEach(stock => {
      const stockItem = document.createElement('div');
      stockItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      stockItem.innerHTML = `
        <strong>${stock.name}</strong>: ${stock.quantity} ${stock.unit}
      `;
      stocksList.appendChild(stockItem);
    });
  } catch (error) {
    console.error('❌ Stoklar yüklenirken hata:', error);
  }
}

async function loadProjectPayments(projectId) {
  try {
    // Mock payments
    const mockPayments = [
      { date: new Date(), amount: 50000, status: 'Ödendi', description: 'İlk taksit' },
      { date: new Date(), amount: 30000, status: 'Beklemede', description: 'İkinci taksit' },
    ];
    
    const paymentsList = document.getElementById('paymentsList');
    paymentsList.innerHTML = '';
    
    mockPayments.forEach(payment => {
      const paymentItem = document.createElement('div');
      paymentItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';
      paymentItem.innerHTML = `
        <strong>${payment.date.toLocaleDateString('tr-TR')}</strong> - ₺${payment.amount.toLocaleString('tr-TR')}
        <br>Durum: <span style="color: ${payment.status === 'Ödendi' ? 'green' : 'orange'}">${payment.status}</span>
        <br><small>${payment.description}</small>
      `;
      paymentsList.appendChild(paymentItem);
    });
  } catch (error) {
    console.error('❌ Ödemeler yüklenirken hata:', error);
  }
}

function addLog() {
  const text = prompt('Log metnini girin:');
  if (text) {
    console.log('📝 Yeni log eklendi:', text);
    showAlert('Log eklendi', 'success');
  }
}

function addStock() {
  const name = prompt('Malzeme adı:');
  if (name) {
    console.log('📦 Yeni malzeme eklendi:', name);
    showAlert('Malzeme eklendi', 'success');
  }
}

function addPayment() {
  const amount = prompt('Ödeme tutarı:');
  if (amount) {
    console.log('💰 Yeni ödeme eklendi:', amount);
    showAlert('Ödeme eklendi', 'success');
  }
}

function openCreateProjectModal() {
  document.getElementById('createProjectModal').classList.add('show');
}

function closeCreateProjectModal() {
  document.getElementById('createProjectModal').classList.remove('show');
  document.getElementById('createProjectForm').reset();
}

async function handleCreateProject(event) {
  event.preventDefault();
  
  const name = document.getElementById('projectName').value;
  const desc = document.getElementById('projectDesc').value;
  const location = document.getElementById('projectLocation').value;
  
  try {
    console.log('✅ Proje oluşturuldu:', { name, desc, location });
    showAlert('Proje başarıyla oluşturuldu!', 'success');
    closeCreateProjectModal();
    // TODO: Firestore'a kaydet ve listeyi yenile
    // await loadProjects();
  } catch (error) {
    console.error('❌ Proje oluşturulurken hata:', error);
    showAlert('Proje oluşturulamadı', 'danger');
  }
}
