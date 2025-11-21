// Clean Duplicate Templates Script
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanDuplicateTemplates() {
  try {
    console.log('🧹 Tekrar eden şablonlar temizleniyor...\n');

    const types = [
      'boq_categories',
      'boq_units',
      'payment_methods',
      'project_statuses',
      'stock_categories',
      'stock_units'
    ];

    let totalDeleted = 0;
    let totalKept = 0;

    for (const type of types) {
      console.log(`\n📋 ${type} işleniyor...`);

      const snapshot = await db.collection('templates')
        .where('type', '==', type)
        .get();

      console.log(`   Toplam kayıt: ${snapshot.size}`);

      // Group by companyId and value
      const companyMap = new Map();

      snapshot.forEach(doc => {
        const data = doc.data();
        const companyId = data.companyId || 'default-company';
        const value = data.value;

        if (!companyMap.has(companyId)) {
          companyMap.set(companyId, new Map());
        }

        const valueMap = companyMap.get(companyId);
        const key = `${value}`;

        if (valueMap.has(key)) {
          // Duplicate found
          valueMap.get(key).duplicates.push(doc.id);
        } else {
          // First occurrence
          valueMap.set(key, {
            keepId: doc.id,
            duplicates: []
          });
        }
      });

      // Delete duplicates
      let deletedCount = 0;
      let keptCount = 0;

      for (const [companyId, valueMap] of companyMap.entries()) {
        console.log(`   Şirket: ${companyId}`);
        
        for (const [value, data] of valueMap.entries()) {
          keptCount++;
          
          if (data.duplicates.length > 0) {
            console.log(`   - "${value}": 1 korundu, ${data.duplicates.length} silindi`);
            
            // Delete duplicates in batch
            const batch = db.batch();
            for (const docId of data.duplicates) {
              batch.delete(db.collection('templates').doc(docId));
              deletedCount++;
            }
            await batch.commit();
          }
        }
      }

      console.log(`   ✅ Sonuç: ${keptCount} benzersiz kayıt korundu, ${deletedCount} tekrar silindi`);
      totalDeleted += deletedCount;
      totalKept += keptCount;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n🎉 Temizlik tamamlandı!`);
    console.log(`   📊 Toplam: ${totalKept} kayıt korundu`);
    console.log(`   🗑️  Toplam: ${totalDeleted} tekrar silindi\n`);

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanDuplicateTemplates();
