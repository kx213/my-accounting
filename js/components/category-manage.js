/* ============================================================
   分类管理（F2）
   ============================================================ */

(function (global) {
  'use strict';

  const EMOJI_OPTIONS = ['🍱','🍔','☕','🚇','🚌','🚗','✈️','🛍️','👕','💄','🎮','🎬','🏠','🛏️','📱','💊','🏥','📚','✏️','☕','🎁','💼','🧾','🔁','📈','💵','📦','🐶','🌸','⚽','🎵','🎨','💰','📌','📎'];

  const CategoryManage = {
    name: 'CategoryManage',
    props: ['store'],
    setup(props) {
      const { ref, computed } = Vue;
      const store = props.store;

      const showAdd = ref(false);
      const showIconPicker = ref(false);
      const editing = ref(null);

      const form = ref({
        name: '',
        icon: '📌',
        type: 'expense',
      });

      const expenseCats = computed(() => store.categoriesForBook(store.state.currentBookId, 'expense'));
      const incomeCats = computed(() => store.categoriesForBook(store.state.currentBookId, 'income'));

      function openAdd(type) {
        editing.value = null;
        form.value = { name: '', icon: '📌', type };
        showAdd.value = true;
      }

      function openEdit(c) {
        editing.value = c;
        form.value = { name: c.name, icon: c.icon, type: c.type };
        showAdd.value = true;
      }

      function save() {
        if (!form.value.name.trim()) return Utils.toast('请输入分类名');
        if (form.value.name.length > 10) return Utils.toast('分类名不超过 10 个字');

        if (editing.value) {
          if (editing.value.isPreset) {
            // 预置分类只能改名（不改图标）
            editing.value.name = form.value.name;
          } else {
            store.updateCategory(editing.value.id, { name: form.value.name, icon: form.value.icon });
          }
          Utils.toast('已保存', 'success');
        } else {
          store.addCategory(form.value.name.trim(), form.value.icon, form.value.type);
          Utils.toast('已添加', 'success');
        }
        showAdd.value = false;
      }

      function remove(c) {
        if (c.isPreset) return Utils.toast('预置分类不可删除');
        // 检查是否被使用
        const used = store.state.records.some((r) => r.categoryId === c.id);
        if (used && !confirm('该分类已被使用，删除后历史记录会显示「未分类」。\n确定删除吗？')) return;
        store.deleteCategory(c.id);
        Utils.toast('已删除');
      }

      function pickIcon(emoji) {
        form.value.icon = emoji;
        showIconPicker.value = false;
      }

      return {
        showAdd, showIconPicker, editing, form,
        expenseCats, incomeCats, EMOJI_OPTIONS,
        openAdd, openEdit, save, remove, pickIcon,
      };
    },
    template: `
      <div class="page">
        <div class="card">
          <div class="card-title">
            <span>支出分类</span>
            <button class="card-title-extra" @click="openAdd('expense')">+ 添加</button>
          </div>
          <div class="record-list" style="box-shadow:none">
            <div v-for="c in expenseCats" :key="c.id" class="record-item">
              <div class="record-icon expense">{{ c.icon }}</div>
              <div class="record-content">
                <div class="record-title">{{ c.name }}</div>
                <div class="record-meta">
                  <span v-if="c.isPreset">预置</span>
                  <span v-else>自定义</span>
                </div>
              </div>
              <button class="btn-text" style="font-size:var(--font-xs)" @click="openEdit(c)">编辑</button>
              <button v-if="!c.isPreset" class="btn-text btn-danger-text" style="font-size:var(--font-xs)" @click="remove(c)">删除</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>收入分类</span>
            <button class="card-title-extra" @click="openAdd('income')">+ 添加</button>
          </div>
          <div class="record-list" style="box-shadow:none">
            <div v-for="c in incomeCats" :key="c.id" class="record-item">
              <div class="record-icon">{{ c.icon }}</div>
              <div class="record-content">
                <div class="record-title">{{ c.name }}</div>
                <div class="record-meta">
                  <span v-if="c.isPreset">预置</span>
                  <span v-else>自定义</span>
                </div>
              </div>
              <button class="btn-text" style="font-size:var(--font-xs)" @click="openEdit(c)">编辑</button>
              <button v-if="!c.isPreset" class="btn-text btn-danger-text" style="font-size:var(--font-xs)" @click="remove(c)">删除</button>
            </div>
          </div>
        </div>

        <div class="card empty-state" style="padding: var(--space-4)">
          <div class="empty-hint">预置分类不可删除，可重命名；自定义分类可自由增删。</div>
        </div>

        <!-- 添加/编辑 弹窗 -->
        <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
          <div class="modal-content">
            <div class="modal-title">{{ editing ? '编辑分类' : '添加分类' }}</div>

            <div class="form-field">
              <div class="form-field-label">类型</div>
              <div class="type-switch">
                <button
                  class="type-switch-btn"
                  :class="{ active: form.type === 'expense' }"
                  :disabled="!!editing"
                  @click="form.type = 'expense'"
                >支出</button>
                <button
                  class="type-switch-btn"
                  :class="{ active: form.type === 'income' }"
                  :disabled="!!editing"
                  @click="form.type = 'income'"
                >收入</button>
              </div>
              <div v-if="editing" class="empty-hint" style="margin-top: 4px">已存在的分类不能修改类型</div>
            </div>

            <div class="form-field">
              <div class="form-field-label">图标</div>
              <button
                class="form-input"
                style="text-align:left;cursor:pointer;font-size:24px"
                @click="showIconPicker = true"
              >
                <span style="margin-right:8px">{{ form.icon }}</span>
                <span class="text-tertiary" style="font-size:var(--font-sm)">点击更换</span>
              </button>
            </div>

            <div class="form-field">
              <div class="form-field-label">名称（≤10 字）</div>
              <input
                v-model="form.name"
                class="form-input"
                placeholder="如：咖啡"
                maxlength="10"
              />
            </div>

            <div class="modal-actions">
              <button class="btn btn-outline" @click="showAdd = false">取消</button>
              <button class="btn btn-primary" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- Emoji 选择 -->
        <div v-if="showIconPicker" class="modal-mask" @click.self="showIconPicker = false">
          <div class="modal-content">
            <div class="modal-title">选择图标</div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">
              <button
                v-for="e in EMOJI_OPTIONS"
                :key="e"
                style="font-size:24px;background:var(--color-bg);border:none;border-radius:8px;padding:10px;cursor:pointer"
                :style="{ border: form.icon === e ? '2px solid var(--color-primary)' : '2px solid transparent' }"
                @click="pickIcon(e)"
              >{{ e }}</button>
            </div>
            <button class="btn btn-outline mt-3" @click="showIconPicker = false">关闭</button>
          </div>
        </div>
      </div>
    `,
  };

  global.CategoryManage = CategoryManage;
})(window);
