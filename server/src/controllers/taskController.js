/**
 * Task Controller - REST API Handlers
 * 
 * Handles HTTP requests for task CRUD operations.
 */

const db = require('../config/db');

class TaskController {
  /**
   * GET /api/boards/:boardId/tasks
   */
  static getAllTasks(req, res) {
    try {
      const {boardId} = req.params;
      const tasks = db.getTasksByBoard(boardId);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/tasks/:taskId
   */
  static getTask(req, res) {
    try {
      const {taskId} = req.params;
      const task = db.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/tasks
   */
  static createTask(req, res) {
    try {
      const {title, description, boardId, columnId, tags, assignee} = req.body;

      if (!title || !boardId || !columnId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, boardId, columnId'
        });
      }

      const task = db.createTask({
        title,
        description,
        boardId,
        columnId,
        position: 0,
        tags: tags || [],
        assignee: assignee || null
      });

      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/tasks/:taskId
   */
  static updateTask(req, res) {
    try {
      const {taskId} = req.params;
      const updates = req.body;

      const task = db.updateTask(taskId, updates);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/tasks/:taskId
   */
  static deleteTask(req, res) {
    try {
      const {taskId} = req.params;
      const task = db.deleteTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/tasks/:taskId/move
   */
  static moveTask(req, res) {
    try {
      const {taskId} = req.params;
      const {columnId, position} = req.body;

      if (!columnId) {
        return res.status(400).json({
          success: false,
          error: 'Missing columnId'
        });
      }

      const task = db.updateTask(taskId, {columnId, position: position || 0});

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/boards/:boardId
   */
  static getBoard(req, res) {
    try {
      const {boardId} = req.params;
      const board = db.getBoard(boardId);

      if (!board) {
        return res.status(404).json({
          success: false,
          error: 'Board not found'
        });
      }

      const columns = db.getColumnsByBoard(boardId);
      const tasks = db.getTasksByBoard(boardId);

      res.json({
        success: true,
        data: {board, columns, tasks}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/boards
   */
  static getAllBoards(req, res) {
    try {
      const boards = db.getBoards();

      res.json({
        success: true,
        data: boards
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = TaskController;
