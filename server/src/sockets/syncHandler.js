/**
 * Sync Handler - Real-time Synchronization Logic
 * 
 * Handles sync event processing and broadcasting.
 */

const db = require('../config/db');

class SyncHandler {
  /**
   * Handle sync event from client
   */
  static processSyncEvent(event, socketServer) {
    try {
      console.log('Processing sync event:', event.type);

      switch (event.type) {
        case 'TASK_CREATED':
          this.handleTaskCreated(event, socketServer);
          break;

        case 'TASK_UPDATED':
          this.handleTaskUpdated(event, socketServer);
          break;

        case 'TASK_DELETED':
          this.handleTaskDeleted(event, socketServer);
          break;

        case 'TASK_MOVED':
          this.handleTaskMoved(event, socketServer);
          break;

        default:
          console.warn('Unknown sync event type:', event.type);
      }

      // Log event for audit trail
      db.logEvent(event);
    } catch (error) {
      console.error('Error processing sync event:', error);
    }
  }

  /**
   * Handle task created
   */
  static handleTaskCreated(event, socketServer) {
    const {payload} = event;

    // Save to database
    const task = db.createTask(payload);

    // Broadcast to all clients
    socketServer.broadcastToAll({
      type: 'TASK_CREATED',
      payload: task
    });

    console.log(`✅ Task created: ${task.id}`);
  }

  /**
   * Handle task updated
   */
  static handleTaskUpdated(event, socketServer) {
    const {payload} = event;
    const {id} = payload;

    // Update in database
    const task = db.updateTask(id, payload);

    if (!task) {
      console.error(`Task not found: ${id}`);
      return;
    }

    // Broadcast to all clients
    socketServer.broadcastToAll({
      type: 'TASK_UPDATED',
      payload: task
    });

    console.log(`✅ Task updated: ${task.id}`);
  }

  /**
   * Handle task deleted
   */
  static handleTaskDeleted(event, socketServer) {
    const {payload} = event;
    const {id} = payload;

    // Delete from database
    const task = db.deleteTask(id);

    if (!task) {
      console.error(`Task not found: ${id}`);
      return;
    }

    // Broadcast to all clients
    socketServer.broadcastToAll({
      type: 'TASK_DELETED',
      payload: {taskId: id}
    });

    console.log(`✅ Task deleted: ${id}`);
  }

  /**
   * Handle task moved
   */
  static handleTaskMoved(event, socketServer) {
    const {payload} = event;
    const {taskId, toColumnId, toPosition} = payload;

    // Update task position
    const task = db.updateTask(taskId, {
      columnId: toColumnId,
      position: toPosition
    });

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return;
    }

    // Broadcast to all clients
    socketServer.broadcastToAll({
      type: 'TASK_MOVED',
      payload: {taskId, toColumnId, toPosition, task}
    });

    console.log(`✅ Task moved: ${taskId} to ${toColumnId}`);
  }

  /**
   * Get sync events for client
   */
  static getSyncEvents(clientId) {
    return db.getUnsyncedEvents();
  }

  /**
   * Mark events as synced
   */
  static markEventsSynced(eventIds) {
    db.markEventsSynced(eventIds);
  }
}

module.exports = SyncHandler;
