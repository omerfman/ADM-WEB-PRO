/**
 * Set Custom Claims for Firebase Users
 * This script sets role and companyId custom claims for users
 * Usage: node set-custom-claims.js <email> <role> <companyId>
 * Example: node set-custom-claims.js admin@adm.com company_admin default-company
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = require(serviceAccountPath);
} else {
  throw new Error('Service account key not found');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('❌ Usage: node set-custom-claims.js <email> <role> <companyId>');
  console.log('Roles: super_admin, company_admin, user');
  console.log('Example: node set-custom-claims.js admin@adm.com company_admin default-company');
  process.exit(1);
}

const [email, role, companyId] = args;

async function setCustomClaims() {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`👤 User found: ${user.uid} (${email})`);

    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role,
      companyId
    });

    // Also update Firestore user document
    await admin.firestore().collection('users').doc(user.uid).update({
      role,
      companyId
    });

    console.log(`✅ Custom claims set successfully:`);
    console.log(`   - Role: ${role}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User: ${email}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setCustomClaims().then(() => {
  process.exit(0);
});
