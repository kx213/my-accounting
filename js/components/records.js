/* ============================================================
   收支明细列表（F3）
   - 时间筛选（今天/本周/本月/全部/自定义）
   - 类型筛选（全部/支出/收入）
   - 分类筛选（多选）
   - 备注关键字搜索
   ============================================================ */

(function (global) {
  'use strict';

  const Records = {
    name: 'Records',
    props: ['store'],
    setup(props) {
      const { ref, computed, watch } = Vue;
      const store = props.store;

      // ---- 筛选状态 ----
      const filterPeriod = ref('month'); // today / week / month / all / custom
      const filterType = ref('all');     // all / expense / income
      const filterCategoryIds = ref([]); // [] 表示全部
      const searchKeyword = ref('');
      const customStart = ref('');
      const customEnd = ref('');
      const showCategoryPicker = ref(false);

      // ---- 计算：实际时间范围 ----
      const dateRange = computed(() => {
        if (filterPeriod.value === 'all') {
          return { start: null, end: null };
        }
        if (filterPeriod.value === 'custom') {
          return {
            start: customStart.value ? Utils.startOfDay(customStart.value) : null,
            end: customEnd.value ? Utils.endOfDay(customEnd.value) : null,
          };
        }
        const map = { today: 'day', week: 'week', month: 'month' };
        return Utils.getRange(map[filterPeriod.value]);
      });

      // ---- 计算：筛选后的记录 ----
      const filteredRecords = computed(() => {
        const { start, end } = dateRange.value;
        const keyword = searchKeyword.value.trim().toLowerCase();
        const catIds = filterCategoryIds.value;
        const type = filterType.value;

        return store.currentRecords.value
          .filter((r) => {
            if (type !== 'all' && r.type !== type) return false;
            if (catIds.length > 0 && !catIds.includes(r.categoryId)) return false;
            const t = new Date(r.occurredAt);
            if (start && t < start) return false;
            if (end && t > end) return false;
            if (keyword && !(r.note || '').toLowerCase().includes(keyword)) return false;
            return true;
          })
          .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
      });

      // 按天分组
      const groupedRecords = computed(() => Utils.groupByDay(filteredRecords.value));

      // 总览数据
      const summary = computed(() => {
        const stats = { expense: 0, income: 0, count: filteredRecords.value.length };
        filteredRecords.value.forEach((r) => (stats[r.type] += r.amount));
        return stats;
      });

      // 所有分类（用于分类筛选器）
      const allCategories = computed(() => {
        return store.state.categories
          .filter((c) => filterType.value === 'all' || c.type === filterType.value)
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder);
      });

      // ---- 方法 ----
      function setPeriod(p) {
        filterPeriod.value = p;
        if (p !== 'custom') {
          customStart.value = '';
          customEnd.value = '';
        }
      }

      function setType(t) {
        filterType.value = t;
        // 切换类型后清空已选分类（避免类型不匹配）
        filterCategoryIds.value = [];
      }

      function toggleCategory(id) {
        const idx = filterCategoryIds.value.indexOf(id);
        if (idx >= 0) filterCategoryIds.value.splice(idx, 1);
        else filterCategoryIds.value.push(id);
      }

      function clearCategoryFilter() {
        filterCategoryIds.value = [];
      }

      function resetFilters() {
        filterPeriod.value = 'month';
        filterType.value = 'all';
        filterCategoryIds.value = [];
        searchKeyword.value = '';
        customStart.value = '';
        customEnd.value = '';
      }

      function onRecordClick(id) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'RecordDetail', id } }));
      }

      function getCategoryName(id) {
        const c = store.state.categories.find((x) => x.id === id);
        return c ? c : { name: '未分类', icon: '❓' };
      }

      // 选中分类的名称（用于显示 chip）
      const selectedCategoryNames = computed(() => {
        if (filterCategoryIds.value.length === 0) return '';
        if (filterCategoryIds.value.length === allCategories.value.length) return '全部分类';
        const names = filterCategoryIds.value
          .map((id) => getCategoryName(id).name)
          .slice(0, 2);
        const extra = filterCategoryIds.value.length - names.length;
        return extra > 0 ? names.join('、') + ` 等${filterCategoryIds.value.length}项` : names.join('、');
      });

      // 当类型切换时关闭 picker（picker 内容会变化）
      watch(filterType, () => {
        if (showCategoryPicker.value) showCategoryPicker.value = false;
      });

      return {
        filterPeriod, filterType, filterCategoryIds, searchKeyword,
        customStart, customEnd, showCategoryPicker,
        filteredRecords, groupedRecords, summary, allCategories,
        dateRange, selectedCategoryNames,
        setPeriod, setType, toggleCategory, clearCategoryFilter,
        resetFilters, onRecordClick, getCategoryName,
      };
    },
    template: `
      <div class="page records-page">
        <!-- 搜索框 -->
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            class="search-input"
            type="search"
            placeholder="搜索备注内容..."
            enterkeyhint="search"
          />
          <button
            v-if="searchKeyword"
            class="search-clear"
            @click="searchKeyword = ''"
            aria-label="清空搜索"
          >×</button>
        </div>

        <!-- 筛选条 -->
        <div class="filter-row">
          <div class="filter-chip-group">
            <button
              class="filter-chip"
              :class="{ active: filterPeriod === 'today' }"
              @click="setPeriod('today')"
            >今天</button>
            <button
              class="filter-chip"
              :class="{ active: filterPeriod === 'week' }"
              @click="setPeriod('week')"
            >本周</button>
            <button
              class="filter-chip"
              :class="{ active: filterPeriod === 'month' }"
              @click="setPeriod('month')"
            >本月</button>
            <button
              class="filter-chip"
              :class="{ active: filterPeriod === 'all' }"
              @click="setPeriod('all')"
            >全部</button>
            <button
              class="filter-chip"
              :class="{ active: filterPeriod === 'custom' }"
              @click="setPeriod('custom')"
            >自定义</button>
          </div>
        </div>

        <!-- 自定义日期范围 -->
        <div v-if="filterPeriod === 'custom'" class="custom-range">
          <input
            v-model="customStart"
            type="date"
            class="form-input date-input"
            placeholder="开始日期"
          />
          <span class="range-sep">至</span>
          <input
            v-model="customEnd"
            type="date"
            class="form-input date-input"
            placeholder="结束日期"
          />
        </div>

        <div class="filter-row">
          <div class="filter-chip-group">
            <button
              class="filter-chip"
              :class="{ active: filterType === 'all' }"
              @click="setType('all')"
            >全部类型</button>
            <button
              class="filter-chip expense"
              :class="{ active: filterType === 'expense' }"
              @click="setType('expense')"
            >支出</button>
            <button
              class="filter-chip income"
              :class="{ active: filterType === 'income' }"
              @click="setType('income')"
            >收入</button>
          </div>
        </div>

        <div class="filter-row">
          <button
            class="filter-chip category-trigger"
            :class="{ active: filterCategoryIds.length > 0 }"
            @click="showCategoryPicker = true"
          >
            <span v-if="filterCategoryIds.length === 0">🏷️ 选择分类</span>
            <span v-else>🏷️ {{ selectedCategoryNames }}</span>
            <span v-if="filterCategoryIds.length > 0" class="chip-clear" @click.stop="clearCategoryFilter">×</span>
          </button>
          <button
            v-if="filterPeriod !== 'month' || filterType !== 'all' || filterCategoryIds.length > 0 || searchKeyword"
            class="filter-chip reset-chip"
            @click="resetFilters"
          >↺ 重置</button>
        </div>

        <!-- 结果汇总 -->
        <div class="result-summary card">
          <div class="summary-row">
            <div class="summary-block">
              <div class="summary-block-label">支出</div>
              <div class="summary-block-value expense">{{ Utils.formatMoney(summary.expense) }}</div>
            </div>
            <div class="summary-block">
              <div class="summary-block-label">收入</div>
              <div class="summary-block-value income">{{ Utils.formatMoney(summary.income) }}</div>
            </div>
            <div class="summary-block">
              <div class="summary-block-label">结余</div>
              <div class="summary-block-value balance">{{ Utils.formatMoney(summary.income - summary.expense) }}</div>
            </div>
            <div class="summary-block">
              <div class="summary-block-label">笔数</div>
              <div class="summary-block-value">{{ summary.count }}</div>
            </div>
          </div>
        </div>

        <!-- 列表 -->
        <div v-if="groupedRecords.length === 0" class="card empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">没有符合条件的记录</div>
          <div class="empty-hint">尝试调整筛选条件或搜索关键字</div>
        </div>

        <div v-else class="records-list">
          <div
            v-for="group in groupedRecords"
            :key="group.day"
            class="record-day-group"
          >
            <div class="record-day-header">
              <span>{{ group.label }}</span>
              <span class="day-total">
                <span v-if="group.totalExpense > 0" class="expense">-{{ Utils.formatMoney(group.totalExpense, false) }}</span>
                <span v-if="group.totalIncome > 0" class="income">+{{ Utils.formatMoney(group.totalIncome, false) }}</span>
              </span>
            </div>
            <div class="record-list" style="box-shadow:none">
              <div
                v-for="r in group.items"
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

        <!-- 分类多选弹窗 -->
        <div v-if="showCategoryPicker" class="modal-mask" @click.self="showCategoryPicker = false">
          <div class="modal-content">
            <div class="modal-title">选择分类（多选）</div>

            <div v-if="allCategories.length === 0" class="empty-state" style="padding: 20px">
              <div class="empty-text">暂无分类</div>
            </div>

            <div v-else class="category-picker-grid">
              <div
                v-for="c in allCategories"
                :key="c.id"
                class="category-picker-item"
                :class="{ selected: filterCategoryIds.includes(c.id) }"
                @click="toggleCategory(c.id)"
              >
                <div class="category-icon">{{ c.icon }}</div>
                <div class="category-name">{{ c.name }}</div>
                <div v-if="filterCategoryIds.includes(c.id)" class="check-mark">✓</div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn btn-outline" @click="clearCategoryFilter">清空</button>
              <button class="btn btn-primary" @click="showCategoryPicker = false">
                确定 ({{ filterCategoryIds.length === 0 ? '全部' : filterCategoryIds.length + '项' }})
              </button>
            </div>
          </div>
        </div>
      </div>
    `,
  };

  global.Records = Records;
})(window);
