#!/usr/bin/env node

/**
 * Create Test Accounts for ADM Web Pro
 * Bu script 3 test hesabı oluşturur:
 * 1. Super Admin
 * 2. Company Admin
 * 3. Normal User
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

// Test accounts configuration
const TEST_ACCOUNTS = [
  {
    email: 'superadmin@adm.com',
    password: '0123456',
    displayName: 'Super Admin',
    role: 'super_admin',
    companyId: null, // Super admin has no company
    customClaims: { role: 'super_admin', admin: true }
  },
  {
    email: 'companyadmin@adm.com',
    password: '0123456',
    displayName: 'Company Admin',
    role: 'company_admin',
    companyId: 'test-company', // Will be created
    customClaims: { role: 'company_admin', companyId: 'test-company' }
  },
  {
    email: 'user@adm.com',
    password: '0123456',
    displayName: 'Normal User',
    role: 'user',
    companyId: 'test-company',
    customClaims: { role: 'user', companyId: 'test-company' }
  }
];

/**
 * Create test company
 */
async function createTestCompany() {
  try {
    const companyRef = db.collection('companies').doc('test-company');
    const companySnap = await companyRef.get();

    if (companySnap.exists) {
      console.log('✅ Test company already exists');
      return;
    }

    await companyRef.set({
      name: 'ADM Test Şirketi',
      taxNumber: '1234567890',
      phone: '+90 555 123 4567',
      email: 'info@adm-test.com',
      address: 'Test Mahallesi, Test Caddesi No:1, İstanbul',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      settings: {
        currency: 'TRY',
        timezone: 'Europe/Istanbul',
        language: 'tr'
      }
    });

    console.log('✅ Test company created: test-company');
  } catch (error) {
    console.error('❌ Error creating test company:', error);
    throw error;
  }
}

/**
 * Create a single user account
 */
async function createUserAccount(accountConfig) {
  try {
    console.log(`\n📝 Creating user: ${accountConfig.email}`);

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(accountConfig.email);
      console.log(`⚠️  User ${accountConfig.email} already exists (UID: ${existingUser.uid})`);
      
      // Update custom claims
      await auth.setCustomUserClaims(existingUser.uid, accountConfig.customClaims);
      console.log(`✅ Custom claims updated for ${accountConfig.email}`);
      
      // Update Firestore user document
      await updateUserDocument(existingUser.uid, accountConfig);
      
      return existingUser.uid;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create new user
    const userRecord = await auth.createUser({
      email: accountConfig.email,
      password: accountConfig.password,
      displayName: accountConfig.displayName,
      emailVerified: true, // Auto-verify for testing
    });

    console.log(`✅ User created: ${accountConfig.email} (UID: ${userRecord.uid})`);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, accountConfig.customClaims);
    console.log(`✅ Custom claims set: ${JSON.stringify(accountConfig.customClaims)}`);

    // Create Firestore user document
    await createUserDocument(userRecord.uid, accountConfig);

    return userRecord.uid;
  } catch (error) {
    console.error(`❌ Error creating user ${accountConfig.email}:`, error);
    throw error;
  }
}

/**
 * Create Firestore user document
 */
async function createUserDocument(uid, accountConfig) {
  try {
    const userRef = db.collection('users').doc(uid);
    
    await userRef.set({
      email: accountConfig.email,
      displayName: accountConfig.displayName,
      role: accountConfig.role,
      companyId: accountConfig.companyId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      photoURL: null,
      settings: {
        theme: 'light',
        language: 'tr',
        notifications: true
      }
    });

    console.log(`✅ Firestore user document created for ${accountConfig.email}`);
  } catch (error) {
    console.error(`❌ Error creating Firestore document for ${accountConfig.email}:`, error);
    throw error;
  }
}

/**
 * Update Firestore user document
 */
async function updateUserDocument(uid, accountConfig) {
  try {
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
      role: accountConfig.role,
      companyId: accountConfig.companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Firestore user document updated for ${accountConfig.email}`);
  } catch (error) {
    console.error(`❌ Error updating Firestore document for ${accountConfig.email}:`, error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ADM Web Pro - Test Accounts Creation Script');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create test company
    console.log('\n📊 Step 1: Creating test company...');
    await createTestCompany();

    // Step 2: Create test accounts
    console.log('\n👥 Step 2: Creating test accounts...');
    const createdAccounts = [];

    for (const account of TEST_ACCOUNTS) {
      const uid = await createUserAccount(account);
      createdAccounts.push({ ...account, uid });
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST ACCOUNTS CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 ACCOUNT CREDENTIALS:\n');

    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.displayName}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}`);
      console.log(`   Role: ${account.role}`);
      console.log(`   UID: ${account.uid}`);
      if (account.companyId) {
        console.log(`   Company: ${account.companyId}`);
      }
      console.log('');
    });

    console.log('🔐 All accounts use the same password: 0123456');
    console.log('📝 Save these credentials for testing');
    console.log('\n✨ You can now login at: http://localhost:3000/login.html\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    // Cleanup
    process.exit(0);
  }
}

// Run the script
main();
