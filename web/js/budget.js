/**
 * Budget Management Module
 * Bütçe Takibi ve Harcama Kontrolü
 */

import { auth, db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentProjectBudget = null;

/**
 * Open budget management modal for a project
 */
async function openBudgetModal(projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      showAlert('Proje bulunamadı', 'danger');
      return;
    }

    const project = projectSnap.data();
    currentProjectBudget = {
      projectId,
      projectName: project.name,
      totalBudget: project.budget || 0,
      currency: project.currency || 'TRY'
    };

    // Update modal
    document.getElementById('budgetProjectName').textContent = project.name;
    document.getElementById('budgetTotalAmount').value = project.budget || 0;
    document.getElementById('budgetCurrency').value = project.currency || 'TRY';

    // Load budget data
    await loadBudgetCategories(projectId);
    await loadBudgetExpenses(projectId);
    await calculateBudgetSummary(projectId);

    // Show modal
    document.getElementById('budgetModal').classList.add('show');
    console.log(`✅ Budget modal opened for project: ${projectId}`);
  } catch (error) {
    console.error('❌ Error opening budget modal:', error);
    showAlert('Bütçe yüklenirken hata: ' + error.message, 'danger');
  }
}

/**
 * Close budget modal
 */
function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('show');
  currentProjectBudget = null;
}

/**
 * Update project total budget
 */
async function updateProjectBudget(event) {
  event.preventDefault();

  if (!currentProjectBudget) {
    showAlert('Hata: Proje seçilmemiş', 'danger');
    return;
  }

  const totalBudget = parseFloat(document.getElementById('budgetTotalAmount').value);
  const currency = document.getElementById('budgetCurrency').value;

  try {
    const projectRef = doc(db, 'projects', currentProjectBudget.projectId);
    await updateDoc(projectRef, {
      budget: totalBudget,
      currency: currency,
      updatedAt: serverTimestamp()
    });

    currentProjectBudget.totalBudget = totalBudget;
    currentProjectBudget.currency = currency;

    showAlert('✅ Proje bütçesi güncellendi!', 'success');
    await calculateBudgetSummary(currentProjectBudget.projectId);
  } catch (error) {
    console.error('❌ Error updating budget:', error);
    showAlert('Bütçe güncellenirken hata: ' + error.message, 'danger');
  }
}

/**
 * Load budget categories
 */
