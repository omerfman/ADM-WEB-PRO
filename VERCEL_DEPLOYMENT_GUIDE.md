# Vercel Deployment Guide - ADM Web Pro

## 🚀 Vercel'e Deployment Rehberi

Bu doküman ADM Web Pro projesinin Vercel'e nasıl deploy edileceğini adım adım açıklar.

---

## 📋 Ön Gereksinimler

### 1. Gerekli Hesaplar
- ✅ **GitHub hesabı** (proje kodunu push etmek için)
- ✅ **Vercel hesabı** (ücretsiz: https://vercel.com/signup)
- ✅ **Firebase projesi** (Authentication ve Firestore için)
- ✅ **ImgBB API key** (ücretsiz image hosting için)

### 2. Kurulumlar
```bash
# Node.js ve npm yüklü olmalı (v18+)
node --version
npm --version

# Vercel CLI yükleyin (global)
npm install -g vercel
```

---

## 🔧 Proje Hazırlığı

### 1. GitHub Repository Oluşturma

```bash
# Git init (henüz yapmadıysanız)
cd d:\islerim\VS\adm-web-pro
git init

# .gitignore oluşturun
echo "node_modules/" > .gitignore
echo "serviceAccountKey.json" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# İlk commit
git add .
git commit -m "Initial commit - ADM Web Pro"

# GitHub'a push
git remote add origin https://github.com/KULLANICI_ADINIZ/adm-web-pro.git
git branch -M main
git push -u origin main
```

### 2. Environment Variables Hazırlama

**Gerekli environment variables:**

```env
# Firebase Configuration (Production)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=adm-web-pro.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=adm-web-pro
VITE_FIREBASE_STORAGE_BUCKET=adm-web-pro.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# ImgBB API Key
VITE_IMGBB_API_KEY=your_imgbb_api_key_here

# API Base URL (optional - auto-detected)
VITE_API_BASE_URL=https://adm-web-pro.vercel.app/api
```

---

## 🌐 Vercel Dashboard ile Deployment

### Adım 1: Vercel'e Giriş

1. **Vercel Dashboard'a gidin:**
   ```
   https://vercel.com/dashboard
   ```

2. **"New Project" butonuna tıklayın**

### Adım 2: GitHub Repository Bağlama

1. **"Import Git Repository" seçin**
2. **GitHub hesabınızı bağlayın** (ilk kez için yetki verin)
3. **`adm-web-pro` repository'sini seçin**
4. **"Import" butonuna tıklayın**

### Adım 3: Proje Ayarları

**Framework Preset:** Other (veya Vite seçebilirsiniz)

**Root Directory:** ./

**Build Command:**
```bash
cd api && npm install && cd ../admin-api && npm install && cd ../admin-scripts && npm install
```

**Output Directory:** (boş bırakın - serverless functions için gerekli değil)

**Install Command:**
```bash
npm install
```

### Adım 4: Environment Variables Ekleme

1. **"Environment Variables" bölümünü açın**

2. **Her bir variable'ı ekleyin:**
   - Name: `VITE_FIREBASE_API_KEY`
   - Value: `AIzaSy...` (Firebase Console'dan alın)
   - Environment: ✅ Production ✅ Preview ✅ Development

3. **ImgBB API Key ekleyin:**
   - Name: `VITE_IMGBB_API_KEY`
   - Value: `your_api_key`
   - Environment: ✅ Production ✅ Preview ✅ Development

4. **Tüm Firebase değişkenlerini ekleyin** (yukarıdaki listeye göre)

### Adım 5: Deploy!

1. **"Deploy" butonuna tıklayın**
2. **Build sürecini izleyin** (2-3 dakika sürer)
3. **Deployment başarılı olduğunda link gösterilir:**
   ```
   https://adm-web-pro.vercel.app
   ```

---

## 💻 Vercel CLI ile Deployment

### Adım 1: Vercel CLI ile Giriş

```bash
# Vercel'e login
vercel login

# Email veya GitHub ile giriş yapın
```

### Adım 2: Environment Variables Ekleme

```bash
# Her bir variable için çalıştırın
vercel env add VITE_FIREBASE_API_KEY
# Değeri girin ve environment seçin (Production)

vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
vercel env add VITE_IMGBB_API_KEY
```

### Adım 3: İlk Deployment

```bash
# Proje dizininde çalıştırın
cd d:\islerim\VS\adm-web-pro
vercel

# Sorulara cevaplar:
# ? Set up and deploy "adm-web-pro"? [Y/n] Y
# ? Which scope? [Kendi hesabınızı seçin]
# ? Link to existing project? [N]
# ? What's your project's name? adm-web-pro
# ? In which directory is your code located? ./
```

### Adım 4: Production Deployment

```bash
# Production'a deploy
vercel --prod

# Custom domain ile (isteğe bağlı)
vercel --prod --scope=your-team
```

---

## 🔍 Deployment Doğrulama

### 1. Web Sitesini Test Edin

```
https://adm-web-pro.vercel.app
```

**Kontrol Listesi:**
- ✅ Login sayfası açılıyor mu?
- ✅ Firebase Authentication çalışıyor mu?
- ✅ Dashboard yükleniyor mu?
- ✅ API endpoint'leri çalışıyor mu?
- ✅ Fotoğraf yükleme çalışıyor mu? (ImgBB)

### 2. Console Hatalarını Kontrol Edin

1. **F12 ile Developer Tools açın**
2. **Console tab'ına bakın**
3. **Hata varsa düzeltin ve yeniden deploy edin**

### 3. API Endpoint'lerini Test Edin

```bash
# Health check
curl https://adm-web-pro.vercel.app/api

# Expected response:
{"status":"ok","message":"ADM Web Pro API is running"}
```

---

## 📁 Dosya Yapısı (Vercel için)

```
adm-web-pro/
├── web/                    # Frontend files (statik)
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── api/                    # Serverless Functions
│   ├── index.js           # /api endpoint
│   └── package.json
│
├── admin-api/              # Admin API (ayrı deploy edilebilir)
│   ├── server.js
│   └── package.json
│
├── admin-scripts/          # Sadece local kullanım
│   ├── create-test-accounts.js
│   └── package.json
│
├── vercel.json            # Vercel configuration
├── package.json           # Root package.json
└── README.md
```

---

## ⚙️ vercel.json Konfigürasyonu

**Mevcut `vercel.json` dosyası:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/web/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

**Açıklama:**
- `api/index.js` serverless function olarak deploy edilir
- `/api/*` istekleri API'ye yönlendirilir
- Diğer tüm istekler `web/` klasöründen servis edilir
- CORS headers otomatik eklenir

---

## 🔄 Güncellemeler ve Redeploy

### Otomatik Deployment (Önerilen)

```bash
# Kodu değiştirin
git add .
git commit -m "Feature: New feature added"
git push origin main

# Vercel otomatik olarak yeni deployment başlatır
# Dashboard'dan takip edebilirsiniz
```

### Manuel Deployment

```bash
# Production'a deploy
vercel --prod

# Preview deployment (test için)
vercel
```

---

## 🐛 Sorun Giderme

### Problem: API çalışmıyor

**Çözüm:**
1. Vercel Dashboard → Functions log'larını kontrol edin
2. `api/index.js` dosyasında hata var mı kontrol edin
3. Environment variables doğru mu kontrol edin

### Problem: Firebase bağlanamıyor

**Çözüm:**
1. `VITE_FIREBASE_*` environment variables'ları kontrol edin
2. Firebase Console'da web app configuration'ı kontrol edin
3. Firebase domains'e Vercel URL'inizi ekleyin:
   - Firebase Console → Authentication → Settings → Authorized domains
   - `adm-web-pro.vercel.app` ekleyin

### Problem: Fotoğraf yüklenmiyor

**Çözüm:**
1. `VITE_IMGBB_API_KEY` doğru mu kontrol edin
2. ImgBB Dashboard'da API key aktif mi kontrol edin
3. Network tab'da API isteğini kontrol edin (F12)

### Problem: 404 hatası

**Çözüm:**
1. `vercel.json` routes konfigürasyonunu kontrol edin
2. Dosya yollarının doğru olduğundan emin olun
3. `web/` klasöründe dosyalar var mı kontrol edin

---

## 📊 Performance Optimization

### 1. Caching

```json
// vercel.json içine ekleyin
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 2. Image Optimization

- ImgBB thumbnail URLs kullanın
- Lazy loading ekleyin
- WebP format desteği

### 3. Code Splitting

- JavaScript modüllerini lazy import edin
- Kritik CSS'i inline edin
- Non-critical CSS'i defer edin

---

## 🔒 Güvenlik

### 1. Environment Variables

- ⚠️ **serviceAccountKey.json'u asla GitHub'a push etmeyin**
- ⚠️ **API keys'leri environment variables'da saklayın**
- ⚠️ **Production ve development için farklı keys kullanın**

### 2. Firestore Security Rules

```bash
# Firestore rules deploy
firebase deploy --only firestore:rules
```

### 3. CORS Configuration

- Sadece kendi domain'inizden isteklere izin verin
- Wildcard (*) yerine spesifik domain kullanın (production'da)

---

## 📈 Monitoring

### Vercel Analytics

1. **Vercel Dashboard → Analytics**
2. **Performance metrics:**
   - Page load time
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

### Firebase Monitoring

1. **Firebase Console → Performance**
2. **Real-time monitoring:**
   - API response times
   - Database queries
   - Authentication success rate

---

## 💰 Maliyet Analizi

### Vercel Free Tier

- ✅ 100 GB bandwidth / ay
- ✅ 100 deployments / gün
- ✅ Serverless function execution: 100 GB-hours
- ✅ Custom domains: Sınırsız

**ADM Web Pro için yeterli mi?**
- 👥 ~100 aktif kullanıcı → ✅ Yeterli
- 📊 ~10,000 sayfa görüntüleme / ay → ✅ Yeterli
- 🚀 ~1,000 API çağrısı / gün → ✅ Yeterli

---

## 📝 Checklist

Deployment öncesi kontrol listesi:

- [ ] GitHub'a kod push edildi
- [ ] Environment variables eklendi
- [ ] Firebase configuration doğru
- [ ] ImgBB API key alındı
- [ ] vercel.json doğru yapılandırıldı
- [ ] Test accounts oluşturuldu
- [ ] Firebase authorized domains güncellendi
- [ ] Firestore security rules deploy edildi
- [ ] Production deployment yapıldı
- [ ] Web sitesi test edildi
- [ ] API endpoint'leri test edildi
- [ ] Fotoğraf yükleme test edildi
- [ ] Mobile responsive test edildi

---

## 🆘 Destek ve Kaynaklar

- **Vercel Documentation:** https://vercel.com/docs
- **Firebase Documentation:** https://firebase.google.com/docs
- **ImgBB API Docs:** https://api.imgbb.com/
- **Vercel Community:** https://github.com/vercel/vercel/discussions

---

## 📅 Deployment History

**v1.0 - İlk Production Release**
- ✅ Firebase Authentication
- ✅ Firestore Database
- ✅ ImgBB Image Hosting
- ✅ Vercel Serverless Functions
- ✅ Multi-company support
- ✅ Role-based access control

---

**Son Güncelleme:** 18 Kasım 2025
**Deployment URL:** https://adm-web-pro.vercel.app
**Status:** 🟢 Production Ready
