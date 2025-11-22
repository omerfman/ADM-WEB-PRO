#!/usr/bin/env node

/**
 * Add Client Message to Projects
 * Premium Deck projesine müşteri mesajı ekle
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addClientMessage() {
  try {
    console.log('💬 Müşteri mesajı ekleniyor...\n');

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    console.log(`📊 Toplam ${projectsSnapshot.size} proje bulundu\n`);
    
    // Find project (use first one for demo)
    let targetProject = null;
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      // Use "Deniz Manzaralı Villa" or first project
      if (data.name && (data.name.includes('Deniz Manzaralı Villa') || !targetProject)) {
        if (!data.name.includes('Demo')) { // Skip demo projects
          targetProject = { id: doc.id, ...data };
        }
      }
    });
    
    if (!targetProject) {
      console.log('⚠️  Uygun proje bulunamadı');
      return;
    }
    
    console.log(`✅ Proje bulundu: ${targetProject.id}`);
    console.log(`   Proje Adı: ${targetProject.name}\n`);
    
    // Add client message
    const clientMessage = `Sayın Müşterimiz,

${targetProject.name} projeniz planlandığı şekilde ilerlemektedir. Ekibimiz kaliteli işçilik ve zamanında teslimat konusunda özenle çalışmaktadır.

📍 Güncel Durum:
• Zemin hazırlık çalışmaları tamamlandı
• İnşaat malzemeleri temin edildi
• Ana yapı iskelet çalışmaları devam ediyor
• Tahmini tamamlanma: 4 hafta içinde

🎯 Dikkat Edilenler:
• Kullanılan tüm malzemeler A+ kalitededir
• İşçilik garantimiz 2 yıldır
• Deprem yönetmeliğine uygun inşa ediliyor
• Su yalıtımı ve ısı yalıtımı standartlara uygun yapılıyor

💡 Bilmeniz Gerekenler:
• Haftalık ilerleme raporları şantiye günlüğünde paylaşılmaktadır
• Fotoğraflar düzenli olarak güncellenmektedir
• Hakediş ödemeleri zamanında yapıldığında proje takvimi aksatılmayacaktır

Herhangi bir sorunuz olduğunda bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
ADM İnşaat Ekibi`;

    await db.collection('projects').doc(targetProject.id).update({
      clientMessage: clientMessage,
      clientMessageUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Müşteri mesajı eklendi!');
    console.log('\n📝 Mesaj İçeriği:');
    console.log('─'.repeat(60));
    console.log(clientMessage);
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

addClientMessage();
