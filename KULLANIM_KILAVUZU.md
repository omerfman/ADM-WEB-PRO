# 📚 ADM Web Pro - Kullanım Kılavuzu

## 🎯 Sistem Genel Bakış

ADM Web Pro, inşaat projelerinin tüm süreçlerini dijital ortamda yönetmek için geliştirilmiş eksiksiz bir iş akış sistemidir. Sistem, **6 ana aşama** ve **6 destek modülü** ile çalışır.

---

## 🔄 İş Akış Süreci (Workflow)

### **Aşama 1: Keşif** 🔍
**Amaç:** Projenin ön maliyet tahmini ve iş kalemleri listesi
**Sorumlular:** Keşif Uzmanı, Proje Müdürü

#### Yapılacaklar:
1. Yeni proje oluştur (Projeler sayfası)
2. Keşif sayfasına git
3. İş kalemlerini ekle:
   - İş kalemi adı (örn: "Temel Kazısı")
   - Kategori (Hafriyat, Beton, Demir, vb.)
   - Birim (m², m³, Adet, vb.)
   - Tahmini miktar
   - Tahmini birim fiyat
   - Risk seviyesi (Düşük/Orta/Yüksek)
   - Açıklama
4. Keşif notlarını yaz
5. Kar marjını belirle (%20 varsayılan)

#### Çıktılar:
- Toplam maliyet tahmini
- İş kalemleri listesi
- Risk analizi

---

### **Aşama 2: Teklif** 💼
**Amaç:** Müşteriye sunulacak resmi teklif hazırlama
**Sorumlular:** Satış Müdürü, Muhasebe

#### Yapılacaklar:
1. Keşif sayfasında "Teklife Dönüştür" butonuna tıkla
   - ✅ Keşif kalemleri otomatik olarak teklife aktarılır
2. Teklif sayfasında:
   - Teklif başlığını düzenle
   - Geçerlilik süresini belirle
   - Ödeme koşullarını yaz
   - Gerekirse fiyatları güncelle
   - Ek maddeler ekle
3. İndirim uygula (gerekirse)
4. KDV oranını ayarla
5. Teklifi PDF olarak indir veya gönder

#### Veri Akışı:
```
Keşif Kalemleri → Teklif Kalemleri
Keşif Tutarı → Teklif Tutarı (+ Kar Marjı)
```

---

### **Aşama 3: Sözleşme** 📄
**Amaç:** Müşteri ile yasal bağlayıcı sözleşme oluşturma
**Sorumlular:** Hukuk, Proje Müdürü, Müşteri

#### Yapılacaklar:
1. Teklif onaylandıktan sonra Sözleşme sayfasına git
2. "Tekliften Oluştur" ile teklif verilerini aktar
3. Sözleşme detaylarını doldur:
   - Müşteri bilgileri
   - Proje adresi
   - Başlangıç-bitiş tarihleri
   - Toplam sözleşme bedeli
   - Ödeme planı
   - Ceza maddeleri
   - Özel şartlar
4. Ekleri yükle (imzalı belgeler, teknik şartname)
5. Her iki taraf imzaladıktan sonra "Onaylandı" işaretle

#### Veri Akışı:
```
Teklif Tutarı → Sözleşme Bedeli
Teklif Kalemleri → Sözleşme Kapsamı
```

---

### **Aşama 4: Metraj (BOQ)** 📐
**Amaç:** Gerçek yapım miktarlarının detaylı hesaplanması
**Sorumlular:** Şantiye Şefi, Metraj Mühendisi

#### Yapılacaklar:
1. Metraj sayfasında "Sözleşmeden Yükle" butonuna tıkla
   - ✅ Sözleşme kalemleri otomatik olarak metraj listesine aktarılır
2. Her iş kalemi için gerçek ölçümleri gir:
   - Metrekare işlerde: En × Boy otomatik hesaplanır
   - Miktar doğrulama
   - Açıklama ekle (hangi bölüm, hangi kat)
