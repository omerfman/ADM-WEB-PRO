# ADM İnşaat Proje Yönetim Sistemi - Proje Durumu

**Son Güncelleme:** 20 Kasım 2025

## 🎯 Proje Özeti

Türk inşaat firmaları için web tabanlı proje yönetim sistemi. Firebase Firestore backend, vanilla JavaScript frontend kullanılıyor.

## 🏗️ Mimari

- **Frontend:** Vanilla JS ES6 modüler yapı, Montserrat font
- **Backend:** Firebase Firestore v10.7.1
- **Hosting:** Vercel (yapılandırma hazır)
- **Kimlik Doğrulama:** Firebase Auth + Custom Claims
- **Stil:** CSS Variables (Dark/Light mode)
- **Kütüphaneler:** SheetJS (xlsx-0.20.1) - Excel işlemleri

## 📊 İş Akış Süreci (6 Aşama)

1. **Keşif** - Ön maliyet tahmini, keşif kalemleri
2. **Teklif** - Kar marjı eklenerek müşteriye teklif
3. **Sözleşme** - Sözleşme detayları, ödeme planı
4. **Metraj (BOQ)** - Bill of Quantities, gerçek ölçümler
5. **Hakediş** - Hakedişlerin takibi ve onayı
6. **Ödeme** - Gelir/gider takibi

## 🗂️ Firestore Koleksiyonları

### Ana Koleksiyonlar
- `users` - Kullanıcı bilgileri
- `companies` - Şirket kayıtları
- `projects` - Proje kayıtları

### Keşif Modülü
- `kesif_items` - Keşif kalemleri (projectId ile filtrelenir)
- `kesif_metadata` - Keşif meta bilgileri (profitMargin, notes, date, status)

### Teklif Modülü
- `teklif_items` - Teklif kalemleri (keşiften kopyalanır)
- `teklif_metadata` - Teklif bilgileri

### Diğer Modüller
- `boq_items` - Metraj kalemleri
- `hakedis_items` - Hakediş kayıtları
- `payment_tracking` - Ödeme takibi (income/expense)
- `site_logs` - Şantiye günlüğü
- `inventory` - Stok yönetimi
- `budget_data` - Bütçe verileri

## 👥 Kullanıcı Rolleri

1. **super_admin** - Sistem yöneticisi, tüm yetkiler
2. **company_admin** - Şirket yöneticisi, şirket içi tam yetki
3. **user** - Standart kullanıcı, okuma/yazma
4. **client** - Müşteri, sadece okuma yetkisi

## 🎨 Sayfa Yapısı

### Ana Sayfalar
- `login.html` - Giriş sayfası
- `anasayfa.html` - Dashboard
- `projeler.html` - Proje listesi

### Proje Detay Sayfaları (`web/projects/`)
- `proje-ozeti.html` - Proje genel bakış
- `kesif.html` - Keşif yönetimi ⭐ (Son geliştirmeler burada)
- `teklif.html` - Teklif yönetimi
- `sozlesme.html` - Sözleşme
- `metraj-listesi.html` - BOQ
- `hakedis-takibi.html` - Hakediş
- `odeme-takibi.html` - Ödeme
- `santiye-gunlugu.html` - Günlük kayıtlar
- `stok-yonetimi.html` - Envanter
- `butce-yonetimi.html` - Bütçe
- `musteri-yetkileri.html` - Müşteri görünüm ayarları

### JavaScript Modülleri (`web/js/`)
- `firebase-config.js` - Firebase init
- `auth.js` - Kimlik doğrulama
- `kesif.js` - Keşif sayfası logic ⭐
- `projects.js` - Proje listesi ⭐
- `excel.js` - Excel işlemleri (genel)
- `boq.js`, `budget.js`, `progress-payments.js` vb.

## 🎯 Son Geliştirmeler (Chronological)

### 1. Kullanım Kılavuzu
**Dosya:** `KULLANIM_KILAVUZU.md` (~600 satır)
- 6 aşamalı iş akışı detaylı anlatım
- Gerçek proje örneği: "Deniz Manzaralı Villa" (12 aylık timeline)
- Veri akış diyagramları
- Best practices
- FAQ ve troubleshooting

