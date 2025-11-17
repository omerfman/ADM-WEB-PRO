#!/usr/bin/env node

/**
 * Test Data Setup Script
 * Creates test users and companies for testing the role-based system
 * 
 * Usage:
 * node admin-scripts/test-setup.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test data
const testCompanies = [
  {
    id: 'company-adm',
    name: 'ADM İnşaat A.Ş.',
    email: 'info@adm-construction.com',
    phone: '+90 212 555 0001',
    address: 'İstanbul, Türkiye'
  },
  {
    id: 'company-build',
    name: 'BuildCo Ltd.',
    email: 'contact@buildco.com',
    phone: '+90 216 555 0002',
    address: 'Ankara, Türkiye'
  }
];

const testUsers = [
  {
    email: 'super@adm.com',
    password: 'SuperAdmin123!',
    fullName: 'Süper Admin',
    role: 'super_admin',
    companyId: null
  },
  {
    email: 'admin-adm@adm.com',
    password: 'AdminADM123!',
    fullName: 'ADM Şirket Yöneticisi',
    role: 'company_admin',
    companyId: 'company-adm'
  },
  {
    email: 'user-adm@adm.com',
    password: 'UserADM123!',
    fullName: 'ADM Kullanıcısı',
    role: 'user',
    companyId: 'company-adm'
  },
  {
    email: 'admin-build@buildco.com',
    password: 'AdminBuild123!',
    fullName: 'BuildCo Şirket Yöneticisi',
    role: 'company_admin',
    companyId: 'company-build'
  },
  {
    email: 'user-build@buildco.com',
    password: 'UserBuild123!',
    fullName: 'BuildCo Kullanıcısı',
    role: 'user',
    companyId: 'company-build'
  }
];

async function setupTestData() {
  console.log('🚀 Starting test data setup...\n');

  try {
    // 1. Create companies
    console.log('📝 Creating test companies...');
    for (const company of testCompanies) {
      await db.collection('companies').doc(company.id).set({
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });
      console.log(`  ✅ Created company: ${company.name}`);
    }

    // 2. Create users
    console.log('\n👤 Creating test users...');
    for (const user of testUsers) {
      try {
        // Check if user already exists
        let existingUser;
        try {
          existingUser = await auth.getUserByEmail(user.email);
          console.log(`  ⚠️  User ${user.email} already exists, skipping creation...`);
        } catch (error) {
          if (error.code !== 'auth/user-not-found') {
            throw error;
          }
        }

        if (!existingUser) {
          // Create user in Firebase Auth
          const userRecord = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.fullName,
            disabled: false
          });

          // Set custom claims
          const claims = { role: user.role };
          if (user.companyId) {
            claims.companyId = user.companyId;
          }
          await auth.setCustomUserClaims(userRecord.uid, claims);

          // Create user document in Firestore
          await db.collection('users').doc(userRecord.uid).set({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            companyId: user.companyId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
          });

          console.log(`  ✅ Created user: ${user.email} (${user.role})`);
          console.log(`     Password: ${user.password}`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating user ${user.email}:`, error.message);
      }
    }

    // 3. Create test projects
    console.log('\n📐 Creating test projects...');
    const projects = [
      {
        name: 'Gökdelenlerin Projesi',
        location: 'İstanbul - Maslak',
        description: 'Modern gökdelenlerin inşaat projesi',
        companyId: 'company-adm'
      },
      {
        name: 'Konut Kompleksi',
        location: 'Ankara - Keçiören',
        description: 'Lüks konut kompleksi inşaatı',
        companyId: 'company-build'
      }
    ];

    for (const project of projects) {
      const docRef = await db.collection('projects').add({
        name: project.name,
        location: project.location,
        description: project.description,
        companyId: project.companyId,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  ✅ Created project: ${project.name}`);
    }

    console.log('\n✨ Test data setup completed successfully!\n');
    console.log('🔐 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
      console.log(`\n${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      if (user.companyId) {
        console.log(`  Company: ${user.companyId}`);
      }
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTestData().then(() => {
  console.log('✅ Done!');
  process.exit(0);
});
