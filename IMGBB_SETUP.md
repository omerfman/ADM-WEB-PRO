# ImgBB Free Image Hosting Setup

## 🎯 Neden ImgBB?

Firebase Storage Türkiye'de ücretli olduğu için **tamamen ücretsiz** bir alternatif olarak ImgBB kullanıyoruz.

### ImgBB Ücretsiz Tier Özellikleri:
- ✅ **Sınırsız depolama alanı**
- ✅ **32MB maksimum dosya boyutu**
- ✅ **Bant genişliği limiti yok**
- ✅ **HTTPS desteği**
- ✅ **Direkt resim linkleri**
- ✅ **Thumbnail otomatik oluşturma**
- ✅ **API ile yönetim**

---

## 📋 Kurulum Adımları

### 1. ImgBB Hesabı Oluşturma

1. **ImgBB API sayfasına gidin:**
   ```
   https://api.imgbb.com/
   ```

2. **"Get API Key" butonuna tıklayın**

3. **Ücretsiz hesap oluşturun:**
   - Email adresi
   - Şifre
   - Kullanıcı adı

4. **Email adresinizi doğrulayın**

---

### 2. API Key Alma

1. **Dashboard'a giriş yapın:**
   ```
   https://api.imgbb.com/
   ```

2. **API Key'inizi kopyalayın**
   - Dashboard'da otomatik olarak gösterilir
   - Örnek format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

3. **API Key'i güvenli bir yerde saklayın**
   - ⚠️ Bu key'i kimseyle paylaşmayın
   - ⚠️ GitHub'a push etmeyin

---

### 3. Projeye Entegrasyon

1. **`web/js/imgbb-config.js` dosyasını açın:**
   ```bash
   notepad web\js\imgbb-config.js
   ```

2. **API Key'inizi yapıştırın:**
   ```javascript
   export const IMGBB_API_KEY = 'BURAYA_API_KEYINIZI_YAPIŞTIRIN';
   ```

3. **Dosyayı kaydedin** (Ctrl+S)

---

## 🧪 Test Etme

### 1. Web Uygulamasını Başlatın

```bash
# Vercel dev server
vercel dev

# veya basit HTTP server
cd web
python -m http.server 8000
```

### 2. Fotoğraf Yükleme Testi

1. **Dashboard'a giriş yapın**
2. **Bir proje açın**
3. **"Günlük Ekle" butonuna tıklayın**
4. **Bir fotoğraf seçin (max 32MB)**
5. **"Kaydet" butonuna tıklayın**

### 3. Başarı Kontrolü

✅ **Başarılı yükleme:**
- "Fotoğraf başarıyla yüklendi!" mesajı görünür
- Fotoğraf günlük kaydında gösterilir
- Console'da ✅ ImgBB upload successful: {...} görünür

❌ **Hata durumları:**
- "ImgBB API key ayarlanmamış!" → API key'i kontrol edin
- "Upload failed" → İnternet bağlantısını kontrol edin
- "Dosya boyutu 32MB'dan küçük olmalıdır" → Daha küçük dosya seçin

---

## 🔒 Güvenlik Notları

### API Key Güvenliği

⚠️ **ÖNEMLİ:** ImgBB API key'i frontend'de kullanıldığı için herkese açıktır.

**Risk Azaltma Yöntemleri:**

1. **Rate Limiting (ImgBB tarafında):**
   - ImgBB kendi rate limiting'i uygular
   - Kötüye kullanım durumunda hesap askıya alınabilir

2. **Domain Restriction (Önerilir):**
   - ImgBB Dashboard → Settings
   - "Allowed Domains" kısmına sadece kendi domain'inizi ekleyin
   - Örnek: `adm-web-pro.vercel.app`

3. **Backend Proxy (Gelişmiş):**
   - API key'i backend'de saklayın
   - Frontend → Backend → ImgBB şeklinde istek atın
   - `/api/upload-photo` endpoint'i oluşturun

---

## 🚀 Vercel Deployment için Ortam Değişkenleri

### Yöntem 1: Vercel Dashboard (Önerilen)

1. **Vercel Dashboard'a gidin:**
   ```
   https://vercel.com/dashboard
   ```

2. **Projenizi seçin**

3. **Settings → Environment Variables**

4. **Yeni değişken ekleyin:**
   ```
   Name: VITE_IMGBB_API_KEY
   Value: [API_KEY_BURAYA]
   Environment: Production, Preview, Development
   ```

5. **Redeploy yapın**

### Yöntem 2: Vercel CLI

```bash
# Environment variable ekle
vercel env add VITE_IMGBB_API_KEY

# Değeri girin
[API_KEY_BURAYA]

# Environment seçin (Production, Preview, Development)
> Production
```

### Config Dosyasını Güncelleme

**`web/js/imgbb-config.js`:**
```javascript
// Production'da environment variable kullan, development'da config'den al
export const IMGBB_API_KEY = 
  import.meta.env?.VITE_IMGBB_API_KEY || 
  'YOUR_IMGBB_API_KEY'; // Development için fallback
```

---

## 📊 Kullanım İstatistikleri

ImgBB Dashboard'da şunları görebilirsiniz:
- 📈 Toplam yüklenen resim sayısı
- 💾 Kullanılan toplam depolama
- 🔄 Aylık API çağrı sayısı
- 📅 Son yükleme tarihleri

---

## ❓ Sık Sorulan Sorular

### Q: ImgBB gerçekten tamamen ücretsiz mi?
**A:** Evet! Ücretsiz tier sınırsız depolama ve bandwidth sağlar. Tek limit dosya başına 32MB.

### Q: Fotoğrafları nasıl silerim?
**A:** ImgBB free tier API ile silmeyi desteklemez. Firestore'daki metadata silinir ama ImgBB'de dosya kalır. Premium hesapla API deletion mümkün.

### Q: Vercel'de environment variable nasıl kullanılır?
**A:** Yukarıdaki "Vercel Deployment için Ortam Değişkenleri" bölümüne bakın.

### Q: API rate limit var mı?
**A:** ImgBB kendi rate limiting uygular. Normal kullanımda sorun yaşamazsınız.

### Q: Başka alternatif var mı?
**A:** Evet: Cloudinary (free tier), Uploadcare (free tier), Supabase Storage (free tier).

---

## 🆘 Destek

Sorun yaşarsanız:
1. Console'da hata mesajlarını kontrol edin (F12)
2. Network tab'da API isteklerini inceleyin
3. ImgBB API key'inizin doğru olduğundan emin olun
4. Dosya boyutunun 32MB'dan küçük olduğunu kontrol edin

---

## 📝 Changelog

**v1.0 (18 Kasım 2025)**
- ✅ Firebase Storage yerine ImgBB entegrasyonu
- ✅ Ücretsiz image hosting
- ✅ Türkiye'de kullanım için optimize edildi
- ✅ 32MB max dosya boyutu desteği
- ✅ Thumbnail otomatik oluşturma
