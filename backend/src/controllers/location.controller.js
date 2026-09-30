import { sendSuccess } from '../utils/apiResponse.js';
import { OK } from '../constants/httpStatus.js';
import { getCitiesForState, getStates } from '../services/location.service.js';

export const listStates = async (_req, res, next) => {
  try {
    return sendSuccess(res, 'States retrieved successfully.', await getStates(), OK);
  } catch (error) {
    return next(error);
  }
};

export const listCitiesForState = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Cities retrieved successfully.', await getCitiesForState(req.params.stateId), OK);
  } catch (error) {
    return next(error);
  }
};