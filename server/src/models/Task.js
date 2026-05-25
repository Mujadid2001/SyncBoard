/**
 * Task Model - Schema Definitions
 * 
 * Defines the structure and validation for tasks.
 */

class Task {
  constructor(data) {
    this.id = data.id || `task-${Date.now()}`;
    this.boardId = data.boardId;
    this.columnId = data.columnId;
    this.title = data.title || '';
    this.description = data.description || '';
    this.position = data.position || 0;
    this.tags = data.tags || [];
    this.assignee = data.assignee || null;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    this.synced = data.synced || false;
  }

  /**
   * Validate task data
   */
  static validate(data) {
    const errors = [];

    if (!data.title || typeof data.title !== 'string') {
      errors.push('title is required and must be a string');
    }

    if (!data.boardId || typeof data.boardId !== 'string') {
      errors.push('boardId is required and must be a string');
    }

    if (!data.columnId || typeof data.columnId !== 'string') {
      errors.push('columnId is required and must be a string');
    }

    if (data.title && data.title.length > 200) {
      errors.push('title must be less than 200 characters');
    }

    if (data.description && data.description.length > 5000) {
      errors.push('description must be less than 5000 characters');
    }

    if (data.tags && !Array.isArray(data.tags)) {
      errors.push('tags must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      boardId: this.boardId,
      columnId: this.columnId,
      title: this.title,
      description: this.description,
      position: this.position,
      tags: this.tags,
      assignee: this.assignee,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      synced: this.synced
    };
  }
}

class Board {
  constructor(data) {
    this.id = data.id || `board-${Date.now()}`;
    this.title = data.title || 'Untitled Board';
    this.description = data.description || '';
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class Column {
  constructor(data) {
    this.id = data.id || `col-${Date.now()}`;
    this.boardId = data.boardId;
    this.title = data.title || 'Untitled Column';
    this.position = data.position || 0;
    this.createdAt = data.createdAt || Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      boardId: this.boardId,
      title: this.title,
      position: this.position,
      createdAt: this.createdAt
    };
  }
}

module.exports = {
  Task,
  Board,
  Column
};
