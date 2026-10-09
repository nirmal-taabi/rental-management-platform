import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { BAD_REQUEST, CREATED, OK } from '../constants/httpStatus.js';
import {
  addStaffMember,
  getTeamMembers,
  updateStaffMemberStatus,
} from '../services/team.service.js';
import {
  validateStaffCreateInput,
  validateStaffStatusInput,
} from '../validators/team.validator.js';

const auditContext = (req) => ({ ipAddress: req.ip });

export const getTeam = async (req, res, next) => {
  try {
    const members = await getTeamMembers(req.user.shopId);
    return sendSuccess(res, 'Team members retrieved.', members, OK);
  } catch (error) {
    return next(error);
  }
};

export const createTeamMember = async (req, res, next) => {
  try {
    const validation = validateStaffCreateInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid staff account details.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }
    const member = await addStaffMember(
      req.user.shopId,
      req.user.id,
      validation.value,
      auditContext(req),
    );
    return sendSuccess(res, 'Staff account created. Share the temporary password securely.', member, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateTeamMemberStatus = async (req, res, next) => {
  try {
    const validation = validateStaffStatusInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid staff account status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }
    const member = await updateStaffMemberStatus(
      req.user.shopId,
      req.user.id,
      req.params.userId,
      validation.status,
      auditContext(req),
    );
    return sendSuccess(res, 'Staff account status updated.', member, OK);
  } catch (error) {
    return next(error);
  }
};
