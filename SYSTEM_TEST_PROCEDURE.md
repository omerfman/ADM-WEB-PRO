# 🏗️ ADM İnşaat Proje Yönetim Sistemi - Test Prosedürü

## 📋 Genel Bakış

Bu belge, ADM İnşaat Proje Yönetim Sistemi'nin kapsamlı test prosedürünü içermektedir. Tüm sayfalar ve fonksiyonlar sistematik olarak test edilecektir.

---

## ✅ Tamamlanan Sayfalar ve Modüller

### 1. ✅ İnşaat Süreç Analizi ve Sistem Tasarımı
- **Dosya:** `CONSTRUCTION_WORKFLOW_SYSTEM.md`
- **Durum:** Tamamlandı
- **İçerik:**
  - KEŞİF → TEKLİF → SÖZLEŞME → METRAJ → HAKEDİŞ → ÖDEME akışı
  - Detaylı süreç analizleri
  - Database şemaları
  - Formül ve hesaplama yöntemleri
  - UI/UX tasarım prensipleri

### 2. ✅ Stok Yönetimi Sayfası
- **Dosya:** `web/projects/stok-yonetimi.html`
- **Durum:** Tamamlandı
- **Özellikler:**
  - ✅ Stok ekleme/düzenleme/silme
  - ✅ Stok kullanım takibi (modal form)
  - ✅ Kullanım geçmişi görüntüleme
  - ✅ Otomatik kalan miktar hesaplama
  - ✅ Özet kartlar (Toplam Kalem, Giriş Değeri, Kullanılan Değer, Kalan Değer)
  - ✅ İlerleme çubukları ve durum göstergeleri
  - ✅ Filtreleme (arama, birim, sıralama)

### 3. ✅ Metraj Listesi (BOQ) Sayfası
- **Dosya:** `web/projects/metraj-listesi.html`
- **JS Modül:** `web/js/boq.js`
- **Durum:** Tamamlandı
- **Özellikler:**
  - ✅ İş kalemi ekleme/düzenleme/silme
  - ✅ Poz numarası sistemi (01.01.001 formatı)
  - ✅ 8 kategori desteği (Hafriyat, Kaba İnşaat, vb.)
  - ✅ 9 birim tipi (m², m³, m, Adet, Kg, Ton, Lt, Takım, Komple)
  - ✅ Otomatik toplam hesaplama (Miktar × Birim Fiyat)
  - ✅ Özet kartlar ve ilerleme göstergesi
  - ✅ Excel import/export
  - ✅ Inline ve modal düzenleme
  - ✅ Boyut hesaplamaları (genişlik × uzunluk × yükseklik)

### 4. ✅ Hakediş Takibi Sayfası
- **Dosya:** `web/projects/hakedis-takibi.html`
- **JS Modül:** `web/js/progress-payments.js`
- **Durum:** Tamamlandı
- **Özellikler:**
  - ✅ Hakediş oluşturma (otomatik numara: HAK-001, HAK-002...)
  - ✅ BOQ entegrasyonu (metraj kalemlerini çekme)
  - ✅ Bu dönem miktar girişi
  - ✅ Otomatik vergi hesaplamaları:
    - Brüt Tutar = Σ(Miktar × Birim Fiyat)
    - KDV (%20)
    - Stopaj (%3)
    - Damga Vergisi (%0.948)
    - Net Ödeme = (Brüt + KDV) - (Stopaj + Damga)
  - ✅ Durum takibi (Taslak → Onay Bekliyor → Onaylandı → Ödendi → İptal)
  - ✅ Özet kartlar (Toplam Hakediş, Toplam Tutar, Ödenen, Bekleyen)
  - ✅ Proje ilerleme özeti (Sözleşme tutarı, Tamamlanma %)
  - ✅ Filtreleme ve sıralama
  - ✅ Detay görüntüleme
  - ✅ PDF export (placeholder)

### 5. ✅ Proje Özeti Sayfası
- **Dosya:** `web/projects/proje-ozeti.html`
- **Durum:** Mevcut (önceden oluşturulmuş)
- **Özellikler:**
  - ✅ Proje başlığı ve temel bilgiler
  - ✅ 4 özet kart (Metraj, Hakediş, Stok, Şantiye Günlüğü)
  - ✅ İlerleme çubukları:
    - Genel proje ilerlemesi
    - Metraj tamamlanma
    - Bütçe kullanımı
    - Zaman kullanımı
  - ✅ Son aktiviteler timeline
  - ✅ Proje ekibi listesi

### 6. ✅ Şantiye Günlüğü Sayfası
- **Dosya:** `web/projects/santiye-gunlugu.html`
- **Durum:** Mevcut (önceden oluşturulmuş)
- **Özellikler:**
  - ✅ Günlük rapor ekleme
  - ✅ Hava durumu kaydı
  - ✅ İşçi sayısı takibi
  - ✅ Yapılan işler listesi
  - ✅ Kullanılan malzemeler
  - ✅ Ekipman kullanımı
  - ✅ Sorunlar ve notlar

