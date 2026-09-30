import { pool } from '../config/database.js';

export const createAuditLog = async ({ shopId, userId, entityType, entityId, action, oldValues, newValues, ipAddress }, connection = pool) => {
  await connection.query(
    `INSERT INTO audit_logs (shop_id, user_id, entity_type, entity_id, action, old_values, new_values, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shopId,
      userId || null,
      entityType,
      entityId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress || null,
    ],
  );
};