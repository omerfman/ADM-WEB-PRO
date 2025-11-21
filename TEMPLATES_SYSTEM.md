# Şablonlar ve Ayarlar Sistemi

## 📋 Genel Bakış

Tüm site genelinde kullanılan dropdown menü değerlerini (kategoriler, birimler, ödeme yöntemleri vb.) merkezi bir yerden yönetebileceğiniz sistem.

## 🎯 Özellikler

### Yönetilebilir Şablon Türleri

1. **BOQ / Metraj Kategorileri** (`boq_categories`)
   - Hafriyat ve Temel
   - Kaba İnşaat
   - İnce İşler
   - Tesisat
   - Elektrik
   - Dış Cephe
   - Çevre Düzenlemesi
   - Diğer

2. **BOQ / Metraj Birimleri** (`boq_units`)
   - m² (Metrekare)
   - m³ (Metreküp)
   - m (Metre)
   - mtül (Metretül)
   - Adet
   - Kg, Ton, Lt
   - Takım, Komple

3. **Ödeme Yöntemleri** (`payment_methods`)
   - Nakit
   - Banka Transferi
   - Çek
   - Senet
   - Kredi Kartı

4. **Proje Durumları** (`project_statuses`)
   - Devam Ediyor
   - Tamamlandı
   - Beklemede
   - İptal

5. **Stok Kategorileri** (`stock_categories`)
   - İnşaat Malzemeleri
   - Elektrik Malzemeleri
   - Tesisat Malzemeleri
   - Boya ve Kimyasallar
   - Ahşap Malzemeler
   - Metal ve Demir
   - Diğer

6. **Stok Birimleri** (`stock_units`)
   - Adet, Kg, Ton, Lt
   - m, m², m³
   - Paket, Koli, Takım

## 🔧 Kullanım

### Erişim

- **URL:** `https://adm-web-pro.web.app/templateler.html`
- **Yetki:** Sadece `company_admin` ve `super_admin` rolleri
- **Menü:** Yan menüde "⚙️ Şablonlar & Ayarlar"

### İşlemler

#### Yeni Şablon Ekle
1. İlgili kategorinin sağ üstündeki "➕ Yeni ..." butonuna tıklayın
2. Değer girin (örn: "Zemin İşleri")
3. İsteğe bağlı açıklama ekleyin
4. Varsayılan değer olarak işaretleyebilirsiniz
5. "💾 Kaydet" butonuna tıklayın

#### Şablon Düzenle
1. İlgili şablonun yanındaki "✏️" butonuna tıklayın
2. Değerleri güncelleyin
3. "💾 Kaydet" butonuna tıklayın

#### Şablon Sil
1. İlgili şablonun yanındaki "🗑️" butonuna tıklayın
2. Onay verin
3. Şablon soft delete ile silinir (mevcut kayıtlar etkilenmez)

#### Sıralama Değiştir
- "⬆️" ve "⬇️" butonları ile şablonların dropdown'daki sırasını değiştirin

## 🗄️ Firestore Şeması

### Collection: `templates`

```javascript
{
  id: "auto-generated",
  type: "boq_categories" | "boq_units" | "payment_methods" | ...,
  value: "Hafriyat ve Temel",
  description: "Kazı, temel ve hafriyat işleri",
  isDefault: true,
  isDeleted: false,
  order: 0,
  companyId: "company-id",
  createdAt: Timestamp,
  createdBy: "user@email.com",
  updatedAt: Timestamp,
  updatedBy: "user@email.com"
}
```

### Firestore Indexes

```json
{
  "collectionGroup": "templates",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "isDeleted", "order": "ASCENDING" },
    { "fieldPath": "order", "order": "ASCENDING" }
  ]
}
```

### Firestore Rules

```javascript
match /templates/{templateId} {
  // Read: All authenticated users (to populate dropdowns)
  allow read: if isSignedIn();
  
  // Create/Update/Delete: Only admins
  allow create, update: if isSignedIn() && isAdminRole() &&
                           request.resource.data.type != null &&
                           request.resource.data.value != null &&
                           request.resource.data.companyId != null;
  allow delete: if isSignedIn() && isAdminRole();
}
```

## 💻 API Kullanımı

### Şablonları Yükle (Diğer Modüllerde Kullanım)

```javascript
import { getTemplatesByType, getDefaultTemplates } from './templates.js';

// Şablonları yükle (async)
const categories = await getTemplatesByType('boq_categories', companyId);
// Returns: ['Hafriyat ve Temel', 'Kaba İnşaat', ...]

// Varsayılan şablonları al (fallback)
const defaultCategories = getDefaultTemplates('boq_categories');
```

### Dropdown Doldurma Örneği

```javascript
// BOQ kategorilerini dropdown'a yükle
async function loadBoqCategoryDropdown(selectElement, companyId) {
  try {
    const categories = await getTemplatesByType('boq_categories', companyId);
    
    selectElement.innerHTML = '<option value="">Seçiniz</option>';
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error('Kategoriler yüklenemedi:', error);
    // Fallback to defaults
    const defaults = getDefaultTemplates('boq_categories');
    // ... fill dropdown with defaults
  }
}
```

