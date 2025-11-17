// Vercel Serverless Functions için API entry point
// Tüm admin-api/server.js kodunu buraya taşıyoruz

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');

dotenv.config();

// ====== EXPRESS SETUP ======
const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ====== FIREBASE SETUP ======
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    })
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ====== CLOUDINARY SETUP ======
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ====== MIDDLEWARE ======

// Request ID middleware
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  next();
});

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// ====== UTILITY FUNCTIONS ======

// Firebase token verification
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Audit logging
const logAudit = async (action, userId, projectId, details = {}) => {
  try {
    await db.collection('audit_logs').add({
      action,
      userId,
      projectId,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      requestId: details.requestId || 'unknown'
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// ====== ENDPOINTS ======

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Firestore connection check
app.get('/api/health/firestore', async (req, res) => {
  try {
    await db.collection('_test').doc('_test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ status: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Firestore connection failed', details: error.message });
  }
});

// ====== AUTH ENDPOINTS ======

// Create user with role
app.post('/api/auth/create-user', loginLimiter, verifyToken, async (req, res) => {
  try {
    const { email, password, displayName, role, companyId } = req.body;

    if (!email || !password || !role || !companyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role, companyId });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role,
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid
    });

    await logAudit('CREATE_USER', req.user.uid, null, {
      newUserId: userRecord.uid,
      email,
      role,
      requestId: req.id
    });

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role,
      companyId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set custom claims
app.post('/api/auth/set-custom-claims', verifyToken, async (req, res) => {
  try {
    const { userId, role, companyId } = req.body;
    await admin.auth().setCustomUserClaims(userId, { role, companyId });
    res.json({ success: true, message: 'Custom claims set successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== USER ENDPOINTS ======

// Get all users for a company (company_admin and super_admin)
app.get('/api/users', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = db.collection('users');

    // Only super_admin can view all users across companies
    if (req.user.role !== 'super_admin') {
      // Regular users can only see users from their own company
      query = query.where('companyId', '==', req.user.companyId);
    } else if (companyId) {
      // Super admin can filter by specific company
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user
app.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (company_admin and super_admin)
app.post('/api/users', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { email, password, fullName, role, companyId } = req.body;

    // Only company_admin and super_admin can create users
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Only admins can create users' });
    }

    // Company admin can only create users for their own company
    if (req.user.role === 'company_admin' && companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot create users for other companies' });
    }

    if (!email || !password || !fullName || !role || !companyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role, companyId });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      fullName,
      role,
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      status: 'active'
    });

    await logAudit('CREATE_USER', req.user.uid, null, {
      newUserId: userRecord.uid,
      email,
      fullName,
      role,
      companyId,
      requestId: req.id
    });

    res.json({
      id: userRecord.uid,
      email: userRecord.email,
      fullName,
      role,
      companyId,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    // Handle Firebase specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { fullName, role, status } = req.body;
    const userId = req.params.id;

    // Get the user being updated
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check permissions
    if (req.user.role !== 'super_admin' && userData.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    };

    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    await db.collection('users').doc(userId).update(updateData);

    // Update custom claims if role changed
    if (role && role !== userData.role) {
      await auth.setCustomUserClaims(userId, { 
        role, 
        companyId: userData.companyId 
      });
    }

    await logAudit('UPDATE_USER', req.user.uid, null, {
      updatedUserId: userId,
      changes: updateData,
      requestId: req.id
    });

    res.json({ id: userId, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get the user being deleted
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check permissions
    if (req.user.role !== 'super_admin' && userData.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    await logAudit('DELETE_USER', req.user.uid, null, {
      deletedUserId: userId,
      email: userData.email,
      requestId: req.id
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== COMPANY ENDPOINTS ======

// Get all companies (super_admin only)
app.get('/api/companies', apiLimiter, verifyToken, async (req, res) => {
  try {
    // Only super_admin can view all companies
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Only super admin can view all companies' });
    }

    const snapshot = await db.collection('companies').get();
    const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single company
app.get('/api/companies/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('companies').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create company (super_admin only)
app.post('/api/companies', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Only super_admin can create companies
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Only super admin can create companies' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields: name, email' });
    }

    const newCompany = {
      name,
      email,
      phone: phone || '',
      address: address || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      status: 'active'
    };

    const docRef = await db.collection('companies').add(newCompany);

    await logAudit('CREATE_COMPANY', req.user.uid, null, {
      companyId: docRef.id,
      companyName: name,
      requestId: req.id
    });

    res.json({ id: docRef.id, ...newCompany });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update company (super_admin only)
app.put('/api/companies/:id', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, status } = req.body;

    // Only super_admin can update companies
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Only super admin can update companies' });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (status) updateData.status = status;

    await db.collection('companies').doc(req.params.id).update(updateData);

    await logAudit('UPDATE_COMPANY', req.user.uid, null, {
      companyId: req.params.id,
      changes: updateData,
      requestId: req.id
    });

    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete company (super_admin only)
app.delete('/api/companies/:id', verifyToken, async (req, res) => {
  try {
    // Only super_admin can delete companies
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Only super admin can delete companies' });
    }

    const companyId = req.params.id;

    // Delete all users in the company
    const usersSnapshot = await db.collection('users')
      .where('companyId', '==', companyId)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      await auth.deleteUser(userDoc.id);
      await userDoc.ref.delete();
    }

    // Delete all projects in the company
    const projectsSnapshot = await db.collection('projects')
      .where('companyId', '==', companyId)
      .get();

    for (const projectDoc of projectsSnapshot.docs) {
      await projectDoc.ref.delete();
    }

    // Delete company
    await db.collection('companies').doc(companyId).delete();

    await logAudit('DELETE_COMPANY', req.user.uid, null, {
      companyId,
      requestId: req.id
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== PROJECT ENDPOINTS ======

// Get all projects
app.get('/api/projects', apiLimiter, verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('projects')
      .where('companyId', '==', req.user.companyId)
      .get();
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
app.get('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
app.post('/api/projects', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { name, description, budget, startDate, endDate, clientName } = req.body;
    const newProject = {
      name,
      description,
      budget,
      startDate,
      endDate,
      clientName,
      companyId: req.user.companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      status: 'active'
    };
    const docRef = await db.collection('projects').add(newProject);
    await logAudit('CREATE_PROJECT', req.user.uid, docRef.id, { projectName: name, requestId: req.id });
    res.json({ id: docRef.id, ...newProject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { name, description, budget, startDate, endDate, clientName, status } = req.body;
    const updateData = {
      name,
      description,
      budget,
      startDate,
      endDate,
      clientName,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    };
    await db.collection('projects').doc(req.params.id).update(updateData);
    await logAudit('UPDATE_PROJECT', req.user.uid, req.params.id, { changes: updateData, requestId: req.id });
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('projects').doc(req.params.id).delete();
    await logAudit('DELETE_PROJECT', req.user.uid, req.params.id, { requestId: req.id });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== UPLOAD ENDPOINTS ======

// Get signed upload URL
app.post('/api/uploads/sign', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { folder, resourceType } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: folder || 'adm-construction',
        resource_type: resourceType || 'image'
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: folder || 'adm-construction'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete upload and save metadata
app.post('/api/uploads/complete', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { publicId, projectId, fileName, fileSize, uploadedBy } = req.body;
    const uploadMetadata = {
      publicId,
      projectId,
      fileName,
      fileSize,
      uploadedBy: uploadedBy || req.user.uid,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      companyId: req.user.companyId,
      cloudinaryUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`
    };

    const docRef = await db.collection('projects').doc(projectId)
      .collection('uploads').add(uploadMetadata);

    await logAudit('UPLOAD_PHOTO', req.user.uid, projectId, {
      fileName,
      publicId,
      requestId: req.id
    });

    res.json({ id: docRef.id, ...uploadMetadata });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== AUDIT LOG ENDPOINTS ======

// Get audit logs
app.get('/api/audit-logs', apiLimiter, verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', req.user.companyId || req.user.uid)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create audit log
app.post('/api/audit-logs', apiLimiter, verifyToken, async (req, res) => {
  try {
    const { action, projectId, details } = req.body;
    await logAudit(action, req.user.uid, projectId, { ...details, requestId: req.id });
    res.json({ success: true, message: 'Audit log created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs summary
app.get('/api/audit-logs/summary', apiLimiter, verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('audit_logs')
      .where('companyId', '==', req.user.companyId || req.user.uid)
      .get();

    const summary = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      summary[data.action] = (summary[data.action] || 0) + 1;
    });

    res.json({ summary, total: snapshot.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== EXPORT HANDLER FOR VERCEL ======
module.exports = app;

// Local development
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
