# 🧪 Role-Based System Testing Plan

## Test Credentials

### Super Admin
- **Email**: super@adm.com
- **Password**: SuperAdmin123!
- **Expected**: Access to all companies and users tabs

### Company Admin (ADM)
- **Email**: admin-adm@adm.com
- **Password**: AdminADM123!
- **Company**: company-adm
- **Expected**: Access to users tab, can manage users in their company

### Regular User (ADM)
- **Email**: user-adm@adm.com
- **Password**: UserADM123!
- **Company**: company-adm
- **Expected**: Only projects tab visible, no admin panels

### Company Admin (BuildCo)
- **Email**: admin-build@buildco.com
- **Password**: AdminBuild123!
- **Company**: company-build
- **Expected**: Access to users tab, can manage users in their company

### Regular User (BuildCo)
- **Email**: user-build@buildco.com
- **Password**: UserBuild123!
- **Company**: company-build
- **Expected**: Only projects tab visible, no admin panels

## Test Cases

### 1. Super Admin Login (super@adm.com)
- [ ] Login succeeds
- [ ] "Super Admin" role displayed
- [ ] Both "Kullanıcılar" and "Şirketler" tabs visible
- [ ] Can switch to "Kullanıcılar" tab
- [ ] Can switch to "Şirketler" tab
- [ ] Can view all companies
- [ ] Can create new company

### 2. Company Admin Login (admin-adm@adm.com)
- [ ] Login succeeds
- [ ] "Şirket Admin" role displayed
- [ ] "Kullanıcılar" tab visible
- [ ] "Şirketler" tab NOT visible
- [ ] Can switch to "Kullanıcılar" tab
- [ ] Can view company users
- [ ] Can create new user

### 3. Regular User Login (user-adm@adm.com)
- [ ] Login succeeds
- [ ] "Kullanıcı" role displayed
- [ ] Only "Projeler" tab visible
- [ ] "Kullanıcılar" tab NOT visible
- [ ] "Şirketler" tab NOT visible
- [ ] Can view projects

### 4. Project Management
- [ ] Can view existing projects
- [ ] Project detail opens with tabs
- [ ] Can add logs to projects
- [ ] Can add stock to projects
- [ ] Can add payments to projects

### 5. Company Isolation
- [ ] admin-adm@adm.com can only see company-adm users
- [ ] admin-build@buildco.com can only see company-build users
- [ ] admin-adm@adm.com can only see company-adm projects
- [ ] admin-build@buildco.com can only see company-build projects

## Known Issues to Fix
- [ ] Modal styling may need adjustments
- [ ] Form validation messages
- [ ] Loading states for async operations
- [ ] Error handling improvements

