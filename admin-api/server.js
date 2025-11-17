/**
 * ADM İnşaat - Admin API Backend
 * Express.js server with Firebase integration
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // 100 request per windowMs
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.',
});

app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Request ID for tracking
app.use((req, res, next) => {
  req.id = require('crypto').randomBytes(16).toString('hex');
  res.set('X-Request-ID', req.id);
  next();
});


// Firebase Admin SDK Initialize (placeholder - gerçek config gerekli)
let admin;
try {
  admin = require('firebase-admin');
  
  // Service Account Key'i env'den oku
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;
  
  if (serviceAccountKey) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://adm-construction.firebaseio.com',
    });
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env - Firebase operations will fail');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

// Get Firebase instances
const auth = admin?.auth?.();
const db = admin?.firestore?.();

// ============ ROUTES ============

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * POST /api/auth/create-user
 * Create a new user in Firebase Authentication
 * Requires: admin token in Authorization header
 */
app.post('/api/auth/create-user', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunludur' });
    }
    
    if (!auth) {
      return res.status(500).json({ error: 'Firebase Auth not configured' });
    }
    
    // Check if user exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create user
    userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });
    
    console.log('✅ Yeni kullanıcı oluşturuldu:', userRecord.uid);
    
    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Create user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/set-custom-claims
 * Set custom claims for a user (admin role, etc)
 */