### 7. ✅ Bütçe Yönetimi Sayfası
- **Dosya:** `web/projects/butce-yonetimi.html`
- **Durum:** Tamamlandı
- **Özellikler:**
  - ✅ Özet kartlar (Toplam Bütçe, Gelirler, Giderler, Net Kar/Zarar)
  - ✅ Kategori bazlı bütçe dağılımı:
    - İşçilik
    - Malzeme
    - Ekipman
    - Nakliye
    - Taşeron
    - İdari Giderler
    - Diğer
  - ✅ Gider ekleme modalı
  - ✅ Gider durumu (Planlandı, Bekliyor, Ödendi)
  - ✅ Ödeme yöntemi (Nakit, Banka, Çek, Kredi Kartı)
  - ✅ Filtreleme (kategori, durum, tarih aralığı, arama)
  - ✅ Gelir-gider entegrasyonu (Hakediş ödemeleri gelir olarak)
  - ✅ Excel export (placeholder)

### 8. ✅ Müşteri Yetkileri Sayfası
- **Dosya:** `web/projects/musteri-yetkileri.html`
- **Durum:** Tamamlandı
- **Özellikler:**
  - ✅ Yetki kategorileri:
    - Genel Görüntüleme (Proje Özeti, Şantiye Günlüğü)
    - Metraj ve Hakediş (BOQ, Hakediş Bilgileri, Hakediş Onaylama)
    - Mali Bilgiler (Bütçe, Detaylı Giderler)
    - Stok ve Malzeme (Stok Durumu, Stok Detayları)
  - ✅ Toggle switch ile yetki yönetimi
  - ✅ Müşteri davet etme modalı
  - ✅ Müşteri kullanıcı listesi
  - ✅ Durum takibi (Aktif, Bekliyor, Pasif)
  - ✅ Erişim günlüğü (placeholder)

---

## 🧪 Test Prosedürü

### A. Ön Hazırlık (Pre-Test Setup)

#### 1. Test Ortamı Kontrolü
```
☐ Firebase bağlantısı aktif mi?
☐ Firestore rules doğru yapılandırılmış mı?
☐ Test kullanıcıları oluşturuldu mu? (Admin, Çalışan, Müşteri)
☐ En az 1 test şirketi var mı?
☐ En az 1 test projesi var mı?
```

#### 2. Test Verileri Hazırlama
```sql
-- Test Şirketi
Company: "Test İnşaat A.Ş."
Address: "Test Mahallesi, Test Caddesi No:1"
Phone: "0212 XXX XX XX"

-- Test Projesi
Project: "Örnek Konut Projesi"
Company: Test İnşaat A.Ş.
Budget: 5,000,000 TL
Start Date: 01.01.2025
End Date: 31.12.2025
Status: active

-- Test Kullanıcıları
Admin: admin@test.com / Admin123!
Employee: calisan@test.com / Calisan123!
Client: musteri@test.com / Musteri123!
```

---

### B. Modül Bazlı Test Senaryoları

#### TEST 1: Kimlik Doğrulama ve Yetkilendirme

**1.1 Giriş Testi**
```
☐ Login sayfası açılıyor mu?
☐ Geçersiz e-posta ile giriş engelleniyor mu?
☐ Geçersiz şifre ile giriş engelleniyor mu?
☐ Geçerli bilgilerle giriş başarılı mı?
☐ Kullanıcı rolü doğru tespit ediliyor mu?
☐ Sidebar'da kullanıcı adı görünüyor mu?
```

**1.2 Yetki Kontrolü**
```
☐ Admin tüm sayfaları görebiliyor mu?
☐ Çalışan yetkili sayfaları görebiliyor mu?
☐ Müşteri sadece izin verilen sayfaları görebiliyor mu?
☐ Yetkisiz sayfaya erişim engelleniyor mu?
☐ Çıkış yapma başarılı mı?
```

---

#### TEST 2: Proje Yönetimi

**2.1 Proje Oluşturma**
```
☐ Projeler sayfası açılıyor mu?
☐ "Yeni Proje" butonu çalışıyor mu?
☐ Proje ekleme modalı açılıyor mu?
☐ Zorunlu alanlar kontrol ediliyor mu?
☐ Şirket seçimi çalışıyor mu?
☐ Tarih seçici çalışıyor mu?
☐ Bütçe girişi sayısal mı?
☐ Proje başarıyla kaydediliyor mu?
☐ Yeni proje listede görünüyor mu?
```