3. İlerleme yüzdesini güncelle
4. Fotoğraflar ekle (opsiyonel)

#### Veri Akışı:
```
Sözleşme Kalemleri → Metraj Kalemleri
Tahmini Miktar → Gerçek Ölçüm
```

#### Önemli:
- Metraj verileri **Hakediş** hesaplamasının temelidir
- Her kalem için detaylı ölçüm notları tutulmalı

---

### **Aşama 5: Hakediş** 💰
**Amaç:** Yapılan işin aylık hakediş tutarının hesaplanması
**Sorumlular:** Muhasebe, Proje Müdürü

#### Yapılacaklar:
1. Hakediş sayfasında yeni hakediş dönemi oluştur (Ocak, Şubat, vb.)
2. Her iş kalemi için:
   - Bir önceki hakedişteki miktar (otomatik gelir)
   - Bu ayki yapılan miktar
   - Toplam miktar (otomatik hesaplanır)
   - İlerleme yüzdesi
3. Sistem otomatik hesaplar:
   - Bu ayki tutar = (Bu ayki miktar × Birim fiyat)
   - Kümülatif toplam
   - Sözleşmeye göre yüzde
4. Kesintileri ekle:
   - Vergi kesintisi
   - Stopaj
   - Gecikme cezası
5. Hakediş raporunu oluştur ve onayla

#### Veri Akışı:
```
Metraj Miktarları → Hakediş Miktarları
Sözleşme Fiyatları → Hakediş Tutarları
Önceki Hakediş → Kümülatif Toplam
```

#### Formül:
```
Bu Ayki Tutar = (Bu Ay Miktar) × (Birim Fiyat)
Net Hakediş = Brüt Tutar - Kesintiler
```

---

### **Aşama 6: Ödeme Takibi** 💳
**Amaç:** Müşteri ödemelerinin ve masrafların takibi
**Sorumlular:** Muhasebe, Mali İşler

#### Yapılacaklar:
1. Hakediş onaylandıktan sonra Ödeme Takibi sayfasına git
2. **Gelen Ödemeler:**
   - Hakediş tutarını fatura kes
   - Fatura bilgilerini kaydet
   - Ödeme yapıldığında kaydet (tarih, tutar, ödeme yöntemi)
3. **Giden Ödemeler:**
   - Taşeron ödemeleri
   - Malzeme alımları
   - İşçi maaşları
   - Diğer masraflar
4. Nakit akışını kontrol et:
   - Toplam gelir
   - Toplam gider
   - Net bakiye
   - Ödeme bekleyenler

#### Veri Akışı:
```
Hakediş Tutarı → Beklenen Gelir
Gerçek Ödemeler → Gelir Kayıtları
Masraflar → Gider Kayıtları
```

---

## 🛠️ Destek Modülleri

### **1. Şantiye Günlüğü** 📔
- Günlük aktiviteler
- Hava durumu
- Çalışan sayısı
- Olaylar ve notlar
- Fotoğraf ekleme

### **2. Stok Yönetimi** 📦
- Malzeme girişi
- Malzeme çıkışı
- Stok seviyeleri
- Minimum stok uyarıları
- Tedarikçi bilgileri

### **3. Bütçe Yönetimi** 💵
- Bütçe planlama
- Gerçekleşen harcamalar
- Bütçe karşılaştırma
- Varyans analizi
- Maliyet tahminleri

### **4. Proje Özeti** 📊
- Genel durum
- Finansal özet
- İlerleme grafikleri
- Risk göstergeleri
- KPI'lar

### **5. Müşteri Yetkileri** 👥
- Müşteri erişim yönetimi
- Görüntüleme izinleri
- Bildirim ayarları
- Rapor paylaşımı

---

## 📖 Örnek Kullanım Hikayesi

### **Proje: Villa İnşaatı - "Deniz Manzaralı Villa"**

**Proje Bilgileri:**
- Müşteri: Ahmet Yılmaz
- Lokasyon: Bodrum, Muğla
- Brüt Alan: 250 m²
- Başlangıç: 15 Mart 2024
- Tahmini Süre: 12 ay

