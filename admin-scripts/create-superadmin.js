#!/usr/bin/env node

/**
 * Create Superadmin User Script
 * Firebase Admin SDK kullanarak superadmin kullanıcısı oluşturur
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccountKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file');
  console.error('💡 Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const auth = admin.auth();
const db = admin.firestore();

/**
 * Main function to create superadmin
 */
async function createSuperadmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@adm.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe!2025';
    const displayName = 'Superadmin';

    console.log('🔧 Superadmin user oluşturuluyor...\n');
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Password: ${password}\n`);

    // Check if user exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('⚠️  Bu e-posta zaten kayıtlı. UID:', userRecord.uid);
      console.log('💡 Existing user kullanılıyor...\n');
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }

      // Create new user
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      console.log('✅ Yeni superadmin kullanıcı oluşturuldu');
      console.log(`📋 UID: ${userRecord.uid}\n`);
    }

    // Set custom claims for superadmin
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'superadmin',
      permissions: ['read', 'write', 'delete', 'manage_users'],
    });

    console.log('✅ Custom claims set: role=superadmin\n');

    // Create Firestore document for user
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email,
        displayName,
        role: 'superadmin',
        companyId: 'default-company',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      },
      { merge: true }
    );

    console.log('✅ Firestore user document oluşturuldu\n');

    // Create default company if not exists
    const companiesRef = db.collection('companies');
    const defaultCompanyDoc = await companiesRef.doc('default-company').get();

    if (!defaultCompanyDoc.exists) {
      await companiesRef.doc('default-company').set({
        id: 'default-company',
        name: 'ADM İnşaat A.Ş.',
        description: 'Ana kuruluş',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      });

      console.log('✅ Default company oluşturuldu\n');
    } else {
      console.log('ℹ️  Default company zaten mevcut\n');
    }

    console.log('🎉 Superadmin setup tamamlandı!\n');
    console.log('🌐 Frontend\'de giriş yapabilirsiniz:\n');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Firebase credentials kontrol edin');
    console.error('   - FIREBASE_SERVICE_ACCOUNT_KEY env variable kontrol edin');
    console.error('   - Firebase project\'i oluşturmuş olduğunuzdan emin olun\n');
    process.exit(1);
  }
}

// Run
createSuperadmin();
