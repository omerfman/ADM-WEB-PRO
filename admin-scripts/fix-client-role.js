#!/usr/bin/env node

/**
 * Fix Client Role - musteri2@test.com rolünü düzelt
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function fixClientRole() {
  try {
    console.log('🔧 Müşteri hesabı düzeltiliyor...\n');

    const email = 'musteri2@test.com';
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Kullanıcı bulundu: ${userRecord.uid}`);
    
    // Update Firestore document
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.update({
      role: 'client',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Firestore role güncellendi: client');
    
    // Update custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'client'
    });
    console.log('✅ Custom claims güncellendi: client');
    
    // Verify
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log('\n📊 Güncel kullanıcı bilgileri:');
    console.log('Email:', updatedData.email);
    console.log('Role:', updatedData.role);
    console.log('Display Name:', updatedData.fullName || updatedData.displayName);
    
    console.log('\n✅ İşlem tamamlandı!');
    console.log('⚠️  Kullanıcı yeniden giriş yapmalı (logout + login)');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

fixClientRole();
