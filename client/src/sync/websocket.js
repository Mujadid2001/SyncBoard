/**
 * WebSocket Manager - Connection & Event Handling
 * 
 * Manages WebSocket connection lifecycle and event dispatching.
 * Uses vanilla event listeners, no external libraries.
 */

import {EventEmitter} from '../utils.js';

class WebSocketManager extends EventEmitter {
  constructor(serverUrl = 'ws://localhost:3000') {
    super();
    this.serverUrl = serverUrl;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempt = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempt = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WS message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('❌ WebSocket error:', event);
          this.emit('error', event);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(data) {
    const {type, payload} = data;

    switch (type) {
      case 'SYNC_EVENT':
        this.emit('sync-event', payload);
        break;

      case 'TASK_UPDATED':
        this.emit('task-updated', payload);
        break;

      case 'TASK_CREATED':
        this.emit('task-created', payload);
        break;

      case 'TASK_DELETED':
        this.emit('task-deleted', payload);
        break;

      case 'CONFLICT':
        this.emit('conflict', payload);
        break;

      case 'SYNC_ACK':
        this.emit('sync-ack', payload);
        break;

      default:
        console.warn('Unknown WS message type:', type);
        this.emit('message', data);
    }
  }

  /**
   * Send message to server
   */
  send(type, payload) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, queuing message');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({type, payload, timestamp: Date.now()}));
      return true;
    } catch (error) {
      console.error('Failed to send WS message:', error);
      return false;
    }
  }

  /**
   * Send sync events
   */
  sendSyncEvents(events) {
    return this.send('SYNC_EVENTS', {events});
  }

  /**
   * Send task update
   */
  sendTaskUpdate(task) {
    return this.send('TASK_UPDATED', task);
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnect-failed');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt++;

    console.log(`⏳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.emit('reconnecting', {attempt: this.reconnectAttempt, delay});

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect gracefully
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempt: this.reconnectAttempt,
      serverUrl: this.serverUrl
    };
  }
}

export default WebSocketManager;
