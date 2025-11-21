// Read-Only Mode Module for Client Users
// This module handles read-only view configuration for hakediş, ödeme pages

/**
 * Configure Hakediş page for client read-only mode
 */
function configureHakedisReadOnly() {
  if (window.userRole !== 'client') {
    return; // Not a client, show normal view
  }

  console.log('🔒 Hakediş sayfası client read-only mode yapılandırılıyor...');

  // Hide create new hakediş button
  const btnCreateHakedis = document.getElementById('btnCreateHakedis');
  if (btnCreateHakedis) {
    btnCreateHakedis.style.display = 'none';
    console.log('✅ Yeni Hakediş butonu gizlendi');
  }

  // Add read-only alert at the top
  const contentSection = document.querySelector('.content-section');
  if (contentSection) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info';
    alertDiv.style.cssText = 'margin-bottom: 1.5rem; padding: 1rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; border: none;';
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2rem;">👁️</span>
        <div>
          <strong style="font-size: 1.1rem;">Sadece Görüntüleme Modu</strong>
          <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">
            Hakediş kayıtlarını görüntüleyebilir ve Excel olarak indirebilirsiniz. Yeni hakediş oluşturma ve düzenleme yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    `;
    contentSection.insertBefore(alertDiv, contentSection.firstChild);
    console.log('✅ Read-only alert eklendi');
  }

  // Hide edit and delete buttons in payment cards
  setTimeout(() => {
    const editButtons = document.querySelectorAll('button[onclick^="editProgressPayment"]');
    editButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log(`✅ ${editButtons.length} düzenle butonu gizlendi`);

    const deleteButtons = document.querySelectorAll('button[onclick^="deleteProgressPayment"]');
    deleteButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log(`✅ ${deleteButtons.length} sil butonu gizlendi`);
  }, 1000);

  console.log('✅ Hakediş read-only mode konfigürasyonu tamamlandı');
}

/**
 * Configure Ödeme page for client read-only mode
 */
function configureOdemeReadOnly() {
  if (window.userRole !== 'client') {
    return; // Not a client, show normal view
  }

  console.log('🔒 Ödeme sayfası client read-only mode yapılandırılıyor...');

  // Hide record payment button
  const btnRecordPayment = document.getElementById('btnRecordPayment');
  if (btnRecordPayment) {
    btnRecordPayment.style.display = 'none';
    console.log('✅ Ödeme Kaydet butonu gizlendi');
  }

  // Hide sync button
  const syncButton = document.querySelector('button[onclick*="syncFromHakedis"]');
  if (syncButton) {
    syncButton.style.display = 'none';
    console.log('✅ Senkronize butonu gizlendi');
  }

  // Add read-only alert at the top
  const contentSection = document.querySelector('.content-section');
  if (contentSection) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info';
    alertDiv.style.cssText = 'margin-bottom: 1.5rem; padding: 1rem 1.5rem; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border-radius: 8px; border: none;';
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2rem;">👁️</span>
        <div>
          <strong style="font-size: 1.1rem;">Sadece Görüntüleme Modu</strong>
          <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">
            Ödeme kayıtlarını ve hakediş tahsilatlarını görüntüleyebilirsiniz. Yeni ödeme kaydetme yetkini bulunmamaktadır.
          </p>
        </div>
      </div>
    `;
    contentSection.insertBefore(alertDiv, contentSection.firstChild);
    console.log('✅ Read-only alert eklendi');
  }

  // Hide "Ödeme Kaydet" buttons in table
  setTimeout(() => {
    const recordPaymentButtons = document.querySelectorAll('button[onclick^="recordPaymentFor"]');
    recordPaymentButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log(`✅ ${recordPaymentButtons.length} ödeme kaydet butonu gizlendi`);

    // Hide edit buttons in payment history
    const editButtons = document.querySelectorAll('button[onclick^="openEditPaymentModal"]');
    editButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log(`✅ ${editButtons.length} düzenle butonu gizlendi`);

    const deleteButtons = document.querySelectorAll('button[onclick^="deletePayment"]');
    deleteButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log(`✅ ${deleteButtons.length} sil butonu gizlendi`);
  }, 1500);

  console.log('✅ Ödeme read-only mode konfigürasyonu tamamlandı');
}

/**
 * Configure Proje Özeti for client view
 */
function configureProjeOzetiForClient() {
  if (window.userRole !== 'client') {
    return; // Not a client, show normal view
  }

  console.log('🔒 Proje Özeti client görünümü yapılandırılıyor...');

  // Hide edit project button
  const editButton = document.querySelector('button[onclick="openEditProjectModal()"]');
  if (editButton) {
    editButton.style.display = 'none';
    console.log('✅ Proje düzenle butonu gizlendi');
  }

  // Add info badge to header
  const projectNameEl = document.getElementById('projectName');
  if (projectNameEl && !projectNameEl.querySelector('.read-only-badge')) {
    const badge = document.createElement('span');
    badge.className = 'read-only-badge';
    badge.style.cssText = 'background: #FF9800; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; margin-left: 1rem; font-weight: 600;';
    badge.textContent = '👁️ Görüntüleme';
    badge.title = 'Sadece görüntüleme yetkisi';
    projectNameEl.appendChild(badge);
    console.log('✅ Read-only badge eklendi');
  }

  console.log('✅ Proje Özeti client yapılandırması tamamlandı');
}

// Export functions to window
window.configureHakedisReadOnly = configureHakedisReadOnly;
window.configureOdemeReadOnly = configureOdemeReadOnly;
window.configureProjeOzetiForClient = configureProjeOzetiForClient;

// Auto-detect page and configure
window.addEventListener('DOMContentLoaded', () => {
  // Wait for auth to load user role
  setTimeout(() => {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('hakedis-takibi.html')) {
      configureHakedisReadOnly();
    } else if (currentPath.includes('odeme-takibi.html')) {
      configureOdemeReadOnly();
    } else if (currentPath.includes('proje-ozeti.html')) {
      configureProjeOzetiForClient();
    }
  }, 1000); // Wait 1s for auth and role to be loaded
});

console.log('✅ Read-Only Mode module loaded');
