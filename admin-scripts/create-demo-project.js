#!/usr/bin/env node

/**
 * Create Complete Demo Project - "Deniz Manzaralı Villa"
 * 
 * Bu script, Kullanım Kılavuzu'nda bahsedilen örnek projeyi
 * tüm aşamalarıyla birlikte Firestore'a ekler.
 * 
 * Şirket: Yılmaz İnşaat Ltd. Şti.
 * Proje: Deniz Manzaralı Villa (Bodrum)
 * Müşteri: Ahmet Yılmaz
 * Durum: Tamamlanmış (Tüm aşamalar işlenmiş)
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let serviceAccountKey = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT_KEY from .env');
  }
}

if (!serviceAccountKey) {
  try {
    const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      serviceAccountKey = require(keyPath);
      console.log('✅ Loaded serviceAccountKey.json from file');
    }
  } catch (e) {
    console.error('❌ Could not load serviceAccountKey.json:', e.message);
  }
}

if (!serviceAccountKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

const db = admin.firestore();

async function createDemoProject() {
  try {
    console.log('\n🏗️  DEMO PROJE OLUŞTURULUYOR: Deniz Manzaralı Villa\n');
    console.log('=' .repeat(60));

    // ========================================================================
    // 1. ŞİRKET OLUŞTUR
    // ========================================================================
    console.log('\n📋 1. ŞİRKET BİLGİLERİ OLUŞTURULUYOR...\n');
    
    const companyId = 'yilmaz-insaat';
    const companyRef = db.collection('companies').doc(companyId);
    
    await companyRef.set({
      id: companyId,
      name: 'Yılmaz İnşaat Ltd. Şti.',
      description: 'Bodrum bölgesinde 15 yıldır hizmet veren inşaat firması',
      taxNumber: '1234567890',
      email: 'info@yilmazinsaat.com',
      phone: '+90 252 123 45 67',
      address: {
        street: 'Gümbet Mahallesi, İnşaat Caddesi No:42',
        city: 'Bodrum',
        state: 'Muğla',
        postal: '48400',
        country: 'Türkiye',
      },
      website: 'www.yilmazinsaat.com',
      logo: 'https://i.ibb.co/placeholder-logo.png',
      foundedYear: 2010,
      employeeCount: 45,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    
    console.log('   ✅ Şirket: Yılmaz İnşaat Ltd. Şti.');
    console.log('   📍 Lokasyon: Bodrum, Muğla');
    console.log('   📞 Telefon: +90 252 123 45 67\n');

    // ========================================================================
    // 2. PROJE OLUŞTUR
    // ========================================================================
    console.log('📋 2. PROJE BİLGİLERİ OLUŞTURULUYOR...\n');
    
    const projectId = 'deniz-manzarali-villa';
    const projectRef = db.collection('projects').doc(projectId);
    
    await projectRef.set({
      id: projectId,
      companyId: companyId,
      name: 'Deniz Manzaralı Villa',
      description: 'Bodrum\'da deniz manzaralı lüks villa inşaatı. 250 m² brüt alan, modern tasarım.',
      client: {
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@example.com',
        phone: '+90 532 111 22 33',
        tcNo: '12345678901',
        address: 'İstanbul',
      },
      location: 'Gümbet Mahallesi, Deniz Sokak No:15, Bodrum, Muğla',
      coordinates: {
        latitude: 37.0333,
        longitude: 27.4289,
      },
      area: {
        gross: 250,
        net: 220,
        plot: 450,
        unit: 'm²',
      },
      status: 'completed',
      startDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
      plannedEndDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-15')),
      actualEndDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      budget: {
        estimated: 437375,
        contract: 489246,
        actual: 412000,
        currency: 'TRY',
      },
      progress: 100,
      tags: ['villa', 'residential', 'luxury', 'completed'],
      team: {
        projectManager: 'Mehmet Demir',
        siteManager: 'Ali Kaya',
        accountant: 'Fatma Şahin',
      },
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-15')),
      updatedAt: admin.firestore.Timestamp.now(),
      createdBy: 'mehmet.demir@yilmazinsaat.com',
    });
    
    console.log('   ✅ Proje: Deniz Manzaralı Villa');
    console.log('   👤 Müşteri: Ahmet Yılmaz');
    console.log('   📐 Alan: 250 m² (Brüt)');
    console.log('   📅 Başlangıç: 15 Nisan 2024');
    console.log('   ✅ Tamamlanma: 13 Nisan 2025 (2 gün erken!)');
    console.log('   💰 Sözleşme Bedeli: 489,246 ₺\n');

    // ========================================================================
    // 3. KEŞİF VERİLERİ
    // ========================================================================
    console.log('📋 3. KEŞİF VERİLERİ EKLENIYOR...\n');
    
    const kesifItems = [
      {
        projectId: projectId,
        name: 'Temel Kazısı',
        description: 'Eğimli arazide temel kazı işleri',
        category: 'earthwork',
        unit: 'm³',
        quantity: 180,
        unitPrice: 45,
        riskLevel: 'medium',
        order: 0,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Temel Betonu C25',
        description: 'Hazır beton dökümü, vibrasyon dahil',
        category: 'concrete',
        unit: 'm³',
        quantity: 42,
        unitPrice: 850,
        riskLevel: 'high',
        order: 1,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Demir Donatı',
        description: 'Nervürlü demir, kesim büküm montaj',
        category: 'steel',
        unit: 'Kg',
        quantity: 8500,
        unitPrice: 18,
        riskLevel: 'medium',
        order: 2,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Duvar Örme',
        description: 'Briket duvar örme işleri',
        category: 'masonry',
        unit: 'm²',
        quantity: 420,
        unitPrice: 95,
        riskLevel: 'low',
        order: 3,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'İç Sıva',
        description: 'Alçı sıva uygulaması',
        category: 'plaster',
        unit: 'm²',
        quantity: 680,
        unitPrice: 35,
        riskLevel: 'low',
        order: 4,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Elektrik Tesisatı',
        description: 'Komple elektrik tesisatı, malzeme dahil',
        category: 'electrical',
        unit: 'Adet',
        quantity: 1,
        unitPrice: 28000,
        riskLevel: 'high',
        order: 5,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Sıhhi Tesisat',
        description: 'Su tesisatı ve kanalizasyon',
        category: 'plumbing',
        unit: 'Adet',
        quantity: 1,
        unitPrice: 32000,
        riskLevel: 'high',
        order: 6,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
      {
        projectId: projectId,
        name: 'Seramik Kaplama',
        description: 'İthal seramik kaplama işçilik',
        category: 'finishing',
        unit: 'm²',
        quantity: 245,
        unitPrice: 120,
        riskLevel: 'low',
        order: 7,
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      },
    ];

    for (const item of kesifItems) {
      await db.collection('kesif_items').add(item);
    }

    // Keşif metadata
    await db.collection('kesif_metadata').doc(projectId).set({
      projectId: projectId,
      profitMargin: 0.25,
      notes: 'Eğimli arazi, ekstra hafriyat gerekebilir. Elektrik ve tesisat için deneyimli ekip şart. Kışın yağmur riski nedeniyle beton işleri erken tamamlanmalı.',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-18')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-20')),
    });

    console.log('   ✅ 8 Keşif Kalemi Eklendi');
    console.log('   💰 Tahmini Maliyet: 349,900 ₺');
    console.log('   📈 Kar Marjı: %25');
    console.log('   💵 Teklif Tutarı: 437,375 ₺\n');

    // ========================================================================
    // 4. TEKLİF VERİLERİ
    // ========================================================================
    console.log('📋 4. TEKLİF VERİLERİ EKLENIYOR...\n');

    const teklifItems = kesifItems.map((item, index) => ({
      ...item,
      order: index,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-21')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-25')),
    }));

    for (const item of teklifItems) {
      await db.collection('teklif_items').add(item);
    }

    await db.collection('teklif_metadata').doc(projectId).set({
      projectId: projectId,
      proposalNumber: 'TKL-2024-001',
      validUntil: admin.firestore.Timestamp.fromDate(new Date('2024-04-25')),
      paymentTerms: '%30 Avans, %40 Kaba İnşaat Tamamlanınca, %30 Teslimde',
      discount: 0.05,
      taxRate: 0.18,
      notes: 'Teklif fiyatlarımız KDV hariçtir. Geçerlilik süresi 30 gündür.',
      status: 'accepted',
      acceptedDate: admin.firestore.Timestamp.fromDate(new Date('2024-03-28')),
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-21')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-28')),
    });

    console.log('   ✅ Teklif Hazırlandı');
    console.log('   📄 Teklif No: TKL-2024-001');
    console.log('   🎯 İndirim: %5');
    console.log('   💰 Net Tutar: 415,506 ₺');
    console.log('   💵 KDV Dahil: 489,246 ₺');
    console.log('   ✅ Müşteri Onayı: 28 Mart 2024\n');

    // ========================================================================
    // 5. SÖZLEŞME VERİLERİ
    // ========================================================================
    console.log('📋 5. SÖZLEŞME VERİLERİ EKLENIYOR...\n');

    await db.collection('sozlesme_metadata').doc(projectId).set({
      projectId: projectId,
      contractNumber: 'SZL-2024-001',
      contractDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-05')),
      contractAmount: 489246,
      currency: 'TRY',
      paymentPlan: [
        {
          name: 'Avans',
          percentage: 30,
          amount: 146774,
          dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
          status: 'paid',
          paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
        },
        {
          name: 'Kaba İnşaat Hakedişi',
          percentage: 40,
          amount: 195698,
          dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-08-15')),
          status: 'paid',
          paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-09-05')),
        },
        {
          name: 'Teslim Ödemesi',
          percentage: 30,
          amount: 146774,
          dueDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-15')),
          status: 'paid',
          paidDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
        },
      ],
      penalties: {
        delayPenalty: 500,
        delayPenaltyUnit: 'per_day',
        description: 'Her gün gecikmede 500 TL ceza uygulanır',
      },
      specialTerms: [
        'Malzeme kabulleri fotoğrafla belgelenecektir',
        'Müşteri değişiklik talepleri ek ücrete tabidir',
        'Hava koşulları nedeniyle gecikmelerde ceza uygulanmaz',
      ],
      signatures: [
        {
          party: 'contractor',
          name: 'Yılmaz İnşaat Ltd. Şti.',
          representative: 'Mehmet Demir',
          signedDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-05')),
        },
        {
          party: 'client',
          name: 'Ahmet Yılmaz',
          signedDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-05')),
        },
      ],
      status: 'completed',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-03-29')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
    });

    console.log('   ✅ Sözleşme İmzalandı');
    console.log('   📄 Sözleşme No: SZL-2024-001');
    console.log('   📅 Sözleşme Tarihi: 5 Nisan 2024');
    console.log('   💰 Toplam Bedel: 489,246 ₺');
    console.log('   💳 Ödeme Planı: 3 Taksit\n');

    // ========================================================================
    // 6. METRAJ VERİLERİ (Gerçek Ölçümler)
    // ========================================================================
    console.log('📋 6. METRAJ VERİLERİ EKLENIYOR...\n');

    const metrajItems = [
      {
        projectId: projectId,
        name: 'Temel Kazısı',
        description: 'Arazi eğimi nedeniyle tahminden fazla',
        category: 'earthwork',
        unit: 'm³',
        quantity: 195, // Gerçek miktar
        unitPrice: 45,
        order: 0,
        width: null,
        height: null,
        progress: 100,
        location: 'Tüm temel alanı',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-04-20')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-05-15')),
      },
      {
        projectId: projectId,
        name: 'Temel Betonu C25',
        description: 'Plana uygun',
        category: 'concrete',
        unit: 'm³',
        quantity: 42,
        unitPrice: 850,
        order: 1,
        width: null,
        height: null,
        progress: 100,
        location: 'Temel döşeme',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-04-20')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-05-15')),
      },
      {
        projectId: projectId,
        name: 'Demir Donatı',
        description: 'Tasarruf sağlandı',
        category: 'steel',
        unit: 'Kg',
        quantity: 8200, // Tasarruf
        unitPrice: 18,
        order: 2,
        width: null,
        height: null,
        progress: 100,
        location: 'Temel ve kolon',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-04-20')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-06-10')),
      },
      {
        projectId: projectId,
        name: 'Duvar Örme',
        description: 'Ek bölme duvarı eklendi',
        category: 'masonry',
        unit: 'm²',
        quantity: 425,
        unitPrice: 95,
        order: 3,
        width: 25.5,
        height: 16.7,
        progress: 100,
        location: 'Tüm iç duvarlar',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-05-01')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-15')),
      },
      {
        projectId: projectId,
        name: 'İç Sıva',
        description: 'Ek alan nedeniyle fazla',
        category: 'plaster',
        unit: 'm²',
        quantity: 685,
        unitPrice: 35,
        order: 4,
        width: 45,
        height: 15.2,
        progress: 100,
        location: 'İç mekan duvarlar',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-20')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-11-30')),
      },
      {
        projectId: projectId,
        name: 'Elektrik Tesisatı',
        description: 'Tamamlandı',
        category: 'electrical',
        unit: 'Adet',
        quantity: 1,
        unitPrice: 28000,
        order: 5,
        width: null,
        height: null,
        progress: 100,
        location: 'Tüm bina',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-01')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-15')),
      },
      {
        projectId: projectId,
        name: 'Sıhhi Tesisat',
        description: 'Tamamlandı',
        category: 'plumbing',
        unit: 'Adet',
        quantity: 1,
        unitPrice: 32000,
        order: 6,
        width: null,
        height: null,
        progress: 100,
        location: 'Tüm bina',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-01')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-20')),
      },
      {
        projectId: projectId,
        name: 'Seramik Kaplama',
        description: 'Küçük ek alan',
        category: 'finishing',
        unit: 'm²',
        quantity: 248,
        unitPrice: 120,
        order: 7,
        width: 15.5,
        height: 16,
        progress: 100,
        location: 'Banyolar ve mutfak',
        isDeleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-10')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-03-20')),
      },
    ];

    for (const item of metrajItems) {
      await db.collection('boq_items').add(item);
    }

    console.log('   ✅ Metraj Kalemleri Eklendi');
    console.log('   📏 Gerçek Ölçümler Kaydedildi');
    console.log('   📊 İlerleme: %100 (Tamamlandı)\n');

    // ========================================================================
    // 7. HAKEDİŞ VERİLERİ
    // ========================================================================
    console.log('📋 7. HAKEDİŞ VERİLERİ EKLENIYOR...\n');

    // Ağustos Hakedişi
    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Temel Kazısı',
      category: 'earthwork',
      unit: 'm³',
      contractQuantity: 180,
      previousQuantity: 0,
      currentQuantity: 195,
      totalQuantity: 195,
      unitPrice: 45,
      previousAmount: 0,
      currentAmount: 8775,
      totalAmount: 8775,
      progress: 100,
      order: 0,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Temel Betonu C25',
      category: 'concrete',
      unit: 'm³',
      contractQuantity: 42,
      previousQuantity: 0,
      currentQuantity: 42,
      totalQuantity: 42,
      unitPrice: 850,
      previousAmount: 0,
      currentAmount: 35700,
      totalAmount: 35700,
      progress: 100,
      order: 1,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Demir Donatı',
      category: 'steel',
      unit: 'Kg',
      contractQuantity: 8500,
      previousQuantity: 0,
      currentQuantity: 8200,
      totalQuantity: 8200,
      unitPrice: 18,
      previousAmount: 0,
      currentAmount: 147600,
      totalAmount: 147600,
      progress: 96.5,
      order: 2,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Duvar Örme',
      category: 'masonry',
      unit: 'm²',
      contractQuantity: 420,
      previousQuantity: 0,
      currentQuantity: 425,
      totalQuantity: 425,
      unitPrice: 95,
      previousAmount: 0,
      currentAmount: 40375,
      totalAmount: 40375,
      progress: 101.2,
      order: 3,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Elektrik Tesisatı',
      category: 'electrical',
      unit: 'Adet',
      contractQuantity: 1,
      previousQuantity: 0,
      currentQuantity: 0.6,
      totalQuantity: 0.6,
      unitPrice: 28000,
      previousAmount: 0,
      currentAmount: 16800,
      totalAmount: 16800,
      progress: 60,
      order: 4,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_items').add({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024',
      itemName: 'Sıhhi Tesisat',
      category: 'plumbing',
      unit: 'Adet',
      contractQuantity: 1,
      previousQuantity: 0,
      currentQuantity: 0.7,
      totalQuantity: 0.7,
      unitPrice: 32000,
      previousAmount: 0,
      currentAmount: 22400,
      totalAmount: 22400,
      progress: 70,
      order: 5,
      isDeleted: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
    });

    await db.collection('hakedis_metadata').doc(`${projectId}-2024-08`).set({
      projectId: projectId,
      period: '2024-08',
      periodName: 'Ağustos 2024 - Kaba İnşaat',
      grossAmount: 271650,
      deductions: {
        tax: 8150,
        other: 0,
      },
      netAmount: 263500,
      status: 'approved',
      approvedDate: admin.firestore.Timestamp.fromDate(new Date('2024-09-01')),
      notes: 'Kaba inşaat tamamlandı. Hedefin üzerinde ilerleme var.',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-09-01')),
    });

    console.log('   ✅ Ağustos 2024 Hakedişi');
    console.log('   💰 Brüt Tutar: 271,650 ₺');
    console.log('   💳 Net Hakediş: 263,500 ₺');
    console.log('   📊 İlerleme: %64\n');

    // ========================================================================
    // 8. ÖDEME TAKİBİ
    // ========================================================================
    console.log('📋 8. ÖDEME TAKİBİ VERİLERİ EKLENIYOR...\n');

    // Gelen Ödemeler
    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'income',
      category: 'advance',
      description: 'Avans Ödemesi (%30)',
      amount: 146774,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'INV-2024-001',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
      paidBy: 'Ahmet Yılmaz',
      notes: 'Sözleşme avansı',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-04-15')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'income',
      category: 'progress_payment',
      description: 'Ağustos Hakedişi',
      amount: 263500,
      currency: 'TRY',
      paymentMethod: 'check',
      status: 'completed',
      invoiceNumber: 'INV-2024-002',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-09-05')),
      paidBy: 'Ahmet Yılmaz',
      notes: 'Kaba inşaat hakedişi',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-25')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-09-05')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'income',
      category: 'final_payment',
      description: 'Teslim Ödemesi (%30)',
      amount: 146774,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'INV-2025-001',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-15')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      paidBy: 'Ahmet Yılmaz',
      notes: 'Proje teslim ödemesi (2 gün erken ödendi)',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
    });

    // Giden Ödemeler
    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'material',
      description: 'Demir Alımı - Kaptan Demir',
      amount: 155000,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'EXP-2024-001',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-06-15')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-06-15')),
      supplier: 'Kaptan Demir San. Tic.',
      notes: '8200 kg demir malzeme',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-06-15')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-06-15')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'material',
      description: 'Tuğla & Beton - Bayraktar İnşaat',
      amount: 87500,
      currency: 'TRY',
      paymentMethod: 'check',
      status: 'completed',
      invoiceNumber: 'EXP-2024-002',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
      supplier: 'Bayraktar İnşaat Malz.',
      notes: 'Tuğla ve beton malzeme',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'labor',
      description: 'Ağustos Ayı İşçi Maaşları',
      amount: 62000,
      currency: 'TRY',
      paymentMethod: 'cash',
      status: 'completed',
      invoiceNumber: 'SALARY-2024-08',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-08-31')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-08-31')),
      notes: '12 işçi maaşı',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-31')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-08-31')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'subcontractor',
      description: 'Elektrik İşleri - Aydın Elektrik',
      amount: 28500,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'EXP-2024-003',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-12-15')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-12-15')),
      supplier: 'Aydın Elektrik Ltd.',
      notes: 'Komple elektrik tesisatı malzeme + işçilik',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-15')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-15')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'subcontractor',
      description: 'Tesisat İşleri - Şahin Tesisat',
      amount: 34000,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'EXP-2024-004',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-12-20')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2024-12-20')),
      supplier: 'Şahin Tesisat A.Ş.',
      notes: 'Su ve kanalizasyon tesisatı',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-20')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-20')),
    });

    await db.collection('payment_tracking').add({
      projectId: projectId,
      type: 'expense',
      category: 'material',
      description: 'Seramik Malzeme - İthal Seramik',
      amount: 45000,
      currency: 'TRY',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      invoiceNumber: 'EXP-2025-001',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2025-03-10')),
      paidDate: admin.firestore.Timestamp.fromDate(new Date('2025-03-10')),
      supplier: 'İthal Seramik Tic.',
      notes: '248 m² İtalyan seramik',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-03-10')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-03-10')),
    });

    console.log('   ✅ Gelen Ödemeler: 3 Adet');
    console.log('   💰 Toplam Gelir: 557,048 ₺');
    console.log('   ✅ Giden Ödemeler: 6 Adet');
    console.log('   💸 Toplam Gider: 412,000 ₺');
    console.log('   💵 Net Kar: 145,048 ₺ (%26.1)\n');

    // ========================================================================
    // 9. ŞANTİYE GÜNLÜĞÜ
    // ========================================================================
    console.log('📋 9. ŞANTİYE GÜNLÜĞÜ KAYITLARI EKLENIYOR...\n');

    await db.collection('site_logs').add({
      projectId: projectId,
      date: admin.firestore.Timestamp.fromDate(new Date('2024-05-18')),
      weather: 'rainy',
      temperature: 18,
      workersCount: 0,
      activities: ['Yağmur nedeniyle çalışma yapılamadı'],
      notes: 'Şiddetli yağış, şantiye kapatıldı',
      createdBy: 'Ali Kaya',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-05-18')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-05-18')),
    });

    await db.collection('site_logs').add({
      projectId: projectId,
      date: admin.firestore.Timestamp.fromDate(new Date('2024-06-05')),
      weather: 'sunny',
      temperature: 28,
      workersCount: 15,
      activities: [
        'Temel betonu dökümü tamamlandı',
        'Demir donatı montajına başlandı',
        'Müşteri mutfak planını değiştirmek istedi - toplantı yapıldı',
      ],
      notes: 'Müşteri değişiklik talebi: Mutfak alanı 2m² büyütülecek. Ek fiyat teklifi hazırlanacak.',
      photos: [],
      createdBy: 'Ali Kaya',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-06-05')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-06-05')),
    });

    await db.collection('site_logs').add({
      projectId: projectId,
      date: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
      weather: 'sunny',
      temperature: 32,
      workersCount: 18,
      activities: [
        'Duvar örme işleri devam ediyor',
        'Elektrikçi ekip 5 kişi - kablo döşeme',
        'Tesisatçı ekip 3 kişi - boru montajı',
      ],
      notes: 'Kaba inşaat %85 tamamlandı. Hedefin önündeyiz.',
      photos: [],
      createdBy: 'Ali Kaya',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2024-07-20')),
    });

    await db.collection('site_logs').add({
      projectId: projectId,
      date: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      weather: 'partly_cloudy',
      temperature: 22,
      workersCount: 8,
      activities: [
        'Son temizlik yapıldı',
        'Müşteri teslim kabulü yapıldı',
        'Tüm işler onaylandı ⭐⭐⭐⭐⭐',
      ],
      notes: 'Proje tamamlandı! Müşteri çok memnun. 2 gün erken teslim edildi.',
      photos: [],
      createdBy: 'Ali Kaya',
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
    });

    console.log('   ✅ 4 Günlük Kayıt Eklendi');
    console.log('   📅 İlk Kayıt: 18 Mayıs 2024');
    console.log('   📅 Son Kayıt: 13 Nisan 2025 (Teslim)\n');

    // ========================================================================
    // 10. STOK YÖNETİMİ
    // ========================================================================
    console.log('📋 10. STOK YÖNETİMİ KAYITLARI EKLENIYOR...\n');

    await db.collection('inventory').add({
      projectId: projectId,
      name: 'Çimento (Torba)',
      category: 'material',
      quantity: 120,
      unit: 'Adet',
      unitPrice: 48,
      supplier: 'Lafarge Çimento',
      status: 'in_stock',
      minimumStock: 50,
      location: 'Şantiye Deposu A',
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date('2024-08-15')),
      updatedBy: 'Ali Kaya',
    });

    await db.collection('inventory').add({
      projectId: projectId,
      name: 'Nervürlü Demir 14mm',
      category: 'material',
      quantity: 0,
      unit: 'Kg',
      unitPrice: 18.5,
      supplier: 'Kaptan Demir',
      status: 'out_of_stock',
      minimumStock: 100,
      location: 'Şantiye Deposu B',
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date('2025-01-10')),
      updatedBy: 'Ali Kaya',
    });

    await db.collection('inventory').add({
      projectId: projectId,
      name: 'Seramik (İtalyan - Premium)',
      category: 'finishing',
      quantity: 15,
      unit: 'm²',
      unitPrice: 180,
      supplier: 'İthal Seramik',
      status: 'low_stock',
      minimumStock: 10,
      location: 'Şantiye Deposu C',
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date('2025-03-20')),
      updatedBy: 'Ali Kaya',
    });

    console.log('   ✅ 3 Stok Kalemi Eklendi');
    console.log('   📦 Çimento: 120 Adet (Stokta)');
    console.log('   📦 Demir: Tükendi');
    console.log('   📦 Seramik: 15 m² (Düşük Stok)\n');

    // ========================================================================
    // 11. BÜTÇE YÖNETİMİ
    // ========================================================================
    console.log('📋 11. BÜTÇE YÖNETİMİ VERİLERİ EKLENIYOR...\n');

    await db.collection('budget').doc(projectId).set({
      projectId: projectId,
      plannedBudget: 349900,
      actualSpent: 412000,
      variance: -62100,
      variancePercent: -17.7,
      categories: {
        material: {
          planned: 250000,
          actual: 287500,
          variance: -37500,
        },
        labor: {
          planned: 80000,
          actual: 62000,
          variance: 18000,
        },
        subcontractor: {
          planned: 60000,
          actual: 62500,
          variance: -2500,
        },
        other: {
          planned: 9900,
          actual: 0,
          variance: 9900,
        },
      },
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date('2025-04-13')),
      updatedBy: 'Fatma Şahin',
    });

    console.log('   ✅ Bütçe Verileri Eklendi');
    console.log('   💰 Planlanan: 349,900 ₺');
    console.log('   💸 Gerçekleşen: 412,000 ₺');
    console.log('   📊 Sapma: -62,100 ₺ (-%17.7)\n');

    // ========================================================================
    // ÖZET RAPOR
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 DEMO PROJE BAŞARIYLA OLUŞTURULDU!\n');
    console.log('=' .repeat(60));
    console.log('\n📊 PROJE ÖZETİ:\n');
    console.log('   🏢 Şirket: Yılmaz İnşaat Ltd. Şti.');
    console.log('   🏗️  Proje: Deniz Manzaralı Villa');
    console.log('   👤 Müşteri: Ahmet Yılmaz');
    console.log('   📍 Lokasyon: Bodrum, Muğla');
    console.log('   📐 Alan: 250 m² (Brüt)');
    console.log('   📅 Süre: 15 Nisan 2024 - 13 Nisan 2025');
    console.log('   ✅ Durum: Tamamlandı (2 gün erken!)\n');

    console.log('💰 FİNANSAL ÖZET:\n');
    console.log('   💵 Keşif Maliyeti: 349,900 ₺');
    console.log('   💵 Teklif Tutarı: 437,375 ₺ (KDV Hariç)');
    console.log('   💵 Sözleşme Bedeli: 489,246 ₺ (KDV Dahil)');
    console.log('   💵 Gerçek Maliyet: 412,000 ₺');
    console.log('   💰 Net Kar: 77,246 ₺ (%18.7)\n');

    console.log('📋 OLUŞTURULAN VERİLER:\n');
    console.log('   ✅ 1 Şirket');
    console.log('   ✅ 1 Proje');
    console.log('   ✅ 8 Keşif Kalemi');
    console.log('   ✅ 8 Teklif Kalemi');
    console.log('   ✅ 1 Sözleşme (3 Taksit)');
    console.log('   ✅ 8 Metraj Kalemi');
    console.log('   ✅ 6 Hakediş Kalemi');
    console.log('   ✅ 9 Ödeme Kaydı (3 Gelir, 6 Gider)');
    console.log('   ✅ 4 Şantiye Günlüğü');
    console.log('   ✅ 3 Stok Kalemi');
    console.log('   ✅ 1 Bütçe Kaydı\n');

    console.log('🔐 DEMO GİRİŞ BİLGİLERİ:\n');
    console.log('   Proje ID: deniz-manzarali-villa');
    console.log('   Şirket ID: yilmaz-insaat\n');

    console.log('🌐 SAYFALAR:\n');
    console.log('   • Keşif: kesif.html?id=deniz-manzarali-villa');
    console.log('   • Teklif: teklif.html?id=deniz-manzarali-villa');
    console.log('   • Sözleşme: sozlesme.html?id=deniz-manzarali-villa');
    console.log('   • Metraj: metraj-listesi.html?id=deniz-manzarali-villa');
    console.log('   • Hakediş: hakedis-takibi.html?id=deniz-manzarali-villa');
    console.log('   • Ödeme: odeme-takibi.html?id=deniz-manzarali-villa\n');

    console.log('=' .repeat(60));
    console.log('\n✨ Tüm veriler Firestore\'a kaydedildi!\n');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ HATA:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
createDemoProject();