### 2. Demo Proje Sistemi
**Dosya:** `admin-scripts/create-demo-project.js` (~400 satır)
- Node.js script ile Firestore'a demo veri ekleme
- "Yılmaz İnşaat Ltd. Şti." şirketi
- "Deniz Manzaralı Villa" projesi
- 11 veri tipi dolduruldu:
  - 8 Keşif kalemi
  - 8 Teklif kalemi
  - Sözleşme + 3 ödeme planı
  - 8 Metraj kalemi
  - 6 Hakediş kalemi
  - 9 Ödeme kaydı (3 gelir, 6 gider)
  - 4 Şantiye günlüğü
  - 3 Stok kalemi
  - Bütçe verileri

**Durum:** ✅ Başarıyla çalıştırıldı, Firestore'da demo oluşturuldu

### 3. Projeler Sayfası - Demo Butonu
**Dosya:** `web/projeler.html` + `web/js/projects.js`
- "🎯 Örnek Proje Oluştur" butonu eklendi
- Tıklayan kullanıcının şirketinde demo proje oluşturur
- `createDemoProject()` fonksiyonu (~300 satır)
- Görünürlük: super_admin, company_admin, user (client hariç)

### 4. Keşif Sayfası - Kar Marjı Modal
**Dosyalar:** `web/projects/kesif.html`, `web/js/kesif.js`, `web/css/style.css`

**Özellikler:**
- Kar marjı kartı tıklanabilir hale getirildi
- Interactive modal (slider 0-50%)
- Real-time hesaplama gösterimi
- Gradient slider (yeşil→sarı→kırmızı)
- `openProfitMarginModal()`, `saveProfitMargin()`, `updateModalCalculations()`

### 5. Keşif Sayfası - Teklife Dönüştür
**Dosya:** `web/js/kesif.js`
- `convertToProposal()` fonksiyonu
- Keşif kalemlerini `teklif_items` koleksiyonuna kopyalar
- Kar marjı uygular
- `teklif_metadata` oluşturur
- Başarı mesajı + yönlendirme

### 6. Keşif Sayfası - Excel İşlemleri
**Dosyalar:** `web/projects/kesif.html`, `web/js/kesif.js`

**Eklenen Özellikler:**
- SheetJS kütüphanesi (CDN)
- 3 Excel fonksiyonu:
  - `exportKesifToExcel()` - Mevcut kalemleri Excel'e aktar
  - `exportKesifTemplate()` - Boş şablon indir (örnek satır + talimatlar)
  - `importKesifFromExcel(event)` - Excel'den toplu veri yükleme
- Kategori/risk seviyesi dönüşümleri
- Veri doğrulama
- Otomatik tablo yenileme

### 7. Modern Buton Tasarımı ⭐ (En Son)
**Dosyalar:** `web/projects/kesif.html`, `web/css/style.css`

**Yeni Tasarım:**
- 5 buton tek grid'de birleştirildi (`.kesif-actions-grid`)
- Kompakt boyutlar (padding: 0.65rem)
- Modern gradient renkler:
  - Primary: Mor gradient (Teklife Dönüştür)
  - Secondary: Pembe-kırmızı gradient (Kar Marjı)
  - Success: Mavi gradient (Excel Aktar)
  - Info: Yeşil gradient (Şablon)
  - Warning: Pembe-sarı gradient (İçe Aktar)
- Ripple hover animasyonu (::before pseudo-element)
- Responsive grid:
  - Desktop: auto-fit (min 160px)
  - Tablet (≤768px): 2 sütun
  - Mobile (≤480px): 1 sütun
- Transform + box-shadow efektleri

## 📱 Responsive Tasarım

