/* ============================================================
   我的页 + 账本管理入口
   ============================================================ */

(function (global) {
  'use strict';

  const Profile = {
    name: 'Profile',
    props: ['store'],
    setup(props) {
      const { ref, computed } = Vue;
      const store = props.store;

      const showBookSwitcher = ref(false);

      function go(view) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view } }));
      }

      function pickBook(id) {
        store.setCurrentBook(id);
        showBookSwitcher.value = false;
      }

      function quickExport() {
        const records = store.currentRecords.value;
        if (records.length === 0) {
          return Utils.toast('当前账本暂无记录');
        }
        const filename = `${store.currentBook.value.name}_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        Utils.exportCSV(records, store.state.categories, filename);
        Utils.toast('已导出 CSV', 'success');
      }

      function exportAll() {
        const data = store.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accounting_backup_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.toast('已导出完整备份', 'success');
      }

      function clearAll() {
        if (!confirm('此操作会清空全部数据（账本、记录、预算、分类），且不可恢复。\n\n确定要继续吗？')) return;
        if (!confirm('再次确认：真的要清空所有数据吗？')) return;
        store.clearAllData();
        Utils.toast('数据已清空', 'success');
      }

      return { showBookSwitcher, store, go, pickBook, quickExport, exportAll, clearAll };
    },
    template: `
      <div class="page">
        <div class="profile-header">
          <div class="profile-nickname">记账小助手</div>
          <div class="profile-book row" @click="showBookSwitcher = true">
            <span>📖 {{ store.currentBook.value.name }}</span>
            <span style="margin-left: 6px">▾</span>
          </div>
        </div>

        <div class="menu-list">
          <div class="menu-item" @click="go('Records')">
            <div class="menu-icon">📋</div>
            <div class="menu-label">全部明细</div>
            <div class="menu-arrow">›</div>
          </div>
          <div class="menu-item" @click="go('BookManage')">
            <div class="menu-icon">📚</div>
            <div class="menu-label">账本管理</div>
            <div class="menu-arrow">›</div>
          </div>
          <div class="menu-item" @click="go('CategoryManage')">
            <div class="menu-icon">🏷️</div>
            <div class="menu-label">分类管理</div>
            <div class="menu-arrow">›</div>
          </div>
          <div class="menu-item" @click="quickExport">
            <div class="menu-icon">📤</div>
            <div class="menu-label">导出当前账本 (CSV)</div>
            <div class="menu-arrow">›</div>
          </div>
          <div class="menu-item" @click="exportAll">
            <div class="menu-icon">💾</div>
            <div class="menu-label">完整备份 (JSON)</div>
            <div class="menu-arrow">›</div>
          </div>
          <div class="menu-item" @click="clearAll">
            <div class="menu-icon" style="background: var(--color-expense-light)">🗑️</div>
            <div class="menu-label" style="color: var(--color-expense)">清空所有数据</div>
            <div class="menu-arrow">›</div>
          </div>
        </div>

        <div class="card mt-3">
          <div style="font-size:var(--font-sm);color:var(--color-text-secondary);text-align:center;padding:8px 0">
            个人记账小产品 · V1.0<br/>
            <span style="font-size:var(--font-xs);color:var(--color-text-tertiary)">数据存于本地浏览器，请定期备份</span>
          </div>
        </div>

        <!-- 账本切换 -->
        <div v-if="showBookSwitcher" class="modal-mask" @click.self="showBookSwitcher = false">
          <div class="modal-content">
            <div class="modal-title">选择账本</div>
            <div
              v-for="b in store.state.books"
              :key="b.id"
              class="menu-item"
              @click="pickBook(b.id)"
            >
              <div class="menu-icon">📖</div>
              <div class="menu-label">
                {{ b.name }}
                <span v-if="b.id === store.state.currentBookId" class="text-tertiary" style="font-size:var(--font-xs)">（当前）</span>
              </div>
              <div v-if="b.id === store.state.currentBookId" style="color:var(--color-primary)">✓</div>
            </div>
            <button class="btn btn-outline mt-3" @click="showBookSwitcher = false; go('BookManage')">+ 管理账本</button>
          </div>
        </div>
      </div>
    `,
  };

  global.Profile = Profile;
})(window);
