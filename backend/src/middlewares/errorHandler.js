import { sendError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import {
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
} from '../constants/httpStatus.js';
import {
  VALIDATION_ERROR,
  AUTHENTICATION_ERROR,
  AUTHORIZATION_ERROR,
  NOT_FOUND as NOT_FOUND_CODE,
  DATABASE_ERROR,
  INTERNAL_SERVER_ERROR as INTERNAL_SERVER_ERROR_CODE,
} from '../constants/errorCodes.js';

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
  let message = err.message || 'Something went wrong';
  let code = INTERNAL_SERVER_ERROR_CODE;

  if (err.name === 'ValidationError') {
    code = err.code || VALIDATION_ERROR;
  } else if (statusCode === BAD_REQUEST) {
    code = err.code || VALIDATION_ERROR;
  } else if (statusCode === UNAUTHORIZED) {
    code = err.code || AUTHENTICATION_ERROR;
    message = 'Authentication required';
  } else if (statusCode === FORBIDDEN) {
    code = err.code || AUTHORIZATION_ERROR;
    message = 'You are not authorized to perform this action';
  } else if (statusCode === NOT_FOUND) {
    code = err.code || NOT_FOUND_CODE;
    message = 'Resource not found';
  } else if (
    err.code === 'ER_BAD_DB_ERROR' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ER_ACCESS_DENIED_ERROR'
  ) {
    code = DATABASE_ERROR;
    message = 'Database connection error';
  } else if (err.code) {
    code = err.code;
  }

  logger.error({
    message: err.message,
    statusCode,
    code,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  return sendError(res, message, { code, details: err.details }, statusCode);
};

export default errorHandler;
