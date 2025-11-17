// Firebase Configuration
// Bu dosya Firebase projesi yapılandırmasını içerir.
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
  console.log('✅ Firebase successfully initialized');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.warn('⚠️ Firebase already initialized', error.message);
  } else {
    console.error('❌ Firebase initialization error:', error);
  }
}

// Get Firebase references
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence for better UX
db.enablePersistence()
  .catch((error) => {
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open - offline persistence disabled');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ Browser does not support offline persistence');
    }
  });

// Development mode: Firestore emulator (optional)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('📍 Development mode detected');
  // Uncomment to use Firestore emulator
  // db.useEmulator('localhost', 8080);
  // auth.useEmulator('http://localhost:9099');
}

/**
 * Verify Firebase connection
 */
async function verifyFirebaseConnection() {
  try {
    const testDoc = await db.collection('_health').doc('test').get();
    console.log('✅ Firestore connection verified');
    return true;
  } catch (error) {
    console.warn('⚠️ Firestore connection check failed:', error.message);
    return false;
  }
}

// Verify connection on load
document.addEventListener('DOMContentLoaded', () => {
  verifyFirebaseConnection();
});

// Export for use in other modules
export { firebase, auth, db, verifyFirebaseConnection };

