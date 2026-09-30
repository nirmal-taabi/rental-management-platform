import AppError from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { findAllStates, findCitiesByStateId } from '../repositories/location.repository.js';

export const getStates = async () => findAllStates();

export const getCitiesForState = async (stateId) => {
  const normalizedStateId = Number(stateId);
  if (!Number.isSafeInteger(normalizedStateId) || normalizedStateId < 1) {
    throw new AppError('State id must be a positive integer.', BAD_REQUEST, 'VALIDATION_ERROR');
  }

  return findCitiesByStateId(normalizedStateId);
};