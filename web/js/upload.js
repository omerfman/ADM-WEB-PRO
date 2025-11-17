/**
 * Photo Upload Management with Cloudinary
 * Signed upload akışı
 */

/**
 * Initialize Cloudinary upload
 */
async function initializePhotoUpload(projectId) {
  try {
    // Get signed upload parameters from backend
    const response = await fetch('http://localhost:3000/api/uploads/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to get upload signature');
    }

    const signData = await response.json();
    console.log('✅ Upload signature obtained:', signData);

    // Open file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = false;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      await uploadToCloudinary(file, signData, projectId);
    });

    input.click();
  } catch (error) {
    console.error('❌ Error initializing photo upload:', error);
    showAlert('Fotoğraf yükleme başlatılamadı: ' + error.message, 'danger');
  }
}

/**
 * Upload file to Cloudinary using signed upload
 */
async function uploadToCloudinary(file, signData, projectId) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cloud_name', signData.cloudName);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);

    console.log('📤 Uploading to Cloudinary...');
    showAlert('Fotoğraf yükleniyor...', 'warning');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);

    // Save metadata to Firestore via backend
    await saveUploadMetadata(projectId, file.name, result.secure_url, file.size);
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    showAlert('Yükleme başarısız: ' + error.message, 'danger');
  }
}

/**
 * Save upload metadata to Firestore
 */
async function saveUploadMetadata(projectId, fileName, cloudinaryUrl, fileSize) {
  try {
    const response = await fetch('http://localhost:3000/api/uploads/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        fileName,
        cloudinaryUrl,
        size: fileSize,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save upload metadata');
    }

    const result = await response.json();
    console.log('✅ Upload metadata saved:', result);
    showAlert('Fotoğraf başarıyla yüklendi!', 'success');

    // Reload project uploads
    if (currentProjectId) {
      // Reload project to show new upload (would call a loadProjectUploads function)
      console.log('🔄 Reloading project uploads...');
    }
  } catch (error) {
    console.error('❌ Error saving upload metadata:', error);
    showAlert('Metadata kaydedilemedi: ' + error.message, 'danger');
  }
}

/**
 * Load and display project photos
 */
async function loadProjectPhotos(projectId) {
  try {
    const snapshot = await db.collection('projects').doc(projectId)
      .collection('uploads')
      .orderBy('uploadedAt', 'desc')
      .get();

    const photosList = document.getElementById('photosList');
    if (!photosList) {
      console.warn('Photos container not found');
      return;
    }

    photosList.innerHTML = '';

    if (snapshot.empty) {
      photosList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Henüz fotoğraf yok</p>';
      return;
    }

    snapshot.forEach(doc => {
      const upload = doc.data();
      const photoItem = document.createElement('div');
      photoItem.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;';

      let preview = '';
      if (upload.type === 'image' || upload.cloudinaryUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        preview = `<img src="${upload.cloudinaryUrl}" style="max-width: 100px; max-height: 100px; margin-top: 0.5rem; border-radius: 4px;">`;
      }

      photoItem.innerHTML = `
        <strong>${upload.fileName}</strong>
        <br><a href="${upload.cloudinaryUrl}" target="_blank" style="color: var(--accent-color); text-decoration: none;">Görüntüle</a> | Boyut: ${(upload.size / 1024 / 1024).toFixed(2)} MB
        <br><small style="color: #999;">
          ${new Date(upload.uploadedAt.toDate()).toLocaleDateString('tr-TR')} — ${upload.uploadedBy}
        </small>
        ${preview}
      `;
      photosList.appendChild(photoItem);
    });

    console.log(`✅ ${snapshot.size} photos loaded`);
  } catch (error) {
    console.error('❌ Error loading photos:', error);
  }
}

/**
 * Delete upload (remove from Firestore)
 */
async function deleteUpload(projectId, uploadId) {
  if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) {
    return;
  }

  try {
    await db.collection('projects').doc(projectId)
      .collection('uploads').doc(uploadId).delete();

    console.log('✅ Upload deleted');
    showAlert('Fotoğraf silindi', 'success');

    // Reload photos
    loadProjectPhotos(projectId);
  } catch (error) {
    console.error('❌ Error deleting upload:', error);
    showAlert('Fotoğraf silinemedi: ' + error.message, 'danger');
  }
}

// Export functions to global scope
window.initializePhotoUpload = initializePhotoUpload;
window.uploadToCloudinary = uploadToCloudinary;
window.loadProjectPhotos = loadProjectPhotos;
window.deleteUpload = deleteUpload;
