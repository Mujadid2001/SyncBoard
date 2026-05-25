/**
 * Sync Engine - Reconciliation & Conflict Resolution
 * 
 * Handles CRDTs, vector clocks, and conflict resolution for distributed sync.
 * Uses operational transformation for real-time collaboration.
 */

import {EventEmitter} from '../utils.js';
import database from '../db/database.js';

class SyncEngine extends EventEmitter {
  constructor() {
    super();
    this.vectorClock = new Map();
    this.conflictResolutions = new Map();
  }

  /**
   * Initialize sync engine
   */
  async init(clientId) {
    this.clientId = clientId;
    this.vectorClock.set(clientId, 0);
    console.log(`✅ Sync engine initialized for client: ${clientId}`);
  }

  /**
   * Increment vector clock for this client
   */
  incrementVectorClock() {
    const current = this.vectorClock.get(this.clientId) || 0;
    this.vectorClock.set(this.clientId, current + 1);
    return this.getVectorClock();
  }

  /**
   * Get current vector clock
   */
  getVectorClock() {
    return Object.fromEntries(this.vectorClock);
  }

  /**
   * Update vector clock with remote clock
   */
  mergeVectorClock(remoteClock) {
    for (const [clientId, timestamp] of Object.entries(remoteClock)) {
      const current = this.vectorClock.get(clientId) || 0;
      this.vectorClock.set(clientId, Math.max(current, timestamp));
    }
  }

  /**
   * Compare vector clocks - returns 'before', 'after', 'concurrent', or 'equal'
   */
  compareVectorClocks(clock1, clock2) {
    let hasGreater = false;
    let hasLess = false;

    const allClients = new Set([
      ...Object.keys(clock1),
      ...Object.keys(clock2)
    ]);

    for (const client of allClients) {
      const t1 = clock1[client] || 0;
      const t2 = clock2[client] || 0;

      if (t1 > t2) hasGreater = true;
      if (t1 < t2) hasLess = true;
    }

    if (!hasGreater && !hasLess) return 'equal';
    if (!hasLess) return 'after';
    if (!hasGreater) return 'before';
    return 'concurrent';
  }

  /**
   * Detect conflict between two events
   */
  detectConflict(event1, event2) {
    // Same entity modified concurrently
    if (
      event1.entityId === event2.entityId &&
      event1.type !== event2.type &&
      this.compareVectorClocks(event1.vectorClock, event2.vectorClock) === 'concurrent'
    ) {
      return {
        hasConflict: true,
        type: 'CONCURRENT_MODIFICATION',
        events: [event1, event2]
      };
    }

    // Task moved to same position
    if (
      event1.type === 'TASK_MOVED' &&
      event2.type === 'TASK_MOVED' &&
      event1.payload.toColumnId === event2.payload.toColumnId &&
      event1.payload.toPosition === event2.payload.toPosition
    ) {
      return {
        hasConflict: true,
        type: 'POSITION_CONFLICT',
        events: [event1, event2]
      };
    }

    return {hasConflict: false};
  }

  /**
   * Resolve conflict using Last-Write-Wins (LWW)
   */
  resolveConflictLWW(event1, event2) {
    // Compare timestamps - newer one wins
    if (event1.timestamp > event2.timestamp) {
      return event1;
    } else if (event2.timestamp > event1.timestamp) {
      return event2;
    }

    // Timestamp tie - use clientId as tiebreaker
    return event1.clientId > event2.clientId ? event1 : event2;
  }

  /**
   * Resolve conflict using Causal Ordering
   */
  resolveConflictCausal(event1, event2) {
    const comparison = this.compareVectorClocks(
      event1.vectorClock,
      event2.vectorClock
    );

    if (comparison === 'after') return event1;
    if (comparison === 'before') return event2;

    // Concurrent - fall back to LWW
    return this.resolveConflictLWW(event1, event2);
  }

  /**
   * Apply remote event to local state
   */
  async applyRemoteEvent(event) {
    // Update vector clock
    this.mergeVectorClock(event.vectorClock);

    // Log event
    await database.logEvent(event);

    this.emit('event-applied', event);
    return event;
  }

  /**
   * Create new event with vector clock
   */
  createEvent(type, payload) {
    const vectorClock = this.incrementVectorClock();

    return {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      clientId: this.clientId,
      vectorClock,
      timestamp: Date.now(),
      synced: false
    };
  }

  /**
   * Get sync metadata
   */
  getSyncMetadata() {
    return {
      clientId: this.clientId,
      vectorClock: this.getVectorClock(),
      timestamp: Date.now()
    };
  }
}

export default new SyncEngine();
