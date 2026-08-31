/**
 * LANDSAFE - Offline-First Storage & Network Synchronization Engine
 * Queues citizen ground reports and SOS requests locally during communication outages
 * and synchronizes automatically upon connectivity restoration.
 */

import { reportsApi, sosApi } from './api';

const REPORTS_QUEUE_KEY = 'landsafe_offline_reports_queue';
const SOS_QUEUE_KEY = 'landsafe_offline_sos_queue';

export const offlineQueue = {
  getPendingReports: () => {
    try {
      const data = localStorage.getItem(REPORTS_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  enqueueReport: (reportPayload) => {
    const queue = offlineQueue.getPendingReports();
    const item = {
      ...reportPayload,
      offline_queued_at: new Date().toISOString(),
      offline_id: `offline-rep-${Date.now()}`
    };
    queue.push(item);
    localStorage.setItem(REPORTS_QUEUE_KEY, JSON.stringify(queue));
    return item;
  },

  clearReportsQueue: () => {
    localStorage.removeItem(REPORTS_QUEUE_KEY);
  },

  getPendingSOS: () => {
    try {
      const data = localStorage.getItem(SOS_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  enqueueSOS: (sosPayload) => {
    const queue = offlineQueue.getPendingSOS();
    const item = {
      ...sosPayload,
      offline_queued_at: new Date().toISOString(),
      offline_id: `offline-sos-${Date.now()}`
    };
    queue.push(item);
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
    return item;
  },

  clearSOSQueue: () => {
    localStorage.removeItem(SOS_QUEUE_KEY);
  },

  getTotalPendingCount: () => {
    return offlineQueue.getPendingReports().length + offlineQueue.getPendingSOS().length;
  },

  syncAllQueuedItems: async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 };

    let syncedReports = 0;
    let syncedSOS = 0;

    // Sync Reports
    const repQueue = offlineQueue.getPendingReports();
    if (repQueue.length > 0) {
      const remainingReports = [];
      for (const rep of repQueue) {
        try {
          await reportsApi.submitReport(rep);
          syncedReports++;
        } catch {
          remainingReports.push(rep);
        }
      }
      localStorage.setItem(REPORTS_QUEUE_KEY, JSON.stringify(remainingReports));
    }

    // Sync SOS
    const sosQueue = offlineQueue.getPendingSOS();
    if (sosQueue.length > 0) {
      const remainingSOS = [];
      for (const sos of sosQueue) {
        try {
          await sosApi.triggerSOS(sos);
          syncedSOS++;
        } catch {
          remainingSOS.push(sos);
        }
      }
      localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(remainingSOS));
    }

    return {
      syncedReports,
      syncedSOS,
      totalSynced: syncedReports + syncedSOS
    };
  }
};