---

#### **1. Hafta - Keşif Aşaması (15-20 Mart)**

Proje Müdürü Mehmet Bey, sahayı inceleyerek keşif çalışmasına başladı.

**Keşif sayfasında eklenen kalemler:**

| İş Kalemi | Kategori | Birim | Miktar | Birim Fiyat | Risk | Toplam |
|-----------|----------|-------|--------|-------------|------|--------|
| Temel Kazısı | Hafriyat | m³ | 180 | 45 ₺ | Orta | 8,100 ₺ |
| Temel Betonu C25 | Beton | m³ | 42 | 850 ₺ | Yüksek | 35,700 ₺ |
| Demir Donatı | Demir | Kg | 8,500 | 18 ₺ | Orta | 153,000 ₺ |
| Duvar Örme | Duvar | m² | 420 | 95 ₺ | Düşük | 39,900 ₺ |
| İç Sıva | Sıva | m² | 680 | 35 ₺ | Düşük | 23,800 ₺ |
| Elektrik Tesisatı | Elektrik | Adet | 1 | 28,000 ₺ | Yüksek | 28,000 ₺ |
| Sıhhi Tesisat | Tesisat | Adet | 1 | 32,000 ₺ | Yüksek | 32,000 ₺ |
| Seramik Kaplama | Kaplama | m² | 245 | 120 ₺ | Düşük | 29,400 ₺ |

**Keşif Özeti:**
- Toplam Maliyet: **349,900 ₺**
- Kar Marjı: **%25**
- Teklif Tutarı: **437,375 ₺**

Mehmet Bey notlara ekledi: *"Eğimli arazi, ekstra hafriyat gerekebilir. Elektrik ve tesisat için deneyimli ekip şart. Kışın yağmur riski nedeniyle beton işleri erken tamamlanmalı."*

---

#### **2. Hafta - Teklif Hazırlama (21-25 Mart)**

Satış Müdürü Ayşe Hanım, keşif verisini teklife dönüştürdü.

**Teklif Sayfasında:**
1. "Keşiften Teklif Oluştur" butonuna tıkladı
2. ✅ Tüm kalemler otomatik yüklendi
3. Düzenlemeler:
   - Geçerlilik süresi: 30 gün
   - Ödeme planı: %30 Avans, %40 Kaba İnşaat, %30 Teslim
   - İndirim: %5 (müşteri sadakat indirimi)
   - Son Teklif: **415,506 ₺ + KDV**

4. PDF olarak indirip müşteriye e-posta ile gönderdi.

**Müşteri Ahmet Bey, 28 Mart'ta teklifi onayladı!** ✅

---

#### **3. Hafta - Sözleşme (29 Mart - 5 Nisan)**

Hukuk müşaviri Zeynep Hanım sözleşmeyi hazırladı.

**Sözleşme Sayfasında:**
- Müşteri: Ahmet Yılmaz (TC: 12345678901)
- Adres: Gümbet Mah. Deniz Sok. No:15, Bodrum
- Başlangıç: 15 Nisan 2024
- Bitiş: 15 Nisan 2025
- Toplam Bedel: **415,506 ₺ + KDV = 489,246 ₺**

**Ödeme Planı:**
- Avans (%30): **146,774 ₺** - 15 Nisan
- Kaba İnşaat Hakedişi (%40): **195,698 ₺** - Ağustos
- Teslim (%30): **146,774 ₺** - Nisan 2025

**Özel Şartlar:**
- Her gün 1 saatlik gecikme: 500 ₺ ceza
- Müşteri değişiklik talebi: Ek maliyet faturalandırılır
- Malzeme kabulleri fotoğrafla belgelenecek

5 Nisan'da her iki taraf imzaladı. ✍️

---

#### **4-8. Ay - Metraj ve İnşaat (15 Nisan - 15 Ağustos)**

Şantiye Şefi Ali Bey, inşaata başladı.

