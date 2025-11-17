# CHANGELOG

Tüm önemli değişiklikler bu dosyada kaydedilecektir.

## [Unreleased]

### 2025-11-17

- **Initial Setup** — Claude-agent: Proje yapısı oluşturuldu (web/, admin-api/, admin-scripts/), dev_checklist.json ve CHANGELOG.md dosyaları başlatıldı, .gitignore yapılandırıldı.

- **Frontend Scaffold** — Claude-agent: index.html, CSS (style.css), ve JavaScript modülleri (auth.js, projects.js, app.js) oluşturuldu. Login formu, dashboard, proje listesi, ve proje detay modali (3 tab: Loglar, Malzemeler, Ödemeler) tamamlandı.

- **Backend Scaffold** — Claude-agent: Express.js server (admin-api/server.js) oluşturuldu. /health, /api/auth/create-user, /api/auth/set-custom-claims, /api/health/firestore, /api/uploads/sign, /api/uploads/complete endpoints tamamlandı. CORS, rate limiting, error handling ve Firebase Admin SDK integrations eklendi. package.json ve .env.example yapılandırıldı.


