/* ============================================================
   应用入口 - 路由 + 根组件
   ============================================================ */

(function (global) {
  'use strict';

  const { createApp, ref, computed } = Vue;

  const TABS = [
    { key: 'Home', label: '记账', icon: '📒' },
    { key: 'Stats', label: '统计', icon: '📊' },
    { key: 'Budget', label: '预算', icon: '🎯' },
    { key: 'Profile', label: '我的', icon: '👤' },
  ];

  const App = {
    name: 'App',
    setup() {
      const store = createStore();
      const view = ref('Home');
      const params = ref({});

      // 监听导航事件
      window.addEventListener('navigate', (e) => {
        view.value = e.detail.view;
        params.value = e.detail;
      });

      // 浏览器返回键处理
      window.addEventListener('popstate', () => {
        view.value = 'Home';
        params.value = {};
      });

      function switchTab(key) {
        view.value = key;
        params.value = {};
      }

      function goBack() {
        view.value = 'Home';
        params.value = {};
      }

      function startApp() {
        store.state.onboarded = true;
      }

      const isTabView = computed(() =>
        ['Home', 'Stats', 'Budget', 'Profile'].includes(view.value)
      );

      const pageTitle = computed(() => {
        const map = {
          Home: '记账',
          Records: '明细',
          Stats: '统计',
          Budget: '预算',
          Profile: '我的',
          CategoryManage: '分类管理',
          BookManage: '账本管理',
          RecordDetail: '记录详情',
        };
        return map[view.value] || '记账';
      });

      return { view, params, store, TABS, isTabView, pageTitle, switchTab, goBack, startApp };
    },
    template: `
      <div class="app">
        <!-- 引导页：未 onboarding 时全屏显示（无 Tab 栏） -->
        <div v-if="!store.state.onboarded" style="padding: 80px 24px 24px; text-align: center; min-height: 100vh; background: var(--color-bg);">
          <div style="font-size: 72px; margin-bottom: 20px">📒</div>
          <div style="font-size: 24px; font-weight: 600; margin-bottom: 12px; color: var(--color-text-primary)">欢迎使用口袋账本</div>
          <div style="color: var(--color-text-secondary); margin-bottom: 32px; font-size: 14px; line-height: 1.7">
            极简个人记账工具<br/>
            让你 10 秒记一笔，3 秒看懂钱花在哪
          </div>
          <button
            class="btn btn-primary"
            style="max-width: 240px; margin: 0 auto; font-size: 16px;"
            @click="startApp"
          >开始使用</button>
          <div style="margin-top: 32px; font-size: 12px; color: var(--color-text-tertiary)">
            数据保存在本地浏览器，定期导出备份
          </div>
        </div>

        <!-- 正常页面：引导完成后才显示 -->
        <template v-else>
          <!-- 非 Tab 页：显示返回 -->
          <div v-if="!isTabView" class="top-bar">
            <button class="top-bar-btn" @click="goBack">‹ 返回</button>
            <span class="top-bar-title">{{ pageTitle }}</span>
            <span style="width: 40px"></span>
          </div>

          <!-- Tab 页面 -->
          <Home v-if="view === 'Home'" :store="store" />
          <Stats v-else-if="view === 'Stats'" :store="store" />
          <Budget v-else-if="view === 'Budget'" :store="store" />
          <Profile v-else-if="view === 'Profile'" :store="store" />

          <!-- 子页面 -->
          <Records v-else-if="view === 'Records'" :store="store" />
          <CategoryManage v-else-if="view === 'CategoryManage'" :store="store" />
          <BookManage v-else-if="view === 'BookManage'" :store="store" />
          <RecordDetail v-else-if="view === 'RecordDetail'" :store="store" :record-id="params.id" />

          <!-- 底部 Tab -->
          <div v-if="isTabView" class="tab-bar">
            <button
              v-for="t in TABS"
              :key="t.key"
              class="tab-item"
              :class="{ active: view === t.key }"
              @click="switchTab(t.key)"
            >
              <span class="tab-icon">{{ t.icon }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>
        </template>
      </div>
    `,
  };

  global.App = App;
})(window);
