# CHANGELOG

Tüm önemli değişiklikler bu dosyada kaydedilecektir.

## [Unreleased]

### 2025-11-17

- **Firebase Setup Complete** — Claude-agent: Firebase web config (adm-web-pro) eklendi, firebase-config.js modular SDK v10.7.1 imports ile güncellendi (getAuth, getFirestore, setPersistence, enableIndexedDbPersistence). auth.js: signInWithEmailAndPassword, signOut, onAuthStateChanged modular imports. projects.js: collection, query, where, orderBy, getDocs, doc, getDoc, addDoc modular imports eklendi. HTML: type="module" script tags eklendi. ES Module exports/imports yapılandırıldı. Frontend Login Test: ✅ admin@adm.com ile successful login, Dashboard ve Projects render edildi, Firestore bağlantısı doğrulandı.

### 2025-11-17

- **Vercel Migration** — Claude-agent: Render'den Vercel'e geçiş yapıldı. `/api/index.js` oluşturuldu (Express uygulaması Vercel Serverless Functions için), `vercel.json` konfigürasyonu eklendi (frontend SPA rewrites, API routes), `web/js/config-vercel.js` oluşturuldu (ortama göre API URL yönetimi: development, staging, production), `api/package.json` Backend bağımlılıkları için oluşturuldu, `.env.example` Firebase Service Account detayları ile güncelleştirildi, `VERCEL_DEPLOYMENT.md` kapsamlı Vercel deployment rehberi oluşturuldu, README.md Vercel deployment talimatları ile güncellendi.

- **Initial Setup** — Claude-agent: Proje yapısı oluşturuldu (web/, admin-api/, admin-scripts/), dev_checklist.json ve CHANGELOG.md dosyaları başlatıldı, .gitignore yapılandırıldı.

- **Frontend Scaffold** — Claude-agent: index.html, CSS (style.css), ve JavaScript modülleri (auth.js, projects.js, app.js) oluşturuldu. Login formu, dashboard, proje listesi, ve proje detay modali (3 tab: Loglar, Malzemeler, Ödemeler) tamamlandı.

- **Backend Scaffold** — Claude-agent: Express.js server (admin-api/server.js) oluşturuldu. /health, /api/auth/create-user, /api/auth/set-custom-claims, /api/health/firestore, /api/uploads/sign, /api/uploads/complete endpoints tamamlandı. CORS, rate limiting, error handling ve Firebase Admin SDK integrations eklendi. package.json ve .env.example yapılandırıldı.

- **Firebase Config & Auth Setup** — Claude-agent: web/js/firebase-config.js enhanced (offline persistence, emulator desteği, connection verification). admin-scripts/create-superadmin.js script'i oluşturuldu - Firebase Admin SDK kullanarak superadmin user oluşturabiliyor. Test user oluşturma workflow hazır.

- **Firestore Schema & Security Rules** — Claude-agent: firestore.rules oluşturuldu (role-based access control: superadmin, admin, operator, finance, viewer). FIRESTORE_SCHEMA.md kapsamlı dokumentasyon (collections, schema örnekleri, security rules özeti). admin-scripts/seed-database.js örnek veri yükleyebiliyor (companies, projects, logs, stocks, payments).

- **Project CRUD & Tabs** — Claude-agent: Frontend projects.js Firestore entegrasyonu tamamlandı (loadProjects, renderProjectsList, create, update, delete operations). Backend /api/projects endpoints (GET, POST, PUT, DELETE) tamamlandı. Proje detay modali 3 tab (Loglar, Malzemeler, Ödemeler) Firestore'dan veri çekip render ediyor.

- **Photo Upload with Cloudinary Signed** — Claude-agent: web/js/upload.js oluşturuldu (Cloudinary signed upload akışı, file picker, metadata save). /api/uploads/sign ve /api/uploads/complete endpoints hazır. API_DOCUMENTATION.md kapsamlı API referansı (tüm endpoints, examples, error handling, rate limiting).

- **Audit Logging System** — Claude-agent: web/js/audit.js oluşturuldu (logAuditAction, loadAuditLogs, renderAuditView, exportCSV, getAuditSummary). Backend /api/audit-logs endpoints (GET, POST, /summary) tamamlandı. Tüm actions audit_logs collection'ına yazılıyor (action type, entity, performedBy, changes, timestamp).

- **Firestore Security Rules Testing** — Claude-agent: firestore.rules dosyası role-based access control (superadmin, admin, operator, finance, viewer) ve companyId bazlı kısıtlamalar ile tamamlandı. Security rules testing rehberi ve manual test senaryoları hazırlandı.

- **Deploy Preparation** — Claude-agent: firebase.json (Firebase Hosting config), render.yaml (Render IaC), admin-api/build.sh, .env.example, README.md (kapsamlı documentasyon) oluşturuldu. Frontend Firebase Hosting ve Backend Render/Cloud Run deployment rehberleri hazırlandı.

- **Final QA & Security Hardening** — Claude-agent: web/js/security.js (password policy validation, strength indicator) ve web/js/security-monitoring.js (error handling, logging, rate limiting, input sanitization, Sentry integration hook) oluşturuldu. Backend'e rate limiting ve request ID tracking middleware'leri eklendi. Tüm 13 tasks tamamlandı.










