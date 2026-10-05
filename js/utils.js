/* ============================================================
   工具函数 - 日期、金额、UUID、统计计算
   ============================================================ */

(function (global) {
  'use strict';

  const Utils = {};

  // ---- 唯一 ID ----
  Utils.uuid = function () {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  // ---- 金额格式化 ----
  Utils.formatMoney = function (n, withSymbol = true) {
    const v = Number(n) || 0;
    const fixed = v.toFixed(2);
    // 千位分隔
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (withSymbol ? '¥' : '') + parts.join('.');
  };

  Utils.parseAmount = function (str) {
    if (str == null || str === '') return null;
    const v = parseFloat(String(str).replace(/[^\d.-]/g, ''));
    if (isNaN(v) || v <= 0) return null;
    return Math.round(v * 100) / 100;
  };

  // ---- 日期 ----
  Utils.formatDate = function (d, fmt = 'YYYY-MM-DD HH:mm') {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return fmt
      .replace('YYYY', dt.getFullYear())
      .replace('MM', pad(dt.getMonth() + 1))
      .replace('DD', pad(dt.getDate()))
      .replace('HH', pad(dt.getHours()))
      .replace('mm', pad(dt.getMinutes()))
      .replace('ss', pad(dt.getSeconds()));
  };

  Utils.startOfDay = function (d) {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  Utils.endOfDay = function (d) {
    const dt = new Date(d);
    dt.setHours(23, 59, 59, 999);
    return dt;
  };

  Utils.startOfWeek = function (d) {
    // 周一作为一周开始
    const dt = Utils.startOfDay(d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return dt;
  };

  Utils.startOfMonth = function (d) {
    const dt = Utils.startOfDay(d);
    dt.setDate(1);
    return dt;
  };

  Utils.startOfYear = function (d) {
    const dt = Utils.startOfDay(d);
    dt.setMonth(0, 1);
    return dt;
  };

  Utils.daysAgo = function (n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  // 显示友好的日期标签（今天 / 昨天 / 本周 / 日期）
  Utils.friendlyDay = function (d) {
    const today = Utils.startOfDay(new Date()).getTime();
    const target = Utils.startOfDay(d).getTime();
    const diff = Math.round((today - target) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    if (diff > 2 && diff < 7) return diff + ' 天前';
    // 跨年显示年份
    const dt = new Date(d);
    const y = dt.getFullYear();
    const sameYear = y === new Date().getFullYear();
    return Utils.formatDate(d, sameYear ? 'MM-DD' : 'YYYY-MM-DD');
  };

  // ---- 范围筛选 ----
  Utils.getRange = function (period) {
    const now = new Date();
    let start, end;
    switch (period) {
      case 'day':
        start = Utils.startOfDay(now);
        end = Utils.endOfDay(now);
        break;
      case 'week':
        start = Utils.startOfWeek(now);
        end = Utils.endOfDay(now);
        break;
      case 'month':
        start = Utils.startOfMonth(now);
        end = Utils.endOfDay(now);
        break;
      case 'year':
        start = Utils.startOfYear(now);
        end = Utils.endOfDay(now);
        break;
      default:
        start = Utils.startOfDay(now);
        end = Utils.endOfDay(now);
    }
    return { start, end };
  };

  // ---- 触发振动 ----
  Utils.vibrate = function (ms = 10) {
    if (navigator.vibrate) navigator.vibrate(ms);
  };

  // ---- 防抖 ----
  Utils.debounce = function (fn, wait = 300) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  // ---- Toast ----
  Utils.toast = function (msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  // ---- 按日期分组记录 ----
  Utils.groupByDay = function (records) {
    const map = {};
    records.forEach((r) => {
      const key = Utils.formatDate(r.occurredAt, 'YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        day: key,
        label: Utils.friendlyDay(key),
        items: map[key].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)),
        totalExpense: map[key].filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
        totalIncome: map[key].filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
      }));
  };

  // ---- 统计聚合 ----
  Utils.aggregate = function (records) {
    const stats = {
      totalExpense: 0,
      totalIncome: 0,
      count: records.length,
      byCategory: {},
      byDate: {},
      byType: { expense: 0, income: 0 },
    };
    records.forEach((r) => {
      if (r.type === 'expense') stats.totalExpense += r.amount;
      else stats.totalIncome += r.amount;
      stats.byType[r.type] = (stats.byType[r.type] || 0) + r.amount;

      // 按分类
      const ck = r.categoryId || 'other';
      if (!stats.byCategory[ck]) stats.byCategory[ck] = { expense: 0, income: 0, count: 0 };
      stats.byCategory[ck][r.type] += r.amount;
      stats.byCategory[ck].count += 1;

      // 按日
      const dk = Utils.formatDate(r.occurredAt, 'YYYY-MM-DD');
      if (!stats.byDate[dk]) stats.byDate[dk] = { expense: 0, income: 0 };
      stats.byDate[dk][r.type] += r.amount;
    });
    stats.balance = stats.totalIncome - stats.totalExpense;
    return stats;
  };

  // ---- CSV 导出 ----
  Utils.exportCSV = function (records, categories, filename = 'records.csv') {
    const headers = ['时间', '类型', '金额', '分类', '备注'];
    const rows = [headers];
    records.forEach((r) => {
      const cat = categories.find((c) => c.id === r.categoryId);
      rows.push([
        Utils.formatDate(r.occurredAt, 'YYYY-MM-DD HH:mm:ss'),
        r.type === 'expense' ? '支出' : '收入',
        r.amount.toFixed(2),
        cat ? cat.name : '未分类',
        (r.note || '').replace(/[\r\n,]/g, ' '),
      ]);
    });
    // BOM 头让 Excel 识别 UTF-8
    const BOM = '﻿';
    const csv = BOM + rows.map((row) => row.map((cell) => {
      const s = String(cell == null ? '' : cell);
      // 防止 CSV 注入与转义
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---- 颜色（分类图表用） ----
  Utils.chartColors = [
    '#4FB3A9', '#F5A25D', '#E85D5D', '#5D8AF5', '#A85DF5',
    '#F5DC5D', '#5DF5C5', '#DC5DF5', '#5D5DF5', '#F55DA8',
    '#7FC9C0', '#FFB088', '#FF8888',
  ];

  Utils.colorFor = function (i) {
    return Utils.chartColors[i % Utils.chartColors.length];
  };

  global.Utils = Utils;
})(window);
