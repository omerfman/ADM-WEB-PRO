# BOQ (Bill of Quantities) Excel Template

## 📋 Excel Şablonu Formatı

### Dosya Adı
`BOQ_Template_v1.xlsx` veya `Metraj_Sablonu_v1.xlsx`

### Sheet Yapısı

#### Sheet 1: "Metraj Listesi" (BOQ Items)

| Sütun | Alan Adı | Tip | Zorunlu | Açıklama | Örnek |
|-------|----------|-----|---------|----------|-------|
| A | Poz No | Text | ✅ | Poz numarası (benzersiz) | 01.01.001 |
| B | Kategori | Text | ✅ | Ana kategori | İnşaat İşleri |
| C | Alt Kategori | Text | ❌ | Alt kategori | Kazı ve Temel |
| D | İş Tanımı | Text | ✅ | İş kalemi açıklaması | Kazı işleri - Temel kazısı |
| E | Birim | Text | ✅ | Ölçü birimi | m³ |
| F | Miktar | Number | ✅ | Toplam iş miktarı | 1500 |
| G | Birim Fiyat | Number | ✅ | Birim fiyat (TL) | 125.50 |
| H | Toplam Tutar | Formula | ❌ | =F*G (otomatik hesaplanır) | 188250 |

### 📐 Örnek Veri

```
Poz No      Kategori            Alt Kategori        İş Tanımı                                Birim   Miktar    Birim Fiyat   Toplam Tutar
01.01.001   İnşaat İşleri      Kazı ve Temel       Kazı işleri - Temel kazısı              m³      1500      125.50        188,250.00
01.01.002   İnşaat İşleri      Kazı ve Temel       Dolgu işleri - Kontrollü dolgu          m³      800       95.00         76,000.00
01.02.001   İnşaat İşleri      Beton İşleri        C25/30 beton - Temel betonu             m³      350       850.00        297,500.00
01.02.002   İnşaat İşleri      Beton İşleri        C30/37 beton - Kolon betonu             m³      120       920.00        110,400.00
02.01.001   Elektrik İşleri    Kablo Döşeme        NYY 3x2.5 kablo döşeme                   m       2500      15.50         38,750.00
02.01.002   Elektrik İşleri    Aydınlatma          LED ampul montajı                        Ad      150       85.00         12,750.00
03.01.001   Mekanik İşleri     Tesisat             Ø50 PVC boru döşeme                      m       500       22.00         11,000.00
03.01.002   Mekanik İşleri     Tesisat             Şofben montajı                           Ad      15        2,500.00      37,500.00
```

### ✅ Validasyon Kuralları

1. **Poz No**
   - Benzersiz olmalı
   - Format: XX.XX.XXX (önerilen ama zorunlu değil)
   - Boş olamaz

2. **Kategori**
   - Minimum 2 karakter
   - Maksimum 100 karakter
   - Boş olamaz

3. **İş Tanımı**
   - Minimum 5 karakter
   - Maksimum 500 karakter
   - Boş olamaz

4. **Birim**
   - Geçerli birimler: m, m², m³, Ad, Kg, Ton, Lt, Takım, Gt
   - Boş olamaz

5. **Miktar**
   - Pozitif sayı
   - Maksimum 999,999,999
   - Boş olamaz
   - Ondalık ayırıcı: . veya ,

6. **Birim Fiyat**
   - Pozitif sayı
   - Maksimum 999,999,999
   - Boş olamaz
   - Ondalık ayırıcı: . veya ,

---

## 📤 Import İşlemi

### 1. Excel Dosyası Seçimi
- Kullanıcı "Excel İçe Aktar" butonuna tıklar
- Dosya seçici açılır (.xlsx, .xls)
- Max dosya boyutu: 10MB

