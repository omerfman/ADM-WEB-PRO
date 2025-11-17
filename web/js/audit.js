/**
 * Audit Logging Functions
 * Track all user actions for compliance and debugging
 */

/**
 * Log user action to audit_logs collection
 */
async function logAuditAction(action, entityType, entityId, entityName, changes = {}) {
  try {
    if (!db) {
      console.warn('⚠️ Firestore not available for audit logging');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ User not authenticated for audit log');
      return;
    }

    // Get user's company ID
    const userDoc = await db.collection('users').doc(user.uid).get();
    const companyId = userDoc.data()?.companyId || 'default-company';
    const userDisplayName = userDoc.data()?.displayName || user.email.split('@')[0];

    const auditEntry = {
      action, // create, update, delete, login, export, download
      entity: entityType, // project, log, stock, payment, user
      entityId,
      entityName,
      companyId,
      performedBy: user.uid,
      performedByName: userDisplayName,
      performedByEmail: user.email,
      changes,
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: admin.firestore.Timestamp.now(),
    };

    await db.collection('audit_logs').add(auditEntry);
    console.log('📋 Audit log recorded:', { action, entity: entityType, entityId });
  } catch (error) {
    console.error('❌ Error logging audit action:', error);
    // Don't throw - audit logging should not break main operations
  }
}

/**
 * Get client IP address
 */
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

/**
 * Load audit logs for current user's company
 */
async function loadAuditLogs(limit = 50) {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const userDoc = await db.collection('users').doc(user.uid).get();
    const companyId = userDoc.data()?.companyId || 'default-company';

    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', companyId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Loaded ${logs.length} audit logs`);
    return logs;
  } catch (error) {
    console.error('❌ Error loading audit logs:', error);
    return [];
  }
}

/**
 * Render audit logs in UI
 */
async function renderAuditView() {
  try {
    const logs = await loadAuditLogs(100);

    // Create container if needed
    let container = document.getElementById('auditLogsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'auditLogsContainer';
      container.style.cssText = 'margin-top: 2rem; padding: 1rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    }

    container.innerHTML = '<h3>📋 Audit Logları</h3>';

    if (logs.length === 0) {
      container.innerHTML += '<p style="color: #999;">Henüz audit logu yok</p>';
      return;
    }

    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 0.9rem;';

    // Table header
    const headerRow = `
      <thead style="background: #f5f5f5; border-bottom: 2px solid var(--border-color);">
        <tr>
          <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Tarih</th>
          <th style="padding: 0.75rem; text-align: left; font-weight: 600;">İşlem</th>
          <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Varlık</th>
          <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Yapan</th>
          <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Değişiklikler</th>
        </tr>
      </thead>
    `;

    let bodyHTML = '<tbody>';
    logs.forEach(log => {
      const date = new Date(log.timestamp.toDate());
      const actionColor = log.action === 'create' ? '#27ae60' :
                         log.action === 'update' ? '#f39c12' :
                         log.action === 'delete' ? '#e74c3c' : '#2c3e50';

      const changesStr = Object.entries(log.changes)
        .map(([key, value]) => {
          if (value.from !== undefined && value.to !== undefined) {
            return `${key}: "${value.from}" → "${value.to}"`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        })
        .join('; ') || '—';

      bodyHTML += `
        <tr style="border-bottom: 1px solid var(--border-color); hover: {background: #f9f9f9;}">
          <td style="padding: 0.75rem;">${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')}</td>
          <td style="padding: 0.75rem;">
            <span style="background: ${actionColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.8rem;">
              ${log.action.toUpperCase()}
            </span>
          </td>
          <td style="padding: 0.75rem;">
            ${log.entity} <strong>${log.entityName}</strong>
            <br><small style="color: #999;">${log.entityId}</small>
          </td>
          <td style="padding: 0.75rem;">
            <strong>${log.performedByName}</strong>
            <br><small style="color: #999;">${log.performedByEmail}</small>
          </td>
          <td style="padding: 0.75rem; font-size: 0.85rem;">
            <details>
              <summary style="cursor: pointer; color: var(--accent-color);">Göster</summary>
              <p style="margin: 0.5rem 0; background: #f5f5f5; padding: 0.5rem; border-radius: 3px; font-family: monospace; font-size: 0.8rem;">
                ${changesStr}
              </p>
            </details>
          </td>
        </tr>
      `;
    });

    bodyHTML += '</tbody>';
    table.innerHTML = headerRow + bodyHTML;
    container.appendChild(table);

    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.textContent = '📥 CSV İndir';
    exportBtn.style.marginTop = '1rem';
    exportBtn.onclick = () => exportAuditLogsCSV(logs);
    container.appendChild(exportBtn);

    document.querySelector('.container').appendChild(container);
  } catch (error) {
    console.error('❌ Error rendering audit view:', error);
    showAlert('Audit logları gösterilemedi', 'danger');
  }
}

/**
 * Export audit logs as CSV
 */
function exportAuditLogsCSV(logs) {
  try {
    let csv = 'Tarih,İşlem,Varlık,Varlık Adı,Yapan,E-posta,Değişiklikler\n';

    logs.forEach(log => {
      const date = new Date(log.timestamp.toDate()).toLocaleString('tr-TR');
      const changes = Object.entries(log.changes)
        .map(([key, value]) => {
          if (value.from !== undefined && value.to !== undefined) {
            return `${key}: "${value.from}" → "${value.to}"`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        })
        .join('; ');

      csv += `"${date}","${log.action}","${log.entity}","${log.entityName}","${log.performedByName}","${log.performedByEmail}","${changes}"\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Audit logs exported to CSV');
    showAlert('Audit logları CSV olarak indirildi', 'success');
  } catch (error) {
    console.error('❌ Error exporting audit logs:', error);
    showAlert('CSV indirilemedi', 'danger');
  }
}

/**
 * Get audit summary statistics
 */
async function getAuditSummary(days = 7) {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await db.collection('users').doc(user.uid).get();
    const companyId = userDoc.data()?.companyId || 'default-company';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', companyId)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();

    const summary = {
      total: snapshot.size,
      byAction: {},
      byEntity: {},
      topUsers: {},
    };

    snapshot.forEach(doc => {
      const log = doc.data();

      // Count by action
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;

      // Count by entity
      summary.byEntity[log.entity] = (summary.byEntity[log.entity] || 0) + 1;

      // Top users
      summary.topUsers[log.performedByName] = (summary.topUsers[log.performedByName] || 0) + 1;
    });

    console.log('📊 Audit Summary (last', days, 'days):', summary);
    return summary;
  } catch (error) {
    console.error('❌ Error getting audit summary:', error);
    return null;
  }
}

// Export functions
window.logAuditAction = logAuditAction;
window.loadAuditLogs = loadAuditLogs;
window.renderAuditView = renderAuditView;
window.exportAuditLogsCSV = exportAuditLogsCSV;
window.getAuditSummary = getAuditSummary;
