# Vercel Deployment Guide / Vercel Yayınlama Kılavuzu

## Önemli Değişiklikler / Important Changes

Vercel yayınlaması için aşağıdaki yapı değiştirilmiştir:

### 1. **API Yapısı Değişti / API Structure Changed**
- **Eski**: `/admin-api/server.js`
- **Yeni**: `/api/index.js` (Vercel Serverless Functions)

### 2. **Ön Uç / Frontend**
- Frontend hâlâ `/web/` klasöründe
- Yeni: `web/js/config-vercel.js` - Ortama göre API URL yönetimi
- API çağrıları artık `apiCall()` helper fonksiyonu kullanıyor

### 3. **Vercel Konfigürasyonu**
- `vercel.json` - Frontend ve API rewrite kuralları
- `api/package.json` - Backend bağımlılıkları
- `api/index.js` - Express uygulaması (Vercel Serverless Functions için)

---

## Kurulum Adımları / Installation Steps

### 1. Vercel CLI Yükle / Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Vercel Hesabında Giriş Yap / Login to Vercel
```bash
vercel login
```

### 3. Proje Klasörüne Git / Go to Project Directory
```bash
cd d:\islerim\VS\adm-web-pro
```

### 4. Ortam Değişkenlerini Ayarla / Set Environment Variables

**Lokal Geliştirme / Local Development:**
```bash
# Root klasörde .env dosyası
cp .env.example .env
# Tüm Firebase ve Cloudinary değişkenlerini doldurun
```

**Vercel Dashboard:**
1. https://vercel.com/dashboard adresine git
2. Projeyi seç veya oluştur
3. Settings → Environment Variables
4. Aşağıdaki değişkenleri ekle:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=your-cert-url

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

FRONTEND_URL=https://your-domain.vercel.app
PORT=3000
```

---

## Yayınlama / Deployment

### Yöntem 1: Vercel CLI Kullanarak / Using Vercel CLI

```bash
# İlk yayınlama
vercel

# Seçenekler soracak:
# - Scope: Vercel hesabınızı seç
# - Project: Yeni proje oluştur
# - Environment: production seç
# - Framework: html seç
```

### Yöntem 2: GitHub Entegrasyonu / GitHub Integration

1. Projeyi GitHub'a push et
2. Vercel Dashboard → Add New → Project
3. GitHub depo'sunu seç
4. Environment Variables ekle
5. Deploy butonuna tıkla

### Yöntem 3: Doğrudan Vercel Üzerine / Direct Upload

```bash
# Deploy et
vercel --prod

# Canlı URL'si konsola yazılacak
```

---

## Proje Yapısı / Project Structure

```
adm-web-pro/
├── api/                          # Vercel Serverless Functions
│   ├── index.js                  # Express uygulaması
│   └── package.json              # Backend bağımlılıkları
├── web/                          # Frontend (Vercel Static)
│   ├── index.html                # Ana HTML
│   ├── css/style.css             # Stiller
│   └── js/
│       ├── config-vercel.js      # Vercel API konfigürasyonu ✨
│       ├── firebase-config.js    # Firebase başlatma
│       ├── auth.js               # Kimlik doğrulama
│       ├── projects.js           # Proje CRUD
│       ├── upload.js             # Cloudinary yüklemesi
│       ├── audit.js              # Denetim günlükleri
│       └── security.js           # Güvenlik kontrolleri
├── vercel.json                   # Vercel konfigürasyonu ✨
├── .env.example                  # Ortam değişkenleri şablonu
└── README.md
```

---

## Frontend vs Backend URL'leri / URLs

### Lokal Development / Local Development
- Frontend: http://localhost:3000 (Vercel dev server)
- Backend API: http://localhost:5000

### Staging
- Frontend: https://adm-staging.vercel.app
- Backend API: https://adm-api-staging.vercel.app

### Production
- Frontend: https://adm.vercel.app (veya özel domain)
- Backend API: https://adm-api.vercel.app

---

## Firestore Güvenlik Kuralları / Firestore Security Rules

1. Firebase Console'da projeyi aç
2. Firestore Database → Rules
3. `firestore.rules` içeriğini kopyala
4. Rules editörüne yapıştır
5. Publish'e tıkla

```bash
# Alternatif olarak Firebase CLI kullanarak:
firebase deploy --only firestore:rules
```

---

## Sorun Giderme / Troubleshooting

### 1. "Module not found" hatası
**Çözüm:** `api/package.json` içinde tüm bağımlılıkları kontrol et ve `npm install` çalıştır

```bash
cd api
npm install
```

### 2. "401 Unauthorized" API hatası
**Çözüm:** 
- Firebase credentials kontrol et (vercel.json ortam değişkenleri)
- `FIREBASE_PRIVATE_KEY` değerinin `\n` karakterini içerip içermediğini kontrol et

### 3. CORS hatası
**Çözüm:** `FRONTEND_URL` ortam değişkenini doğru ayarla (vercel.json'da)

### 4. "Firebase app not initialized" hatası
**Çözüm:** `web/js/config-vercel.js` ve `web/js/firebase-config.js` yüklü mi kontrol et

---

## Vercel Komutları / Vercel Commands

```bash
# Lokal preview (production ortamında deneme)
vercel --prod

# Staging deploy
vercel --env-file=.env.staging

# Production deploy
vercel --prod --env-file=.env.production

# Logs görmek
vercel logs

# Sürüm kontrol
vercel --version
```

---

## Öğrenme Kaynakları / Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Express.js on Vercel](https://vercel.com/docs/functions/serverless-functions)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloudinary API](https://cloudinary.com/documentation)

---

## Notlar / Notes

✅ **Done**: Frontend ve Backend Vercel'de çalışan yapıya dönüştürüldü
✅ **Done**: API URL'si ortama göre dinamik
✅ **Done**: Firestore güvenlik kuralları harici deploy
✅ **Done**: Cloudinary entegrasyonu API tarafında

⚠️ **Dikkat**: İlk deploy'dan sonra:
1. Firestore rules'ı manuel deploy et
2. Superadmin kullanıcı oluştur: `node admin-scripts/create-superadmin.js`
3. Test verileri yükle: `node admin-scripts/seed-database.js`

---

**Vercel Deployment Hazır! / Ready for Vercel Deployment!** 🚀
