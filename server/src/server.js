/**
 * Server Entry Point
 * 
 * Express server with WebSocket support, REST API, and middleware setup.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const SocketServer = require('./sockets/socketServer');
const taskRoutes = require('./routes/taskRoutes');
const {
  corsMiddleware,
  loggingMiddleware,
  errorHandler,
  notFoundHandler
} = require('./middleware/errorHandler');

// Environment
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();
const httpServer = http.createServer(app);

// WebSocket server
const socketServer = new SocketServer(httpServer);

// ============================================================================
// Middleware
// ============================================================================

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb', extended: true}));
app.use(corsMiddleware);
app.use(loggingMiddleware);

// ============================================================================
// Static Files
// ============================================================================

const publicPath = path.join(__dirname, '../../client/public');
app.use(express.static(publicPath));

// ============================================================================
// API Routes
// ============================================================================

app.use('/api', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    clients: socketServer.getClientsCount()
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   SyncBoard Server                     ║
║   Environment: ${NODE_ENV.padEnd(23)}║
║   Port: ${PORT.toString().padEnd(28)}║
║   WebSocket: ws://localhost:${PORT}   ║
║   REST API: http://localhost:${PORT}   ║
╚════════════════════════════════════════╝
  `);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = {app, httpServer, socketServer};