**2.2 Proje Özeti Sayfası**
```
☐ Proje detayına tıklayınca açılıyor mu?
☐ Proje başlığı doğru gösteriliyor mu?
☐ Şirket bilgisi doğru mu?
☐ Tarihler doğru formatlanmış mı?
☐ Toplam bütçe gösteriliyor mu?
☐ 4 özet kart doğru veri gösteriyor mu?
  - Metraj Durumu (0 iş kalemi)
  - Hakediş Durumu (0 hakediş)
  - Stok Durumu (0 stok)
  - Şantiye Günlüğü (0 rapor)
☐ İlerleme çubukları çalışıyor mu?
☐ Zaman kullanımı hesaplanıyor mu?
☐ Navigation linkleri doğru projeye gidiyor mu?
```

---

#### TEST 3: Metraj Listesi (BOQ)

**3.1 İş Kalemi Ekleme**
```
☐ Metraj listesi sayfası açılıyor mu?
☐ "Yeni İş Kalemi" butonu çalışıyor mu?
☐ Modal açılıyor mu?
☐ Poz numarası otomatik mi manuel mi?
☐ Kategori seçimi çalışıyor mu?
☐ Birim seçimi çalışıyor mu?
☐ Miktar ve birim fiyat sayısal mı?
☐ Toplam tutar otomatik hesaplanıyor mu? (Miktar × Birim Fiyat)
☐ Kayıt başarılı mı?
☐ Listede yeni kalem görünüyor mu?
```

**3.2 BOQ Fonksiyonları**
```
☐ Arama çalışıyor mu?
☐ Kategori filtresi çalışıyor mu?
☐ Sıralama seçenekleri çalışıyor mu?
☐ Düzenleme butonu çalışıyor mu?
☐ Düzenleme modalında mevcut veriler geliyor mu?
☐ Güncelleme başarılı mı?
☐ Silme işlemi onay istiyor mu?
☐ Silinen kalem listeden kalkıyor mu?
☐ Özet kartlar güncelleniyor mu?
  - Toplam İş Kalemi
  - Sözleşme Değeri
  - Tamamlanan
  - Kalan
☐ İlerleme çubuğu doğru hesaplanıyor mu?
```

**3.3 Excel İşlemleri**
```
☐ "Excel'e Aktar" butonu çalışıyor mu?
☐ İndirilen dosya açılıyor mu?
☐ Veriler doğru aktarılmış mı?
☐ "Excel'den İçe Aktar" butonu çalışıyor mu?
☐ Şablon indirme çalışıyor mu?
☐ Geçerli Excel dosyası içe aktarılıyor mu?
☐ Hatalı veriler reddediliyor mu?
```

**Test Verileri:**
```
İş Kalemi 1:
  Poz No: 01.01.001
  Kategori: Hafriyat
  İş Adı: Kazı İşleri
  Birim: m³
  Miktar: 500
  Birim Fiyat: 150
  Toplam: 75,000 TL

İş Kalemi 2:
  Poz No: 02.01.001
  Kategori: Kaba İnşaat
  İş Adı: Beton Dökümü
  Birim: m³
  Miktar: 300
  Birim Fiyat: 800
  Toplam: 240,000 TL

İş Kalemi 3:
  Poz No: 03.01.001
  Kategori: İnce İnşaat
  İş Adı: Sıva İşleri
  Birim: m²
  Miktar: 1000
  Birim Fiyat: 120
  Toplam: 120,000 TL
```

---

#### TEST 4: Hakediş Takibi

**4.1 Hakediş Oluşturma**
```
☐ Hakediş sayfası açılıyor mu?
☐ "Yeni Hakediş" butonu çalışıyor mu?
☐ Modal açılıyor mu?
☐ Hakediş numarası otomatik oluşuyor mu? (HAK-001)
☐ Dönem bilgisi varsayılan olarak geliyor mu?
☐ Tarih aralığı ayın ilk ve son günü mü?
☐ BOQ kalemleri yükleniyor mu?
☐ Sözleşme miktarları doğru mu?
☐ Daha önce yapılan miktarlar gösteriliyor mu?
☐ Kalan miktarlar hesaplanıyor mu?
```

**4.2 Hakediş Hesaplamaları**
```
☐ "Bu Dönem" miktarı girilince toplam tutar hesaplanıyor mu?
☐ Brüt tutar doğru mu? Σ(Miktar × Birim Fiyat)
☐ KDV hesaplanıyor mu? (Brüt × 0.20)
☐ Ara toplam doğru mu? (Brüt + KDV)
☐ Stopaj hesaplanıyor mu? (Brüt × 0.03)
☐ Damga vergisi hesaplanıyor mu? (Brüt × 0.00948)
☐ Net ödeme doğru mu? (Ara Toplam - Stopaj - Damga)
☐ Vergi oranları değiştirilince yeniden hesaplanıyor mu?
☐ Özet kutusu real-time güncelliyor mu?
```

