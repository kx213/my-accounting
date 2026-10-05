/* ============================================================
   记录详情/编辑（F8）
   ============================================================ */

(function (global) {
  'use strict';

  const RecordDetail = {
    name: 'RecordDetail',
    props: ['store', 'recordId'],
    setup(props) {
      const { reactive, computed, ref } = Vue;
      const store = props.store;

      const editing = ref(false);
      const pendingDelete = ref(false);
      let deleteTimer = null;

      const record = computed(() => store.findRecord(props.recordId));

      const form = reactive({
        type: 'expense',
        amount: '',
        categoryId: null,
        note: '',
        occurredAt: new Date().toISOString(),
      });

      function loadFromRecord() {
        if (!record.value) return;
        form.type = record.value.type;
        form.amount = String(record.value.amount);
        form.categoryId = record.value.categoryId;
        form.note = record.value.note || '';
        form.occurredAt = record.value.occurredAt;
      }

      const categories = computed(() =>
        store.categoriesForBook(store.state.currentBookId, form.type)
      );

      const canSave = computed(() => {
        const v = Utils.parseAmount(form.amount);
        return v && v > 0 && form.categoryId;
      });

      function startEdit() {
        loadFromRecord();
        editing.value = true;
      }

      function cancelEdit() {
        editing.value = false;
      }

      function saveEdit() {
        const v = Utils.parseAmount(form.amount);
        if (!v) return Utils.toast('请输入有效金额');
        if (!form.categoryId) return Utils.toast('请选择分类');
        store.updateRecord(props.recordId, {
          type: form.type,
          amount: v,
          categoryId: form.categoryId,
          note: form.note,
          occurredAt: form.occurredAt,
        });
        editing.value = false;
        Utils.toast('已保存', 'success');
        Utils.vibrate(15);
      }

      function selectType(type) {
        form.type = type;
        const c = store.state.categories.find((x) => x.id === form.categoryId);
        if (!c || c.type !== type) form.categoryId = null;
      }

      function selectCategory(id) {
        form.categoryId = id;
      }

      function startDelete() {
        if (pendingDelete.value) {
          // 二次确认：执行删除
          clearTimeout(deleteTimer);
          store.deleteRecord(props.recordId);
          Utils.toast('已删除', 'success');
          window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'Home' } }));
        } else {
          pendingDelete.value = true;
          Utils.toast('再点一次确认删除（5秒内）');
          deleteTimer = setTimeout(() => {
            pendingDelete.value = false;
          }, 5000);
        }
      }

      function getCat(id) {
        return store.state.categories.find((c) => c.id === id) || { name: '未分类', icon: '❓' };
      }

      function back() {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'Home' } }));
      }

      return {
        record, editing, pendingDelete, form, categories, canSave,
        startEdit, cancelEdit, saveEdit, selectType, selectCategory,
        startDelete, getCat, back,
      };
    },
    template: `
      <div class="page" v-if="record">
        <div class="top-bar" style="margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-4) + 0px) var(--space-3); padding: var(--space-3) var(--space-4); background:transparent; border:none; position:relative;">
          <button class="top-bar-btn" @click="back">‹ 返回</button>
          <span class="top-bar-title" style="font-size:var(--font-md)">记录详情</span>
          <button v-if="!editing" class="top-bar-btn" @click="startEdit">编辑</button>
          <span v-else style="width: 40px"></span>
        </div>

        <!-- 浏览态 -->
        <div v-if="!editing" class="card">
          <div style="text-align:center;padding: var(--space-5) 0">
            <div style="font-size: 60px; margin-bottom: var(--space-3)">{{ getCat(record.categoryId).icon }}</div>
            <div
              class="tabular"
              :style="{
                fontSize: 'var(--font-3xl)',
                fontWeight: '600',
                color: record.type === 'expense' ? 'var(--color-expense)' : 'var(--color-income)',
                marginBottom: 'var(--space-2)'
              }"
            >
              {{ record.type === 'expense' ? '-' : '+' }}{{ Utils.formatMoney(record.amount, false) }}
            </div>
            <div class="text-secondary">{{ getCat(record.categoryId).name }}</div>
            <div class="text-tertiary mt-2" style="font-size:var(--font-sm)">
              {{ Utils.formatDate(record.occurredAt, 'YYYY-MM-DD HH:mm') }}
            </div>
          </div>

          <div v-if="record.note" class="divider"></div>
          <div v-if="record.note" style="padding: var(--space-2) 0">
            <div class="text-tertiary" style="font-size:var(--font-xs);margin-bottom:4px">备注</div>
            <div>{{ record.note }}</div>
          </div>

          <div v-if="record.updatedAt && record.updatedAt !== record.createdAt" class="empty-hint mt-3" style="text-align:center">
            该记录已编辑 · 创建于 {{ Utils.formatDate(record.createdAt, 'YYYY-MM-DD HH:mm') }}
          </div>
        </div>

        <!-- 删除 -->
        <button
          v-if="!editing"
          class="btn btn-outline"
          style="color:var(--color-expense);border-color:var(--color-expense)"
          @click="startDelete"
        >
          {{ pendingDelete ? '再次点击确认删除' : '删除记录' }}
        </button>

        <!-- 编辑态 -->
        <div v-if="editing" class="record-form">
          <div class="type-switch">
            <button
              class="type-switch-btn expense"
              :class="{ active: form.type === 'expense' }"
              @click="selectType('expense')"
            >支出</button>
            <button
              class="type-switch-btn income"
              :class="{ active: form.type === 'income' }"
              @click="selectType('income')"
            >收入</button>
          </div>

          <div class="amount-input-wrap">
            <span class="amount-currency">¥</span>
            <input
              v-model="form.amount"
              class="amount-input"
              :class="form.type"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              maxlength="10"
            />
          </div>

          <div class="form-field">
            <div class="form-field-label">分类</div>
            <div class="category-grid" v-if="categories.length">
              <div
                v-for="c in categories"
                :key="c.id"
                class="category-item"
                :class="{ selected: form.categoryId === c.id, expense: form.type === 'expense' }"
                @click="selectCategory(c.id)"
              >
                <div class="category-icon">{{ c.icon }}</div>
                <div class="category-name">{{ c.name }}</div>
              </div>
            </div>
          </div>

          <div class="form-field">
            <div class="form-field-label">备注</div>
            <textarea v-model="form.note" class="note-input" rows="2" maxlength="50"></textarea>
          </div>

          <div class="form-field">
            <div class="form-field-label">时间</div>
            <input
              type="datetime-local"
              class="form-input"
              :value="Utils.formatDate(form.occurredAt, 'YYYY-MM-DDTHH:mm')"
              @input="form.occurredAt = new Date($event.target.value).toISOString()"
            />
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" :disabled="!canSave" @click="saveEdit">保存</button>
          </div>
        </div>
      </div>

      <div v-else class="page">
        <div class="empty-state">
          <div class="empty-icon">❓</div>
          <div class="empty-text">记录不存在或已被删除</div>
          <button class="btn btn-primary mt-3" style="max-width:200px;margin: 16px auto 0" @click="back">返回首页</button>
        </div>
      </div>
    `,
  };

  global.RecordDetail = RecordDetail;
})(window);
