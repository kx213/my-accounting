/* ============================================================
   localStorage 封装
   ============================================================ */

(function (global) {
  'use strict';

  const PREFIX = 'ma_'; // my-accounting prefix

  const Storage = {};

  Storage.get = function (key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage] get fail', key, e);
      return fallback;
    }
  };

  Storage.set = function (key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] set fail', key, e);
      return false;
    }
  };

  Storage.remove = function (key) {
    localStorage.removeItem(PREFIX + key);
  };

  Storage.clearAll = function () {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
  };

  // 业务键
  Storage.keys = {
    books: 'books',
    currentBookId: 'currentBookId',
    categories: 'categories',
    records: 'records',
    budgets: 'budgets',
    lastUsedCategory: 'lastUsedCategory',
    lastUsedType: 'lastUsedType',
    settings: 'settings',
    onboarded: 'onboarded',
  };

  global.Storage = Storage;
})(window);
