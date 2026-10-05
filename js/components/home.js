/* ============================================================
   首页 - 记账（F1）
   ============================================================ */

(function (global) {
  'use strict';

  const Home = {
    name: 'Home',
    props: ['store'],
    setup(props) {
      const { ref, computed, reactive, onMounted, watch } = Vue;
      const store = props.store;

      // ---- 表单状态 ----
      const form = reactive({
        type: store.state.lastUsedType || 'expense',
        amount: '',
        categoryId: store.state.lastUsedCategory || null,
        note: '',
        occurredAt: new Date().toISOString(),
      });

      // 上次用的分类如果被删了，要回退
      watch(
        () => form.categoryId,
        () => {}
      );

      // ---- 计算 ----
      const categories = computed(() => store.categoriesForBook(store.state.currentBookId, form.type));

      const todayRecords = computed(() => {
        const today = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        return store.currentRecords.value
          .filter((r) => Utils.formatDate(r.occurredAt, 'YYYY-MM-DD') === today)
          .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
      });

      const todayStats = computed(() => {
        const stats = { expense: 0, income: 0 };
        todayRecords.value.forEach((r) => {
          stats[r.type] += r.amount;
        });
        return stats;
      });

      const canSubmit = computed(() => {
        const v = Utils.parseAmount(form.amount);
        return v && v > 0 && form.categoryId;
      });

      // ---- 方法 ----
      function selectType(type) {
        form.type = type;
        // 切换类型后，如果当前分类不是该类型，清空
        const c = store.state.categories.find((x) => x.id === form.categoryId);
        if (!c || c.type !== type) form.categoryId = null;
      }

      function selectCategory(id) {
        form.categoryId = id;
      }

      function setNow() {
        form.occurredAt = new Date().toISOString();
      }

      function submit() {
        const v = Utils.parseAmount(form.amount);
        if (!v) return Utils.toast('请输入金额');
        if (!form.categoryId) return Utils.toast('请选择分类');

        store.addRecord({
          type: form.type,
          amount: v,
          categoryId: form.categoryId,
          note: form.note,
          occurredAt: form.occurredAt,
        });

        const cat = store.state.categories.find((c) => c.id === form.categoryId);
        Utils.toast(`已记 ${Utils.formatMoney(v)} ${cat ? '· ' + cat.name : ''}`, 'success');
        Utils.vibrate(15);

        // 清空金额和备注，保留分类与类型，方便连续记录
        form.amount = '';
        form.note = '';
      }

      function getCategoryName(id) {
        const c = store.state.categories.find((x) => x.id === id);
        return c ? c : { name: '未分类', icon: '❓' };
      }

      function onRecordClick(id) {
        // 触发自定义事件让 App 处理跳转
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'RecordDetail', id } }));
      }

      function onCategoryManageClick() {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'CategoryManage' } }));
      }

      function onRecordsClick() {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'Records' } }));
      }

      // 自动聚焦金额输入
      onMounted(() => {
        const input = document.querySelector('.amount-input');
        if (input) setTimeout(() => input.focus(), 100);
      });

      return { form, categories, todayRecords, todayStats, canSubmit,
               selectType, selectCategory, setNow, submit, getCategoryName,
               onRecordClick, onCategoryManageClick, onRecordsClick };
    },
    template: `
      <div class="page">
        <!-- 顶部汇总 -->
        <div class="summary-card">
          <div class="summary-label">今日支出</div>
          <div class="summary-amount">{{ Utils.formatMoney(todayStats.expense) }}</div>
          <div class="summary-sub">
            <div class="summary-sub-item">
              <div class="label">今日收入</div>
              <div>{{ Utils.formatMoney(todayStats.income) }}</div>
            </div>
            <div class="summary-sub-item" style="text-align:right">
              <div class="label">今日结余</div>
              <div>{{ Utils.formatMoney(todayStats.income - todayStats.expense) }}</div>
            </div>
          </div>
        </div>

        <!-- 记账表单 -->
        <div class="record-form">
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
            <div class="form-field-label row">
              <span class="flex-1">分类</span>
              <button class="btn-text" style="font-size: var(--font-xs)" @click="onCategoryManageClick">管理</button>
            </div>
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
            <div v-else class="empty-state" style="padding: 20px">
              <div class="empty-text">暂无{{ form.type === 'expense' ? '支出' : '收入' }}分类</div>
              <button class="btn-text" @click="onCategoryManageClick">+ 添加分类</button>
            </div>
          </div>

          <div class="form-field">
            <div class="form-field-label">备注</div>
            <textarea
              v-model="form.note"
              class="note-input"
              placeholder="选填，≤50 字"
              rows="2"
              maxlength="50"
            ></textarea>
          </div>

          <div class="form-field">
            <div class="form-field-label row">
              <span class="flex-1">时间</span>
              <button class="btn-text" style="font-size: var(--font-xs)" @click="setNow">回到当前</button>
            </div>
            <input
              type="datetime-local"
              class="form-input"
              :value="Utils.formatDate(form.occurredAt, 'YYYY-MM-DDTHH:mm')"
              @input="form.occurredAt = new Date($event.target.value).toISOString()"
            />
          </div>

          <button
            class="btn btn-primary"
            :class="form.type"
            :disabled="!canSubmit"
            @click="submit"
          >记一笔</button>
        </div>

        <!-- 今日明细 -->
        <div class="card">
          <div class="card-title">
            <span>今日明细</span>
            <span style="display:flex;align-items:center;gap:12px">
              <span class="card-title-extra">{{ todayRecords.length }} 笔</span>
              <button class="btn-text" style="font-size:var(--font-sm);font-weight:500" @click="onRecordsClick">查看全部 ›</button>
            </span>
          </div>
          <div v-if="todayRecords.length === 0" class="empty-state">
            <div class="empty-icon">🌱</div>
            <div class="empty-text">今天还没有记账</div>
            <div class="empty-hint">试试记一笔午餐 ¥35</div>
          </div>
          <div v-else class="record-list" style="box-shadow:none">
            <div
              v-for="r in todayRecords"
              :key="r.id"
              class="record-item"
              @click="onRecordClick(r.id)"
            >
              <div class="record-icon" :class="r.type">
                {{ getCategoryName(r.categoryId).icon }}
              </div>
              <div class="record-content">
                <div class="record-title">
                  {{ getCategoryName(r.categoryId).name }}
                  <span v-if="r.updatedAt && r.updatedAt !== r.createdAt" class="record-edited-tag">已编辑</span>
                </div>
                <div class="record-meta">
                  {{ Utils.formatDate(r.occurredAt, 'HH:mm') }}
                  <span v-if="r.note"> · {{ r.note }}</span>
                </div>
              </div>
              <div class="record-amount" :class="r.type">
                {{ r.type === 'expense' ? '-' : '+' }}{{ Utils.formatMoney(r.amount, false) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  };

  global.Home = Home;
})(window);
