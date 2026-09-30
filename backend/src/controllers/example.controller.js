import { sendSuccess } from '../utils/apiResponse.js';
import { getExampleById } from '../services/example.service.js';

export const getExample = async (req, res, next) => {
  try {
    const example = await getExampleById(req.params.id);

    if (!example) {
      return res.status(404).json({
        success: false,
        message: 'Example record not found',
        error: { code: 'NOT_FOUND' },
      });
    }

    return sendSuccess(res, 'Example record retrieved successfully', example, 200);
  } catch (error) {
    return next(error);
  }
};
