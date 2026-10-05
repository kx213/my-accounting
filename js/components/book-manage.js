/* ============================================================
   账本管理（F6 - 本地版，云端协作留 V2.0）
   ============================================================ */

(function (global) {
  'use strict';

  const BookManage = {
    name: 'BookManage',
    props: ['store'],
    setup(props) {
      const { ref, computed } = Vue;
      const store = props.store;

      const showAdd = ref(false);
      const showRename = ref(false);
      const renaming = ref(null);
      const newName = ref('');
      const newType = ref('personal');

      function openAdd() {
        newName.value = '';
        newType.value = 'personal';
        showAdd.value = true;
      }

      function create() {
        if (!newName.value.trim()) return Utils.toast('请输入账本名');
        store.addBook(newName.value.trim(), newType.value);
        showAdd.value = false;
      }

      function openRename(b) {
        renaming.value = b;
        newName.value = b.name;
        showRename.value = true;
      }

      function doRename() {
        if (!renaming.value) return;
        if (!newName.value.trim()) return Utils.toast('请输入账本名');
        store.renameBook(renaming.value.id, newName.value.trim());
        showRename.value = false;
        Utils.toast('已重命名', 'success');
      }

      function pickBook(id) {
        store.setCurrentBook(id);
        Utils.toast('已切换账本');
      }

      function remove(b) {
        const count = store.state.records.filter((r) => r.bookId === b.id).length;
        const msg = count > 0
          ? `账本「${b.name}」内有 ${count} 条记录，删除后无法恢复。\n确定删除吗？`
          : `确定删除账本「${b.name}」吗？`;
        if (!confirm(msg)) return;
        store.deleteBook(b.id);
        Utils.toast('已删除');
      }

      function getRecordCount(id) {
        return store.state.records.filter((r) => r.bookId === id).length;
      }

      return {
        store, showAdd, showRename, renaming, newName, newType,
        openAdd, create, openRename, doRename, pickBook, remove, getRecordCount,
      };
    },
    template: `
      <div class="page">
        <div class="card">
          <div class="card-title">
            <span>所有账本</span>
            <button class="card-title-extra" @click="openAdd">+ 添加</button>
          </div>
          <div class="record-list" style="box-shadow:none">
            <div
              v-for="b in store.state.books"
              :key="b.id"
              class="record-item"
              @click="pickBook(b.id)"
            >
              <div class="record-icon" :class="b.type === 'shared' ? '' : 'expense'">
                {{ b.type === 'shared' ? '👨‍👩‍👧' : '📖' }}
              </div>
              <div class="record-content">
                <div class="record-title">
                  {{ b.name }}
                  <span v-if="b.id === store.state.currentBookId" class="record-edited-tag">当前</span>
                </div>
                <div class="record-meta">
                  {{ b.type === 'shared' ? '共享账本' : '个人账本' }} · {{ getRecordCount(b.id) }} 条记录
                </div>
              </div>
              <button class="btn-text" style="font-size:var(--font-xs)" @click.stop="openRename(b)">重命名</button>
              <button
                v-if="store.state.books.length > 1"
                class="btn-text btn-danger-text"
                style="font-size:var(--font-xs)"
                @click.stop="remove(b)"
              >删除</button>
            </div>
          </div>
        </div>

        <div class="card empty-state" style="padding: var(--space-4)">
          <div style="font-size:var(--font-sm);color:var(--color-text-secondary);margin-bottom:6px">💡 关于共享账本</div>
          <div class="empty-hint" style="line-height:1.6">
            V1.0 仅支持本地多账本。<br/>
            云端共享账本（邀请码加入）将在 V2.0 版本提供。
          </div>
        </div>

        <!-- 添加账本 -->
        <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
          <div class="modal-content">
            <div class="modal-title">新建账本</div>

            <div class="form-field">
              <div class="form-field-label">账本名称</div>
              <input v-model="newName" class="form-input" placeholder="如：家庭、小店" maxlength="20" />
            </div>

            <div class="form-field">
              <div class="form-field-label">类型</div>
              <div class="type-switch">
                <button
                  class="type-switch-btn"
                  :class="{ active: newType === 'personal' }"
                  @click="newType = 'personal'"
                >个人账本</button>
                <button
                  class="type-switch-btn"
                  :class="{ active: newType === 'shared' }"
                  @click="newType = 'shared'"
                >共享账本（V2.0）</button>
              </div>
              <div v-if="newType === 'shared'" class="empty-hint" style="margin-top:4px;color:var(--color-warn)">
                ⚠️ 当前版本暂不支持云端协作，仅作为标记使用
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn btn-outline" @click="showAdd = false">取消</button>
              <button class="btn btn-primary" @click="create">创建</button>
            </div>
          </div>
        </div>

        <!-- 重命名 -->
        <div v-if="showRename" class="modal-mask" @click.self="showRename = false">
          <div class="modal-content">
            <div class="modal-title">重命名账本</div>
            <div class="form-field">
              <div class="form-field-label">新名称</div>
              <input v-model="newName" class="form-input" maxlength="20" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" @click="showRename = false">取消</button>
              <button class="btn btn-primary" @click="doRename">保存</button>
            </div>
          </div>
        </div>
      </div>
    `,
  };

  global.BookManage = BookManage;
})(window);