### 2. Parsing ve Validation
```javascript
// Frontend validation
const validUnits = ['m', 'm²', 'm³', 'Ad', 'Kg', 'Ton', 'Lt', 'Takım', 'Gt'];

function validateRow(row, rowNumber) {
  const errors = [];
  
  // Poz No
  if (!row.pozNo || row.pozNo.trim() === '') {
    errors.push(`Satır ${rowNumber}: Poz No boş olamaz`);
  }
  
  // Kategori
  if (!row.category || row.category.length < 2) {
    errors.push(`Satır ${rowNumber}: Kategori en az 2 karakter olmalı`);
  }
  
  // İş Tanımı
  if (!row.description || row.description.length < 5) {
    errors.push(`Satır ${rowNumber}: İş tanımı en az 5 karakter olmalı`);
  }
  
  // Birim
  if (!row.unit || !validUnits.includes(row.unit)) {
    errors.push(`Satır ${rowNumber}: Geçersiz birim (${validUnits.join(', ')})`);
  }
  
  // Miktar
  if (!row.quantity || row.quantity <= 0) {
    errors.push(`Satır ${rowNumber}: Miktar pozitif bir sayı olmalı`);
  }
  
  // Birim Fiyat
  if (!row.unitPrice || row.unitPrice <= 0) {
    errors.push(`Satır ${rowNumber}: Birim fiyat pozitif bir sayı olmalı`);
  }
  
  return errors;
}
```

### 3. Önizleme
- Import öncesi tüm satırlar tabloda gösterilir
- Hatalı satırlar kırmızı highlight
- Hata mesajları tooltip olarak gösterilir
- Kullanıcı hatalı satırları düzeltebilir veya silebilir

### 4. Import
- Geçerli satırlar Firestore'a batch write edilir
- Her batch 500 satır (Firestore limiti)
- Progress bar gösterilir
- Başarılı/hatalı satır sayıları raporlanır

---

## 📥 Export İşlemi

### Excel Export
```javascript
async function exportBoqToExcel(projectId) {
  const boqItems = await getBoqItems(projectId);
  
  const data = boqItems.map(item => ({
    'Poz No': item.pozNo,
    'Kategori': item.category,
    'Alt Kategori': item.subCategory || '',
    'İş Tanımı': item.description,
    'Birim': item.unit,
    'Miktar': item.quantity,
    'Birim Fiyat': item.unitPrice,
    'Toplam Tutar': item.totalPrice
  }));
  
  // XLSX.js kullanarak export
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Metraj Listesi');
  
  // Styling
  worksheet['!cols'] = [
    { width: 12 },  // Poz No
    { width: 20 },  // Kategori
    { width: 20 },  // Alt Kategori
    { width: 50 },  // İş Tanımı
    { width: 10 },  // Birim
    { width: 12 },  // Miktar
    { width: 15 },  // Birim Fiyat
    { width: 15 }   // Toplam Tutar
  ];
  
  // Download
  XLSX.writeFile(workbook, `BOQ_${projectId}_${Date.now()}.xlsx`);
}
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Yeni Proje - Excel Import
1. Proje oluşturulur
2. BOQ sekmesine gidilir
3. "Excel İçe Aktar" butonuna tıklanır
4. Şablon dosyası doldurulmuş Excel seçilir
5. Önizleme ekranı görülür
6. Hatalar düzeltilir
7. "İçe Aktar" butonuna basılır
8. 500 satır başarıyla eklendi mesajı alınır

### Senaryo 2: Mevcut Proje - Manuel Ekleme
1. BOQ sekmesinde "Yeni Kalem Ekle" butonuna tıklanır
2. Form doldurulur (Poz No, Kategori, İş Tanımı, Birim, Miktar, Birim Fiyat)
3. "Kaydet" butonuna basılır
4. Tablo güncellenir

### Senaryo 3: BOQ Export
1. BOQ sekmesinde "Excel İndir" butonuna tıklanır
2. Dosya otomatik indirilir
3. Muhasebe departmanına gönderilir

---

## 📊 Template Dosyası İçeriği

Template dosyası aşağıdaki özellikleri içerir:

1. **Başlık Satırı**: Renkli, kalın yazı
2. **Örnek Veri**: 3-5 satır örnek
3. **Veri Validasyonu**: Birim sütununda dropdown
4. **Formüller**: Toplam Tutar sütunu otomatik hesaplanır
5. **Açıklamalar**: Ayrı bir "Kullanım Kılavuzu" sheet'i
6. **Özet**: Toplam tutar, toplam kalem sayısı

---

**Sonraki Adım:** BOQ JavaScript modülü oluşturma (`web/js/boq.js`)
