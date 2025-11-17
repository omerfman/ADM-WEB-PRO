# Firestore Security Rules Testing Guide

## Overview

This guide provides manual and automated testing strategies for Firestore Security Rules in the ADM Construction Project Management System.

## Security Rules Summary

### Roles
- **superadmin**: Full system access, company management
- **admin**: Company-level operations, user management, reports
- **operator**: Project updates, log entries, stock management
- **finance**: Payment management
- **viewer**: Read-only access

### Access Control Pattern
All operations are controlled by:
1. **Role-based access** (`request.auth.token.role`)
2. **Company ID match** (`resource.data.companyId == userCompanyId()`)
3. **Document-level security** (subcollections inherit parent rules)

---

## Manual Testing Scenarios

### Test 1: Superadmin Full Access

**Scenario**: Superadmin user should access all companies and resources

**Test Steps**:
1. Create superadmin user via Admin SDK
   ```bash
   node admin-scripts/create-superadmin.js
   ```

2. Login with superadmin credentials
   ```
   Email: admin@adm.com
   Password: ChangeMe!2025
   ```

3. Verify superadmin can:
   - ✅ Read all companies
   - ✅ Create new companies
   - ✅ Read all users (any company)
   - ✅ Read all projects (any company)
   - ✅ Access audit logs globally

**Expected Result**: All operations succeed

---

### Test 2: Admin Company-Level Access

**Scenario**: Admin should only access resources within their company

**Test Steps**:
1. Create admin user in default-company
   ```javascript
   await auth.createUser({
     email: 'admin-company@adm.com',
     password: 'Test@2025',
     displayName: 'Company Admin'
   });
   
   await auth.setCustomUserClaims(uid, {
     role: 'admin',
     companyId: 'default-company'
   });
   ```

2. Admin creates a new project in their company
   ```javascript
   db.collection('projects').add({
     name: 'Test Project',
     companyId: 'default-company'
   });
   ```

3. Verify:
   - ✅ Can create projects in own company
   - ✅ Can read projects in own company
   - ❌ Cannot read projects from other companies

**Expected Result**: Company-level isolation enforced

---

### Test 3: Unauthorized Cross-Company Access

**Scenario**: User from Company A should NOT access Company B's resources

**Test Steps**:
1. Create two companies: `company-a`, `company-b`

2. Create users:
   - `user-a@adm.com` in `company-a` (admin role)
   - `user-b@adm.com` in `company-b` (admin role)

3. User A attempts to read User B's projects:
   ```javascript
   db.collection('projects')
     .where('companyId', '==', 'company-b')
     .get();  // Should return empty or be denied
   ```

4. Verify:
   - ❌ Query returns 0 results (due to Firestore rules filtering)
   - ❌ Or explicit permission denied error

**Expected Result**: Access denied by Firestore Rules

---

### Test 4: Role-Based Permission Enforcement

**Scenario**: Different roles have different permissions

**Test Cases**:

#### Operator Role
```javascript
// Can read and create logs
✅ db.collection('projects').doc('proj-001')
     .collection('logs').add({ ... })

// Can read stocks
✅ db.collection('projects').doc('proj-001')
     .collection('stocks').get()

// Cannot delete projects
❌ db.collection('projects').doc('proj-001').delete()
```

#### Finance Role
```javascript
// Can manage payments
✅ db.collection('projects').doc('proj-001')
     .collection('payments').add({ ... })

// Cannot delete logs
❌ db.collection('projects').doc('proj-001')
     .collection('logs').doc('log-001').delete()
```

#### Viewer Role
```javascript
// Can only read
✅ db.collection('projects').get()

// Cannot create anything
❌ db.collection('projects').add({ ... })
```

**Expected Result**: Each role can only perform allowed operations

---

### Test 5: Subcollection Security Inheritance

**Scenario**: Subcollection access is controlled by parent document

**Test Steps**:
1. Create project in default-company
2. Try to access logs from different company using direct path
   ```javascript
   db.collection('projects').doc('proj-from-other-company')
     .collection('logs').get()
   ```

3. Verify:
   - ❌ Permission denied

**Expected Result**: Cannot bypass security through direct subcollection access

---

## Automated Testing with Firestore Emulator

### Setup Emulator

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only firestore
```

### Test with Jest/Mocha

Example test file:

```javascript
// tests/firestore-rules.test.js
const firebase = require('@firebase/testing');

const projectId = 'adm-construction-test';

// Test: Superadmin can read companies
test('superadmin can read companies', async () => {
  const db = firebase.initializeTestApp({
    projectId,
    auth: {
      uid: 'superadmin-uid',
      token: { role: 'superadmin' }
    }
  }).firestore();

  const snapshot = await db.collection('companies').get();
  expect(snapshot.size).toBeGreaterThan(0);
});

// Test: Operator cannot delete projects
test('operator cannot delete projects', async () => {
  const db = firebase.initializeTestApp({
    projectId,
    auth: {
      uid: 'operator-uid',
      token: {
        role: 'operator',
        companyId: 'default-company'
      }
    }
  }).firestore();

  await expect(
    db.collection('projects').doc('proj-001').delete()
  ).rejects.toThrow('Missing or insufficient permissions');
});
```

Run tests:
```bash
npm test -- firestore-rules.test.js
```

---

## Security Audit Checklist

- [ ] All collections have read/write rules defined
- [ ] Role-based access is enforced
- [ ] Company ID matching prevents cross-company access
- [ ] Subcollections inherit parent security
- [ ] Default rule is "deny all" (`allow read, write: if false;`)
- [ ] No wildcard (`{document=**}`) access without conditions
- [ ] Audit logs are restricted to admins
- [ ] Users can only read/update own profile
- [ ] Sensitive operations require specific roles

---

## Deployment Checklist

### Before Deploying to Production

1. **Test all scenarios** (automated + manual)
2. **Review firestore.rules** for any loose permissions
3. **Verify role assignments** in Firebase Console
4. **Set up monitoring** for Firestore access patterns
5. **Test with emulator** in staging environment
6. **Document exceptions** to standard rules (if any)

### Deploy Rules

```bash
# Deploy to Firebase
firebase deploy --only firestore:rules

# Or via Firebase Console
# Settings → Rules → Publish
```

### Monitor After Deployment

1. **Monitor Firestore Usage**:
   - Go to Firebase Console → Firestore
   - Check "Usage" tab for denied reads/writes
   - Look for unusual access patterns

2. **Monitor Audit Logs**:
   - Check `audit_logs` collection
   - Look for unauthorized access attempts
   - Monitor failed operations

3. **Set up Alerts**:
   - High error rates
   - Unusual access patterns
   - Quota exceeded warnings

---

## Troubleshooting

### "Missing or insufficient permissions" Error

**Cause**: User doesn't have required role or companyId mismatch

**Solution**:
1. Verify user's custom claims in Firebase Console
2. Check user's `companyId` matches document's `companyId`
3. Verify role is correctly set

### Rules Changes Not Taking Effect

**Cause**: Rules not deployed or cached

**Solution**:
```bash
# Redeploy rules
firebase deploy --only firestore:rules

# Clear browser cache
# Logout and login again
```

### Cross-Company Data Leakage

**Symptoms**: Users see data from other companies

**Verification**:
1. Check rules are correctly applied
2. Verify user's `companyId` in custom claims
3. Check audit logs for unauthorized access
4. Review Firestore Rules in Firebase Console

---

## References

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Testing Library](https://github.com/firebase/firebase-js-sdk/tree/master/packages/testing)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
