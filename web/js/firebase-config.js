// Firebase Configuration Placeholder
// Bu dosya Firebase yapılandırmasını içerir.
// Gerçek Firebase projesi oluşturduktan sonra aşağıdaki değerleri doldurun.

const firebaseConfig = {
  apiKey: "AIzaSyDEXAMPLE_PLACEHOLDER",
  authDomain: "adm-construction.firebaseapp.com",
  projectId: "adm-construction",
  storageBucket: "adm-construction.appspot.com",
  messagingSenderId: "123456789000",
  appId: "1:123456789000:web:abcdef123456",
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase başarıyla initialized');
} catch (error) {
  console.warn('⚠️ Firebase zaten initialize edilmiş', error.code);
}

// Get references
const auth = firebase.auth();
const db = firebase.firestore();

// Development mode: Firestore emulator (gerekirse)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('📍 Development mode detected - Emulator kullanıyor');
  // db.useEmulator('localhost', 8080);
  // auth.useEmulator('http://localhost:9099');
}

export { firebase, auth, db };
