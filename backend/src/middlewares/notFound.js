import { sendError } from '../utils/apiResponse.js';
import { NOT_FOUND } from '../constants/httpStatus.js';
import { NOT_FOUND as NOT_FOUND_CODE } from '../constants/errorCodes.js';

const notFoundHandler = (req, res) => {
  sendError(res, 'Resource not found', { code: NOT_FOUND_CODE }, NOT_FOUND);
};

export default notFoundHandler;