**Metraj Sayfasında:**
1. "Sözleşmeden Yükle" ile tüm kalemleri yükledi
2. Her hafta gerçek ölçümleri güncelledi

**15 Mayıs - Temel Tamamlandı:**
- Temel Kazısı: 180 m³ → Gerçek: **195 m³** (arazi eğimi nedeniyle fazla)
- Temel Betonu: 42 m³ → Gerçek: **42 m³** ✅
- Demir Donatı: 8,500 kg → Kullanılan: **8,200 kg** (tasarruf)

**15 Ağustos - Kaba İnşaat Tamamlandı:**
- Duvar Örme: 420 m² → Gerçek: **425 m²** (ek bölme)
- İç Sıva: Henüz başlanmadı
- Elektrik: %60 tamamlandı
- Tesisat: %70 tamamlandı

Ali Bey her gün **Şantiye Günlüğü**'ne not düştü:
- "18 Mayıs - Yağmur, çalışma yok"
- "5 Haziran - Müşteri mutfak planını değiştirmek istedi"
- "20 Temmuz - Elektrikçi ekip 5 kişi, tesisat ekip 3 kişi"

---

#### **9. Ay - İlk Hakediş (Ağustos)**

Muhasebe Müdürü Fatma Hanım, hakediş hazırladı.

**Hakediş Sayfasında:**
- Dönem: **Ağustos 2024**
- Kaba İnşaat Tamamlandı

**Hakediş Detayı:**

| Kalem | Sözleşme Miktarı | Bu Ay Yapılan | Birim Fiyat | Bu Ay Tutarı |
|-------|------------------|---------------|-------------|--------------|
| Temel Kazısı | 180 m³ | 195 m³ | 45 ₺ | 8,775 ₺ |
| Temel Betonu | 42 m³ | 42 m³ | 850 ₺ | 35,700 ₺ |
| Demir Donatı | 8,500 kg | 8,200 kg | 18 ₺ | 147,600 ₺ |
| Duvar Örme | 420 m² | 425 m² | 95 ₺ | 40,375 ₺ |
| Elektrik | 1 Adet | 0.60 Adet | 28,000 ₺ | 16,800 ₺ |
| Tesisat | 1 Adet | 0.70 Adet | 32,000 ₺ | 22,400 ₺ |

**Hakediş Özeti:**
- Brüt Tutar: **271,650 ₺**
- Stopaj (%3): **-8,150 ₺**
- **Net Hakediş: 263,500 ₺**

Sözleşmeye göre ilerleme: **%64** ✅ (Hedef: %40 - İleriden gidiyoruz!)

---

#### **Ödeme Takibi (Ağustos - Eylül)**

**Ödeme Takibi Sayfasında:**

**GELEN ÖDEMELER:**
- 15 Nisan: Avans **146,774 ₺** ✅ (Banka Havalesi)
- 5 Eylül: Ağustos Hakedişi **263,500 ₺** ✅ (Çek)

**GİDEN ÖDEMELER:**
- Haziran: Demir Alımı **155,000 ₺**
- Temmuz: Tuğla & Beton **87,500 ₺**
- Ağustos: İşçi Maaşları **62,000 ₺**
- Ağustos: Elektrik Malzemesi **18,500 ₺**
- Ağustos: Tesisat Malzemesi **24,000 ₺**

**NAKİT AKIŞI:**
- Toplam Gelen: **410,274 ₺**
- Toplam Giden: **347,000 ₺**
- **Kalan: 63,274 ₺** ✅

**Bütçe Yönetimi** modülünde Fatma Hanım kontrol etti:
- Planlanan harcama: 349,900 ₺
- Gerçekleşen: 347,000 ₺
- **Tasarruf: 2,900 ₺** 🎉

---

#### **12. Ay - Proje Tamamlandı (15 Nisan 2025)**

**Metraj Sayfası - Final:**
- Tüm kalemler %100 tamamlandı
- İç Sıva: 680 m² → **685 m²** (ek alan)
- Seramik: 245 m² → **248 m²**

