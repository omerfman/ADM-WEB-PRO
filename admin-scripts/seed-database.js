#!/usr/bin/env node

/**
 * Seed Firestore Database with Example Data
 * Firebase Admin SDK kullanarak örnek veriler oluşturur
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccountKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.firestore();

/**
 * Seed database with example data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Firestore verileri seeding başlıyor...\n');

    // 1. Create default company
    console.log('1️⃣  Default company oluşturuluyor...');
    const companyRef = db.collection('companies').doc('default-company');
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      await companyRef.set({
        id: 'default-company',
        name: 'ADM İnşaat A.Ş.',
        description: 'Türkiye\'nin En İyi İnşaat Şirketleri',
        email: 'info@adm-insaat.com',
        phone: '0212 123 45 67',
        address: {
          street: 'Maslak Mahallesi, Kaçak Cad. No:123',
          city: 'İstanbul',
          postal: '34398',
          country: 'Türkiye',
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        status: 'active',
      });
      console.log('   ✅ Default company oluşturuldu\n');
    } else {
      console.log('   ℹ️  Default company zaten mevcut\n');
    }

    // 2. Create example projects
    console.log('2️⃣  Örnek projeler oluşturuluyor...');
    const projectsData = [
      {
        id: 'proj-001',
        name: 'Yazlık Villa',
        description: 'Denize yakın yazlık villa projesi',
        location: 'Bodrum, Muğla',
        coordinates: { latitude: 37.1882, longitude: 27.2287 },
        companyId: 'default-company',
        status: 'ongoing',
        budget: 500000,
        currency: 'TRY',
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-01-01')),
        endDate: admin.firestore.Timestamp.fromDate(new Date('2025-12-31')),
        createdBy: 'admin-user',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        tags: ['residential', 'villa'],
        progress: 45,
      },
      {
        id: 'proj-002',
        name: 'Otel Kompleksi',
        description: 'Turizm kompleksi inşaatı',
        location: 'Cappadocia, Nevşehir',
        coordinates: { latitude: 38.7469, longitude: 34.5571 },
        companyId: 'default-company',
        status: 'ongoing',
        budget: 2000000,
        currency: 'TRY',
        startDate: admin.firestore.Timestamp.fromDate(new Date('2024-06-01')),
        endDate: admin.firestore.Timestamp.fromDate(new Date('2026-06-01')),
        createdBy: 'admin-user',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        tags: ['commercial', 'hotel'],
        progress: 60,
      },
    ];

    for (const project of projectsData) {
      const projectRef = db.collection('projects').doc(project.id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        await projectRef.set(project);
        console.log(`   ✅ Project "${project.name}" oluşturuldu`);

        // Create example logs for project
        await projectRef.collection('logs').doc('log-001').set({
          type: 'milestone',
          title: 'Temelleme başlandı',
          description: 'Temel inşaatı başlandı',
          createdBy: 'admin-user',
          createdAt: admin.firestore.Timestamp.now(),
          attachments: [],
        });

        // Create example stocks for project
        await projectRef.collection('stocks').doc('stock-001').set({
          name: 'Çimento',
          category: 'construction',
          quantity: 500,
          unit: 'çuval',
          unitPrice: 45.50,
          supplier: 'Lafarge Çimento',
          status: 'in_stock',
          lastUpdated: admin.firestore.Timestamp.now(),
          updatedBy: 'admin-user',
        });

        // Create example payments for project
        await projectRef.collection('payments').doc('pay-001').set({
          amount: 50000,
          currency: 'TRY',
          description: 'Birinci taksit ödenmesi',
          status: 'paid',
          paymentMethod: 'bank_transfer',
          dueDate: admin.firestore.Timestamp.fromDate(new Date()),
          paidDate: admin.firestore.Timestamp.fromDate(new Date()),
          paidBy: 'admin-user',
          invoiceNumber: '2025-001',
          notes: 'Başarıyla ödenmiştir',
        });
      } else {
        console.log(`   ℹ️  Project "${project.name}" zaten mevcut`);
      }
    }

    console.log('\n✅ Seeding tamamlandı!\n');
    console.log('📊 Created:');
    console.log('   - 1 Company (default-company)');
    console.log('   - 2 Projects (proj-001, proj-002)');
    console.log('   - Example logs, stocks, and payments for each project\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
seedDatabase();
