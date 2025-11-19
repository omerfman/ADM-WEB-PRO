// Firebase Configuration
// Firebase Web SDK v10+ with modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, persistentLocalCache, persistentMultipleTabManager, initializeFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase Config (adm-web-pro)
const firebaseConfig = {
  apiKey: "AIzaSyAvGQjx51AJZQnQQvLJcB6Onel-M84FhLw",
  authDomain: "adm-web-pro.firebaseapp.com",
  projectId: "adm-web-pro",
  storageBucket: "adm-web-pro.firebasestorage.app",
  messagingSenderId: "877194069372",
  appId: "1:877194069372:web:6e9a5320fafdc20cbb90f9",
  measurementId: "G-90SJPXF24R"
};

// Initialize Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Use new cache configuration instead of deprecated enableIndexedDbPersistence
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  
  console.log('✅ Firebase successfully initialized');
  console.log('📱 Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Enable Auth persistence
setPersistence(auth, browserLocalPersistence)
  .catch(error => console.error('Auth persistence error:', error));

// Development mode: Firestore emulator (optional)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('📍 Development mode detected - Firestore emulator disabled (set to false)');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

/**
 * Verify Firebase connection
 */
async function verifyFirebaseConnection() {
  try {
    console.log('🔍 Testing Firestore connection...');
    // Test connection by checking auth state
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        console.log('✅ Firebase Auth connection verified');
        resolve(true);
      });
    });
  } catch (error) {
    console.warn('⚠️ Firebase connection check failed:', error.message);
    return false;
  }
}

// Verify connection on load
document.addEventListener('DOMContentLoaded', () => {
  verifyFirebaseConnection();
});

// Global window exports for non-module scripts
window.auth = auth;
window.db = db;
window.verifyFirebaseConnection = verifyFirebaseConnection;
window.firestore = {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp
};

// ES Module exports (for import statements)
export { 
  firebaseConfig,
  auth, 
  db, 
  verifyFirebaseConnection, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc,
  orderBy,
  limit,
  serverTimestamp
};

