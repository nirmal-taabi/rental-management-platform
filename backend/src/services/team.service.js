import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { validatePasswordChangeInput } from '../validators/team.validator.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import {
  createStaffAccount,
  findAccountByEmail,
  findShopTeamMember,
  listShopTeamMembers,
  updatePasswordAndClearReset,
  updateShopTeamMemberStatus,
} from '../repositories/team.repository.js';
import { BAD_REQUEST, CONFLICT, NOT_FOUND, UNAUTHORIZED } from '../constants/httpStatus.js';
import { EMAIL_ALREADY_EXISTS } from '../constants/errorCodes.js';

export const getTeamMembers = (shopId) => listShopTeamMembers(shopId);

export const addStaffMember = async (shopId, actorUserId, payload, audit = {}) => {
  const passwordHash = await hashPassword(payload.temporaryPassword);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existingAccount = await findAccountByEmail(payload.email, connection);
    if (existingAccount) {
      throw new AppError(
        'An account with this email already exists. Use an email address not registered on TrackinHub.',
        CONFLICT,
        EMAIL_ALREADY_EXISTS,
      );
    }

    const userId = await createStaffAccount({
      ...payload,
      shopId,
      passwordHash,
    }, connection);
    await createAuditLog({
      ...audit,
      shopId,
      userId: actorUserId,
      entityType: 'user',
      entityId: userId,
      action: 'SHOP_STAFF_CREATED',
      newValues: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName || null,
        role: 'STAFF',
        membershipStatus: 'active',
        passwordResetRequired: true,
      },
    }, connection);
    await connection.commit();
    return {
      id: userId,
      name: `${payload.firstName} ${payload.lastName || ''}`.trim(),
      email: payload.email,
      role: 'STAFF',
      membershipStatus: 'active',
      passwordResetRequired: true,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateStaffMemberStatus = async (shopId, actorUserId, userId, status, audit = {}) => {
  const targetUserId = Number(userId);
  if (!Number.isSafeInteger(targetUserId) || targetUserId < 1) {
    throw new AppError('Staff member not found.', NOT_FOUND, 'TEAM_MEMBER_NOT_FOUND');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const member = await findShopTeamMember(shopId, targetUserId, connection);
    if (!member) throw new AppError('Staff member not found.', NOT_FOUND, 'TEAM_MEMBER_NOT_FOUND');
    if (status === 'active' && member.accountStatus !== 'active') {
      throw new AppError(
        'This account is inactive. Reactivate the account before restoring shop access.',
        CONFLICT,
        'INACTIVE_USER',
      );
    }
    if (member.membershipStatus !== status) {
      await updateShopTeamMemberStatus(shopId, targetUserId, status, connection);
      await createAuditLog({
        ...audit,
        shopId,
        userId: actorUserId,
        entityType: 'user',
        entityId: targetUserId,
        action: status === 'suspended' ? 'SHOP_STAFF_SUSPENDED' : 'SHOP_STAFF_REACTIVATED',
        oldValues: { membershipStatus: member.membershipStatus },
        newValues: { membershipStatus: status },
      }, connection);
    }
    await connection.commit();
    return {
      id: member.id,
      name: `${member.firstName} ${member.lastName || ''}`.trim(),
      email: member.email,
      role: member.role,
      membershipStatus: status,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const changeOwnPassword = async (userId, payload, passwordResetRequired) => {
  const validation = validatePasswordChangeInput(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid password update.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }

  const [rows] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [userId],
  );
  const user = rows[0];
  if (!user || !(await comparePassword(validation.value.currentPassword, user.password_hash))) {
    throw new AppError('Current password is incorrect.', UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const passwordHash = await hashPassword(validation.value.newPassword);
  await updatePasswordAndClearReset(userId, passwordHash);
  return { passwordResetRequired: Boolean(passwordResetRequired) };
};
