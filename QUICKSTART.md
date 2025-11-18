# 🎯 HIZLI BAŞLANGIÇ REHBERİ - ADM Web Pro

## 📦 Yapılan Değişiklikler (18 Kasım 2025)

### ✅ Firebase Storage → ImgBB Migration

**Sebep:** Firebase Storage Türkiye'de ücretli

**Değişiklikler:**
```
web/js/upload.js          → ImgBB API entegrasyonu
web/js/imgbb-config.js    → API key konfigürasyonu (YENİ)
web/js/projects.js        → uploadPhotoToImgBB() kullanımı
IMGBB_SETUP.md           → Detaylı kurulum rehberi (YENİ)
```

**Yapılması Gerekenler:**
1. https://api.imgbb.com/ adresinden ücretsiz hesap oluştur
2. API key al
3. `web/js/imgbb-config.js` dosyasında güncelle:
   ```javascript
   export const IMGBB_API_KEY = 'BURAYA_API_KEYINIZI_YAPIŞTIRIN';
   ```

---

## 🚀 Deployment Hazırlığı

### 1. GitHub'a Push

```bash
# .gitignore kontrol
echo "serviceAccountKey.json" >> .gitignore
echo "node_modules/" >> .gitignore

# Commit ve push
git add .
git commit -m "Production ready with ImgBB integration"
git push origin main
```

### 2. Vercel Deployment

**Dashboard Yöntemi:**
1. https://vercel.com/dashboard → New Project
2. GitHub repo import et
3. Environment Variables ekle:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_IMGBB_API_KEY`
4. Deploy!

**CLI Yöntemi:**
```bash
vercel login
vercel
vercel --prod
```

**Detaylı Rehber:** `VERCEL_DEPLOYMENT_GUIDE.md`

---

## 🧪 Test Hesapları Oluşturma

```bash
cd admin-scripts
npm install
node create-test-accounts.js
```

**Oluşturulacak Hesaplar:**
- superadmin@adm.com (Şifre: 0123456)
- companyadmin@adm.com (Şifre: 0123456)
- user@adm.com (Şifre: 0123456)

---

## 📁 Dosya Yapısı

```
adm-web-pro/
├── web/
│   ├── login.html
│   ├── dashboard.html
│   ├── js/
│   │   ├── upload.js           ← ImgBB entegrasyonu
│   │   ├── imgbb-config.js     ← API key config (YENİ)
│   │   ├── projects.js         ← ImgBB kullanımı güncellendi
│   │   └── ...
│   └── ...
│
├── api/
│   ├── index.js                ← Vercel serverless function
│   └── package.json
│
├── admin-scripts/
│   ├── create-test-accounts.js ← Test hesapları (YENİ)
│   └── package.json
│
├── IMGBB_SETUP.md             ← ImgBB kurulum rehberi (YENİ)
├── VERCEL_DEPLOYMENT_GUIDE.md ← Deployment rehberi (YENİ)
├── CHECKLIST.md               ← Görevler listesi (güncellendi)
└── vercel.json                ← Vercel config
```

---

## 🔧 Konfigürasyon Dosyaları

### 1. ImgBB Config (`web/js/imgbb-config.js`)

```javascript
export const IMGBB_API_KEY = 'YOUR_API_KEY_HERE'; // BURAYA API KEY
export const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
export const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB
```

### 2. Firebase Config (`web/js/firebase-config.js`)

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 3. Vercel Config (`vercel.json`)

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
  ]
}
```

---

## ⚡ Hızlı Test

### Local Development

```bash
# Basit HTTP server
cd web
python -m http.server 8000

# Tarayıcıda aç
http://localhost:8000/login.html
```

### Vercel Dev

```bash
vercel dev
```

---

## 📋 Deployment Checklist

- [ ] ImgBB API key alındı ve eklendi
- [ ] Firebase config güncellendi
- [ ] GitHub'a kod push edildi
- [ ] Vercel environment variables eklendi
- [ ] Test hesapları oluşturuldu
- [ ] Firebase authorized domains güncellendi
- [ ] Production deployment yapıldı
- [ ] Web sitesi test edildi
- [ ] Fotoğraf yükleme test edildi

---

## 🆘 Sorun Giderme

### Problem: "ImgBB API key ayarlanmamış"
```bash
# web/js/imgbb-config.js dosyasını düzenle
export const IMGBB_API_KEY = 'GERÇEK_API_KEYINIZ';
```

### Problem: Firebase bağlanamıyor
```bash
# Firebase Console → Authorized domains
# Vercel URL'inizi ekleyin: adm-web-pro.vercel.app
```

### Problem: API çalışmıyor
```bash
# Vercel Dashboard → Functions → Logs
# Hata mesajlarını kontrol edin
```

---

## 📞 Destek Dokümanları

- **ImgBB Setup:** `IMGBB_SETUP.md`
- **Vercel Deployment:** `VERCEL_DEPLOYMENT_GUIDE.md`
- **API Documentation:** `API_DOCUMENTATION.md`
- **Firestore Schema:** `FIRESTORE_SCHEMA.md`
- **Checklist:** `CHECKLIST.md`

---

## 🎉 Özet

**✅ Tamamlanan:**
1. Firebase Storage → ImgBB migration (ücretsiz!)
2. Vercel deployment optimizasyonu
3. Test hesapları scripti

**⏳ Sonraki Adımlar:**
1. ImgBB API key al ve ekle
2. GitHub'a push
3. Vercel'e deploy
4. Test hesapları oluştur
5. Production test

**🚀 Production Ready!**

---

**Son Güncelleme:** 18 Kasım 2025
**Versiyon:** 1.0.0
**Deployment Platform:** Vercel
**Image Hosting:** ImgBB (Free)
**Database:** Firebase Firestore
