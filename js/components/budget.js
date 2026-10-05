/* ============================================================
   预算页（F5）
   ============================================================ */

(function (global) {
  'use strict';

  const Budget = {
    name: 'Budget',
    props: ['store'],
    setup(props) {
      const { ref, computed } = Vue;
      const store = props.store;

      const showModal = ref(false);
      const editing = ref(null); // 正在编辑的预算

      const form = ref({
        scope: 'total',
        categoryId: null,
        amount: '',
      });

      const currentBudgets = computed(() =>
        store.state.budgets.filter((b) => b.bookId === store.state.currentBookId)
      );

      const expenseCategories = computed(() =>
        store.categoriesForBook(store.state.currentBookId, 'expense')
      );

      const range = computed(() => Utils.getRange('month'));

      function getSpent(scope, categoryId) {
        return store.currentRecords.value
          .filter((r) => {
            if (r.type !== 'expense') return false;
            if (scope === 'category' && r.categoryId !== categoryId) return false;
            const t = new Date(r.occurredAt);
            return t >= range.value.start && t <= range.value.end;
          })
          .reduce((s, r) => s + r.amount, 0);
      }

      function openCreate() {
        editing.value = null;
        form.value = { scope: 'total', categoryId: null, amount: '' };
        showModal.value = true;
      }

      function openEdit(b) {
        editing.value = b;
        form.value = {
          scope: b.scope,
          categoryId: b.categoryId,
          amount: String(b.amount),
        };
        showModal.value = true;
      }

      function save() {
        const v = Utils.parseAmount(form.value.amount);
        if (!v) return Utils.toast('请输入有效金额');

        if (form.value.scope === 'category' && !form.value.categoryId) {
          return Utils.toast('请选择分类');
        }

        // 同一账本同 scope 同 category 唯一
        if (editing.value) {
          store.deleteBudget(editing.value.id);
        }
        store.setBudget(
          form.value.scope,
          form.value.scope === 'total' ? null : form.value.categoryId,
          v,
          'monthly'
        );
        showModal.value = false;
        Utils.toast('预算已保存', 'success');
      }

      function removeBudget(b) {
        if (!confirm('确定删除该预算？')) return;
        store.deleteBudget(b.id);
        Utils.toast('已删除');
      }

      function getCatName(id) {
        const c = store.state.categories.find((x) => x.id === id);
        return c ? c.name : '未分类';
      }

      function progressClass(ratio) {
        if (ratio >= 1) return 'danger';
        if (ratio >= 0.8) return 'warn';
        return '';
      }

      return {
        showModal, form, currentBudgets, expenseCategories,
        openCreate, openEdit, save, removeBudget,
        getSpent, getCatName, progressClass,
      };
    },
    template: `
      <div class="page">
        <div class="card">
          <div class="card-title">
            <span>月度预算</span>
            <button class="card-title-extra" @click="openCreate">+ 添加</button>
          </div>

          <div v-if="currentBudgets.length === 0" class="empty-state">
            <div class="empty-icon">🎯</div>
            <div class="empty-text">还没有设置预算</div>
            <div class="empty-hint">设置预算，超支时自动提醒</div>
          </div>

          <div v-for="b in currentBudgets" :key="b.id" class="budget-card">
            <div class="budget-header">
              <div class="budget-title">
                <span v-if="b.scope === 'total'">总预算</span>
                <span v-else>{{ getCatName(b.categoryId) }}</span>
              </div>
              <div>
                <button class="btn-text" style="font-size:var(--font-xs)" @click="openEdit(b)">编辑</button>
                <button class="btn-text btn-danger-text" style="font-size:var(--font-xs)" @click="removeBudget(b)">删除</button>
              </div>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :class="progressClass(getSpent(b.scope, b.categoryId) / b.amount)"
                :style="{ width: Math.min(100, (getSpent(b.scope, b.categoryId) / b.amount) * 100) + '%' }"
              ></div>
            </div>
            <div class="budget-amount row">
              <span class="flex-1">
                已用 <span class="tabular" style="color:var(--color-text-primary);font-weight:500">{{ Utils.formatMoney(getSpent(b.scope, b.categoryId)) }}</span>
                / 预算 {{ Utils.formatMoney(b.amount) }}
              </span>
              <span class="tabular">{{ Math.round((getSpent(b.scope, b.categoryId) / b.amount) * 100) }}%</span>
            </div>
          </div>
        </div>

        <!-- 弹窗 -->
        <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
          <div class="modal-content">
            <div class="modal-title">{{ editing ? '编辑预算' : '添加预算' }}</div>

            <div class="form-field">
              <div class="form-field-label">预算范围</div>
              <div class="type-switch">
                <button
                  class="type-switch-btn"
                  :class="{ active: form.scope === 'total' }"
                  @click="form.scope = 'total'"
                >总预算</button>
                <button
                  class="type-switch-btn"
                  :class="{ active: form.scope === 'category' }"
                  @click="form.scope = 'category'"
                >分类预算</button>
              </div>
            </div>

            <div v-if="form.scope === 'category'" class="form-field">
              <div class="form-field-label">选择分类</div>
              <select v-model="form.categoryId" class="form-input">
                <option :value="null">请选择</option>
                <option v-for="c in expenseCategories" :key="c.id" :value="c.id">
                  {{ c.icon }} {{ c.name }}
                </option>
              </select>
            </div>

            <div class="form-field">
              <div class="form-field-label">预算金额 (¥)</div>
              <input
                v-model="form.amount"
                class="form-input"
                type="text"
                inputmode="decimal"
                placeholder="0.00"
              />
            </div>

            <div class="modal-actions">
              <button class="btn btn-outline" @click="showModal = false">取消</button>
              <button class="btn btn-primary" @click="save">保存</button>
            </div>
          </div>
        </div>
      </div>
    `,
  };

  global.Budget = Budget;
})(window);
