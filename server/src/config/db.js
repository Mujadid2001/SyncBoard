/**
 * Database Configuration
 * 
 * Sets up persistent storage for boards, tasks, and sync events.
 * Uses in-memory storage with optional persistence to file.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'syncboard.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {recursive: true});
}

class Database {
  constructor() {
    this.data = {
      boards: [],
      columns: [],
      tasks: [],
      events: [],
      syncQueue: []
    };
    this.loadFromFile();
  }

  /**
   * Load data from file
   */
  loadFromFile() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
        console.log('✅ Loaded data from file');
      } else {
        this.createDefaultData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.createDefaultData();
    }
  }

  /**
   * Save data to file
   */
  saveToFile() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  /**
   * Create default data
   */
  createDefaultData() {
    const boardId = `board-${Date.now()}`;

    this.data = {
      boards: [
        {
          id: boardId,
          title: 'Default Board',
          description: 'Getting started board',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      columns: [
        {
          id: `col-1`,
          boardId,
          title: 'To Do',
          position: 0,
          createdAt: Date.now()
        },
        {
          id: `col-2`,
          boardId,
          title: 'In Progress',
          position: 1,
          createdAt: Date.now()
        },
        {
          id: `col-3`,
          boardId,
          title: 'Done',
          position: 2,
          createdAt: Date.now()
        }
      ],
      tasks: [
        {
          id: `task-1`,
          boardId,
          columnId: `col-1`,
          title: 'Welcome to SyncBoard',
          description: 'This is your first task. Drag it to other columns!',
          position: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['demo'],
          assignee: null
        }
      ],
      events: [],
      syncQueue: []
    };

    this.saveToFile();
    console.log('✅ Created default data');
  }

  // ========== BOARD OPERATIONS ==========

  /**
   * Get all boards
   */
  getBoards() {
    return this.data.boards;
  }

  /**
   * Get board by ID
   */
  getBoard(boardId) {
    return this.data.boards.find(b => b.id === boardId);
  }

  /**
   * Create board
   */
  createBoard(board) {
    const newBoard = {
      id: `board-${Date.now()}`,
      ...board,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.data.boards.push(newBoard);
    this.saveToFile();
    return newBoard;
  }

  /**
   * Update board
   */
  updateBoard(boardId, updates) {
    const board = this.getBoard(boardId);
    if (!board) return null;

    Object.assign(board, updates, {updatedAt: Date.now()});
    this.saveToFile();
    return board;
  }

  // ========== COLUMN OPERATIONS ==========

  /**
   * Get columns for board
   */
  getColumnsByBoard(boardId) {
    return this.data.columns.filter(c => c.boardId === boardId);
  }

  /**
   * Create column
   */
  createColumn(column) {
    const newColumn = {
      id: `col-${Date.now()}`,
      ...column,
      createdAt: Date.now()
    };
    this.data.columns.push(newColumn);
    this.saveToFile();
    return newColumn;
  }

  // ========== TASK OPERATIONS ==========

  /**
   * Get all tasks
   */
  getTasks() {
    return this.data.tasks;
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.data.tasks.find(t => t.id === taskId);
  }

  /**
   * Get tasks by board
   */
  getTasksByBoard(boardId) {
    return this.data.tasks.filter(t => t.boardId === boardId);
  }

  /**
   * Get tasks by column
   */
  getTasksByColumn(columnId) {
    return this.data.tasks.filter(t => t.columnId === columnId).sort((a, b) => a.position - b.position);
  }

  /**
   * Create task
   */
  createTask(task) {
    const newTask = {
      id: `task-${Date.now()}`,
      ...task,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false
    };
    this.data.tasks.push(newTask);
    this.saveToFile();
    return newTask;
  }

  /**
   * Update task
   */
  updateTask(taskId, updates) {
    const task = this.getTask(taskId);
    if (!task) return null;

    Object.assign(task, updates, {updatedAt: Date.now()});
    this.saveToFile();
    return task;
  }

  /**
   * Delete task
   */
  deleteTask(taskId) {
    const index = this.data.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;

    const deleted = this.data.tasks.splice(index, 1)[0];
    this.saveToFile();
    return deleted;
  }

  // ========== EVENT OPERATIONS ==========

  /**
   * Log event
   */
  logEvent(event) {
    const logged = {
      id: `event-${Date.now()}`,
      ...event,
      timestamp: Date.now(),
      synced: false
    };
    this.data.events.push(logged);
    this.saveToFile();
    return logged;
  }

  /**
   * Get unsynced events
   */
  getUnsyncedEvents() {
    return this.data.events.filter(e => !e.synced);
  }

  /**
   * Mark events as synced
   */
  markEventsSynced(eventIds) {
    for (const eventId of eventIds) {
      const event = this.data.events.find(e => e.id === eventId);
      if (event) {
        event.synced = true;
      }
    }
    this.saveToFile();
  }
}

module.exports = new Database();
