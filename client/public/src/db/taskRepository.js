/**
 * Task Repository - Local CRUD Operations
 * 
 * High-level interface for task operations on top of IndexedDB database.
 */

import database from './database.js';

class TaskRepository {
  /**
   * Create a new task
   */
  async create(task) {
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: task.title || '',
      description: task.description || '',
      columnId: task.columnId,
      boardId: task.boardId,
      position: task.position || 0,
      assignee: task.assignee || null,
      tags: task.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false
    };

    // Save to DB
    await database.saveTask(newTask);

    // Log event
    await database.logEvent({
      type: 'TASK_CREATED',
      entityId: newTask.id,
      entityType: 'TASK',
      data: newTask
    });

    return newTask;
  }

  /**
   * Get task by ID
   */
  async getById(taskId) {
    return database.getTask(taskId);
  }

  /**
   * Get all tasks in a column
   */
  async getByColumn(columnId) {
    const tasks = await database.getTasksByColumn(columnId);
    return tasks.sort((a, b) => a.position - b.position);
  }

  /**
   * Get all tasks in a board
   */
  async getByBoard(boardId) {
    const tasks = await database.getTasksByBoard(boardId);
    return tasks.sort((a, b) => {
      if (a.columnId !== b.columnId) {
        return a.columnId.localeCompare(b.columnId);
      }
      return a.position - b.position;
    });
  }

  /**
   * Update task
   */
  async update(taskId, updates) {
    const task = await database.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updated = {
      ...task,
      ...updates,
      updatedAt: Date.now(),
      synced: false
    };

    await database.saveTask(updated);

    await database.logEvent({
      type: 'TASK_UPDATED',
      entityId: taskId,
      entityType: 'TASK',
      data: {before: task, after: updated}
    });

    return updated;
  }

  /**
   * Move task to different column or position
   */
  async move(taskId, toColumnId, toPosition) {
    const task = await database.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // If moving within same column, just update position
    if (task.columnId === toColumnId) {
      return this.update(taskId, {position: toPosition});
    }

    // Moving to different column - update both columnId and position
    return this.update(taskId, {
      columnId: toColumnId,
      position: toPosition
    });
  }

  /**
   * Delete task
   */
  async delete(taskId) {
    const task = await database.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    await database.deleteTask(taskId);

    await database.logEvent({
      type: 'TASK_DELETED',
      entityId: taskId,
      entityType: 'TASK',
      data: task
    });
  }

  /**
   * Reorder tasks in a column
   */
  async reorderInColumn(columnId, taskIds) {
    const tasks = await database.getTasksByColumn(columnId);
    const tasksMap = new Map(tasks.map(t => [t.id, t]));

    // Update positions based on new order
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const task = tasksMap.get(taskId);
      if (task && task.position !== i) {
        await this.update(taskId, {position: i});
      }
    }
  }

  /**
   * Bulk create tasks
   */
  async createBulk(tasks) {
    const created = [];
    for (const taskData of tasks) {
      const task = await this.create(taskData);
      created.push(task);
    }
    return created;
  }

  /**
   * Search tasks
   */
  async search(boardId, query) {
    const tasks = await database.getTasksByBoard(boardId);
    const lowerQuery = query.toLowerCase();

    return tasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description.toLowerCase().includes(lowerQuery) ||
      task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

export default new TaskRepository();
