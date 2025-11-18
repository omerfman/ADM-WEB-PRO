# Hakediş (Progress Payment) Veri Modeli

## 📊 Firestore Collections Yapısı

### 1. `boq_items` (Bill of Quantities - Metraj Kalemleri)
Projeye ait tüm iş kalemleri ve birim fiyatları.

```javascript
{
  id: "boq_item_uuid",
  projectId: "project_uuid",
  companyId: "company_uuid",
  
  // Poz bilgileri
  pozNo: "01.01.001",
  description: "Kazı işleri - Temel kazısı",
  unit: "m³",
  quantity: 1500,
  unitPrice: 125.50,
  totalPrice: 188250, // quantity * unitPrice
  
  // Kategorileme
  category: "İnşaat İşleri",
  subCategory: "Kazı ve Temel",
  
  // Meta
  createdAt: Timestamp,
  createdBy: "user_uuid",
  updatedAt: Timestamp,
  updatedBy: "user_uuid",
  isDeleted: false
}
```

**Indexes:**
- `projectId` (ascending)
- `companyId` (ascending)
- `pozNo` (ascending)

---

### 2. `progress_payments` (Hakediş Dönemleri)
Her hakediş dönemi için ana kayıt.

```javascript
{
  id: "payment_uuid",
  projectId: "project_uuid",
  companyId: "company_uuid",
  
  // Hakediş bilgileri
  paymentNo: 1, // 1. Hakediş, 2. Hakediş...
  periodStart: Timestamp, // Dönem başlangıcı
  periodEnd: Timestamp,   // Dönem sonu
  title: "1. Hakediş - Ocak 2025",
  
  // Durum
  status: "draft", // draft, pending_review, pending_approval, approved, rejected, paid
  
  // Tutarlar (otomatik hesaplanan)
  grossAmount: 450000,      // Brüt tutar
  previousAmount: 0,        // Önceki hakedişler toplamı
  currentAmount: 450000,    // Bu dönem hakediş
  
  // Kesintiler
  vatRate: 20,              // KDV oranı (%)
  vatAmount: 90000,         // KDV tutarı
  
  withholdingRate: 3,       // Stopaj oranı (%)
  withholdingAmount: 13500, // Stopaj tutarı
  
  stampTaxRate: 0.825,      // Damga vergisi (%)
  stampTaxAmount: 3712.5,   // Damga vergisi tutarı
  
  advanceDeduction: 50000,  // Avans kesintisi
  otherDeductions: 0,       // Diğer kesintiler
  
  // Net tutar
  netAmount: 382787.5,      // Ödenecek net tutar
  
  // Onay bilgileri
  submittedAt: Timestamp,
  submittedBy: "user_uuid",
  
  reviewedAt: Timestamp,
  reviewedBy: "user_uuid",
  reviewNotes: "Kontrol edildi, onaya hazır",
  
  approvedAt: Timestamp,
  approvedBy: "user_uuid",
  approvalNotes: "Onaylandı",
  
  paidAt: Timestamp,
  paidBy: "user_uuid",
  paymentReference: "TRANSFER-001",
  
  // Dosyalar
  attachments: [
    {
      name: "hakedis-1-detay.xlsx",
      url: "https://imgbb.com/...",
      type: "excel",
      uploadedAt: Timestamp,
      uploadedBy: "user_uuid"
    }
  ],
  
  // Meta
  createdAt: Timestamp,
  createdBy: "user_uuid",
  updatedAt: Timestamp,
  updatedBy: "user_uuid"
}
```

**Indexes:**
- `projectId + status` (composite)
- `companyId + status` (composite)
- `paymentNo` (ascending)

---

### 3. `measurement_lines` (Metraj Satırları)
Her hakediş döneminde yapılan iş miktarları.

```javascript
{
  id: "measurement_uuid",
  paymentId: "payment_uuid",
  projectId: "project_uuid",
  companyId: "company_uuid",
  boqItemId: "boq_item_uuid",
  
  // Metraj bilgileri
  measuredQuantity: 500,    // Bu dönem yapılan iş
  previousQuantity: 0,      // Önceki dönemler toplamı
  cumulativeQuantity: 500,  // Kümülatif toplam
  
  // Hesaplamalar
  unitPrice: 125.50,
  lineTotal: 62750,         // measuredQuantity * unitPrice
  
  // Açıklama ve fotoğraflar
  notes: "A blok temel kazısı tamamlandı",
  photos: [
    {
      url: "https://imgbb.com/photo1.jpg",
      caption: "Kazı işi başlangıç",
      uploadedAt: Timestamp,
      uploadedBy: "user_uuid"
    },
    {
      url: "https://imgbb.com/photo2.jpg",
      caption: "Kazı işi bitiş",
      uploadedAt: Timestamp,
      uploadedBy: "user_uuid"
    }
  ],
  
  // Meta
  createdAt: Timestamp,
  createdBy: "user_uuid",
  updatedAt: Timestamp,
  updatedBy: "user_uuid"
}
```