**4.3 Hakediş Kaydetme ve Görüntüleme**
```
☐ Boş hakediş kaydedilemiyor mu? (en az 1 kalem olmalı)
☐ Hakediş başarıyla kaydediliyor mu?
☐ Durum "Taslak" olarak ayarlanıyor mu?
☐ Liste sayfasında yeni hakediş görünüyor mu?
☐ Hakediş kartında bilgiler doğru mu?
  - Hakediş No
  - Dönem
  - Tarih aralığı
  - Brüt tutar
  - KDV
  - Kesintiler
  - Net ödeme
  - Durum badge
☐ "Detay" butonu çalışıyor mu?
☐ Detay modalında tüm bilgiler görünüyor mu?
☐ İş kalemleri tablosu doğru mu?
☐ Durum değişimi çalışıyor mu?
☐ PDF export butonu görünüyor mu?
```

**4.4 Proje İlerlemesi**
```
☐ Özet kartlar güncelleniyor mu?
  - Toplam Hakediş Sayısı
  - Toplam Tutar
  - Ödenen
  - Bekleyen
☐ Proje ilerleme özeti doğru mu?
  - Sözleşme Tutarı (BOQ toplamı)
  - Toplam Faturalanan (Hakediş toplamı)
  - Kalan İş
  - Tamamlanma %
☐ İlerleme çubuğu doğru hesaplanıyor mu?
☐ Renk kodlaması çalışıyor mu? (kırmızı/sarı/yeşil)
```

**Test Verileri:**
```
Hakediş 1:
  No: HAK-001
  Dönem: Ocak 2025
  Tarih: 01.01.2025 - 31.01.2025
  İş Kalemleri:
    - Kazı İşleri: 100 m³ (500'den)
    - Beton Dökümü: 50 m³ (300'den)
  Hesaplama:
    Brüt: (100×150) + (50×800) = 55,000 TL
    KDV (20%): 11,000 TL
    Ara Toplam: 66,000 TL
    Stopaj (3%): 1,650 TL
    Damga (0.948%): 521.40 TL
    Net: 63,828.60 TL

Hakediş 2:
  No: HAK-002
  Dönem: Şubat 2025
  İş Kalemleri:
    - Kazı İşleri: 200 m³ (400 kalan)
    - Beton Dökümü: 100 m³ (250 kalan)
    - Sıva İşleri: 300 m² (1000'den)
  Hesaplama:
    Brüt: (200×150) + (100×800) + (300×120) = 146,000 TL
    Net: 148,367.28 TL (hesaplanacak)
```

---

#### TEST 5: Stok Yönetimi

**5.1 Stok Ekleme**
```
☐ Stok yönetimi sayfası açılıyor mu?
☐ "Stok Ekle" butonu çalışıyor mu?
☐ Modal açılıyor mu?
☐ Stok adı zorunlu mu?
☐ Kategori seçimi var mı?
☐ Birim seçimi çalışıyor mu?
☐ Miktar ve birim fiyat sayısal mı?
☐ Toplam tutar otomatik hesaplanıyor mu?
☐ Kayıt başarılı mı?
☐ Yeni stok listede görünüyor mu?
```

**5.2 Stok Kullanımı**
```
☐ "Kullan" butonu çalışıyor mu?
☐ Kullanım modalı açılıyor mu?
☐ Maksimum miktar kontrolü var mı? (kalan stok)
☐ Tarih seçici çalışıyor mu?
☐ Kim kullandı alanı var mı?
☐ Lokasyon bilgisi girilebiliyor mu?
☐ Not alanı çalışıyor mu?
☐ Kayıt başarılı mı?
☐ Kullanılan miktar stoktan düşüyor mu?
☐ Kalan miktar güncelleniyor mu?
☐ İlerleme çubuğu değişiyor mu?
```

**5.3 Stok Geçmişi**
```
☐ "Geçmiş" butonu çalışıyor mu?
☐ Geçmiş modalı açılıyor mu?
☐ Kullanım kayıtları listeleniyor mu?
☐ Kronolojik sıralama doğru mu?
☐ Her kayıtta şu bilgiler var mı?
  - Kullanım tarihi
  - Kullanılan miktar
  - Kimin kullandığı
  - Lokasyon
  - Notlar
☐ Boş geçmiş durumunda mesaj gösteriliyor mu?
```

**5.4 Stok Özet Kartları**
```
☐ Toplam Kalem Sayısı doğru mu?
☐ Toplam Giriş Değeri doğru mu?
☐ Kullanılan Değer doğru mu?
☐ Kalan Değer doğru mu?
☐ Kartlar real-time güncelleniyor mu?
```

