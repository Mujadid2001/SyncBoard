# SyncBoard

Production-grade offline-first collaborative Kanban dashboard with real-time synchronization.

## 🎯 Features

- **Offline-First**: Works seamlessly offline with automatic sync when online
- **Real-Time Sync**: WebSocket-based live collaboration
- **Zero Dependencies (Client)**: Pure vanilla JavaScript, no frameworks or libraries
- **CRDT-Based**: Conflict-free replicated data types for distributed consistency
- **Progressive Web App**: Installable and works on any device
- **Enterprise Architecture**: Event sourcing, state machines, middleware pipeline

## 📁 Project Structure

```
syncboard/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── assets/             # Styles and icons (CSS/SCSS)
│   │   │   └── main.css
│   │   │
│   │   ├── db/                 # IndexedDB / Local Persistence Layer
│   │   │   ├── database.js     # DB initialization
│   │   │   └── taskRepository.js # Local CRUD operations
│   │   │
│   │   ├── sync/               # Real-time & Offline Synchronization
│   │   │   ├── syncEngine.js   # Reconciliation & conflict resolution
│   │   │   ├── queue.js        # Offline operation queue
│   │   │   └── websocket.js    # WS connection management
│   │   │
│   │   ├── ui/                 # DOM Components & Interactions
│   │   │   ├── board.js        # Kanban board layout
│   │   │   ├── card.js         # Task card logic
│   │   │   └── dragDrop.js     # Zero-dependency drag-and-drop
│   │   │
│   │   ├── app.js              # Application entry point
│   │   ├── state.js            # Redux-like reactive store
│   │   └── utils.js            # Shared utility functions
│   │
│   ├── sw.js                   # Service Worker (offline support)
│   ├── manifest.json           # PWA configuration
│   └── package.json
│
├── server/                     # Backend Application (Node.js/Express)
│   ├── src/
│   │   ├── config/             # Configuration
│   │   │   └── db.js           # Database setup
│   │   │
│   │   ├── controllers/        # REST API Handlers
│   │   │   └── taskController.js
│   │   │
│   │   ├── middleware/         # Express middleware
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── models/             # Data schemas
│   │   │   └── Task.js
│   │   │
│   │   ├── routes/             # API route definitions
│   │   │   └── taskRoutes.js
│   │   │
│   │   ├── sockets/            # WebSocket handling
│   │   │   ├── socketServer.js
│   │   │   └── syncHandler.js
│   │   │
│   │   └── server.js           # Server entry point
│   │
│   ├── .env.example
│   └── package.json
│
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ LTS
- npm or yarn

### Server Setup

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3000`

### Client Setup

```bash
cd client
npm install
npm start
```

Client runs on `http://localhost:8000`

## 🔌 API Endpoints

### Boards
- `GET /api/boards` - List all boards
- `GET /api/boards/:boardId` - Get board with columns and tasks

### Tasks
- `GET /api/boards/:boardId/tasks` - List tasks in board
- `GET /api/tasks/:taskId` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `PATCH /api/tasks/:taskId/move` - Move task to column/position

## 🔄 WebSocket Events

### Client → Server
- `SYNC_EVENTS` - Send events for synchronization
- `TASK_UPDATED` - Broadcast task update
- `PING` - Connection heartbeat

### Server → Client
- `CONNECTED` - Connection established with clientId
- `TASK_UPDATED` - Remote task update
- `TASK_CREATED` - Remote task creation
- `TASK_DELETED` - Remote task deletion
- `TASK_MOVED` - Remote task movement
- `PONG` - Heartbeat response

## 💾 Local Data Model

### Tasks
```javascript
{
  id: string,
  boardId: string,
  columnId: string,
  title: string,
  description: string,
  position: number,
  tags: string[],
  assignee: string | null,
  createdAt: number,
  updatedAt: number,
  synced: boolean
}
```

### Boards
```javascript
{
  id: string,
  title: string,
  description: string,
  createdAt: number,
  updatedAt: number
}
```

### Columns
```javascript
{
  id: string,
  boardId: string,
  title: string,
  position: number,
  createdAt: number
}
```

## 🏗️ Architecture Highlights

### Client-Side
- **IndexedDB**: Persistent local storage with transaction support
- **Redux-like Store**: Centralized state management with middleware
- **Connection State Machine**: Finite state machine for offline/online transitions
- **Sync Engine**: Vector clock-based CRDT for conflict resolution
- **Service Worker**: Offline caching and background sync

### Server-Side
- **Express.js**: Lightweight HTTP framework
- **WebSocket**: Real-time bidirectional communication
- **File-based DB**: Simple JSON persistence for development
- **Event Logging**: Audit trail for all operations

## 🔐 Zero Dependencies (Client)

The client uses **zero external dependencies** - only native Web APIs:

- **IndexedDB** - Local persistence
- **WebSocket** - Real-time sync
- **Service Worker** - Offline support
- **Fetch API** - HTTP requests
- **Web APIs** - DOM manipulation, localStorage, etc.

## 📱 Features

### Offline-First
- Works without internet connection
- Queues operations while offline
- Automatic sync when reconnected
- Conflict resolution via CRDTs

### Real-Time Collaboration
- Multiple users editing simultaneously
- Live updates via WebSocket
- Operational transformation for concurrent edits
- Vector clocks for causality tracking

### Progressive Web App
- Installable on mobile devices
- Works as standalone app
- Service Worker caching
- Responsive design

## 🧪 Testing

Run server:
```bash
cd server && npm start
```

Run client (from different terminal):
```bash
cd client && npm start
# Open http://localhost:8000
```

## 📖 Development

### Client Architecture
- Entry point: `src/app.js`
- State management: `src/state.js`
- Database: `src/db/database.js`
- Sync: `src/sync/syncEngine.js`
- UI: `src/ui/` components

### Server Architecture
- Entry point: `src/server.js`
- Routes: `src/routes/`
- Controllers: `src/controllers/`
- WebSocket: `src/sockets/`
- Database: `src/config/db.js`

## 🔄 Sync Protocol

The system uses an event-based sync model:

1. **Local Change**: User modifies task → event emitted
2. **Enqueue**: Event added to sync queue with vector clock
3. **Send**: When online, send queued events to server
4. **Process**: Server applies events, broadcasts to other clients
5. **Receive**: Clients receive and apply remote events
6. **Conflict**: If concurrent edits detected, CRDT resolves automatically

## 🚦 Connection States

```
UNINITIALIZED
    ↓
OFFLINE → CONNECTING → AUTHENTICATING → SYNCING → READY
    ↑                                              ↓
    └──────────────────────────────────────────────┘
              (disconnect or error)
```

## 📝 License

MIT

## 👥 Contributing

Contributions welcome! Please follow the architecture guidelines.

## 📞 Support

For issues, questions, or suggestions, please open an issue in the repository.
- State management architecture
- Offline-first flow with queue processing
- Error handling and recovery strategies

## Conflict Resolution Strategy

See [CONFLICT_RESOLUTION.md](docs/CONFLICT_RESOLUTION.md) for:
- Operational Transformation (OT) algorithm
- CRDT-inspired merge strategies
- Deterministic conflict resolution
- Time-vector clock implementation

## API Reference

See [API.md](docs/API.md) for:
- WebSocket message protocol
- HTTP endpoints
- Event schemas
- Error codes and handling

## State Machine Design

See [STATE_MACHINE.md](docs/STATE_MACHINE.md) for:
- Client lifecycle states
- Sync state machine
- UI state transitions
- Event handler orchestration

---

**Built by architects who treat offline-first as a first-class requirement, not an afterthought.**