**Indexes:**
- `paymentId` (ascending)
- `boqItemId` (ascending)
- `projectId + boqItemId` (composite)

---

### 4. `payment_config` (Proje Bazlı Hakediş Ayarları)
Her projenin kendi hakediş hesaplama kuralları.

```javascript
{
  id: "config_uuid",
  projectId: "project_uuid",
  companyId: "company_uuid",
  
  // Vergi oranları
  vatRate: 20,              // KDV %
  withholdingRate: 3,       // Stopaj %
  stampTaxRate: 0.825,      // Damga vergisi %
  
  // Kesinti kuralları
  retentionRate: 10,        // Teminat kesintisi %
  retentionReleaseCondition: "completion", // completion, warranty_period
  
  // Avans bilgileri
  advanceAmount: 500000,
  advancePaidAt: Timestamp,
  advanceDeductionPercentage: 10, // Her hakedişten %10 avans kesintisi
  
  // Onay akışı
  approvalFlow: [
    { role: "user", label: "Saha Mühendisi" },
    { role: "company_admin", label: "Proje Müdürü" },
    { role: "super_admin", label: "Genel Müdür" }
  ],
  
  // Otomatik hesaplamalar
  autoCalculate: true,
  allowManualAdjustment: false,
  
  // Meta
  createdAt: Timestamp,
  createdBy: "user_uuid",
  updatedAt: Timestamp
}
```

**Indexes:**
- `projectId` (unique)

---

### 5. `payment_approvals` (Onay Logları)
Hakediş onay sürecinin takibi.

```javascript
{
  id: "approval_uuid",
  paymentId: "payment_uuid",
  projectId: "project_uuid",
  
  // Onay bilgileri
  approverRole: "company_admin",
  approverId: "user_uuid",
  approverName: "Ahmet Yılmaz",
  
  action: "approved", // approved, rejected, requested_changes
  notes: "Fotoğraflar yeterli, onaylandı",
  timestamp: Timestamp,
  
  // Değişiklik istekleri
  requestedChanges: [
    {
      lineId: "measurement_uuid",
      field: "measuredQuantity",
      currentValue: 500,
      requestedValue: 450,
      reason: "Fiili ölçüm 450m³ olarak tespit edildi"
    }
  ]
}
```

**Indexes:**
- `paymentId` (ascending)
- `timestamp` (descending)

---

## 🔄 İş Akışı (Workflow)

### Durum Geçişleri

```
draft → pending_review → pending_approval → approved → paid
  ↓           ↓                ↓
rejected ← rejected ← rejected
```

**Durum Açıklamaları:**
- `draft`: Hakediş hazırlanıyor (metraj girişi devam ediyor)
- `pending_review`: İnceleme için gönderildi (saha mühendisi → proje müdürü)
- `pending_approval`: Onay için gönderildi (proje müdürü → genel müdür)
- `approved`: Onaylandı, ödeme bekleniyor
- `rejected`: Reddedildi, düzeltme gerekiyor
- `paid`: Ödeme yapıldı

---

## 📐 Hesaplama Formülleri

### 1. Brüt Tutar
```
grossAmount = Σ(measuredQuantity × unitPrice)
```

### 2. KDV
```
vatAmount = grossAmount × (vatRate / 100)
```

### 3. Stopaj
```
withholdingAmount = grossAmount × (withholdingRate / 100)
```

### 4. Damga Vergisi
```
stampTaxAmount = grossAmount × (stampTaxRate / 100)
```

### 5. Avans Kesintisi
```
advanceDeduction = grossAmount × (advanceDeductionPercentage / 100)
// veya
advanceDeduction = min(remainingAdvance, calculatedDeduction)
```

### 6. Net Tutar
```
netAmount = grossAmount 
          + vatAmount 
          - withholdingAmount 
          - stampTaxAmount 
          - advanceDeduction 
          - otherDeductions
```

---

## 🎯 Örnek Senaryo

### Proje: ABC Apartmanı
- Sözleşme bedeli: 5.000.000 TL
- Avans: 500.000 TL (%10)

### 1. Hakediş (Ocak 2025)
- Brüt: 450.000 TL
- KDV (%20): +90.000 TL
- Stopaj (%3): -13.500 TL
- Damga V. (%0.825): -3.712 TL
- Avans Kes. (%10): -45.000 TL
- **Net: 477.787 TL**