## 🔄 Senkronizasyon

### Otomatik Senkronizasyon

Şablonlar Firestore'dan dinamik olarak yüklenir. Bir yönetici şablon eklediğinde/güncellediğinde:

1. ✅ Değişiklik anında Firestore'a kaydedilir
2. ✅ Sayfa yenilenir ve güncel liste gösterilir
3. ✅ Diğer kullanıcılar sayfayı yenilediğinde güncel değerleri görür
4. ✅ Mevcut kayıtlar etkilenmez (soft delete)

### Varsayılan Değerler

İlk kurulumda veya index hatası durumunda, sistem otomatik olarak varsayılan değerleri oluşturur:

```javascript
await initializeDefaultTemplates('boq_categories');
```

## 📱 Responsive Tasarım

- ✅ Mobil uyumlu
- ✅ Tablet uyumlu
- ✅ Desktop uyumlu
- ✅ Dark/Light mode desteği

## 🔒 Güvenlik

### Erişim Kontrolü

- **Client (Müşteri):** ❌ Erişim yok
- **User (Kullanıcı):** ❌ Erişim yok (sadece okuma)
- **Company Admin:** ✅ Tam erişim (CRUD)
- **Super Admin:** ✅ Tam erişim (CRUD)

### Veri İzolasyonu

- Her şirketin şablonları kendi `companyId`'si ile izole edilir
- Şirketler birbirlerinin şablonlarını göremez/değiştiremez
- Super Admin tüm şablonları görebilir ama `companyId` ile filtreleme yapılır

## 🚀 Deployment

### İlk Deployment

```bash
# Tüm dosyalar commit edildi
git add .
git commit -m "feat: Şablonlar ve Ayarlar sayfası eklendi"

# Firestore rules + indexes + hosting deploy
firebase deploy

# Sadece hosting güncellemesi
firebase deploy --only hosting
```

### Firestore Indexes

Deploy sonrası Firebase Console'da index oluşturma linki görünecektir. Linke tıklayarak index'leri otomatik oluşturabilirsiniz.

## 📊 Kullanım İstatistikleri

### Monitoring

Firebase Console > Firestore > Data > templates collection'ı izleyin:

- Toplam şablon sayısı
- Şirket başına şablon dağılımı
- En çok kullanılan şablon türleri
- Ekleme/güncelleme/silme logları

## 🐛 Troubleshooting

### Index Hatası

**Hata:** `The query requires an index`

**Çözüm:**
1. Console'daki link'e tıklayın veya
2. `firestore.indexes.json` dosyasını deploy edin:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Şablonlar Görünmüyor

**Çözüm:**
1. `auth.js` dosyasında rolünüzü kontrol edin
2. `templatesNavBtn` elementinin `hidden` class'ını kaldırın
3. Firestore rules'ı kontrol edin
4. Browser console'da hata olup olmadığını kontrol edin

### Dropdown'lar Boş

**Çözüm:**
1. `getTemplatesByType()` fonksiyonunu kullanın
2. Fallback olarak `getDefaultTemplates()` kullanın
3. CompanyId'nin doğru olduğundan emin olun

## 📚 İlgili Dosyalar

- `web/templateler.html` - Şablonlar sayfası
- `web/js/templates.js` - Şablon yönetimi modülü
- `web/css/style.css` - Template stilleri (son 90 satır)
- `firestore.rules` - Templates collection kuralları
- `firestore.indexes.json` - Templates index'leri

## 🎨 Özelleştirme

### Yeni Şablon Türü Ekle

1. **HTML'de yeni kart ekle** (`templateler.html`):
```html
<div class="card">
  <div class="card-header">
    <h3>🆕 Yeni Tür</h3>
    <button onclick="openAddTemplateModal('new_type')">➕</button>
  </div>
  <div id="newTypeList" class="template-list"></div>
</div>
```

2. **JS'de varsayılan değerleri ekle** (`templates.js`):
```javascript
const defaults = {
  // ... mevcut türler
  new_type: ['Değer 1', 'Değer 2', 'Değer 3']
};
```

3. **loadAllTemplates'e ekle**:
```javascript
await loadTemplatesByType('new_type');
```

## 📈 Gelecek Geliştirmeler

- [ ] Toplu import/export (Excel)
- [ ] Şablon kopyalama (şirketler arası)
- [ ] Şablon kullanım istatistikleri
- [ ] Şablon öneri sistemi (AI)
- [ ] Çoklu dil desteği
- [ ] Şablon versiyonlama
- [ ] Şablon approval workflow

## ✅ Tamamlanan Özellikler

- [x] Merkezi şablon yönetimi
- [x] CRUD işlemleri
- [x] Sıralama sistemi
- [x] Soft delete
- [x] Company isolation
- [x] Dark/Light mode
- [x] Responsive design
- [x] Firestore integration
- [x] Security rules
- [x] Default templates

---

**Versiyon:** 1.0.0  
**Tarih:** 21 Kasım 2025  
**Deploy URL:** https://adm-web-pro.web.app/templateler.html
