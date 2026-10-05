/* ============================================================
   统计页（F4）
   ============================================================ */

(function (global) {
  'use strict';

  const Stats = {
    name: 'Stats',
    props: ['store'],
    setup(props) {
      const { ref, computed, onMounted, watch, nextTick } = Vue;
      const store = props.store;

      const period = ref('month'); // day / week / month / year
      let chartPie = null;
      let chartTrend = null;
      let chartTop = null;

      const range = computed(() => Utils.getRange(period.value));

      const records = computed(() =>
        store.currentRecords.value
          .filter((r) => {
            const t = new Date(r.occurredAt);
            return t >= range.value.start && t <= range.value.end;
          })
      );

      const stats = computed(() => Utils.aggregate(records.value));

      const pieData = computed(() => {
        const arr = Object.entries(stats.value.byCategory)
          .map(([cid, v]) => {
            const c = store.state.categories.find((x) => x.id === cid);
            return {
              name: c ? c.name : '未分类',
              value: Math.round(v.expense * 100) / 100,
            };
          })
          .filter((x) => x.value > 0)
          .sort((a, b) => b.value - a.value);
        return arr;
      });

      const topData = computed(() => pieData.value.slice(0, 5));

      const trendData = computed(() => {
        const map = {};
        Object.keys(stats.value.byDate).forEach((k) => (map[k] = stats.value.byDate[k]));
        const keys = Object.keys(map).sort();
        return {
          categories: keys.map((k) => Utils.formatDate(k, 'MM-DD')),
          expense: keys.map((k) => Math.round((map[k].expense || 0) * 100) / 100),
          income: keys.map((k) => Math.round((map[k].income || 0) * 100) / 100),
        };
      });

      function renderCharts() {
        // 销毁旧实例
        if (chartPie) chartPie.dispose();
        if (chartTrend) chartTrend.dispose();
        if (chartTop) chartTop.dispose();

        const pieEl = document.getElementById('chart-pie');
        const trendEl = document.getElementById('chart-trend');
        const topEl = document.getElementById('chart-top');

        if (!pieEl || !trendEl || !topEl) return;
        if (!global.echarts) return;

        // 环形图
        chartPie = global.echarts.init(pieEl);
        chartPie.setOption({
          tooltip: { trigger: 'item', formatter: '{b}<br/>¥{c} ({d}%)' },
          legend: { orient: 'vertical', right: 10, top: 'middle', textStyle: { fontSize: 12 } },
          series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['38%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            data: pieData.value.map((d, i) => ({
              ...d,
              itemStyle: { color: Utils.colorFor(i) },
            })),
          }],
        });

        // 趋势图
        chartTrend = global.echarts.init(trendEl);
        chartTrend.setOption({
          tooltip: { trigger: 'axis' },
          legend: { data: ['支出', '收入'], top: 0, right: 0, textStyle: { fontSize: 12 } },
          grid: { left: 40, right: 16, top: 32, bottom: 24 },
          xAxis: { type: 'category', data: trendData.value.categories, axisLine: { lineStyle: { color: '#E5E7EB' } }, axisLabel: { fontSize: 10 } },
          yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#F3F4F6' } }, axisLabel: { fontSize: 10 } },
          series: [
            {
              name: '支出',
              type: 'bar',
              data: trendData.value.expense,
              itemStyle: { color: '#E85D5D', borderRadius: [4, 4, 0, 0] },
              barWidth: '40%',
            },
            {
              name: '收入',
              type: 'bar',
              data: trendData.value.income,
              itemStyle: { color: '#4FB3A9', borderRadius: [4, 4, 0, 0] },
              barWidth: '40%',
            },
          ],
        });

        // Top 排行
        if (topData.value.length > 0) {
          chartTop = global.echarts.init(topEl);
          chartTop.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: 60, right: 24, top: 8, bottom: 24 },
            xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#F3F4F6' } }, axisLabel: { fontSize: 10 } },
            yAxis: { type: 'category', data: topData.value.map((d) => d.name).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
            series: [{
              type: 'bar',
              data: topData.value.map((d) => d.value).reverse(),
              itemStyle: {
                color: (params) => Utils.colorFor(topData.value.length - 1 - params.dataIndex),
                borderRadius: [0, 4, 4, 0],
              },
              label: { show: true, position: 'right', formatter: (p) => '¥' + p.value.toFixed(0), fontSize: 10 },
              barWidth: '50%',
            }],
          });
        }
      }

      function onResize() {
        chartPie && chartPie.resize();
        chartTrend && chartTrend.resize();
        chartTop && chartTop.resize();
      }

      onMounted(() => {
        nextTick(() => renderCharts());
        window.addEventListener('resize', onResize);
      });

      watch([period, () => store.state.records.length], () => {
        nextTick(() => renderCharts());
      });

      return { period, stats, pieData, topData };
    },
    template: `
      <div class="page">
        <div class="stat-tabs">
          <button class="stat-tab" :class="{ active: period === 'day' }" @click="period = 'day'">日</button>
          <button class="stat-tab" :class="{ active: period === 'week' }" @click="period = 'week'">周</button>
          <button class="stat-tab" :class="{ active: period === 'month' }" @click="period = 'month'">月</button>
          <button class="stat-tab" :class="{ active: period === 'year' }" @click="period = 'year'">年</button>
        </div>

        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-card-label">收入</div>
            <div class="stat-card-value income">{{ Utils.formatMoney(stats.totalIncome) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">支出</div>
            <div class="stat-card-value expense">{{ Utils.formatMoney(stats.totalExpense) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">结余</div>
            <div class="stat-card-value balance">{{ Utils.formatMoney(stats.balance) }}</div>
          </div>
        </div>

        <div v-if="stats.count === 0" class="card empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">本周期还没有记录</div>
          <div class="empty-hint">先去记一笔吧</div>
        </div>

        <template v-else>
          <div class="chart-card" v-if="pieData.length > 0">
            <div class="chart-title">支出分类占比</div>
            <div id="chart-pie" class="chart-container"></div>
          </div>

          <div class="chart-card" v-if="trendData && Object.keys(trendData).length">
            <div class="chart-title">收支趋势</div>
            <div id="chart-trend" class="chart-container"></div>
          </div>

          <div class="chart-card" v-if="topData.length > 0">
            <div class="chart-title">分类 Top {{ topData.length }}</div>
            <div id="chart-top" class="chart-container-tall"></div>
          </div>
        </template>
      </div>
    `,
  };

  global.Stats = Stats;
})(window);