- Sidebar collapsible (hamburger menu)
- Grid sistemler tablet/mobile'da reorganize
- Font boyutları responsive
- Touch-friendly buton boyutları (mobile'da 0.75rem padding)

## 🌙 Dark/Light Mode

- CSS Variables ile tema yönetimi
- Tüm renklerde smooth transition (0.3s ease)
- Theme toggle sidebar'da
- localStorage'da tercih saklanıyor

## 🔧 Mevcut Durum

### Tamamlanmış Modüller
✅ Kullanım kılavuzu  
✅ Demo proje sistemi (script + UI butonu)  
✅ Keşif sayfası (inline editing, kar marjı, Excel, modern butonlar)  
✅ Teklife dönüştürme  
✅ Responsive tasarım  
✅ Dark mode  

### Kısmi Tamamlanmış
🔄 Diğer iş akış sayfaları (teklif, sözleşme, metraj vb.) - temel yapı var, tam entegrasyon eksik

### Bekleyen
⏳ API geliştirme (admin-api/ klasöründe temel yapı var)  
⏳ Test senaryoları  
⏳ Production deployment (Vercel config hazır)  

## 📝 Önemli Notlar

1. **Firestore Security Rules:** `firestore.rules` dosyasında tanımlı, role-based access control
2. **Custom Claims:** Firebase Auth'ta roller saklanıyor (super_admin, company_admin vb.)
3. **Excel Formatı:** Türkçe kolon başlıkları, kategori/risk mapping
4. **Naming Convention:** Türkçe UI, İngilizce code (category: 'hafriyat' → "Hafriyat")
5. **Version Control:** CSS dosyası query string ile cache busting (`style.css?v=9`)

## 🚀 Gelecek Adımlar (Potansiyel)

- [ ] Teklif sayfasına benzer Excel entegrasyonu
- [ ] Metraj/BOQ sayfası için Excel şablonları
- [ ] Raporlama modülü (PDF export)
- [ ] Email bildirimleri (hakediş onayı vb.)
- [ ] Mobil uygulama (React Native potansiyeli)
- [ ] Dashboard'a grafikler (Chart.js)

## 🗂️ Klasör Yapısı

```
adm-web-pro/
├── web/
│   ├── index.html (landing page)
│   ├── login.html
│   ├── anasayfa.html
│   ├── projeler.html
│   ├── css/
│   │   └── style.css (1674 satır, modern CSS)
│   ├── js/
│   │   ├── firebase-config.js
│   │   ├── auth.js
│   │   ├── kesif.js ⭐ (730+ satır)
│   │   ├── projects.js ⭐ (650+ satır)
│   │   └── [diğer modüller]
│   └── projects/
│       ├── kesif.html ⭐
│       ├── teklif.html
│       └── [diğer sayfalar]
├── admin-scripts/
│   ├── create-demo-project.js ⭐
│   └── [diğer admin scriptleri]
├── api/ (Vercel serverless functions)
├── admin-api/ (Node.js API)
├── docs/ (Dökümanlar)
├── KULLANIM_KILAVUZU.md ⭐
└── [config dosyaları: firebase.json, vercel.json vb.]
```

## 🎨 Tasarım Sistemi

**Font:** Montserrat (Google Fonts)  
**Ana Renk:** Kırmızı (#d32f2f) - ADM brand  
**Gradient Kullanımı:** Modern, vibrant gradientler (kesif butonları)  
**Spacing:** 0.5rem, 0.75rem, 1rem, 1.5rem sistem  
**Border Radius:** 6px, 8px, 12px  
**Shadows:** Soft (2px 4px rgba) → Hard (4px 12px rgba) hover  
**Transitions:** 0.2s - 0.4s ease  

## 💾 Veri Akışı Örneği

1. **Keşif Oluştur** → `kesif_items` + `kesif_metadata` (profitMargin: 15%)
2. **Teklife Dönüştür** → `teklif_items` (fiyatlar %15 arttı) + `teklif_metadata`
3. **Sözleşme İmzala** → `contracts` (teklif tutarı, ödeme planı)
4. **Metraj Gir** → `boq_items` (gerçek ölçümler)
5. **Hakediş Oluştur** → `hakedis_items` (BOQ bazlı)
6. **Ödeme Kaydet** → `payment_tracking` (gelir/gider)

---

**Not:** Bu özet, projenin mevcut durumunu ve geliştirme tarihçesini yansıtmaktadır. Chat geçmişi uzadığında bu dosya referans alınarak context restore edilebilir.
