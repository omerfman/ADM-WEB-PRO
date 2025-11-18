/**
 * Photo Upload Management with ImgBB (FREE)
 * ImgBB kullanarak fotoğraf yükleme - Tamamen ücretsiz
 * API Key: https://api.imgbb.com/ adresinden alınabilir
 */

import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { IMGBB_API_KEY, IMGBB_UPLOAD_URL, MAX_FILE_SIZE } from './imgbb-config.js';

/**
 * Upload photo to ImgBB (FREE image hosting)
 */
async function uploadPhotoToImgBB(file, projectId) {
  if (!file) {
    alert('Lütfen bir dosya seçin');
    return;
  }

  // Check API key
  if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
    alert('❌ ImgBB API key ayarlanmamış!\n\n1. https://api.imgbb.com/ adresinden ücretsiz hesap oluşturun\n2. API key\'inizi alın\n3. web/js/imgbb-config.js dosyasında IMGBB_API_KEY değerini güncelleyin');
    throw new Error('ImgBB API key not configured');
  }

  // Check file size (max 32MB for ImgBB free)
  if (file.size > MAX_FILE_SIZE) {
    alert('Dosya boyutu 32MB\'dan küçük olmalıdır');
    return;
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    alert('Lütfen sadece resim dosyası yükleyin');
    return;
  }

  try {
    showAlert('Fotoğraf yükleniyor...', 'warning');

    // Create form data for ImgBB
    const formData = new FormData();
    formData.append('image', file);
    
    // Add optional parameters
    formData.append('name', `project_${projectId}_${Date.now()}`);

    console.log('📤 Uploading to ImgBB...');

    // Upload to ImgBB
    const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const result = await response.json();
    console.log('✅ ImgBB upload successful:', result);

    if (!result.success) {
      throw new Error('Upload failed');
    }

    const imageData = result.data;
    const downloadURL = imageData.url;
    const deleteURL = imageData.delete_url;

    // Save metadata to Firestore
    await savePhotoMetadata(projectId, {
      fileName: file.name,
      downloadURL: downloadURL,
      deleteURL: deleteURL, // For deletion later
      thumbURL: imageData.thumb?.url || downloadURL,
      size: file.size,
      contentType: file.type,
      width: imageData.width,
      height: imageData.height,
      uploadedBy: auth.currentUser.uid,
      uploadedByEmail: auth.currentUser.email,
      uploadedAt: serverTimestamp(),
      provider: 'imgbb'
    });

    showAlert('✅ Fotoğraf başarıyla yüklendi!', 'success');
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    showAlert('Yükleme hatası: ' + error.message, 'danger');
    throw error;
  }
}

/**
 * Save photo metadata to Firestore
 */
async function savePhotoMetadata(projectId, metadata) {
  try {
    const photosRef = collection(db, 'projects', projectId, 'photos');
    const docRef = await addDoc(photosRef, metadata);
    console.log('✅ Photo metadata saved:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving photo metadata:', error);
    throw error;
  }
}

/**
 * Load and display project photos
 */