**5.5 Stok Görselleştirme**
```
☐ İlerleme çubuğu kullanım oranını gösteriyor mu?
☐ Renk kodlaması çalışıyor mu?
  - Yeşil: < %70
  - Sarı: %70-89
  - Kırmızı: ≥ %90
☐ Durum ikonları doğru mu?
  - ✅ İyi durumda
  - ⚡ Azalıyor
  - ⚠️ Kritik seviye
☐ Grid görünümü bilgiler doğru mu?
  - Toplam miktar ve değer
  - Kullanılan miktar ve değer
  - Kalan miktar ve değer
```

**Test Verileri:**
```
Stok 1:
  Ad: Demir 12mm
  Kategori: İnşaat Malzemeleri
  Birim: Ton
  Miktar: 10
  Birim Fiyat: 25,000
  Toplam: 250,000 TL
  
  Kullanım 1:
    Miktar: 2 Ton
    Tarih: 15.01.2025
    Kullanıcı: Ali Yılmaz
    Lokasyon: Bodrum Kat
    Not: Kolon demiri

  Kullanım 2:
    Miktar: 3 Ton
    Tarih: 20.01.2025
    Kullanıcı: Mehmet Demir
    Lokasyon: Zemin Kat
    Not: Kiriş demiri

Stok 2:
  Ad: Çimento 42.5
  Kategori: İnşaat Malzemeleri
  Birim: Ton
  Miktar: 50
  Birim Fiyat: 3,500
  Toplam: 175,000 TL
```

---

#### TEST 6: Bütçe Yönetimi

**6.1 Gider Ekleme**
```
☐ Bütçe yönetimi sayfası açılıyor mu?
☐ "Gider Ekle" butonu çalışıyor mu?
☐ Modal açılıyor mu?
☐ Gider adı zorunlu mu?
☐ Kategori seçimi çalışıyor mu? (İşçilik, Malzeme, vb.)
☐ Tutar sayısal mı?
☐ Tarih seçici çalışıyor mu?
☐ Durum seçimi var mı? (Planlandı, Bekliyor, Ödendi)
☐ Ödeme yöntemi seçimi çalışıyor mu?
☐ Açıklama alanı var mı?
☐ Referans/Fatura no girilebiliyor mu?
☐ Kayıt başarılı mı?
☐ Yeni gider listede görünüyor mu?
```

**6.2 Özet Kartları**
```
☐ Toplam Bütçe gösteriliyor mu? (Projeden)
☐ Gelirler hesaplanıyor mu? (Ödenen hakediş toplamı)
☐ Giderler hesaplanıyor mu? (Ödenen gider toplamı)
☐ Net Kar/Zarar doğru mu? (Gelir - Gider)
☐ Kar/Zarar renk kodlaması çalışıyor mu?
  - Yeşil: Kar
  - Kırmızı: Zarar
☐ Kartlar real-time güncelleniyor mu?
```

**6.3 Kategori Dağılımı**
```
☐ Kategoriler listeleniyor mu?
☐ Her kategori için toplam tutar doğru mu?
☐ Bütçe yüzdesi hesaplanıyor mu?
☐ Planlanan vs Gerçekleşen gösteriliyor mu?
☐ Varyans hesaplanıyor mu?
☐ Pozitif varyans yeşil mi?
☐ Negatif varyans kırmızı mı?
```

**6.4 Gider Listesi ve Filtreleme**
```
☐ Tüm giderler listeleniyor mu?
☐ Arama çalışıyor mu?
☐ Kategori filtresi çalışıyor mu?
☐ Durum filtresi çalışıyor mu?
☐ Tarih aralığı filtresi çalışıyor mu?
☐ Filtreleri temizle çalışıyor mu?
☐ Gider sayısı gösteriliyor mu?
☐ Her giderde şu bilgiler var mı?
  - Tarih
  - Gider adı
  - Kategori
  - Tutar
  - Durum badge
☐ Silme butonu çalışıyor mu?
```

**Test Verileri:**
```
Gider 1:
  Ad: İşçi Bordrosu - Ocak
  Kategori: İşçilik
  Tutar: 50,000 TL
  Tarih: 31.01.2025
  Durum: Ödendi
  Ödeme Yöntemi: Banka Transferi
  Açıklama: 10 işçi aylık bordro

Gider 2:
  Ad: Demir Satın Alma
  Kategori: Malzeme
  Tutar: 250,000 TL
  Tarih: 15.01.2025
  Durum: Ödendi
  Ödeme Yöntemi: Çek
  Referans: FT-2025-001

Gider 3:
  Ad: Vinç Kiralama
  Kategori: Ekipman
  Tutar: 15,000 TL
  Tarih: 01.02.2025
  Durum: Planlandı
  Ödeme Yöntemi: -

Hesaplama:
  Gelir (Hakediş 1 + 2): 63,828.60 + 148,367.28 = 212,195.88 TL
  Gider (Ödenen): 50,000 + 250,000 = 300,000 TL
  Net: 212,195.88 - 300,000 = -87,804.12 TL (Zarar)
```