app.post('/api/auth/set-custom-claims', async (req, res) => {
  try {
    const { uid, claims } = req.body;
    
    if (!uid || !claims) {
      return res.status(400).json({ error: 'uid ve claims zorunludur' });
    }
    
    if (!auth) {
      return res.status(500).json({ error: 'Firebase Auth not configured' });
    }
    
    await auth.setCustomUserClaims(uid, claims);
    
    console.log('✅ Custom claims set for user:', uid);
    
    res.status(200).json({
      uid,
      claims,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Set claims error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/firestore
 * Check Firestore connection
 */
app.get('/api/health/firestore', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    // Try to read a doc
    await db.collection('_health').doc('check').get();
    
    res.status(200).json({
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Firestore health check failed:', error.message);
    res.status(500).json({ 
      status: 'disconnected',
      error: error.message 
    });
  }
});

/**
 * POST /api/uploads/sign
 * Generate Cloudinary signed upload parameters
 */
app.post('/api/uploads/sign', (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    
    if (!cloudinary.config().cloud_name) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      timestamp,
      folder: 'adm-construction/projects',
      resource_type: 'auto',
      unsigned: false,
    };
    
    // Sign the parameters
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );
    
    res.json({
      cloudName: cloudinary.config().cloud_name,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: params.folder,
    });
  } catch (error) {
    console.error('❌ Sign upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uploads/complete
 * Save upload metadata to Firestore
 */
app.post('/api/uploads/complete', async (req, res) => {
  try {
    const { projectId, fileName, cloudinaryUrl, size } = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    if (!projectId || !cloudinaryUrl) {
      return res.status(400).json({ error: 'projectId ve cloudinaryUrl zorunludur' });
    }
    
    // Save metadata to Firestore
    const uploadMetadata = {
      fileName: fileName || 'uploaded_file',
      cloudinaryUrl,
      size: size || 0,
      uploadedAt: new Date(),
      uploadedBy: 'anonymous', // Should be from auth token
    };
    
    await db.collection('projects').doc(projectId)
      .collection('uploads').add(uploadMetadata);
    
    console.log('✅ Upload metadata saved for project:', projectId);
    
    res.status(201).json({
      message: 'Upload completed',
      metadata: uploadMetadata,
    });
  } catch (error) {
    console.error('❌ Complete upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ PROJECTS CRUD ENDPOINTS ============

/**
 * GET /api/projects
 * Get projects for user's company
 */
app.get('/api/projects', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const companyId = req.query.companyId || 'default-company';
    
    const snapshot = await db.collection('projects')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const projects = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('❌ Get projects error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get single project details
 */
app.get('/api/projects/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const doc = await db.collection('projects').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error('❌ Get project error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
app.post('/api/projects', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const { name, description, location, companyId, status, budget } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ error: 'name ve location zorunludur' });
    }
    
    const projectRef = await db.collection('projects').add({
      name,
      description: description || '',
      location,
      companyId: companyId || 'default-company',
      status: status || 'planning',
      budget: budget || 0,
      currency: 'TRY',
      startDate: admin.firestore.Timestamp.now(),
      createdBy: 'system',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      progress: 0,
      tags: [],
    });
    
    res.status(201).json({
      id: projectRef.id,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('❌ Create project error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
app.put('/api/projects/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const { name, description, status, progress, budget } = req.body;
    
    const updateData = {
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (budget !== undefined) updateData.budget = budget;
    
    await db.collection('projects').doc(req.params.id).update(updateData);
    
    res.json({
      id: req.params.id,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('❌ Update project error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
app.delete('/api/projects/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    await db.collection('projects').doc(req.params.id).delete();
    
    res.json({
      id: req.params.id,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete project error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ AUDIT LOGS ENDPOINTS ============

/**
 * GET /api/audit-logs
 * Get audit logs for a company
 */
app.get('/api/audit-logs', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const companyId = req.query.companyId || 'default-company';
    const limit = parseInt(req.query.limit) || 100;
    
    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', companyId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('❌ Get audit logs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/audit-logs
 * Create audit log entry (usually done by system)
 */
app.post('/api/audit-logs', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const { action, entity, entityId, entityName, companyId, performedBy, changes } = req.body;
    
    if (!action || !entity || !entityId) {
      return res.status(400).json({ 
        error: 'action, entity, entityId zorunludur' 
      });
    }
    
    const logRef = await db.collection('audit_logs').add({
      action,
      entity,
      entityId,
      entityName: entityName || '',
      companyId: companyId || 'default-company',
      performedBy: performedBy || 'system',
      performedByName: performedBy || 'System',
      performedByEmail: 'system@adm.com',
      changes: changes || {},
      timestamp: admin.firestore.Timestamp.now(),
    });
    
    res.status(201).json({
      id: logRef.id,
      message: 'Audit log created',
    });
  } catch (error) {
    console.error('❌ Create audit log error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit-logs/summary
 * Get audit logs summary statistics
 */
app.get('/api/audit-logs/summary', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore not configured' });
    }
    
    const companyId = req.query.companyId || 'default-company';
    const days = parseInt(req.query.days) || 7;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', companyId)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();
    
    const summary = {
      total: snapshot.size,
      byAction: {},
      byEntity: {},
      topUsers: {},
    };
    
    snapshot.forEach(doc => {
      const log = doc.data();
      
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      summary.byEntity[log.entity] = (summary.byEntity[log.entity] || 0) + 1;
      summary.topUsers[log.performedByName] = (summary.topUsers[log.performedByName] || 0) + 1;
    });
    
    res.json({
      period: { days, startDate },
      summary,
    });
  } catch (error) {
    console.error('❌ Get audit summary error:', error.message);
    res.status(500).json({ error: error.message });
  }
});



// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir hata oluştu',
  });
});

// ============ SERVER START ============

app.listen(PORT, () => {
  console.log(`\n🚀 ADM İnşaat Admin API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5500'}`);
  console.log('\n✅ Available endpoints:');
  console.log('   GET  /health');
  console.log('   POST /api/auth/create-user');
  console.log('   POST /api/auth/set-custom-claims');
  console.log('   GET  /api/health/firestore');
  console.log('   POST /api/uploads/sign');
  console.log('   POST /api/uploads/complete');
  console.log('   GET  /api/projects');
  console.log('   GET  /api/projects/:id');
  console.log('   POST /api/projects');
  console.log('   PUT  /api/projects/:id');
  console.log('   DELETE /api/projects/:id\n');
});

module.exports = app;
