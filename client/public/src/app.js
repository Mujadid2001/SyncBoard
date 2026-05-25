/**
 * Application Entry Point
 * 
 * Initializes the SyncBoard application, sets up store,
 * database, sync, and UI components.
 */

import database from './db/database.js';
import taskRepository from './db/taskRepository.js';
import syncEngine from './sync/syncEngine.js';
import SyncQueue from './sync/queue.js';
import WebSocketManager from './sync/websocket.js';
import DragDropManager from './ui/dragDrop.js';
import Board from './ui/board.js';
import Store from './state.js';
import {generateClientId, generateSessionId, debounce, log} from './utils.js';

class SyncBoardApp {
  constructor() {
    this.clientId = null;
    this.sessionId = null;
    this.store = null;
    this.ws = null;
    this.syncQueue = SyncQueue;
    this.board = null;
    this.dragDrop = null;
  }

  /**
   * Initialize application
   */
  async init() {
    try {
      console.log('🚀 Initializing SyncBoard...');

      // Generate IDs
      this.clientId = generateClientId();
      this.sessionId = generateSessionId();
      localStorage.setItem('clientId', this.clientId);
      localStorage.setItem('sessionId', this.sessionId);

      // Initialize database
      await database.init();

      // Initialize sync engine
      await syncEngine.init(this.clientId);

      // Initialize store
      this.store = new Store({
        board: null,
        columns: [],
        tasks: [],
        selectedTask: null,
        connectionStatus: 'CONNECTING',
        syncStatus: 'SYNCING',
        errors: []
      });

      // Add middleware
      this.store.use(Store.loggingMiddleware('DISPATCH'));

      // Connect to WebSocket
      await this.connectWebSocket();

      // Load initial data
      await this.loadInitialData();

      // Setup UI
      this.setupUI();

      // Setup listeners
      this.setupListeners();

      console.log('✅ SyncBoard initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncBoard:', error);
      this.showError(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket() {
    this.ws = new WebSocketManager(this.getWebSocketURL());

    this.ws.on('connected', () => {
      console.log('✅ Connected to server');
      this.updateStatus('READY', 'connected');
    });

    this.ws.on('disconnected', () => {
      console.log('❌ Disconnected from server');
      this.updateStatus('OFFLINE', 'disconnected');
    });

    this.ws.on('sync-event', (data) => {
      this.handleSyncEvent(data);
    });

    this.ws.on('task-updated', (task) => {
      this.handleTaskUpdate(task);
    });

    this.ws.on('task-created', (task) => {
      this.handleTaskCreate(task);
    });

    this.ws.on('task-deleted', (data) => {
      this.handleTaskDelete(data);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.showError('WebSocket connection error');
    });

    await this.ws.connect();
  }

  /**
   * Get WebSocket URL
   */
  getWebSocketURL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to backend server on port 3000
    const host = window.location.hostname;
    return `${protocol}//${host}:3000`;
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      // TODO: Fetch board data from server
      const boards = await database.getAllBoards();

      if (boards.length === 0) {
        // Create default board
        const defaultBoard = await this.createDefaultBoard();
        this.store.dispatch({
          type: 'INIT_BOARD',
          payload: defaultBoard
        });
      } else {
        const board = boards[0];
        const columns = await database.getColumnsByBoard(board.id);
        const tasks = await database.getTasksByBoard(board.id);

        this.store.dispatch({
          type: 'INIT_BOARD',
          payload: {board, columns, tasks}
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  /**
   * Create default board
   */
  async createDefaultBoard() {
    const board = {
      id: `board-${Date.now()}`,
      title: 'My Board',
      description: 'Default board',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await database.saveBoard(board);

    const columns = [
      {id: 'col-1', boardId: board.id, title: 'To Do', position: 0},
      {id: 'col-2', boardId: board.id, title: 'In Progress', position: 1},
      {id: 'col-3', boardId: board.id, title: 'Done', position: 2}
    ];

    for (const col of columns) {
      await database.saveColumn(col);
    }

    return {board, columns, tasks: []};
  }

  /**
   * Setup UI
   */
  setupUI() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) return;

    const state = this.store.getState();

    this.board = new Board(state.board, state.columns, state.tasks, {
      onCardClick: (task) => this.handleCardClick(task),
      onCardMenu: (task) => this.handleCardMenu(task),
      onAddCard: (columnId) => this.handleAddCard(columnId),
      onAddColumn: () => this.handleAddColumn()
    });

    boardContainer.appendChild(this.board.getElement());

    // Setup drag-drop
    this.dragDrop = new DragDropManager(boardContainer);
    boardContainer.addEventListener('card-dropped', (e) => {
      this.handleCardDropped(e.detail);
    });
  }

  /**
   * Setup event listeners
   */
  setupListeners() {
    // Subscribe to state changes
    this.store.subscribe((oldState, newState) => {
      // Update board if tasks changed
      if (newState.tasks !== oldState.tasks) {
        this.syncBoardDisplay(oldState, newState);
      }
    });

    // Listen for sync queue changes
    this.syncQueue.on('processing-start', () => {
      this.updateStatus('SYNCING', 'syncing');
    });

    this.syncQueue.on('processing-complete', () => {
      this.updateStatus('READY', 'synced');
    });

    this.syncQueue.on('offline', () => {
      this.updateStatus('OFFLINE', 'offline');
    });

    this.syncQueue.on('online', () => {
      this.updateStatus('READY', 'online');
    });
  }

  /**
   * Sync board display with store
   */
  syncBoardDisplay(oldState, newState) {
    if (!this.board) return;

    // Find added tasks
    const oldTaskIds = new Set(oldState.tasks.map(t => t.id));
    const newTasks = newState.tasks.filter(t => !oldTaskIds.has(t.id));

    for (const task of newTasks) {
      this.board.addCard(task);
    }

    // Find removed tasks
    const newTaskIds = new Set(newState.tasks.map(t => t.id));
    const removedTasks = oldState.tasks.filter(t => !newTaskIds.has(t.id));

    for (const task of removedTasks) {
      this.board.removeCard(task.id);
    }

    // Find updated tasks
    for (const newTask of newState.tasks) {
      const oldTask = oldState.tasks.find(t => t.id === newTask.id);
      if (oldTask && JSON.stringify(oldTask) !== JSON.stringify(newTask)) {
        this.board.updateCard(newTask.id, newTask);
      }
    }
  }

  /**
   * Handle card click
   */
  handleCardClick(task) {
    this.store.dispatch({
      type: 'SELECT_TASK',
      payload: task
    });
    console.log('Selected task:', task);
  }

  /**
   * Handle card menu
   */
  handleCardMenu(task) {
    console.log('Card menu clicked:', task);
    // TODO: Show context menu
  }

  /**
   * Handle add card
   */
  async handleAddCard(columnId) {
    const title = prompt('Enter card title:');
    if (!title) return;

    const task = await taskRepository.create({
      title,
      columnId,
      boardId: this.store.getState().board.id
    });

    this.store.dispatch({
      type: 'ADD_TASK',
      payload: task
    });

    // Sync to server
    await this.syncQueue.enqueueTaskCreate(task);
  }

  /**
   * Handle add column
   */
  handleAddColumn() {
    const title = prompt('Enter column title:');
    if (!title) return;
    console.log('Adding column:', title);
    // TODO: Implement add column
  }

  /**
   * Handle card dropped
   */
  async handleCardDropped(detail) {
    const {cardId, fromColumnId, toColumnId, toPosition} = detail;

    // Update task in repository
    await taskRepository.move(cardId, toColumnId, toPosition);

    // Update store
    this.store.dispatch({
      type: 'MOVE_TASK',
      payload: {taskId: cardId, toColumnId, toPosition}
    });

    // Sync to server
    const task = this.store.getState().tasks.find(t => t.id === cardId);
    if (task) {
      await this.syncQueue.enqueuTaskUpdate(task);
    }

    console.log(`✅ Moved card ${cardId} to ${toColumnId}:${toPosition}`);
  }

  /**
   * Handle sync events from server
   */
  handleSyncEvent(data) {
    console.log('Sync event:', data);
    // TODO: Apply sync event to local state
  }

  /**
   * Handle task update from server
   */
  handleTaskUpdate(task) {
    this.store.dispatch({
      type: 'UPDATE_TASK',
      payload: task
    });
  }

  /**
   * Handle task create from server
   */
  handleTaskCreate(task) {
    this.store.dispatch({
      type: 'ADD_TASK',
      payload: task
    });
  }

  /**
   * Handle task delete from server
   */
  handleTaskDelete(data) {
    this.store.dispatch({
      type: 'DELETE_TASK',
      payload: {id: data.taskId}
    });
  }

  /**
   * Update connection status
   */
  updateStatus(connectionStatus, syncStatus) {
    this.store.dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: connectionStatus
    });

    this.store.dispatch({
      type: 'SET_SYNC_STATUS',
      payload: syncStatus
    });

    // Update UI
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');

    if (indicator) {
      indicator.className = 'status-indicator ' + syncStatus;
    }

    if (text) {
      const statusText = {
        connected: '🌐 Connected',
        disconnected: '📴 Disconnected',
        syncing: '↔️ Syncing',
        synced: '✅ Synced',
        offline: '⚠️ Offline',
        error: '❌ Error'
      }[syncStatus] || syncStatus;

      text.textContent = statusText;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('App error:', message);
    this.store.dispatch({
      type: 'ADD_ERROR',
      payload: {message, timestamp: Date.now()}
    });

    // Show alert (temporary)
    alert(message);
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new SyncBoardApp();
    app.init();
    window.syncBoardApp = app;
  });
} else {
  const app = new SyncBoardApp();
  app.init();
  window.syncBoardApp = app;
}