---

#### TEST 7: Müşteri Yetkileri

**7.1 Yetki Ayarları**
```
☐ Müşteri yetkileri sayfası açılıyor mu?
☐ 4 yetki kategorisi görünüyor mu?
  - Genel Görüntüleme
  - Metraj ve Hakediş
  - Mali Bilgiler
  - Stok ve Malzeme
☐ Toggle switch'ler çalışıyor mu?
☐ Varsayılan yetkiler doğru mu?
☐ Yetki değişimi kaydediliyor mu?
☐ Değişiklikler sonrası sayfa yenilenince kalıcı mı?
```

**7.2 Müşteri Davet Etme**
```
☐ "Müşteri Davet Et" butonu çalışıyor mu?
☐ Davet modalı açılıyor mu?
☐ Ad soyad zorunlu mu?
☐ E-posta zorunlu ve geçerli mi?
☐ Telefon formatı kontrol ediliyor mu?
☐ Şirket bilgisi opsiyonel mi?
☐ Mesaj alanı çalışıyor mu?
☐ Davet kaydediliyor mu?
☐ Başarı mesajı gösteriliyor mu?
```

**7.3 Müşteri Listesi**
```
☐ Davet edilen müşteriler listeleniyor mu?
☐ Avatar harfleri doğru mu? (İlk 2 harf)
☐ Kullanıcı bilgileri gösteriliyor mu?
  - Ad soyad
  - E-posta
  - Şirket (varsa)
☐ Durum badge'leri doğru mu?
  - Aktif (yeşil)
  - Bekliyor (sarı)
  - Pasif (kırmızı)
☐ "Yetkilendir" butonu çalışıyor mu?
```

**7.4 Erişim Günlüğü**
```
☐ Erişim günlüğü bölümü var mı?
☐ Boş durumda mesaj gösteriliyor mu?
☐ Gelecekte log kayıtları görünecek mi?
```

**Test Verileri:**
```
Müşteri 1:
  Ad: Ahmet Yılmaz
  E-posta: ahmet@testsirketi.com
  Telefon: 0532 111 22 33
  Şirket: Test Şirketi A.Ş.
  Durum: Aktif
  Yetkiler:
    ✅ Proje Özeti
    ✅ Şantiye Günlüğü
    ✅ Metraj Listesi
    ✅ Hakediş Bilgileri
    ❌ Hakediş Onaylama
    ❌ Bütçe Görüntüleme
    ❌ Detaylı Giderler
    ✅ Stok Durumu
    ❌ Stok Detayları

Müşteri 2:
  Ad: Mehmet Demir
  E-posta: mehmet@muhasebe.com
  Telefon: 0533 444 55 66
  Şirket: Muhasebe Ltd.
  Durum: Bekliyor
```

---

#### TEST 8: Şantiye Günlüğü (Mevcut Sayfa)

**8.1 Günlük Rapor Ekleme**
```
☐ Şantiye günlüğü sayfası açılıyor mu?
☐ Yeni rapor ekleme çalışıyor mu?
☐ Tarih seçimi var mı?
☐ Hava durumu seçimi çalışıyor mu?
☐ İşçi sayısı girilebiliyor mu?
☐ Yapılan işler listesi eklenebiliyor mu?
☐ Kullanılan malzemeler kaydediliyor mu?
☐ Ekipman kullanımı girebiliyor mu?
☐ Sorunlar ve notlar yazılabiliyor mu?
☐ Kayıt başarılı mı?
```

**8.2 Günlük Raporları Görüntüleme**
```
☐ Tüm raporlar listeleniyor mu?
☐ Tarih filtresi çalışıyor mu?
☐ Rapor detayı görüntülenebiliyor mu?
☐ Raporlar düzenlenebiliyor mu?
☐ Raporlar silinebiliyor mu?
```

---

### C. Entegrasyon Testleri

#### INT-1: BOQ → Hakediş Entegrasyonu
```
☐ BOQ'da eklenen kalemler Hakediş'te görünüyor mu?
☐ BOQ'da yapılan değişiklikler Hakediş'e yansıyor mu?
☐ Hakediş'teki miktarlar BOQ'yu aşamıyor mu?
☐ Birden fazla hakediş için kümülatif toplam doğru mu?
☐ BOQ'daki silinen kalemler Hakediş'te görünmüyor mu?
```

#### INT-2: Hakediş → Bütçe Entegrasyonu
```
☐ Ödenen hakediş tutarları bütçede gelir olarak görünüyor mu?
☐ Hakediş durumu değişince bütçe güncelleniyor mu?
☐ Net kar/zarar hesabı doğru mu?
☐ Proje özeti kartlarında hakediş toplamları doğru mu?
```

