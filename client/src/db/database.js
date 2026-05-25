/**
 * Database Layer - Pure IndexedDB (Zero Dependencies)
 * 
 * Handles all local persistence with IndexedDB.
 * No Dexie.js or external libraries - raw IndexedDB API only.
 */

const DB_NAME = 'syncboard';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize and open the database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ DB init failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createSchema(db);
      };
    });
  }

  /**
   * Create database schema
   */
  createSchema(db) {
    // Tasks store
    if (!db.objectStoreNames.contains('tasks')) {
      const taskStore = db.createObjectStore('tasks', {keyPath: 'id'});
      taskStore.createIndex('by-column', 'columnId');
      taskStore.createIndex('by-board', 'boardId');
      taskStore.createIndex('by-updated', 'updatedAt');
    }

    // Boards store
    if (!db.objectStoreNames.contains('boards')) {
      db.createObjectStore('boards', {keyPath: 'id'});
    }

    // Columns store
    if (!db.objectStoreNames.contains('columns')) {
      const columnStore = db.createObjectStore('columns', {keyPath: 'id'});
      columnStore.createIndex('by-board', 'boardId');
    }

    // Event log (for sync)
    if (!db.objectStoreNames.contains('events')) {
      const eventStore = db.createObjectStore('events', {keyPath: 'id'});
      eventStore.createIndex('by-timestamp', 'timestamp');
      eventStore.createIndex('by-synced', 'synced');
    }

    // Sync queue
    if (!db.objectStoreNames.contains('sync-queue')) {
      const queueStore = db.createObjectStore('sync-queue', {keyPath: 'id'});
      queueStore.createIndex('by-status', 'status');
      queueStore.createIndex('by-retry-at', 'retryAt');
    }

    console.log('✅ Schema created');
  }

  /**
   * Get all tasks for a board
   */
  async getTasksByBoard(boardId) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks'], 'readonly');
      const store = tx.objectStore('tasks');
      const index = store.index('by-board');
      const request = index.getAll(boardId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get all tasks for a column
   */
  async getTasksByColumn(columnId) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks'], 'readonly');
      const store = tx.objectStore('tasks');
      const index = store.index('by-column');
      const request = index.getAll(columnId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get single task
   */
  async getTask(taskId) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks'], 'readonly');
      const store = tx.objectStore('tasks');
      const request = store.get(taskId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Save task (create or update)
   */
  async saveTask(task) {
    if (!this.db) throw new Error('DB not initialized');

    const enriched = {
      ...task,
      updatedAt: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks'], 'readwrite');
      const store = tx.objectStore('tasks');
      const request = store.put(enriched);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(enriched);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tasks'], 'readwrite');
      const store = tx.objectStore('tasks');
      const request = store.delete(taskId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all columns for a board
   */
  async getColumnsByBoard(boardId) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['columns'], 'readonly');
      const store = tx.objectStore('columns');
      const index = store.index('by-board');
      const request = index.getAll(boardId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Save column
   */
  async saveColumn(column) {
    if (!this.db) throw new Error('DB not initialized');

    const enriched = {
      ...column,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['columns'], 'readwrite');
      const store = tx.objectStore('columns');
      const request = store.put(enriched);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(enriched);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all boards
   */
  async getAllBoards() {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['boards'], 'readonly');
      const store = tx.objectStore('boards');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Save board
   */
  async saveBoard(board) {
    if (!this.db) throw new Error('DB not initialized');

    const enriched = {
      ...board,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['boards'], 'readwrite');
      const store = tx.objectStore('boards');
      const request = store.put(enriched);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(enriched);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Log event for sync
   */
  async logEvent(event) {
    if (!this.db) throw new Error('DB not initialized');

    const enriched = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...event,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['events'], 'readwrite');
      const store = tx.objectStore('events');
      const request = store.add(enriched);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(enriched);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get unsynced events
   */
  async getUnsyncedEvents() {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['events'], 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('by-synced');
      const request = index.getAll(false);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Mark events as synced
   */
  async markEventsSynced(eventIds) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['events'], 'readwrite');
      const store = tx.objectStore('events');

      for (const eventId of eventIds) {
        const request = store.get(eventId);
        request.onsuccess = () => {
          const event = request.result;
          if (event) {
            event.synced = true;
            store.put(event);
          }
        };
      }

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  }

  /**
   * Enqueue sync operation
   */
  async enqueueSyncOp(operation) {
    if (!this.db) throw new Error('DB not initialized');

    const queued = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...operation,
      status: 'PENDING',
      createdAt: Date.now(),
      retryAt: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync-queue'], 'readwrite');
      const store = tx.objectStore('sync-queue');
      const request = store.add(queued);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(queued);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get pending sync operations
   */
  async getPendingSyncOps() {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync-queue'], 'readonly');
      const store = tx.objectStore('sync-queue');
      const index = store.index('by-status');
      const request = index.getAll('PENDING');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const ops = request.result.filter(op => op.retryAt <= Date.now());
        resolve(ops);
      };
    });
  }

  /**
   * Update sync operation status
   */
  async updateSyncOpStatus(opId, status, error = null) {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync-queue'], 'readwrite');
      const store = tx.objectStore('sync-queue');
      const request = store.get(opId);

      request.onsuccess = () => {
        const op = request.result;
        if (op) {
          op.status = status;
          if (error) {
            op.error = error;
            op.retryCount++;
            op.retryAt = Date.now() + Math.pow(2, op.retryCount) * 1000;
          }
          store.put(op);
        }
      };

      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default new Database();
