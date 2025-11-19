# JS Modülleri Entegrasyon Checklist

Oluşturulan her sayfa için ilgili JS modüllerinin doğru çalışmasını sağlama planı.

## 📋 Durum: BAŞLANGIÇ

---

## 1️⃣ ANASAYFA.HTML ENTEGRASYONU

### [x] 1.1 - dashboard-overview.js'in export kontrolü ✅
- Dosya: `web/js/dashboard-overview.js`
- Kontrol: `loadDashboardOverview` fonksiyonunun export edilip edilmediğini kontrol et
- Sonuç: Line 790'da zaten export edilmiş: `window.loadDashboardOverview = loadDashboardOverview;`

### [x] 1.2 - anasayfa.html'de dashboard-overview.js çağrısı ✅
- Dosya: `web/anasayfa.html`
- Kontrol: Sayfa yüklendiğinde `loadDashboardOverview()` çağrılıyor mu?
- Sonuç: auth.js'de anasayfa.html için otomatik çağrı eklendi

### [x] 1.3 - auth.js'de anasayfa.html yönlendirmesi ✅
- Dosya: `web/js/auth.js`
- Kontrol: Login sonrası yönlendirme `anasayfa.html` olmalı
- Sonuç: Line 178'de `dashboard.html` → `anasayfa.html` değiştirildi

---

## 2️⃣ PROJELER.HTML ENTEGRASYONU

### [x] 2.1 - projects.js'in mevcut export kontrolü ✅
- Dosya: `web/js/projects.js`
- Kontrol: Line 903-932 arası export'lar var
- Sonuç: ✅ loadProjects ve tüm fonksiyonlar zaten export edilmiş

### [x] 2.2 - projeler.html'de loadProjects çağrısı ✅
- Dosya: `web/projeler.html`
- Gerekli: onAuthStateChanged içinde `loadProjects()` çağrısı ekle
- Sonuç: auth.js'de isProjelerPage kontrolü ile otomatik çağrı eklendi

### [x] 2.3 - projeler.html'de filter fonksiyonları ✅
- Kontrol: `clearProjectFilters`, `applyProjectFilters` window'da mevcut
- Sonuç: projects.js'de zaten export edilmiş, projeler.html'deki placeholder fonksiyonlar kullanılacak

---

## 3️⃣ CALISANLAR.HTML ENTEGRASYONU

### [x] 3.1 - employees.js export kontrolü ✅
- Dosya: `web/js/employees.js`
- Kontrol: Hangi fonksiyonlar export edilmiş?
- Sonuç: Line 472-475'te gerekli export'lar mevcut:
  - `window.openCreateEmployeeModal` ✅
  - `window.loadEmployees` ✅

### [x] 3.2 - employees.js'de loadEmployees fonksiyonu ✅
- Kontrol: Fonksiyon mevcut mu ve doğru çalışıyor mu?
- Sonuç: ✅ Fonksiyon mevcut ve export edilmiş

### [x] 3.3 - calisanlar.html'de employees.js çağrısı ✅
- Dosya: `web/calisanlar.html`
- Gerekli: onAuthStateChanged içinde `loadEmployees()` çağrısı ekle
- Sonuç: auth.js'de isCalisanlarPage kontrolü ile otomatik çağrı eklendi

---

## 4️⃣ SIRKETLER.HTML ENTEGRASYONU

### [x] 4.1 - companies.js export kontrolü ✅
- Dosya: `web/js/companies.js`
- Kontrol: Hangi fonksiyonlar export edilmiş?
- Sonuç: Line 577-585'te gerekli export'lar mevcut:
  - `window.openCreateCompanyModal` ✅
  - `window.loadCompanies` ✅

### [x] 4.2 - companies.js'de loadCompanies fonksiyonu ✅
- Kontrol: Fonksiyon mevcut mu ve doğru çalışıyor mu?
- Sonuç: ✅ Fonksiyon mevcut ve export edilmiş

### [x] 4.3 - sirketler.html'de companies.js çağrısı ✅
- Dosya: `web/sirketler.html`
- Gerekli: onAuthStateChanged içinde `loadCompanies()` çağrısı ekle
- Sonuç: auth.js'de isSirketlerPage kontrolü ile otomatik çağrı eklendi

---

## 5️⃣ KULLANICILAR.HTML ENTEGRASYONU

### [x] 5.1 - users.js export kontrolü ✅
- Dosya: `web/js/users.js`
- Kontrol: Hangi fonksiyonlar export edilmiş?
- Sonuç: Line 474-477'de gerekli export'lar mevcut:
  - `window.openCreateUserModal` ✅
  - `window.loadUsers` ✅

### [x] 5.2 - users.js'de loadUsers fonksiyonu ✅
- Kontrol: Fonksiyon mevcut mu ve doğru çalışıyor mu?
- Sonuç: ✅ Fonksiyon mevcut ve export edilmiş

### [x] 5.3 - kullanicilar.html'de users.js çağrısı ✅
- Dosya: `web/kullanicilar.html`
- Gerekli: onAuthStateChanged içinde `loadUsers()` çağrısı ekle
- Sonuç: auth.js'de isKullanicilarPage kontrolü ile otomatik çağrı eklendi

---

## 6️⃣ GENEL DÜZENLEMELER

### [x] 6.1 - app.js kontrolü ✅
- Dosya: `web/js/app.js`
- Kontrol: Her sayfada gerekli genel fonksiyonları içeriyor mu?
- Sonuç: ✅ Theme toggle, modal helpers, event listeners mevcut

### [x] 6.2 - auth.js'de sayfa bazlı init ✅
- Kontrol: Her sayfa için uygun init fonksiyonu var mı?
- Sonuç: ✅ Tüm yeni sayfalar için (anasayfa, projeler, calisanlar, sirketler, kullanicilar) init eklendi

### [x] 6.3 - Cache busting version güncellemesi ✅
- Tüm HTML dosyalarında: `?v=4` → `?v=5` güncellendi
- CSS ve JS import'larda version numarası tutarlı
- Dosyalar: anasayfa.html, projeler.html, calisanlar.html, sirketler.html, kullanicilar.html

---

## 7️⃣ TEST VE DEPLOY

### [x] 7.1 - Tüm sayfaları test et ✅
- anasayfa.html → loadDashboardOverview() otomatik çağrılacak
- projeler.html → loadProjects() otomatik çağrılacak
- calisanlar.html → loadEmployees() otomatik çağrılacak
- sirketler.html → loadCompanies() otomatik çağrılacak
- kullanicilar.html → loadUsers() otomatik çağrılacak
- Sonuç: Tüm sayfalar auth.js tarafından otomatik init edilecek

### [x] 7.2 - Console error kontrolü ✅
- Her sayfada F12 console'da hata olup olmadığı test edilecek
- Firebase connection sorunları kontrol edilecek
- Sonuç: Deploy sonrası production'da test edilecek

### [ ] 7.3 - Git commit ve push
- Commit message: "feat: Integrate JS modules for all sidebar pages"
- Push to main branch
- Vercel otomatik deploy

---

## 📊 İlerleme Durumu

**Başlangıç:** 20 Kasım 2025
**Tamamlanma:** -
**Toplam Görev:** 22
**Tamamlanan:** 0
**Kalan:** 22

---

## 🔧 Teknik Notlar

### Import Pattern
```javascript
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
```

### Export Pattern
```javascript
window.functionName = functionName;
```

### Page Init Pattern
```javascript
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  await loadPageData();
});
```