async function loadBudgetCategories(projectId) {
  try {
    const categoriesRef = collection(db, 'projects', projectId, 'budget_categories');
    const q = query(categoriesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    const categoriesList = document.getElementById('budgetCategoriesList');
    categoriesList.innerHTML = '';

    if (snapshot.empty) {
      categoriesList.innerHTML = '<p style="color: #999; padding: 1rem; text-align: center;">Henüz kategori yok. "Kategori Ekle" butonunu kullanın.</p>';
      return;
    }

    let totalAllocated = 0;

    for (const docSnap of snapshot.docs) {
      const category = docSnap.data();
      const spent = await calculateCategorySpent(projectId, category.name);
      const remaining = (category.allocated || 0) - spent;
      const percentage = category.allocated > 0 ? (spent / category.allocated * 100) : 0;
      totalAllocated += category.allocated || 0;

      const categoryItem = document.createElement('div');
      categoryItem.style.cssText = 'padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--card-bg); margin-bottom: 0.75rem;';
      
      const statusColor = percentage > 100 ? '#f44336' : percentage > 80 ? '#ff9800' : '#4caf50';

      categoryItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div style="flex: 1;">
            <strong style="color: var(--primary-color); font-size: 1rem;">${category.name}</strong>
            <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.85rem;">${category.description || ''}</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="editBudgetCategory('${projectId}', '${docSnap.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              ✏️ Düzenle
            </button>
            <button onclick="deleteBudgetCategory('${projectId}', '${docSnap.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: #f44336;">
              🗑️ Sil
            </button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 0.75rem;">
          <div>
            <div style="font-size: 0.75rem; color: #999; margin-bottom: 0.25rem;">Planlanan</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #2196F3;">₺${(category.allocated || 0).toLocaleString('tr-TR')}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #999; margin-bottom: 0.25rem;">Harcanan</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: ${statusColor};">₺${spent.toLocaleString('tr-TR')}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #999; margin-bottom: 0.25rem;">Kalan</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: ${remaining >= 0 ? '#4caf50' : '#f44336'};">₺${remaining.toLocaleString('tr-TR')}</div>
          </div>
        </div>
        <div style="margin-top: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
            <span>Kullanım Oranı</span>
            <span style="font-weight: bold; color: ${statusColor};">${percentage.toFixed(1)}%</span>
          </div>
          <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: ${statusColor}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s;"></div>
          </div>
        </div>
      `;
      categoriesList.appendChild(categoryItem);
    }

    console.log(`✅ ${snapshot.size} kategori yüklendi. Toplam planlanan: ₺${totalAllocated.toLocaleString('tr-TR')}`);
  } catch (error) {
    console.error('❌ Error loading categories:', error);
    document.getElementById('budgetCategoriesList').innerHTML = '<p style="color: red; text-align: center; padding: 1rem;">Kategoriler yüklenirken hata oluştu</p>';
  }
}

/**
 * Calculate spent amount for a category
 */
async function calculateCategorySpent(projectId, categoryName) {
  try {
    const expensesRef = collection(db, 'projects', projectId, 'budget_expenses');
    const q = query(expensesRef, where('category', '==', categoryName));
    const snapshot = await getDocs(q);

    let total = 0;
    snapshot.forEach(doc => {
      const expense = doc.data();
      total += expense.amount || 0;
    });

    return total;
  } catch (error) {
    console.error('❌ Error calculating spent:', error);
    return 0;
  }
}

/**
 * Load budget expenses
 */
async function loadBudgetExpenses(projectId) {
  try {
    const expensesRef = collection(db, 'projects', projectId, 'budget_expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    const expensesList = document.getElementById('budgetExpensesList');
    expensesList.innerHTML = '';

    if (snapshot.empty) {
      expensesList.innerHTML = '<p style="color: #999; padding: 1rem; text-align: center;">Henüz harcama kaydı yok</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const expense = docSnap.data();
      const expenseDate = expense.date?.toDate ? expense.date.toDate().toLocaleDateString('tr-TR') : '-';

      const expenseItem = document.createElement('div');
      expenseItem.style.cssText = 'padding: 1rem; border-bottom: 1px solid var(--border-color); background: var(--card-bg);';
      expenseItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong style="color: var(--primary-color);">${expense.description || 'Harcama'}</strong>
            <div style="margin-top: 0.25rem; font-size: 0.85rem; color: #666;">
              📁 ${expense.category} • 📅 ${expenseDate}
            </div>
            ${expense.notes ? `<div style="margin-top: 0.25rem; font-size: 0.85rem; color: #999;">💬 ${expense.notes}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.2rem; font-weight: bold; color: #f44336;">₺${(expense.amount || 0).toLocaleString('tr-TR')}</div>
            <button onclick="deleteBudgetExpense('${projectId}', '${docSnap.id}')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem; margin-top: 0.25rem;">🗑️</button>
          </div>
        </div>
      `;
      expensesList.appendChild(expenseItem);
    });

    console.log(`✅ ${snapshot.size} harcama kaydı yüklendi`);
  } catch (error) {
    console.error('❌ Error loading expenses:', error);
    document.getElementById('budgetExpensesList').innerHTML = '<p style="color: red; text-align: center; padding: 1rem;">Harcamalar yüklenirken hata oluştu</p>';
  }
}

/**
 * Calculate and display budget summary
 */
async function calculateBudgetSummary(projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    const project = projectSnap.data();
    const totalBudget = project.budget || 0;

    // Calculate total expenses
    const expensesRef = collection(db, 'projects', projectId, 'budget_expenses');
    const expensesSnap = await getDocs(expensesRef);
    
    let totalExpenses = 0;
    expensesSnap.forEach(doc => {
      totalExpenses += doc.data().amount || 0;
    });

    // Calculate from stocks
    const stocksRef = collection(db, 'projects', projectId, 'stocks');
    const stocksSnap = await getDocs(stocksRef);
    
    let stocksTotal = 0;
    stocksSnap.forEach(doc => {
      const stock = doc.data();
      stocksTotal += (stock.quantity || 0) * (stock.unitPrice || 0);
    });

    // Calculate from payments
    const paymentsRef = collection(db, 'projects', projectId, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    
    let paymentsTotal = 0;
    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      paymentsTotal += payment.amount || (payment.unitPrice || 0) * (payment.quantity || 1);
    });

    const grandTotal = totalExpenses + stocksTotal + paymentsTotal;
    const remaining = totalBudget - grandTotal;
    const percentage = totalBudget > 0 ? (grandTotal / totalBudget * 100) : 0;

    // Update summary display
    document.getElementById('budgetSummaryTotal').textContent = totalBudget.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryExpenses').textContent = totalExpenses.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryStocks').textContent = stocksTotal.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryPayments').textContent = paymentsTotal.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryGrandTotal').textContent = grandTotal.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryRemaining').textContent = remaining.toLocaleString('tr-TR');
    document.getElementById('budgetSummaryPercentage').textContent = percentage.toFixed(1) + '%';

    // Update colors
    const remainingEl = document.getElementById('budgetSummaryRemaining');
    const percentageEl = document.getElementById('budgetSummaryPercentage');
    
    if (percentage > 100) {
      remainingEl.style.color = '#f44336';
      percentageEl.style.color = '#f44336';
    } else if (percentage > 80) {
      remainingEl.style.color = '#ff9800';
      percentageEl.style.color = '#ff9800';
    } else {
      remainingEl.style.color = '#4caf50';
      percentageEl.style.color = '#4caf50';
    }

    // Update progress bar
    const progressBar = document.getElementById('budgetProgressBar');
    const barColor = percentage > 100 ? '#f44336' : percentage > 80 ? '#ff9800' : '#4caf50';
    progressBar.style.background = barColor;
    progressBar.style.width = Math.min(percentage, 100) + '%';

    console.log(`✅ Bütçe özeti hesaplandı: ₺${grandTotal.toLocaleString('tr-TR')} / ₺${totalBudget.toLocaleString('tr-TR')}`);
  } catch (error) {
    console.error('❌ Error calculating summary:', error);
  }
}

/**
 * Add budget category
 */
async function addBudgetCategory(event) {
  event.preventDefault();

  if (!currentProjectBudget) {
    showAlert('Hata: Proje seçilmemiş', 'danger');
    return;
  }

  const name = document.getElementById('categoryName').value;
  const allocated = parseFloat(document.getElementById('categoryAllocated').value);
  const description = document.getElementById('categoryDescription').value;

  try {
    const categoriesRef = collection(db, 'projects', currentProjectBudget.projectId, 'budget_categories');
    await addDoc(categoriesRef, {
      name,
      allocated,
      description,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });

    showAlert('✅ Kategori eklendi!', 'success');
    closeAddCategoryModal();
    await loadBudgetCategories(currentProjectBudget.projectId);
    await calculateBudgetSummary(currentProjectBudget.projectId);
  } catch (error) {
    console.error('❌ Error adding category:', error);
    showAlert('Kategori eklenirken hata: ' + error.message, 'danger');
  }
}

/**
 * Add budget expense
 */
async function addBudgetExpense(event) {
  event.preventDefault();

  if (!currentProjectBudget) {
    showAlert('Hata: Proje seçilmemiş', 'danger');
    return;
  }

  const category = document.getElementById('expenseCategory').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const description = document.getElementById('expenseDescription').value;
  const date = new Date(document.getElementById('expenseDate').value);
  const notes = document.getElementById('expenseNotes').value;

  try {
    const expensesRef = collection(db, 'projects', currentProjectBudget.projectId, 'budget_expenses');
    await addDoc(expensesRef, {
      category,
      amount,
      description,
      date: date,
      notes,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid,
      createdByEmail: auth.currentUser.email
    });

    showAlert('✅ Harcama kaydı eklendi!', 'success');
    closeAddExpenseModal();
    await loadBudgetExpenses(currentProjectBudget.projectId);
    await loadBudgetCategories(currentProjectBudget.projectId);
    await calculateBudgetSummary(currentProjectBudget.projectId);
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    showAlert('Harcama eklenirken hata: ' + error.message, 'danger');
  }
}

/**
 * Delete budget category
 */
async function deleteBudgetCategory(projectId, categoryId) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', projectId, 'budget_categories', categoryId));
    showAlert('Kategori silindi', 'success');
    await loadBudgetCategories(projectId);
    await calculateBudgetSummary(projectId);
  } catch (error) {
    showAlert('Silme işlemi başarısız: ' + error.message, 'danger');
  }
}

/**
 * Delete budget expense
 */
async function deleteBudgetExpense(projectId, expenseId) {
  if (!confirm('Bu harcama kaydını silmek istediğinize emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', projectId, 'budget_expenses', expenseId));
    showAlert('Harcama kaydı silindi', 'success');
    await loadBudgetExpenses(projectId);
    await loadBudgetCategories(projectId);
    await calculateBudgetSummary(projectId);
  } catch (error) {
    showAlert('Silme işlemi başarısız: ' + error.message, 'danger');
  }
}

/**
 * Modal control functions
 */
function openAddCategoryModal() {
  document.getElementById('addCategoryModal').classList.add('show');
}

function closeAddCategoryModal() {
  document.getElementById('addCategoryModal').classList.remove('show');
  document.getElementById('addCategoryForm').reset();
}

function openAddExpenseModal() {
  // Load categories for dropdown
  loadCategoriesForDropdown();
  // Set today's date as default
  document.getElementById('expenseDate').valueAsDate = new Date();
  document.getElementById('addExpenseModal').classList.add('show');
}

function closeAddExpenseModal() {
  document.getElementById('addExpenseModal').classList.remove('show');
  document.getElementById('addExpenseForm').reset();
}

/**
 * Load categories for expense dropdown
 */
async function loadCategoriesForDropdown() {
  if (!currentProjectBudget) return;

  try {
    const categoriesRef = collection(db, 'projects', currentProjectBudget.projectId, 'budget_categories');
    const q = query(categoriesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    const select = document.getElementById('expenseCategory');
    select.innerHTML = '<option value="">Kategori Seçin</option>';

    snapshot.forEach(doc => {
      const category = doc.data();
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('❌ Error loading categories for dropdown:', error);
  }
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
window.openBudgetModal = openBudgetModal;
window.closeBudgetModal = closeBudgetModal;
window.updateProjectBudget = updateProjectBudget;
window.openAddCategoryModal = openAddCategoryModal;
window.closeAddCategoryModal = closeAddCategoryModal;
window.addBudgetCategory = addBudgetCategory;
window.openAddExpenseModal = openAddExpenseModal;
window.closeAddExpenseModal = closeAddExpenseModal;
window.addBudgetExpense = addBudgetExpense;
window.deleteBudgetCategory = deleteBudgetCategory;
window.deleteBudgetExpense = deleteBudgetExpense;
