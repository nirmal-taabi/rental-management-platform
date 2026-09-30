class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', isOperational = true, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
