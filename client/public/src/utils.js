/**
 * Shared Utilities - Zero-Dependency Library
 * 
 * Pure vanilla JavaScript utilities for common operations.
 * No external dependencies - using native Web APIs only.
 */

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate unique client ID
 */
export function generateClientId() {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Generate unique session ID
 */
export function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Generate unique event ID
 */
export function generateEventId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ============================================================================
// Timing & Async
// ============================================================================

/**
 * Sleep for milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function - delay execution until calls stop
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function - limit execution frequency
 */
export function throttle(fn, interval) {
  let lastCallTime = 0;

  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCallTime >= interval) {
      lastCallTime = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attempt, maxDelay = 300000) {
  const delay = Math.min(1000 * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * delay * 0.1;
  return delay + jitter;
}

// ============================================================================
// Array Operations
// ============================================================================

/**
 * Partition array by predicate
 */
export function partition(array, predicate) {
  const pass = [];
  const fail = [];

  for (const item of array) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }

  return [pass, fail];
}

/**
 * Chunk array into smaller arrays
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Group array by key function
 */
export function groupBy(array, keyFn) {
  const groups = new Map();

  for (const item of array) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }

  return groups;
}

/**
 * Get unique values
 */
export function unique(array, keyFn = v => v) {
  const seen = new Set();
  const result = [];

  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Flatten one level
 */
export function flatten(array) {
  return array.reduce((acc, val) => acc.concat(val), []);
}

// ============================================================================
// Object Operations
// ============================================================================

/**
 * Deep equality check
 */
export function isEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Deep clone
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(deepClone);

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Merge objects (shallow)
 */
export function merge(...objects) {
  const result = {};
  for (const obj of objects) {
    Object.assign(result, obj);
  }
  return result;
}

// ============================================================================
// String Operations
// ============================================================================

/**
 * Convert to camelCase
 */
export function camelCase(str) {
  return str.replace(/[-_\s](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, c => c.toLowerCase());
}

/**
 * Convert to kebab-case
 */
export function kebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

/**
 * Truncate string
 */
export function truncate(str, length = 50) {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

// ============================================================================
// Event Emitter
// ============================================================================

export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(handler);
    return this;
  }

  once(eventName, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(eventName, wrappedHandler);
    };
    return this.on(eventName, wrappedHandler);
  }

  off(eventName, handler) {
    if (!this.events.has(eventName)) return this;

    const handlers = this.events.get(eventName);
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }

    return this;
  }

  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return this;

    const handlers = this.events.get(eventName);
    for (const handler of handlers) {
      handler(...args);
    }

    return this;
  }

  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    return this;
  }
}

// ============================================================================
// DOM Operations
// ============================================================================

/**
 * Create element with options
 */
export function createElement(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.className) el.className = options.className;
  if (options.id) el.id = options.id;
  if (options.innerHTML) el.innerHTML = options.innerHTML;
  if (options.textContent) el.textContent = options.textContent;

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value);
    }
  }

  if (options.styles) {
    Object.assign(el.style, options.styles);
  }

  return el;
}

/**
 * Add class to element
 */
export function addClass(el, className) {
  el.classList.add(className);
}

/**
 * Remove class from element
 */
export function removeClass(el, className) {
  el.classList.remove(className);
}

/**
 * Toggle class on element
 */
export function toggleClass(el, className) {
  el.classList.toggle(className);
}

/**
 * Set multiple styles
 */
export function setStyle(el, styles) {
  Object.assign(el.style, styles);
}

/**
 * Get element position and size
 */
export function getElementOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

// ============================================================================
// Network Operations
// ============================================================================

/**
 * Fetch JSON with error handling
 */
export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * POST JSON
 */
export async function postJson(url, data, options = {}) {
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * PUT JSON
 */
export async function putJson(url, data, options = {}) {
  return fetchJson(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * DELETE request
 */
export async function deleteRequest(url, options = {}) {
  const response = await fetch(url, {
    method: 'DELETE',
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.status === 204 ? null : response.json();
}

// ============================================================================
// Logger
// ============================================================================

const DEBUG = localStorage.getItem('DEBUG') === 'true' || false;

export function log(...args) {
  if (DEBUG) console.log(...args);
}

export function logError(...args) {
  console.error(...args);
}

export function logWarn(...args) {
  console.warn(...args);
}
