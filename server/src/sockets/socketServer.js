/**
 * WebSocket Server - Connection Management
 * 
 * Initializes WebSocket server and manages client connections.
 */

const WebSocket = require('ws');

class SocketServer {
  constructor(httpServer) {
    this.wss = new WebSocket.Server({server: httpServer});
    this.clients = new Map();
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`✅ Client connected: ${clientId}`);

      this.clients.set(clientId, {
        ws,
        id: clientId,
        connectedAt: Date.now()
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: {clientId}
      }));

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`❌ Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`Error for client ${clientId}:`, error);
      });
    });
  }

  /**
   * Handle incoming message
   */
  handleMessage(clientId, message) {
    const {type, payload} = message;

    switch (type) {
      case 'PING':
        this.handlePing(clientId);
        break;

      case 'SYNC_EVENTS':
        this.handleSyncEvents(clientId, payload);
        break;

      case 'TASK_UPDATED':
        this.broadcastMessage(clientId, {
          type: 'TASK_UPDATED',
          payload
        });
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }

  /**
   * Handle ping
   */
  handlePing(clientId) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({type: 'PONG'}));
    }
  }

  /**
   * Handle sync events
   */
  handleSyncEvents(clientId, payload) {
    console.log(`Sync events from ${clientId}:`, payload);
    // TODO: Apply sync events to database
    // TODO: Broadcast to other clients
  }

  /**
   * Broadcast message to all clients except sender
   */
  broadcastMessage(senderId, message) {
    for (const [clientId, client] of this.clients) {
      if (clientId !== senderId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all clients including sender
   */
  broadcastToAll(message) {
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Get connected clients count
   */
  getClientsCount() {
    return this.clients.size;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

module.exports = SocketServer;