**Ödeme Takibi:**
- Toplam Gelir: **489,246 ₺** (KDV Dahil)
- Toplam Gider: **412,000 ₺**
- **Net Kar: 77,246 ₺** (%18.7 kar marjı) 🎊

**Müşteri Memnuniyeti:**
Ahmet Bey, **Müşteri Yetkileri** modülünden tüm süreci takip etti:
- Anlık hakediş raporları
- Şantiye fotoğrafları
- Günlük aktiviteler
- Ödeme durumu

Proje 2 gün önce teslim edildi! Ahmet Bey 5 yıldız verdi. ⭐⭐⭐⭐⭐

---

## 🔗 Veri Akış Özeti

```
┌─────────────────────────────────────────────────────────┐
│                    PROJE BAŞLANGICI                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  1. KEŞİF                                                │
│  - İş kalemleri listesi                                  │
│  - Tahmini miktarlar                                     │
│  - Tahmini fiyatlar                                      │
│  - Risk analizi                                          │
│  → Çıktı: Toplam maliyet tahmini                        │
└─────────────────────────────────────────────────────────┘
                            ↓
              [Keşif → Teklif Dönüşümü]
                            ↓
┌─────────────────────────────────────────────────────────┐
│  2. TEKLİF                                               │
│  - Keşif verileri + Kar marjı                           │
│  - Geçerlilik süresi                                     │
│  - Ödeme koşulları                                       │
│  - İndirimler                                            │
│  → Çıktı: Müşteriye teklif belgesi                      │
└─────────────────────────────────────────────────────────┘
                            ↓
         [Teklif Onayı → Sözleşme Oluşturma]
                            ↓
┌─────────────────────────────────────────────────────────┐
│  3. SÖZLEŞME                                             │
│  - Teklif verileri → Sözleşme bedeli                    │
│  - Yasal şartlar                                         │
│  - Ödeme planı                                           │
│  - Teslim tarihleri                                      │
│  → Çıktı: İmzalı sözleşme                               │
└─────────────────────────────────────────────────────────┘
                            ↓
         [Sözleşme → Metraj Başlangıç Verileri]
                            ↓
┌─────────────────────────────────────────────────────────┐
│  4. METRAJ (BOQ)                                         │
│  - Sözleşme kalemleri → Metraj listesi                  │
│  - Gerçek ölçümler                                       │
│  - Detaylı hesaplamalar                                  │
│  - İlerleme takibi                                       │
│  → Çıktı: Gerçek yapım miktarları                       │
└─────────────────────────────────────────────────────────┘
                            ↓
           [Metraj Verileri → Hakediş Hesabı]
                            ↓
┌─────────────────────────────────────────────────────────┐
│  5. HAKEDİŞ                                              │
│  - Metraj miktarları × Sözleşme fiyatları               │
│  - Dönemsel ilerleme                                     │
│  - Kümülatif toplam                                      │
│  - Kesintiler                                            │
│  → Çıktı: Aylık hakediş raporu                          │
└─────────────────────────────────────────────────────────┘
                            ↓
          [Hakediş Tutarı → Fatura & Tahsilat]
                            ↓
┌─────────────────────────────────────────────────────────┐
│  6. ÖDEME TAKİBİ                                         │
│  - Hakediş → Beklenen gelir                             │
│  - Gerçek tahsilatlar                                    │
│  - Masraflar                                             │
│  - Nakit akışı                                           │
│  → Çıktı: Finansal durum raporu                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   PROJE TAMAMLANDI                       │
│                   Kar/Zarar Analizi                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ En İyi Uygulamalar (Best Practices)

### **Keşif Aşaması:**
- ✅ Tüm iş kalemlerini detaylı listeleyin
- ✅ Risk seviyelerini gerçekçi belirleyin
- ✅ %10-15 ek maliyet payı bırakın
- ❌ Eksik kalem bırakmayın

### **Teklif Aşaması:**
- ✅ Keşif verilerini kontrol edin
- ✅ Kar marjını piyasa koşullarına göre ayarlayın
- ✅ Geçerlilik süresini net belirtin
- ❌ Gerçekçi olmayan düşük fiyat vermeyin

### **Sözleşme Aşaması:**
- ✅ Tüm şartları yazılı hale getirin
- ✅ Ödeme planını netleştirin
- ✅ Ek iş ve değişiklik prosedürlerini tanımlayın
- ❌ Belirsiz ifadeler kullanmayın

### **Metraj Aşaması:**
- ✅ Her ölçümü fotoğrafla belgeleyin
- ✅ Detaylı açıklamalar yazın (hangi bölüm, kat, vs.)
- ✅ Haftalık güncellemeler yapın
- ❌ Tahmini değerlerle metraj yapmayın

### **Hakediş Aşaması:**
- ✅ Metraj verilerini doğrulayın
- ✅ Sözleşme fiyatlarını kontrol edin
- ✅ Kesintileri unutmayın
- ❌ Tamamlanmamış işleri hakediş dahil etmeyin

### **Ödeme Takibi:**
- ✅ Her ödemeyi hemen kaydedin
- ✅ Fatura numaralarını saklayın
- ✅ Nakit akışını haftalık kontrol edin
- ❌ Belgesiz harcama yapmayın

---

## 🎓 Kullanıcı Rolleri ve Yetkileri

| Rol | Keşif | Teklif | Sözleşme | Metraj | Hakediş | Ödeme |
|-----|-------|--------|----------|--------|---------|-------|
| **Süper Admin** | ✅ Tümü | ✅ Tümü | ✅ Tümü | ✅ Tümü | ✅ Tümü | ✅ Tümü |
| **Proje Müdürü** | ✅ Ekle/Düzenle | ✅ Görüntüle | ✅ Düzenle | ✅ Tümü | ✅ Görüntüle | ✅ Görüntüle |
| **Muhasebe** | ✅ Görüntüle | ✅ Düzenle | ✅ Görüntüle | ✅ Görüntüle | ✅ Tümü | ✅ Tümü |
| **Şantiye Şefi** | ❌ Hayır | ❌ Hayır | ✅ Görüntüle | ✅ Ekle/Düzenle | ✅ Görüntüle | ❌ Hayır |
| **Müşteri** | ❌ Hayır | ✅ Görüntüle | ✅ Görüntüle | ✅ Görüntüle | ✅ Görüntüle | ✅ Görüntüle |

---

## 📞 Destek ve Sorun Giderme

### **Sık Karşılaşılan Sorunlar:**

**1. "Veri yüklenmiyor"**
- Çözüm: Sayfayı yenile (F5), internet bağlantısını kontrol et

**2. "Keşiften teklife aktarılamadı"**
- Çözüm: Keşif kalemlerinin tamamlandığından emin ol

**3. "Hakediş hesabı yanlış"**
- Çözüm: Metraj miktarlarını ve birim fiyatları kontrol et

**4. "PDF indirmiyor"**
- Çözüm: Tarayıcı ayarlarından pop-up engelleyiciyi kapat

---

## 🚀 Gelecek Özellikler (Roadmap)

- 📱 Mobil uygulama
- 🤖 Yapay zeka destekli maliyet tahmini
- 📊 Gelişmiş raporlama ve dashboard
- 🔔 Otomatik bildirimler (SMS/Email)
- 📸 OCR ile fatura okuma
- 🌍 Çoklu dil desteği

---

**Son Güncelleme:** 20 Kasım 2024  
**Versiyon:** 1.0  
**Hazırlayan:** ADM Web Pro Development Team

---

## 📧 İletişim

Sorularınız için: support@admwebpro.com  
Dokümantasyon: https://docs.admwebpro.com

---

> **Not:** Bu kılavuz, sistemin genel kullanımını açıklamaktadır. Detaylı teknik bilgi için ilgili modül dokümantasyonlarına bakınız.
