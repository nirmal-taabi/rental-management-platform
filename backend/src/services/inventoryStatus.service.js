import { STATUS_TRANSITIONS } from '../constants/inventory.constants.js';

export const canTransitionInventoryStatus = (currentStatus, nextStatus) => {
  const current = String(currentStatus || '').toUpperCase();
  const next = String(nextStatus || '').toUpperCase();
  return STATUS_TRANSITIONS[current]?.includes(next) || false;
};

export const getAllowedInventoryTransitions = (currentStatus) => STATUS_TRANSITIONS[String(currentStatus || '').toUpperCase()] || [];