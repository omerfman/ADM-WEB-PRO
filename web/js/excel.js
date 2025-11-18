/**
 * Excel Import/Export Module
 * Hakediş ve Stok listelerini Excel'e aktarma ve Excel'den içe aktarma
 * SheetJS (xlsx) kütüphanesi kullanılıyor
 */

import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Export stocks to Excel
 */
async function exportStocksToExcel(projectId, projectName) {
  try {
    showAlert('Excel hazırlanıyor...', 'warning');

    // Load stocks data
    const stocksRef = collection(db, 'projects', projectId, 'stocks');
    const q = query(stocksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      showAlert('Dışa aktarılacak ürün bulunamadı', 'warning');
      return;
    }

    // Prepare data for Excel
    const data = [];
    data.push(['Ürün Adı', 'Birim', 'Miktar', 'Birim Fiyat', 'Toplam Fiyat', 'Oluşturma Tarihi']);

    snapshot.forEach(doc => {
      const stock = doc.data();
      const totalPrice = (stock.quantity || 0) * (stock.unitPrice || 0);
      const createdAt = stock.createdAt?.toDate ? stock.createdAt.toDate().toLocaleDateString('tr-TR') : '-';

      data.push([
        stock.name || '',
        stock.unit || '',
        stock.quantity || 0,
        stock.unitPrice || 0,
        totalPrice,
        createdAt
      ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Ürün Adı
      { wch: 10 }, // Birim
      { wch: 10 }, // Miktar
      { wch: 12 }, // Birim Fiyat
      { wch: 15 }, // Toplam Fiyat
      { wch: 15 }  // Tarih
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Listesi');

    // Generate filename
    const filename = `${projectName}_Stok_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);

    showAlert(`✅ ${snapshot.size} ürün Excel'e aktarıldı!`, 'success');
    console.log(`✅ Stocks exported: ${filename}`);
  } catch (error) {
    console.error('❌ Error exporting stocks:', error);
    showAlert('Excel dışa aktarma hatası: ' + error.message, 'danger');
  }
}

/**
 * Export payments to Excel
 */
async function exportPaymentsToExcel(projectId, projectName) {
  try {
    showAlert('Excel hazırlanıyor...', 'warning');

    // Load payments data
    const paymentsRef = collection(db, 'projects', projectId, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      showAlert('Dışa aktarılacak hakediş bulunamadı', 'warning');
      return;
    }

    // Prepare data for Excel
    const data = [];
    data.push(['Açıklama', 'Yapan Kişi', 'Birim', 'Birim Fiyat', 'Miktar', 'Toplam Tutar', 'Durum', 'Tarih']);

    let grandTotal = 0;

    snapshot.forEach(doc => {
      const payment = doc.data();
      const unitPrice = payment.unitPrice || payment.amount || 0;
      const quantity = payment.quantity || 1;
      const totalAmount = unitPrice * quantity;
      grandTotal += totalAmount;
      const createdAt = payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString('tr-TR') : '-';

      data.push([
        payment.description || '',
        payment.createdBy || '',
        payment.unit || 'Adet',
        unitPrice,
        quantity,
        totalAmount,
        payment.status || 'pending',
        createdAt
      ]);
    });

    // Add total row
    data.push([]);
    data.push(['', '', '', '', 'TOPLAM HAKEDİŞ:', grandTotal, '', '']);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 35 }, // Açıklama
      { wch: 20 }, // Yapan Kişi
      { wch: 10 }, // Birim
      { wch: 12 }, // Birim Fiyat
      { wch: 10 }, // Miktar
      { wch: 15 }, // Toplam
      { wch: 12 }, // Durum
      { wch: 15 }  // Tarih
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Hakediş Listesi');

    // Generate filename
    const filename = `${projectName}_Hakedis_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);

    showAlert(`✅ ${snapshot.size} hakediş kaydı Excel'e aktarıldı! Toplam: ₺${grandTotal.toLocaleString('tr-TR')}`, 'success');
    console.log(`✅ Payments exported: ${filename}`);
  } catch (error) {
    console.error('❌ Error exporting payments:', error);
    showAlert('Excel dışa aktarma hatası: ' + error.message, 'danger');
  }
}

/**
 * Download Excel template for stocks
 */
function downloadStockTemplate() {
  const data = [
    ['Ürün Adı', 'Birim', 'Miktar', 'Birim Fiyat'],
    ['Çimento', 'Ton', '10', '2500'],
    ['Demir', 'Kg', '500', '15'],
    ['Tuğla', 'Adet', '1000', '3']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stok Şablonu');
  XLSX.writeFile(wb, 'Stok_Sablonu.xlsx');

  showAlert('✅ Stok şablonu indirildi!', 'success');
}

/**
 * Download Excel template for payments
 */
function downloadPaymentTemplate() {
  const data = [
    ['Açıklama', 'Yapan Kişi', 'Birim', 'Birim Fiyat', 'Miktar'],
    ['Beton Dökümü', 'Ali Yılmaz', 'm³', '500', '20'],
    ['Sıva İşçiliği', 'Mehmet Demir', 'm²', '75', '150'],
    ['Elektrik İşçiliği', 'Ahmet Kaya', 'Gün', '1500', '5']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Hakediş Şablonu');
  XLSX.writeFile(wb, 'Hakedis_Sablonu.xlsx');

  showAlert('✅ Hakediş şablonu indirildi!', 'success');
}

/**
 * Import stocks from Excel
 */
async function importStocksFromExcel(event, projectId) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    showAlert('Excel dosyası okunuyor...', 'warning');

    const data = await readExcelFile(file);
    
    if (data.length < 2) {
      showAlert('Excel dosyası boş veya geçersiz', 'danger');
      return;
    }

    // Skip header row
    const rows = data.slice(1);
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      // Skip empty rows
      if (!row[0]) continue;

      try {
        const stocksRef = collection(db, 'projects', projectId, 'stocks');
        await addDoc(stocksRef, {
          name: row[0] || '',
          unit: row[1] || '',
          quantity: parseFloat(row[2]) || 0,
          unitPrice: parseFloat(row[3]) || 0,
          createdBy: window.auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'in_stock',
          importedFrom: 'excel'
        });
        successCount++;
      } catch (error) {
        console.error('❌ Error importing row:', row, error);
        errorCount++;
      }
    }

    showAlert(`✅ ${successCount} ürün içe aktarıldı! ${errorCount > 0 ? `(${errorCount} hata)` : ''}`, 'success');
    
    // Reload stocks list
    if (window.loadProjectStocks) {
      await window.loadProjectStocks(projectId);
    }

    // Clear file input
    event.target.value = '';
  } catch (error) {
    console.error('❌ Error importing stocks:', error);
    showAlert('Excel içe aktarma hatası: ' + error.message, 'danger');
  }
}

/**
 * Import payments from Excel
 */
async function importPaymentsFromExcel(event, projectId) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    showAlert('Excel dosyası okunuyor...', 'warning');

    const data = await readExcelFile(file);
    
    if (data.length < 2) {
      showAlert('Excel dosyası boş veya geçersiz', 'danger');
      return;
    }

    // Skip header row
    const rows = data.slice(1);
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      // Skip empty rows
      if (!row[0]) continue;

      try {
        const unitPrice = parseFloat(row[3]) || 0;
        const quantity = parseFloat(row[4]) || 1;
        
        const paymentsRef = collection(db, 'projects', projectId, 'payments');
        await addDoc(paymentsRef, {
          description: row[0] || '',
          createdBy: row[1] || '',
          unit: row[2] || 'Adet',
          unitPrice: unitPrice,
          quantity: quantity,
          amount: unitPrice * quantity,
          userId: window.auth.currentUser.uid,
          createdAt: serverTimestamp(),
          status: 'pending',
          importedFrom: 'excel'
        });
        successCount++;
      } catch (error) {
        console.error('❌ Error importing row:', row, error);
        errorCount++;
      }
    }

    showAlert(`✅ ${successCount} hakediş kaydı içe aktarıldı! ${errorCount > 0 ? `(${errorCount} hata)` : ''}`, 'success');
    
    // Reload payments list
    if (window.loadProjectPayments) {
      await window.loadProjectPayments(projectId);
    }

    // Clear file input
    event.target.value = '';
  } catch (error) {
    console.error('❌ Error importing payments:', error);
    showAlert('Excel içe aktarma hatası: ' + error.message, 'danger');
  }
}

/**
 * Read Excel file
 */
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#4caf50' : type === 'danger' ? '#f44336' : '#ff9800'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alertDiv.remove(), 300);
  }, 4000);
}

// Export functions to global scope
window.exportStocksToExcel = exportStocksToExcel;
window.exportPaymentsToExcel = exportPaymentsToExcel;
window.downloadStockTemplate = downloadStockTemplate;
window.downloadPaymentTemplate = downloadPaymentTemplate;
window.importStocksFromExcel = importStocksFromExcel;
window.importPaymentsFromExcel = importPaymentsFromExcel;
