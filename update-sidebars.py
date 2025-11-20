import re

# Metraj sidebar template (lines 12-105 from metraj-listesi.html)
SIDEBAR_TEMPLATE = '''      <div class="sidebar-header">
        <img src="../assets/adm_logo.png" alt="ADM Studio" class="sidebar-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <h1 style="display: none;">🏗️ ADM İnşaat</h1>
      </div>
      
      <nav class="sidebar-nav">
        <a href="../anasayfa.html" class="nav-item">
          <span class="nav-icon">📊</span>
          <span class="nav-text">Anasayfa</span>
        </a>
        <a href="../projeler.html" class="nav-item">
          <span class="nav-icon">🏗️</span>
          <span class="nav-text">Projeler</span>
        </a>
        
        <!-- Project Navigation -->
        <div style="margin-top: 1.5rem; padding: 0 1rem; color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Proje Dashboard
        </div>
        <a href="proje-ozeti.html" class="nav-item{ozet_active}" id="navOzet">
          <span class="nav-icon">📊</span>
          <span class="nav-text">Proje Özeti</span>
        </a>
        
        <div style="margin-top: 1.5rem; padding: 0 1rem; color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          İş Akış Süreci
        </div>
        <a href="kesif.html" class="nav-item{kesif_active}" id="navKesif">
          <span class="nav-icon">🔍</span>
          <span class="nav-text">1. Keşif</span>
        </a>
        <a href="teklif.html" class="nav-item{teklif_active}" id="navTeklif">
          <span class="nav-icon">💼</span>
          <span class="nav-text">2. Teklif</span>
        </a>
        <a href="sozlesme.html" class="nav-item{sozlesme_active}" id="navSozlesme">
          <span class="nav-icon">📝</span>
          <span class="nav-text">3. Sözleşme</span>
        </a>
        <a href="metraj-listesi.html" class="nav-item{metraj_active}" id="navMetraj">
          <span class="nav-icon">📐</span>
          <span class="nav-text">4. Metraj (BOQ)</span>
        </a>
        <a href="hakedis-takibi.html" class="nav-item{hakedis_active}" id="navHakedis">
          <span class="nav-icon">💰</span>
          <span class="nav-text">5. Hakediş</span>
        </a>
        <a href="odeme-takibi.html" class="nav-item{odeme_active}" id="navOdeme">
          <span class="nav-icon">💳</span>
          <span class="nav-text">6. Ödeme</span>
        </a>
        
        <div style="margin-top: 1.5rem; padding: 0 1rem; color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Destek Modüller
        </div>
        <a href="santiye-gunlugu.html" class="nav-item" id="navGunluk">
          <span class="nav-icon">📔</span>
          <span class="nav-text">Şantiye Günlüğü</span>
        </a>
        <a href="stok-yonetimi.html" class="nav-item" id="navStok">
          <span class="nav-icon">📦</span>
          <span class="nav-text">Stok Yönetimi</span>
        </a>
        <a href="butce-yonetimi.html" class="nav-item" id="navButce">
          <span class="nav-icon">💵</span>
          <span class="nav-text">Bütçe Yönetimi</span>
        </a>
        <a href="musteri-yetkileri.html" class="nav-item hidden" id="navMusteri">
          <span class="nav-icon">👥</span>
          <span class="nav-text">Müşteri Yetkileri</span>
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">👤</div>
          <div class="user-details">
            <div class="user-name" id="sidebarUserName">Yükleniyor...</div>
            <div class="user-role" id="sidebarUserRole">...</div>
          </div>
        </div>
        <div class="sidebar-actions">
          <button id="sidebarThemeToggle" class="theme-toggle-btn" onclick="toggleTheme()">
            <span class="theme-option light-option">
              <span class="theme-circle">⚪</span>
              <span class="theme-label">Light</span>
            </span>
            <span class="theme-option dark-option active">
              <span class="theme-circle">⚫</span>
              <span class="theme-label">Dark</span>
            </span>
          </button>
          <button id="logoutBtn" class="logout-btn" onclick="handleLogout()">Çıkış Yap</button>
        </div>
      </div>'''

# Files to update with their active page
FILES = {
    'web/projects/teklif.html': 'teklif',
    'web/projects/sozlesme.html': 'sozlesme',
    'web/projects/odeme-takibi.html': 'odeme',
}

def update_file(filepath, active_page):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace active classes
    sidebar = SIDEBAR_TEMPLATE
    sidebar = sidebar.replace('{ozet_active}', ' active' if active_page == 'ozet' else '')
    sidebar = sidebar.replace('{kesif_active}', ' active' if active_page == 'kesif' else '')
    sidebar = sidebar.replace('{teklif_active}', ' active' if active_page == 'teklif' else '')
    sidebar = sidebar.replace('{sozlesme_active}', ' active' if active_page == 'sozlesme' else '')
    sidebar = sidebar.replace('{metraj_active}', ' active' if active_page == 'metraj' else '')
    sidebar = sidebar.replace('{hakedis_active}', ' active' if active_page == 'hakedis' else '')
    sidebar = sidebar.replace('{odeme_active}', ' active' if active_page == 'odeme' else '')
    
    # Find and replace sidebar content (from <div class="sidebar-header"> to </div> before </aside>)
    pattern = r'(<aside class="sidebar">)\s*<div class="sidebar-header">.*?</div>\s*</aside>'
    replacement = r'\1\n' + sidebar + '\n    </aside>'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ Updated: {filepath}")
    else:
        print(f"⚠️  No changes: {filepath}")

if __name__ == '__main__':
    for filepath, active_page in FILES.items():
        try:
            update_file(filepath, active_page)
        except Exception as e:
            print(f"❌ Error updating {filepath}: {e}")
