/* ============================================================
   全局状态 - 用 Vue reactive 实现简易 Store
   ============================================================ */

(function (global) {
  'use strict';

  const { reactive, computed, watch } = Vue;

  // ---- 预设分类 ----
  const PRESET_EXPENSE = [
    { name: '餐饮', icon: '🍱' },
    { name: '交通', icon: '🚇' },
    { name: '购物', icon: '🛍️' },
    { name: '娱乐', icon: '🎮' },
    { name: '居家', icon: '🏠' },
    { name: '通讯', icon: '📱' },
    { name: '医疗', icon: '💊' },
    { name: '学习', icon: '📚' },
    { name: '社交', icon: '☕' },
    { name: '其他', icon: '📦' },
  ];

  const PRESET_INCOME = [
    { name: '工资', icon: '💼' },
    { name: '奖金', icon: '🎁' },
    { name: '报销', icon: '🧾' },
    { name: '转账', icon: '🔁' },
    { name: '投资', icon: '📈' },
    { name: '其他', icon: '💵' },
  ];

  function makePreset(type, sortBase) {
    return (type === 'expense' ? PRESET_EXPENSE : PRESET_INCOME).map((c, i) => ({
      id: 'c_' + type + '_' + i,
      name: c.name,
      icon: c.icon,
      type,
      isPreset: true,
      sortOrder: sortBase + i,
      bookId: null, // 预设为全局可见
    }));
  }

  // ---- 默认数据 ----
  function defaultCategories() {
    return [
      ...makePreset('expense', 0),
      ...makePreset('income', 100),
    ];
  }

  function defaultBooks() {
    return [
      {
        id: 'b_default',
        name: '个人账本',
        type: 'personal',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // ---- 创建 store ----
  function createStore() {
    const state = reactive({
      books: Storage.get(Storage.keys.books) || defaultBooks(),
      currentBookId: Storage.get(Storage.keys.currentBookId) || 'b_default',
      categories: Storage.get(Storage.keys.categories) || defaultCategories(),
      records: Storage.get(Storage.keys.records) || [],
      budgets: Storage.get(Storage.keys.budgets) || [],
      lastUsedCategory: Storage.get(Storage.keys.lastUsedCategory) || null,
      lastUsedType: Storage.get(Storage.keys.lastUsedType) || 'expense',
      onboarded: Storage.get(Storage.keys.onboarded) || false,
    });

    // ---- 持久化 ----
    watch(() => state.books, (v) => Storage.set(Storage.keys.books, v), { deep: true });
    watch(() => state.currentBookId, (v) => Storage.set(Storage.keys.currentBookId, v));
    watch(() => state.categories, (v) => Storage.set(Storage.keys.categories, v), { deep: true });
    watch(() => state.records, (v) => Storage.set(Storage.keys.records, v), { deep: true });
    watch(() => state.budgets, (v) => Storage.set(Storage.keys.budgets, v), { deep: true });
    watch(() => state.lastUsedCategory, (v) => Storage.set(Storage.keys.lastUsedCategory, v));
    watch(() => state.lastUsedType, (v) => Storage.set(Storage.keys.lastUsedType, v));
    watch(() => state.onboarded, (v) => Storage.set(Storage.keys.onboarded, v));

    // ---- 计算 ----
    const currentBook = computed(() =>
      state.books.find((b) => b.id === state.currentBookId) || state.books[0]
    );

    const currentRecords = computed(() =>
      state.records.filter((r) => r.bookId === state.currentBookId)
    );

    const categoriesForBook = (bookId, type) =>
      state.categories
        .filter((c) => c.type === type)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    // ---- 操作 ----

    function setCurrentBook(id) {
      if (state.books.find((b) => b.id === id)) state.currentBookId = id;
    }

    function addBook(name, type = 'personal') {
      const book = {
        id: 'b_' + Utils.uuid(),
        name: (name || '新账本').slice(0, 20),
        type,
        createdAt: new Date().toISOString(),
      };
      state.books.push(book);
      state.currentBookId = book.id;
      Utils.toast('已创建账本', 'success');
      return book;
    }

    function deleteBook(id) {
      if (state.books.length <= 1) {
        Utils.toast('至少保留一个账本');
        return false;
      }
      state.records = state.records.filter((r) => r.bookId !== id);
      state.budgets = state.budgets.filter((b) => b.bookId !== id);
      state.books = state.books.filter((b) => b.id !== id);
      if (state.currentBookId === id) state.currentBookId = state.books[0].id;
      return true;
    }

    function renameBook(id, name) {
      const b = state.books.find((x) => x.id === id);
      if (b) b.name = name;
    }

    function addCategory(name, icon, type) {
      const c = {
        id: 'c_' + Utils.uuid(),
        name: (name || '').slice(0, 10),
        icon: icon || '📌',
        type,
        isPreset: false,
        sortOrder: 9999,
        bookId: null,
      };
      state.categories.push(c);
      return c;
    }

    function updateCategory(id, patch) {
      const c = state.categories.find((x) => x.id === id);
      if (!c) return;
      if (!c.isPreset && patch.name) c.name = patch.name;
      if (patch.icon) c.icon = patch.icon;
    }

    function deleteCategory(id) {
      const c = state.categories.find((x) => x.id === id);
      if (!c || c.isPreset) {
        Utils.toast('预置分类不可删除');
        return false;
      }
      state.categories = state.categories.filter((x) => x.id !== id);
      return true;
    }

    function addRecord(rec) {
      const record = {
        id: 'r_' + Utils.uuid(),
        bookId: state.currentBookId,
        type: rec.type,
        amount: rec.amount,
        categoryId: rec.categoryId,
        note: (rec.note || '').slice(0, 50),
        occurredAt: rec.occurredAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.records.push(record);
      state.lastUsedCategory = rec.categoryId;
      state.lastUsedType = rec.type;

      // 触发预算检查
      checkBudgetAfterRecord(record);
      return record;
    }

    function updateRecord(id, patch) {
      const r = state.records.find((x) => x.id === id);
      if (!r) return;
      Object.assign(r, patch, { updatedAt: new Date().toISOString() });
      checkBudgetAfterRecord(r);
    }

    function deleteRecord(id) {
      state.records = state.records.filter((r) => r.id !== id);
    }

    function findRecord(id) {
      return state.records.find((r) => r.id === id);
    }

    function setBudget(scope, categoryId, amount, period = 'monthly') {
      const existing = state.budgets.find(
        (b) => b.bookId === state.currentBookId && b.scope === scope && b.categoryId === categoryId
      );
      if (existing) {
        existing.amount = amount;
        existing.period = period;
      } else {
        state.budgets.push({
          id: 'bg_' + Utils.uuid(),
          bookId: state.currentBookId,
          scope,
          categoryId: categoryId || null,
          amount,
          period,
          createdAt: new Date().toISOString(),
        });
      }
    }

    function deleteBudget(id) {
      state.budgets = state.budgets.filter((b) => b.id !== id);
    }

    function findBudget(scope, categoryId) {
      return state.budgets.find(
        (b) => b.bookId === state.currentBookId && b.scope === scope && b.categoryId === (categoryId || null)
      );
    }

    function checkBudgetAfterRecord(record) {
      if (record.type !== 'expense') return;
      const range = Utils.getRange('month');
      const monthExpense = state.records
        .filter(
          (r) =>
            r.bookId === record.bookId &&
            r.type === 'expense' &&
            new Date(r.occurredAt) >= range.start &&
            new Date(r.occurredAt) <= range.end
        )
        .reduce((s, r) => s + r.amount, 0);

      // 分类预算检查
      const catBudget = findBudget('category', record.categoryId);
      if (catBudget) {
        const catExpense = state.records
          .filter(
            (r) =>
              r.bookId === record.bookId &&
              r.type === 'expense' &&
              r.categoryId === record.categoryId &&
              new Date(r.occurredAt) >= range.start &&
              new Date(r.occurredAt) <= range.end
          )
          .reduce((s, r) => s + r.amount, 0);
        const ratio = catExpense / catBudget.amount;
        if (ratio >= 1) {
          const cat = state.categories.find((c) => c.id === record.categoryId);
          Utils.toast(`「${cat ? cat.name : ''}」分类已超预算`, 'error');
        } else if (ratio >= 0.8) {
          const cat = state.categories.find((c) => c.id === record.categoryId);
          Utils.toast(`「${cat ? cat.name : ''}」分类预算已用 ${Math.round(ratio * 100)}%`, 'error');
        }
      }

      // 总预算检查
      const totalBudget = findBudget('total', null);
      if (totalBudget) {
        const ratio = monthExpense / totalBudget.amount;
        if (ratio >= 1) {
          Utils.toast(`本月总预算已超额 ${Utils.formatMoney(monthExpense - totalBudget.amount)}`, 'error');
        } else if (ratio >= 0.8) {
          Utils.toast(`本月总预算已用 ${Math.round(ratio * 100)}%`, 'error');
        }
      }
    }

    function exportAll() {
      return {
        books: state.books,
        categories: state.categories,
        records: state.records,
        budgets: state.budgets,
        exportedAt: new Date().toISOString(),
      };
    }

    function clearAllData() {
      Storage.clearAll();
      state.books = defaultBooks();
      state.currentBookId = 'b_default';
      state.categories = defaultCategories();
      state.records = [];
      state.budgets = [];
      state.lastUsedCategory = null;
      state.lastUsedType = 'expense';
      state.onboarded = false;
    }

    return {
      state,
      currentBook,
      currentRecords,
      categoriesForBook,
      setCurrentBook,
      addBook,
      deleteBook,
      renameBook,
      addCategory,
      updateCategory,
      deleteCategory,
      addRecord,
      updateRecord,
      deleteRecord,
      findRecord,
      setBudget,
      deleteBudget,
      findBudget,
      exportAll,
      clearAllData,
    };
  }

  global.createStore = createStore;
})(window);
