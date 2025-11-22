#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listProjects() {
  const projectsSnapshot = await db.collection('projects').get();
  
  console.log(`📊 Toplam ${projectsSnapshot.size} proje:\n`);
  
  projectsSnapshot.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. ${data.name} (ID: ${doc.id})`);
  });
  
  process.exit();
}

listProjects();
