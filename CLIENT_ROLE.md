# Müşteri (Client) Rol Sistemi

## Genel Bakış

ADM İnşaat Proje Yönetim Sistemi'ne "Müşteri" (client) rolü eklenmiştir. Bu rol, müşterilerin kendi projelerini takip edebilmesini sağlarken, şirket içi verileri korur.

## Roller ve Yetkiler

### Mevcut Roller:
1. **super_admin** - Tüm sisteme erişim
2. **company_admin** - Şirket yönetimi ve kullanıcı oluşturma
3. **user** - Standart çalışan, proje yönetimi
4. **client** 🆕 - Sadece yetkili projeleri görüntüleme

## Müşteri Rolü Özellikleri

### ✅ Müşteriler Yapabilir:
- Yetkili oldukları projeleri görüntüleme
- Proje detaylarını inceleme
- Şantiye günlüklerini okuma
- Fotoğraf galerilerini görüntüleme
- Hakediş bilgilerini görme (eğer izin verilmişse)

### ❌ Müşteriler Yapamaz:
- Yeni proje oluşturma
- Mevcut projeleri düzenleme/silme
- Bütçe detaylarını görüntüleme
- Stok bilgilerine erişim
- BOQ (Metraj) detaylarını görme
- Hakediş onaylama
- Kullanıcı oluşturma/düzenleme
- Şirket ayarlarına erişim

## Müşteri Oluşturma

### 1. Kullanıcı Oluşturma
Company Admin veya Super Admin:
1. Dashboard → Kullanıcılar → + Yeni Kullanıcı
2. Rol: "Müşteri" seçin
3. Müşteri bilgilerini doldurun:
   - Firma Adı
   - Yetkili Kişi
   - Vergi No / TC
   - Adres
4. Kaydet

### 2. Proje Yetkisi Verme
1. Kullanıcılar listesinde müşteri kartında "📁 Projeler" butonuna tıklayın
2. Müşterinin görebileceği projeleri işaretleyin
3. Kaydet

## Teknik Detaylar

### Firestore Schema

```javascript
// users collection - client user
{
  uid: "client-uid",
  email: "client@example.com",
  displayName: "Müşteri Adı",
  role: "client",
  companyId: "company-id",
  
  // Client-specific fields
  clientInfo: {
    companyName: "Müşteri Firma A.Ş.",
    contactPerson: "Ahmet Yılmaz",
    taxId: "1234567890",
    address: "Adres bilgisi"
  },
  
  // Authorized project IDs
  authorizedProjects: ["project-id-1", "project-id-2"],
  
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// projects collection
{
  id: "project-id",
  name: "Proje Adı",
  // ... other fields
  
  // Client access control
  allowedClients: ["client-uid-1", "client-uid-2"],
  
  // Client visibility settings
  clientVisibility: {
    showBudget: false,     // Bütçe gizli
    showPayments: true,    // Hakediş göster
    showStocks: false,     // Stok gizli
    showLogs: true         // Günlük göster
  }
}
```

### Security Rules

Client kullanıcıları için özel güvenlik kuralları:

```javascript
// Projects - only authorized clients can read
allow read: if isClient() && 
           request.auth.uid in resource.data.get('allowedClients', []);

// Budget/Stocks - clients cannot access
allow read: if isSignedIn() && !isClient();

// Payments - visibility controlled by project settings
allow read: if isClient() && 
           clientHasProjectAccess(projectId) && 
           project.clientVisibility.showPayments == true;
```

### Frontend UI

**Auth.js:**
- Client kullanıcıları için menü öğeleri gizlenir
- Sadece "Projeler" sekmesi görünür

**Projects.js:**
- Client kullanıcıları sadece `authorizedProjects` listesindeki projeleri görür
- Proje kartlarında "👁️ SADECE GÖRÜNTÜLEME" badge'i
- Düzenle/Sil butonları gizlenir

**Users.js:**
- Müşteri oluşturma formu client bilgileri ile genişletildi
- "📁 Projeler" butonu ile proje yetkisi yönetimi
- Client bilgileri kart üzerinde gösterilir

## Kullanım Senaryoları

### Senaryo 1: Villa Projesi Müşterisi
```
1. Müşteri hesabı oluşturulur (client role)
2. "Bodrum Villa" projesine yetki verilir
3. Müşteri giriş yapar
4. Sadece Bodrum Villa projesini görür
5. Proje detaylarında:
   ✓ Şantiye günlüklerini okuyabilir
   ✓ İlerleme fotoğraflarını görebilir
   ✓ Hakediş durumunu takip edebilir
   ✗ Bütçe detaylarını göremez
   ✗ Stok bilgilerine erişemez
   ✗ Hiçbir düzenleme yapamaz
```

### Senaryo 2: Çoklu Proje Müşterisi
```
1. Müşteri birden fazla projeye yetkilendirilir
2. Dashboard'da sadece yetkili projeleri listeler
3. Her proje için ayrı visibility ayarları olabilir
4. Company admin istediği zaman yetkileri güncelleyebilir
```

## Güvenlik Önlemleri

1. **Backend Validation**: API endpoints client kullanıcılarının create/update/delete işlemlerini reddeder
2. **Firestore Rules**: Client kullanıcıları sadece izin verilen projelere erişebilir
3. **Frontend UI**: Client için gereksiz butonlar/menüler gizlenir
4. **Audit Trail**: Tüm client erişimleri loglanabilir (gelecek özellik)

## Best Practices

1. **Proje Yetkisi**: Müşteriye sadece ilgili projelere yetki verin
2. **Visibility Settings**: Proje bazında hangi bilgilerin görüneceğini ayarlayın
3. **Düzenli İnceleme**: Müşteri yetkilerini periyodik olarak gözden geçirin
4. **Güvenli Şifreler**: Müşteri hesapları için güçlü şifreler kullanın
5. **Eğitim**: Müşterilere sistemin sadece görüntüleme amaçlı olduğunu bildirin

## API Endpoints

### Create Client User
```bash
POST /api/users
Authorization: Bearer <admin-token>

{
  "email": "client@example.com",
  "password": "secure-password",
  "fullName": "Müşteri Adı",
  "role": "client",
  "companyId": "company-id",
  "clientInfo": {
    "companyName": "Müşteri Firma",
    "contactPerson": "İletişim Kişisi",
    "taxId": "1234567890",
    "address": "Adres"
  },
  "authorizedProjects": []
}
```

### Update Client Project Access
```bash
PUT /api/users/{clientId}/projects
Authorization: Bearer <admin-token>

{
  "authorizedProjects": ["project-1", "project-2"]
}
```

## Gelecek Geliştirmeler

- [ ] Client Portal - Özel müşteri dashboard sayfası
- [ ] Email Notifications - Proje güncellemeleri için bildirimler
- [ ] PDF Reports - Müşteriler için otomatik raporlar
- [ ] Mobile App - Müşteri mobil uygulaması
- [ ] Access Logs - Client erişim logları ve analytics
- [ ] Custom Branding - Müşteri bazlı logo/renk özelleştirme

## Troubleshooting

### Müşteri proje göremiyor
1. `users` collection'da `authorizedProjects` array'i kontrol edin
2. İlgili `projects` collection'da `allowedClients` array'inde client uid var mı?
3. Firestore rules deploy edilmiş mi?

### Müşteri düzenleme yapabiliyor
1. Frontend'de role check'i var mı?
2. Firestore rules client için write: false mi?
3. API endpoints role validation yapıyor mu?

## İletişim

Sorularınız için: [GitHub Issues](https://github.com/omerfman/ADM-WEB-PRO/issues)
