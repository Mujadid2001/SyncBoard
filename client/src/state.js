/**
 * Client State Machine & Reactive Store
 * 
 * Redux-like store with middleware pipeline for state management.
 * Handles application state, subscriptions, and dispatch.
 */

import {EventEmitter, isEqual, deepClone} from './utils.js';

class Store extends EventEmitter {
  constructor(initialState = {}) {
    super();
    this.state = initialState;
    this.subscribers = new Map();
    this.selectorCache = new Map();
    this.middleware = [];
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Dispatch action
   */
  async dispatch(action) {
    let finalAction = action;

    // Run through middleware
    for (const middleware of this.middleware) {
      finalAction = await middleware(finalAction, this.getState) || finalAction;
    }

    // Apply reducer
    const newState = this.reduce(this.state, finalAction);

    // Update if changed
    if (newState !== this.state) {
      const oldState = this.state;
      this.state = newState;

      // Notify subscribers
      this.notifySubscribers(oldState, newState);
      this.emit('state-changed', {oldState, newState, action});
    }

    return finalAction;
  }

  /**
   * Core reducer
   */
  reduce(state, action) {
    switch (action.type) {
      case 'INIT_BOARD':
        return {
          ...state,
          board: action.payload.board,
          columns: action.payload.columns,
          tasks: action.payload.tasks,
          selectedTask: null
        };

      case 'ADD_TASK':
        return {
          ...state,
          tasks: [...state.tasks, action.payload]
        };

      case 'UPDATE_TASK':
        return {
          ...state,
          tasks: state.tasks.map(t =>
            t.id === action.payload.id ? action.payload : t
          )
        };

      case 'DELETE_TASK':
        return {
          ...state,
          tasks: state.tasks.filter(t => t.id !== action.payload.id),
          selectedTask: state.selectedTask?.id === action.payload.id ? null : state.selectedTask
        };

      case 'MOVE_TASK':
        return {
          ...state,
          tasks: state.tasks.map(t =>
            t.id === action.payload.taskId
              ? {
                  ...t,
                  columnId: action.payload.toColumnId,
                  position: action.payload.toPosition
                }
              : t
          )
        };

      case 'SELECT_TASK':
        return {
          ...state,
          selectedTask: action.payload
        };

      case 'SET_CONNECTION_STATUS':
        return {
          ...state,
          connectionStatus: action.payload
        };

      case 'SET_SYNC_STATUS':
        return {
          ...state,
          syncStatus: action.payload
        };

      case 'ADD_ERROR':
        return {
          ...state,
          errors: [...(state.errors || []), action.payload]
        };

      case 'CLEAR_ERRORS':
        return {
          ...state,
          errors: []
        };

      default:
        return state;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(subscriber) {
    const id = Math.random();
    this.subscribers.set(id, subscriber);

    return () => this.subscribers.delete(id);
  }

  /**
   * Subscribe to selector changes (memoized)
   */
  subscribeToSelector(selector, callback, key = 'default') {
    const cacheKey = `${key}:${selector.toString()}`;
    let lastValue = selector(this.state);

    const subscriber = (oldState, newState) => {
      const newValue = selector(newState);
      if (!isEqual(lastValue, newValue)) {
        lastValue = deepClone(newValue);
        callback(newValue, lastValue);
      }
    };

    return this.subscribe(subscriber);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(oldState, newState) {
    for (const subscriber of this.subscribers.values()) {
      subscriber(oldState, newState);
    }
  }

  /**
   * Create middleware for validation
   */
  static validationMiddleware(validator) {
    return (action, getState) => {
      try {
        validator(action);
        return action;
      } catch (error) {
        console.error('Validation failed:', error);
        throw error;
      }
    };
  }

  /**
   * Create middleware for logging
   */
  static loggingMiddleware(prefix = 'ACTION') {
    return (action, getState) => {
      console.log(`${prefix}:`, action.type, action.payload);
      return action;
    };
  }

  /**
   * Create middleware for async operations
   */
  static asyncMiddleware() {
    return (action, getState) => {
      if (action.type.startsWith('ASYNC_')) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(action);
          }, 0);
        });
      }
      return action;
    };
  }
}

export default Store;