#### INT-3: Stok → Bütçe Entegrasyonu
```
☐ Stok alımları bütçede gider olarak kaydediliyor mu?
☐ Stok kullanımları maliyet hesabına dahil mi?
☐ Kategori dağılımında "Malzeme" güncelliyor mu?
```

#### INT-4: Proje Özeti Entegrasyonu
```
☐ Tüm modüllerden veriler özet sayfada toplanıyor mu?
☐ Metraj durumu doğru mu?
☐ Hakediş durumu doğru mu?
☐ Stok durumu doğru mu?
☐ Şantiye günlüğü sayısı doğru mu?
☐ Genel ilerleme yüzdesi hesaplanıyor mu?
☐ Bütçe kullanımı doğru mu?
☐ Zaman kullanımı doğru mu?
```

---

### D. Performans Testleri

#### PERF-1: Sayfa Yükleme Süreleri
```
☐ Projeler listesi < 2 saniye
☐ Proje özeti < 2 saniye
☐ BOQ listesi < 3 saniye
☐ Hakediş listesi < 3 saniye
☐ Stok listesi < 2 saniye
☐ Bütçe sayfası < 2 saniye
```

#### PERF-2: Büyük Veri Setleri
```
☐ 100+ BOQ kalemi ile performans?
☐ 50+ Hakediş kaydı ile performans?
☐ 200+ Stok kalemi ile performans?
☐ 500+ Gider kaydı ile performans?
☐ Filtreleme hızı kabul edilebilir mi?
```

#### PERF-3: Real-time Hesaplamalar
```
☐ BOQ toplam hesaplama < 1 saniye
☐ Hakediş vergi hesaplamaları < 1 saniye
☐ Bütçe özet kartları < 1 saniye
☐ Stok özet kartları < 1 saniye
```

---

### E. Güvenlik Testleri

#### SEC-1: Firestore Güvenlik Kuralları
```
☐ Yetkisiz kullanıcı veri okuyabiliyor mu? (OLMAMALI)
☐ Yetkisiz kullanıcı veri yazabiliyor mu? (OLMAMALI)
☐ Müşteri sadece yetkili projeleri görebiliyor mu?
☐ Müşteri başka projelere erişemiyor mu?
☐ Admin tüm projelere erişebiliyor mu?
☐ Çalışan sadece atandığı projelere erişebiliyor mu?
```

#### SEC-2: XSS ve Injection Koruması
```
☐ HTML injection çalışıyor mu? (ÇALIŞMAMALI)
☐ Script injection çalışıyor mu? (ÇALIŞMAMALI)
☐ SQL injection riski var mı? (Firestore kullanıldığı için olmaz)
☐ Kullanıcı girişleri sanitize ediliyor mu?
```

#### SEC-3: Veri Doğrulama
```
☐ Negatif sayılar kabul ediliyor mu? (OLMAMALI)
☐ Geçersiz tarihler kabul ediliyor mu? (OLMAMALI)
☐ Boş zorunlu alanlar geçiyor mu? (GEÇMEMELİ)
☐ E-posta formatı kontrol ediliyor mu?
☐ Telefon formatı kontrol ediliyor mu?
```

---

### F. Kullanıcı Deneyimi (UX) Testleri

#### UX-1: Responsive Tasarım
```
☐ Desktop (1920×1080) düzgün görünüyor mu?
☐ Laptop (1366×768) düzgün görünüyor mu?
☐ Tablet (768×1024) düzgün görünüyor mu?
☐ Mobile (375×667) düzgün görünüyor mu?
☐ Hamburger menü mobilde çalışıyor mu?
☐ Tablolar mobilde scroll yapabiliyor mu?
☐ Formlar mobilde kullanılabilir mi?
```

#### UX-2: Görsel Tutarlılık
```
☐ Renk paleti tutarlı mı?
☐ Font büyüklükleri tutarlı mı?
☐ Buton stilleri tutarlı mı?
☐ İkonlar tutarlı mı?
☐ Boşluklar (margin/padding) tutarlı mı?
☐ Border radius'lar tutarlı mı?
```

#### UX-3: Kullanıcı Geri Bildirimleri
```
☐ Başarılı işlemlerde mesaj gösteriliyor mu?
☐ Hatalı işlemlerde mesaj gösteriliyor mu?
☐ Yükleme sırasında loading gösteriliyor mu?
☐ Boş durumlar için mesaj var mı?
☐ Onay gereken işlemlerde uyarı çıkıyor mu?
☐ Form validasyonu real-time mi?
```

---

### G. Tarayıcı Uyumluluğu

#### BROWSER-1: Chrome
```
☐ Tüm sayfalar açılıyor mu?
☐ Fonksiyonlar çalışıyor mu?
☐ Console'da hata var mı?
```

#### BROWSER-2: Firefox
```
☐ Tüm sayfalar açılıyor mu?
☐ Fonksiyonlar çalışıyor mu?
☐ Console'da hata var mı?
```

