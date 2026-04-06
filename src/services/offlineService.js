/**
 * src/services/offlineService.js
 * Manages offline data buffering and sync-on-reconnect.
 */

import { state } from '../utils/state.js';
import { showToast } from '../utils/toast.js';
import { alertService } from './alertService.js';

class OfflineService {
  /** Total queued records across all devices. */
  queueCount() {
    return Object.values(state.offlineQueue).reduce((s, q) => s + q.length, 0);
  }

  /** Update all offline UI indicators. */
  updateUI() {
    const total = this.queueCount();
    const pill  = document.getElementById('offline-store-pill');
    const count = document.getElementById('offline-store-count');
    const qel   = document.getElementById('offline-queue-count');

    if (pill)  pill.classList.toggle('show', total > 0);
    if (count) count.textContent = total;
    if (qel)   qel.textContent   = `${total} records`;
  }

  /** Push all buffered offline records to Firebase and clear the queue. */
  async sync() {
    const total = this.queueCount();
    if (total === 0 || !state.settings.autoSync) return;

    const syncBar = document.getElementById('offline-sync-bar');
    syncBar?.classList.add('show');
    showToast('info', `🔄 Syncing ${total} offline records…`);

    const db = window._nextrackDb;
    if (!db) {
      syncBar?.classList.remove('show');
      return;
    }

    const promises = [];

    Object.entries(state.offlineQueue).forEach(([id, queue]) => {
      if (!queue.length) return;
      const batch = {};
      queue.forEach((rec, i) => {
        batch[`offline_${id}_${rec.ts}_${i}`] = { ...rec, deviceId: id };
      });
      promises.push(
        db.ref('/offline_data').update(batch).then(() => {
          state.offlineQueue[id] = [];
          this.updateUI();
        })
      );
    });

    Promise.all(promises)
      .then(() => {
        syncBar?.classList.remove('show');
        const firstId = Object.keys(state.offlineQueue)[0] || 'sys';
        alertService.fire(firstId, 'sync', `Synced ${total} offline records`);
        showToast('success', `✅ Offline sync complete! ${total} records uploaded.`);
      })
      .catch(() => {
        syncBar?.classList.remove('show');
        showToast('danger', '❌ Offline sync failed. Will retry on reconnect.');
      });
  }
}

export const offlineService = new OfflineService();