async function loadProjectPhotos(projectId) {
  try {
    console.log('📥 Loading photos for project:', projectId);
    
    const photosRef = collection(db, 'projects', projectId, 'photos');
    const q = query(photosRef, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);

    const photosList = document.getElementById('photosList');
    if (!photosList) {
      console.warn('⚠️ Photos container not found');
      return;
    }

    if (snapshot.empty) {
      photosList.innerHTML = '<p style="color: #999; font-size: 0.9rem; text-align: center; padding: 1rem;">Henüz fotoğraf yok</p>';
      return;
    }

    photosList.innerHTML = snapshot.docs.map(docSnap => {
      const photo = docSnap.data();
      const uploadDate = photo.uploadedAt?.toDate ? photo.uploadedAt.toDate().toLocaleDateString('tr-TR') : '-';
      const fileSize = (photo.size / 1024).toFixed(2);

      return `
        <div style="
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          gap: 1rem;
          align-items: center;
        ">
          <img src="${photo.thumbURL || photo.downloadURL}" 
               alt="${photo.fileName}"
               style="
                 width: 100px;
                 height: 100px;
                 object-fit: cover;
                 border-radius: 8px;
                 border: 2px solid var(--border-color);
                 cursor: pointer;
               "
               onclick="window.open('${photo.downloadURL}', '_blank')">
          <div style="flex: 1;">
            <strong style="color: var(--text-primary);">${photo.fileName}</strong>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              📅 ${uploadDate} • 👤 ${photo.uploadedByEmail || 'Bilinmeyen'}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              📦 ${fileSize} KB • 📐 ${photo.width || '?'}x${photo.height || '?'}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button onclick="window.open('${photo.downloadURL}', '_blank')" 
                    class="btn btn-secondary" 
                    style="padding: 0.5rem 1rem; font-size: 0.85rem; width: auto;">
              👁️ Görüntüle
            </button>
            <button onclick="deleteProjectPhoto('${projectId}', '${docSnap.id}')" 
                    class="btn btn-secondary" 
                    style="padding: 0.5rem 1rem; font-size: 0.85rem; width: auto; background: #f44336;">
              🗑️ Sil
            </button>
          </div>
        </div>
      `;
    }).join('');

    console.log(`✅ ${snapshot.size} photos loaded`);
  } catch (error) {
    console.error('❌ Error loading photos:', error);
    const photosList = document.getElementById('photosList');
    if (photosList) {
      photosList.innerHTML = '<p style="color: #f44336; text-align: center; padding: 1rem;">Fotoğraflar yüklenirken hata oluştu</p>';
    }
  }
}

/**
 * Delete photo from ImgBB and Firestore
 * Note: ImgBB free tier doesn't allow API deletion, so we just remove from Firestore
 */
async function deleteProjectPhoto(projectId, photoId) {
  if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?\n\nNot: Fotoğraf ImgBB sunucusunda kalacaktır (ImgBB ücretsiz planda API ile silme desteklenmez).')) {
    return;
  }

  try {
    // Delete metadata from Firestore
    await deleteDoc(doc(db, 'projects', projectId, 'photos', photoId));
    console.log('✅ Photo metadata deleted');

    showAlert('✅ Fotoğraf listeden kaldırıldı', 'success');

    // Reload photos
    loadProjectPhotos(projectId);
  } catch (error) {
    console.error('❌ Error deleting photo:', error);
    showAlert('Fotoğraf silinemedi: ' + error.message, 'danger');
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  // Create alert element
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

  // Auto remove after 4 seconds
  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alertDiv.remove(), 300);
  }, 4000);
}

// Export functions to global scope
window.uploadPhotoToImgBB = uploadPhotoToImgBB;
window.loadProjectPhotos = loadProjectPhotos;
window.deleteProjectPhoto = deleteProjectPhoto;

/**
 * Upload photo to Firebase Storage
 */
async function uploadPhotoToFirebase(file, projectId) {
  if (!file) {
    alert('Lütfen bir dosya seçin');
    return;
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
    return;
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    alert('Lütfen sadece resim dosyası yükleyin');
    return;
  }

  try {
    showAlert('Fotoğraf yükleniyor...', 'warning');

    // Create a reference to the file location
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `projects/${projectId}/photos/${fileName}`);

    // Upload the file with progress monitoring
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress + '%');
        },
        (error) => {
          // Error
          console.error('❌ Upload error:', error);
          showAlert('Yükleme başarısız: ' + error.message, 'danger');
          reject(error);
        },
        async () => {
          // Success - get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ File uploaded successfully:', downloadURL);

            // Save metadata to Firestore
            await savePhotoMetadata(projectId, {
              fileName: file.name,
              storagePath: uploadTask.snapshot.ref.fullPath,
              downloadURL: downloadURL,
              size: file.size,
              contentType: file.type,
              uploadedBy: auth.currentUser.uid,
              uploadedByEmail: auth.currentUser.email,
              uploadedAt: serverTimestamp()
            });

            showAlert('✅ Fotoğraf başarıyla yüklendi!', 'success');
            resolve(downloadURL);
          } catch (error) {
            console.error('❌ Error getting download URL:', error);
            showAlert('Fotoğraf URL\'si alınamadı', 'danger');
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    showAlert('Yükleme hatası: ' + error.message, 'danger');
    throw error;
  }
}

// Export functions to global scope for non-module scripts
window.uploadPhotoToFirebase = uploadPhotoToFirebase;

// ES Module exports
export { uploadPhotoToImgBB, loadProjectPhotos, deleteProjectPhoto, uploadPhotoToFirebase };
