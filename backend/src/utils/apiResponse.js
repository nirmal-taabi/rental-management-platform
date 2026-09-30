export const sendSuccess = (res, message = 'Request successful', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res,
  message = 'Something went wrong',
  error = { code: 'INTERNAL_SERVER_ERROR' },
  statusCode = 500,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
