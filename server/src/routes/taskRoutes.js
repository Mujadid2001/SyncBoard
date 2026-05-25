/**
 * Task Routes - REST API Endpoints
 * 
 * Defines HTTP routes for task operations.
 */

const express = require('express');
const TaskController = require('../controllers/taskController');
const {validateRequest} = require('../middleware/errorHandler');

const router = express.Router();

// Board routes
router.get('/boards', TaskController.getAllBoards);
router.get('/boards/:boardId', TaskController.getBoard);

// Task routes
router.get('/boards/:boardId/tasks', TaskController.getAllTasks);
router.get('/tasks/:taskId', TaskController.getTask);
router.post('/tasks', 
  validateRequest({required: ['title', 'boardId', 'columnId']}),
  TaskController.createTask
);
router.put('/tasks/:taskId', TaskController.updateTask);
router.delete('/tasks/:taskId', TaskController.deleteTask);
router.patch('/tasks/:taskId/move',
  validateRequest({required: ['columnId']}),
  TaskController.moveTask
);

module.exports = router;
