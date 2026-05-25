/**
 * Error Handler Middleware
 * 
 * Centralized error handling and validation.
 */

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error response
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {stack: err.stack})
  });
}

/**
 * Not found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found'
  });
}

/**
 * Request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      // Basic validation - check required fields
      if (schema.required) {
        const missing = schema.required.filter(field => !(field in req.body));
        if (missing.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Missing required fields: ${missing.join(', ')}`
          });
        }
      }
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid request'
      });
    }
  };
}

/**
 * CORS middleware
 */
function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * Logging middleware
 */
function loggingMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  validateRequest,
  corsMiddleware,
  loggingMiddleware
};
