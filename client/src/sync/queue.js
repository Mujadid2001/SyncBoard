/**
 * Sync Queue - Offline Operation Buffering
 * 
 * Buffers operations when offline, replays when connection restored.
 * Uses IndexedDB to persist queue across sessions.
 */

import database from '../db/database.js';
import {EventEmitter} from '../utils.js';

class SyncQueue extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Enqueue operation
   */
  async enqueue(operation) {
    const queued = await database.enqueueSyncOp(operation);
    console.log(`📝 Queued operation: ${operation.type}`);
    this.emit('operation-queued', queued);

    // If online, process immediately
    if (this.isOnline) {
      this.process();
    }

    return queued;
  }

  /**
   * Enqueue task update
   */
  async enqueuTaskUpdate(task) {
    return this.enqueue({
      type: 'TASK_UPDATED',
      entityId: task.id,
      data: task
    });
  }

  /**
   * Enqueue task creation
   */
  async enqueueTaskCreate(task) {
    return this.enqueue({
      type: 'TASK_CREATED',
      entityId: task.id,
      data: task
    });
  }

  /**
   * Enqueue task deletion
   */
  async enqueueTaskDelete(taskId) {
    return this.enqueue({
      type: 'TASK_DELETED',
      entityId: taskId
    });
  }

  /**
   * Process all pending operations
   */
  async process() {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    this.emit('processing-start');

    try {
      while (true) {
        const pending = await database.getPendingSyncOps();
        if (pending.length === 0) break;

        for (const op of pending) {
          await this.processOperation(op);
        }
      }

      this.emit('processing-complete', {success: true});
    } catch (error) {
      console.error('Error processing queue:', error);
      this.emit('processing-error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process single operation
   */
  async processOperation(operation) {
    try {
      // Send to server
      const success = await this.sendToServer(operation);

      if (success) {
        // Mark as synced
        await database.updateSyncOpStatus(operation.id, 'SYNCED');
        this.emit('operation-synced', operation);
      } else {
        // Will retry
        await database.updateSyncOpStatus(operation.id, 'PENDING', 'Failed');
        this.emit('operation-failed', operation);
      }
    } catch (error) {
      console.error('Error processing operation:', error);
      await database.updateSyncOpStatus(operation.id, 'PENDING', error.message);
    }
  }

  /**
   * Send operation to server
   */
  async sendToServer(operation) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(operation)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send operation:', error);
      return false;
    }
  }

  /**
   * Handle coming online
   */
  handleOnline() {
    console.log('🌐 Came online');
    this.isOnline = true;
    this.emit('online');
    this.process();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('📴 Went offline');
    this.isOnline = false;
    this.emit('offline');
  }

  /**
   * Get queue status
   */
  async getStatus() {
    const pending = await database.getPendingSyncOps();
    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      pendingCount: pending.length,
      pending
    };
  }

  /**
   * Clear queue
   */
  async clear() {
    // TODO: Implement clearing logic
    console.log('Queue cleared');
    this.emit('queue-cleared');
  }
}

export default new SyncQueue();
