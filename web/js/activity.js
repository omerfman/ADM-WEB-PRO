// ========== ACTIVITY LOGS MANAGEMENT ==========

const db = window.db;
const auth = window.auth;
const { collection, query, where, getDocs, orderBy, limit } = window.firestore;

// Load activity logs based on user role
async function loadActivityLogs() {
  try {
    const userRole = window.userRole;
    const userCompanyId = window.userCompanyId;
    const userId = auth.currentUser.uid;

    console.log('📥 Loading activity logs...', { userRole, userCompanyId });

    let q;
    const logsRef = collection(db, 'audit_logs');

    // Super admin sees all logs
    if (userRole === 'super_admin') {
      q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
    }
    // Company admin sees only their company's logs
    else if (userRole === 'company_admin') {
      // Note: audit_logs may not have companyId, we need to filter by users from company
      q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
    }
    // Regular users see only their own logs
    else {
      q = query(logsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(100));
    }

    const snapshot = await getDocs(q);
    const logs = [];

    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Loaded logs:', logs.length);
    
    // Filter logs based on company for company_admin
    let filteredLogs = logs;
    if (userRole === 'company_admin') {
      // We need to get all users from the company first
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('companyId', '==', userCompanyId)));
      const companyUserIds = usersSnapshot.docs.map(doc => doc.id);
      
      filteredLogs = logs.filter(log => companyUserIds.includes(log.userId));
    }

    renderActivityLogs(filteredLogs);
  } catch (error) {
    console.error('❌ Error loading activity logs:', error);
    const activityLogsList = document.getElementById('activityLogsList');
    if (activityLogsList) {
      activityLogsList.innerHTML = '<p style="text-align: center; color: #f44336;">Faaliyet kayıtları yüklenirken hata: ' + error.message + '</p>';
    }
  }
}

// Render activity logs
function renderActivityLogs(logs) {
  const activityLogsList = document.getElementById('activityLogsList');
  if (!activityLogsList) return;

  if (logs.length === 0) {
    activityLogsList.innerHTML = '<p style="text-align: center; color: #999;">Henüz faaliyet kaydı yok</p>';
    return;
  }

  // Apply filters
  const dateFrom = document.getElementById('activityDateFrom')?.value;
  const dateTo = document.getElementById('activityDateTo')?.value;
  const typeFilter = document.getElementById('activityTypeFilter')?.value;

  let filteredLogs = logs.filter(log => {
    // Date filter
    if (dateFrom || dateTo) {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      if (dateFrom && logDate < new Date(dateFrom)) return false;
      if (dateTo && logDate > new Date(dateTo + 'T23:59:59')) return false;
    }

    // Type filter
    if (typeFilter && log.action !== typeFilter) return false;

    return true;
  });

  const actionIcons = {
    'CREATE_PROJECT': '📁',
    'UPDATE_PROJECT': '✏️',
    'DELETE_PROJECT': '🗑️',
    'CREATE_USER': '👤',
    'UPDATE_USER': '✏️',
    'DELETE_USER': '🗑️',
    'CREATE_COMPANY': '🏢',
    'UPDATE_COMPANY': '✏️',
    'DELETE_COMPANY': '🗑️',
    'UPLOAD_PHOTO': '📸',
    'ADD_LOG': '📝',
    'ADD_STOCK': '📦',
    'ADD_PAYMENT': '💰'
  };

  const actionNames = {
    'CREATE_PROJECT': 'Proje Oluşturuldu',
    'UPDATE_PROJECT': 'Proje Güncellendi',
    'DELETE_PROJECT': 'Proje Silindi',
    'CREATE_USER': 'Kullanıcı Oluşturuldu',
    'UPDATE_USER': 'Kullanıcı Güncellendi',
    'DELETE_USER': 'Kullanıcı Silindi',
    'CREATE_COMPANY': 'Şirket Oluşturuldu',
    'UPDATE_COMPANY': 'Şirket Güncellendi',
    'DELETE_COMPANY': 'Şirket Silindi',
    'UPLOAD_PHOTO': 'Fotoğraf Yüklendi',
    'ADD_LOG': 'Şantiye Günlüğü Eklendi',
    'ADD_STOCK': 'Stok Eklendi',
    'ADD_PAYMENT': 'Hakediş Eklendi'
  };

  activityLogsList.innerHTML = filteredLogs.map(log => {
    const icon = actionIcons[log.action] || '📋';
    const actionName = actionNames[log.action] || log.action;
    const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
    const timeStr = timestamp.toLocaleString('tr-TR');

    let detailsHtml = '';
    if (log.details) {
      const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2);
      detailsHtml = `<pre style="
        background: var(--bg-tertiary);
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        overflow-x: auto;
        margin-top: 0.5rem;
      ">${details}</pre>`;
    }

    return `
      <div style="
        background: var(--card-bg);
        border-left: 4px solid var(--brand-red);
        padding: 1rem;
        margin-bottom: 0.75rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <div>
              <strong style="color: var(--text-primary);">${actionName}</strong>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                👤 Kullanıcı ID: ${log.userId}
                ${log.projectId ? ` • 📁 Proje ID: ${log.projectId}` : ''}
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: var(--text-secondary);">
            🕒 ${timeStr}
          </div>
        </div>
        ${detailsHtml}
      </div>
    `;
  }).join('');
}

// Filter activity logs
function filterActivityLogs() {
  loadActivityLogs();
}

// Clear filters
function clearActivityFilters() {
  const dateFrom = document.getElementById('activityDateFrom');
  const dateTo = document.getElementById('activityDateTo');
  const typeFilter = document.getElementById('activityTypeFilter');

  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  if (typeFilter) typeFilter.value = '';

  loadActivityLogs();
}

// Export functions to window
window.loadActivityLogs = loadActivityLogs;
window.filterActivityLogs = filterActivityLogs;
window.clearActivityFilters = clearActivityFilters;