#### BROWSER-3: Edge
```
☐ Tüm sayfalar açılıyor mu?
☐ Fonksiyonlar çalışıyor mu?
☐ Console'da hata var mı?
```

#### BROWSER-4: Safari (macOS/iOS)
```
☐ Tüm sayfalar açılıyor mu?
☐ Fonksiyonlar çalışıyor mu?
☐ Console'da hata var mı?
```

---

### H. Hata Senaryoları

#### ERROR-1: Network Hataları
```
☐ İnternet bağlantısı kesilince ne oluyor?
☐ Firestore bağlantısı kopunca ne oluyor?
☐ Timeout durumunda mesaj gösteriliyor mu?
☐ Retry mekanizması var mı?
```

#### ERROR-2: Veri Hataları
```
☐ Geçersiz proje ID'si ile ne oluyor?
☐ Silinmiş proje açılmaya çalışılınca ne oluyor?
☐ Eksik veri varsa ne oluyor?
☐ Çakışan veriler için kontrol var mı?
```

#### ERROR-3: Kullanıcı Hataları
```
☐ Yanlış form girişi yapılınca mesaj gösteriliyor mu?
☐ Gerekli alan boş bırakılınca uyarı var mı?
☐ Geçersiz dosya yüklenince ne oluyor?
☐ Maksimum değer aşılınca engelleniyor mu?
```

---

## 📊 Test Sonuç Raporu Şablonu

### Test Özeti
```
Test Tarihi: [GÜN/AY/YIL]
Test Eden: [AD SOYAD]
Test Ortamı: [Development/Staging/Production]
Tarayıcı: [Chrome/Firefox/Edge/Safari] v[VERSION]
OS: [Windows/macOS/Linux]

Toplam Test Sayısı: [X]
Başarılı: [Y]
Başarısız: [Z]
Atlanan: [W]

Başarı Oranı: [(Y/X)*100]%
```

### Kritik Hatalar (Blocker)
```
1. [Hata Açıklaması]
   - Sayfa: [SAYFA ADI]
   - Adımlar: [TEKRAR ADIMLARI]
   - Beklenen: [BEKLENEN SONUÇ]
   - Gerçekleşen: [GERÇEKLEŞEN SONUÇ]
   - Ekran Görüntüsü: [LINK]
```

### Orta Seviye Hatalar (Major)
```
[Yukarıdaki format ile]
```

### Düşük Seviye Hatalar (Minor)
```
[Yukarıdaki format ile]
```

### İyileştirme Önerileri
```
1. [ÖNERİ]
2. [ÖNERİ]
```

---

## 🎯 Kabul Kriterleri

### Minimum Kabul Kriterleri
```
✅ Tüm kritik testler geçmeli (Blocker: 0)
✅ Başarı oranı > %95 olmalı
✅ Sayfa yükleme süreleri kabul edilebilir olmalı
✅ Responsive tasarım 4 cihaz tipinde çalışmalı
✅ En az 2 tarayıcıda tam uyumlu olmalı
✅ Güvenlik testleri geçmeli
✅ Entegrasyon testleri başarılı olmalı
```

### İdeal Kabul Kriterleri
```
⭐ Tüm testler geçmeli (Hata: 0)
⭐ Başarı oranı %100
⭐ Tüm tarayıcılarda tam uyumlu
⭐ Performans testleri mükemmel
⭐ UX testleri mükemmel
```

---

## 📝 Test Notları

### Önemli Kontrol Noktaları
1. **Veri Tutarlılığı**: Tüm modüller arasında veri tutarlılığı sağlanmalı
2. **Hesaplama Doğruluğu**: Mali hesaplamalar %100 doğru olmalı
3. **Yetkilendirme**: Her rol doğru sayfalara erişebilmeli
4. **Gerçek Zamanlı Güncellemeler**: Hesaplamalar anında olmalı
5. **Kullanıcı Dostu**: 3 tıkla ile tüm işlemler yapılabilmeli

### Test Sonrası Aksiyonlar
1. Tüm hataları dokümante et
2. Kritik hataları önceliklendir
3. Düzeltmeleri yap
4. Regression test yap
5. User Acceptance Test (UAT) planla
6. Production deployment hazırlığı

---

## 🚀 Sonraki Adımlar

1. **Alpha Test**: Geliştirici testleri (Bu doküman)
2. **Beta Test**: İç kullanıcı testleri
3. **UAT**: Gerçek kullanıcı testleri
4. **Production**: Canlıya alma
5. **Monitoring**: Sürekli izleme ve iyileştirme

---

**Test Başlangıç Tarihi:** [DOLDURULACAK]  
**Test Bitiş Tarihi:** [DOLDURULACAK]  
**Test Durumu:** ⏸️ Hazır - Başlatılmayı Bekliyor