### 2. Hakediş (Şubat 2025)
- Brüt: 600.000 TL
- Kümülatif: 1.050.000 TL
- KDV (%20): +120.000 TL
- Stopaj (%3): -18.000 TL
- Damga V. (%0.825): -4.950 TL
- Avans Kes. (%10): -60.000 TL
- **Net: 637.050 TL**

---

## 🔐 Yetkilendirme

### Role-based Access
- **super_admin**: Tüm hakediş işlemleri (görüntüleme, düzenleme, onaylama, silme)
- **company_admin**: Şirket projelerinde tüm işlemler
- **user**: Sadece atandığı projelerde metraj girişi yapabilir
  - Hakediş oluşturma ✅
  - Metraj girişi ✅
  - Fotoğraf yükleme ✅
  - Onaylama ❌ (sadece görüntüleme)

---

## 📊 Firestore Security Rules

```javascript
// BOQ Items
match /boq_items/{itemId} {
  allow read: if isAuthenticated() && hasCompanyAccess(resource.data.companyId);
  allow create, update: if isCompanyAdmin() || isSuperAdmin();
  allow delete: if isSuperAdmin();
}

// Progress Payments
match /progress_payments/{paymentId} {
  allow read: if isAuthenticated() && hasCompanyAccess(resource.data.companyId);
  allow create: if isCompanyAdmin() || isUser();
  allow update: if isCompanyAdmin() || (isUser() && resource.data.status == 'draft');
  allow delete: if isSuperAdmin();
}

// Measurement Lines
match /measurement_lines/{lineId} {
  allow read: if isAuthenticated() && hasCompanyAccess(resource.data.companyId);
  allow create, update: if isCompanyAdmin() || isUser();
  allow delete: if isCompanyAdmin() || isSuperAdmin();
}

// Payment Config
match /payment_config/{configId} {
  allow read: if isAuthenticated() && hasCompanyAccess(resource.data.companyId);
  allow create, update, delete: if isCompanyAdmin() || isSuperAdmin();
}

// Payment Approvals
match /payment_approvals/{approvalId} {
  allow read: if isAuthenticated() && hasCompanyAccess(resource.data.companyId);
  allow create: if isCompanyAdmin() || isSuperAdmin();
  allow update, delete: if false; // Audit trail - no updates/deletes
}
```

---

## 🎨 UI Components Planı

### 1. Hakediş Listesi (`/projects/:id/payments`)
- Tablo görünümü: Hakediş No, Dönem, Durum, Brüt, Net, Onay Durumu
- Filtreler: Durum, Tarih aralığı
- Actions: Yeni Hakediş, Görüntüle, Düzenle, Sil, PDF, Excel

### 2. Hakediş Detay/Düzenleme (`/payments/:id`)
- Üst bilgi: Dönem, Durum badge
- Metraj tablosu:
  - Poz No | Açıklama | Birim | Birim Fiyat | Önceki | Bu Dönem | Kümülatif | Tutar
  - Her satırda: Fotoğraf ikonu, Not ikonu
- Alt bilgi: Hesaplama özeti (Brüt, KDV, Kesintiler, Net)
- Actions: Kaydet, Onayla Gönder, PDF, Excel

### 3. Metraj Girişi Modal
- BOQ item seçimi (autocomplete)
- Miktar girişi
- Not alanı
- Fotoğraf upload (drag & drop)
- Önizleme

### 4. Onay Ekranı
- Metraj detayları (read-only)
- Fotoğraf galerisi
- Onay/Red butonları
- Not alanı (zorunlu - red durumunda)

### 5. BOQ Yönetimi (`/projects/:id/boq`)
- Excel import butonu
- Tablo: Poz No, Açıklama, Birim, Miktar, Birim Fiyat, Toplam
- CRUD işlemleri
- Template indir

---

## 📅 Implementation Roadmap

### Sprint 1: Veri Yapısı (BUGÜN)
- [x] Schema tasarımı ✅
- [ ] Firestore collections oluşturma
- [ ] Security rules
- [ ] Seed data

### Sprint 2: BOQ Yönetimi
- [ ] BOQ CRUD API
- [ ] Excel import/export
- [ ] Template oluştur
- [ ] UI implementation

### Sprint 3: Hakediş Girişi
- [ ] Payment CRUD API
- [ ] Measurement lines API
- [ ] Calculation engine
- [ ] UI implementation

### Sprint 4: Onay Akışı
- [ ] Workflow service
- [ ] Approval API
- [ ] Notification system
- [ ] UI implementation

### Sprint 5: Raporlama
- [ ] PDF template
- [ ] Excel export
- [ ] Dashboard widgets
- [ ] UI implementation

---

**Sonraki Adım:** Firestore collections ve security rules oluşturma
