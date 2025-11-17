// ========== DEBUG & CONSOLE MONITORING ==========
// Add this to the end of app.js for debugging

console.log('🔍 DEBUG: App.js loaded');
console.log('🔍 DEBUG: window.auth =', typeof window.auth);
console.log('🔍 DEBUG: window.db =', typeof window.db);
console.log('🔍 DEBUG: window.firestore =', typeof window.firestore);

// Monitor function availability
setTimeout(() => {
  console.log('\n✅ FUNCTION AVAILABILITY CHECK:');
  console.log('  switchDashboardTab:', typeof switchDashboardTab);
  console.log('  openCreateUserModal:', typeof openCreateUserModal);
  console.log('  handleCreateUser:', typeof handleCreateUser);
  console.log('  loadUsers:', typeof loadUsers);
  console.log('  openCreateCompanyModal:', typeof openCreateCompanyModal);
  console.log('  handleCreateCompany:', typeof handleCreateCompany);
  console.log('  loadCompanies:', typeof loadCompanies);
  console.log('  toggleTheme:', typeof toggleTheme);
  console.log('  initializeTheme:', typeof initializeTheme);
}, 2000);

// Monitor auth state
if (window.auth) {
  window.auth.onAuthStateChanged((user) => {
    console.log('\n🔐 AUTH STATE CHANGED:');
    if (user) {
      console.log('  User:', user.email);
      console.log('  Role:', window.userRole);
      console.log('  Company:', window.userCompanyId);
    } else {
      console.log('  No user logged in');
    }
  });
}
