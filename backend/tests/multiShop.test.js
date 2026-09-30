import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import {
  createShopMembership,
  findActiveShopMembership,
  findShopMembershipsForUser,
} from '../src/repositories/userShopMembership.repository.js';
import { createShopForUser, switchShopForUser, updateShopForMembership, updateShopStatusForUser } from '../src/services/shop.service.js';
import { signToken } from '../src/utils/jwt.js';
import { validateShopCreateInput, validateShopStatusInput } from '../src/validators/shop.validator.js';

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1';

test('validateShopCreateInput accepts a shop profile without environment-specific fields', () => {
  const result = validateShopCreateInput({
    name: 'Classic Bridal Studio',
    businessName: 'Classic Bridal Studio Private Limited',
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, []);
});

test('validateShopCreateInput rejects malformed optional fields', () => {
  const result = validateShopCreateInput({
    name: 'Classic Bridal Studio',
    businessName: 'Classic Bridal Studio Private Limited',
    email: 'not-an-email',
    pincode: 'ABC',
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.errors.map((error) => error.field), ['email', 'pincode']);
});

test('validateShopStatusInput only accepts active shop lifecycle states', () => {
  assert.equal(validateShopStatusInput({ status: 'INACTIVE' }).isValid, true);
  assert.equal(validateShopStatusInput({ status: 'DELETED' }).isValid, false);
});

test('shop memberships scope active context and shop-scoped roles', { skip: !integrationEnabled }, async () => {
  const suffix = randomUUID().replaceAll('-', '');
  let homeShopId;
  let createdShopId;

  const runAuth = async (token, selectedShopId) => {
    const req = {
      headers: { authorization: `Bearer ${token}` },
      get: (name) => name.toLowerCase() === 'x-shop-id' ? String(selectedShopId) : undefined,
    };
    let authError = null;
    await authMiddleware(req, {}, (error) => { authError = error || null; });
    return { req, authError };
  };

  try {
    const [shopResult] = await pool.query(
      'INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)',
      [`Membership home ${suffix}`, `membership-home-${suffix}`, 'active'],
    );
    homeShopId = shopResult.insertId;
    const [userResult] = await pool.query(
      `INSERT INTO users (shop_id, first_name, last_name, email, password_hash, status, is_owner)
       VALUES (?, ?, ?, ?, ?, 'active', 0)`,
      [homeShopId, 'Shop', 'Member', `member-${suffix}@example.test`, 'test-hash'],
    );
    const userId = userResult.insertId;

    await createShopMembership({ userId, shopId: homeShopId, role: 'STAFF', status: 'active', isDefault: true });
    const createdShop = await createShopForUser(userId, {
      name: `Membership branch ${suffix}`,
      businessName: `Membership branch ${suffix} Private Limited`,
      ownerId: 999999,
    }, { ipAddress: '127.0.0.1' });
    createdShopId = createdShop.id;

    assert.equal(createdShop.role, 'OWNER');
    assert.equal(createdShop.isDefault, false);
    assert.equal((await findActiveShopMembership(userId, homeShopId)).role, 'STAFF');
    assert.equal((await findActiveShopMembership(userId, createdShopId)).role, 'OWNER');
    assert.equal((await findShopMembershipsForUser(userId)).length, 2);
    assert.equal((await switchShopForUser(userId, createdShopId)).id, createdShopId);

    const identityToken = signToken({ id: userId, shopId: homeShopId, roles: ['OWNER'] });
    const homeContext = await runAuth(identityToken, homeShopId);
    assert.equal(homeContext.authError, null);
    assert.equal(homeContext.req.user.shopId, homeShopId);
    assert.deepEqual(homeContext.req.user.roles, ['STAFF'], 'the signed role claim does not override membership role');

    const branchContext = await runAuth(identityToken, createdShopId);
    assert.equal(branchContext.authError, null);
    assert.equal(branchContext.req.user.shopId, createdShopId);
    assert.deepEqual(branchContext.req.user.roles, ['OWNER']);

    const deniedContext = await runAuth(identityToken, Number.MAX_SAFE_INTEGER);
    assert.equal(deniedContext.authError?.code, 'SHOP_ACCESS_DENIED');
    await assert.rejects(
      switchShopForUser(userId, Number.MAX_SAFE_INTEGER),
      (error) => error.code === 'SHOP_ACCESS_DENIED',
    );

    const deactivatedShop = await updateShopStatusForUser(userId, createdShopId, 'INACTIVE', { ipAddress: '127.0.0.1' });
    assert.equal(deactivatedShop.status, 'INACTIVE');
    const editedInactiveShop = await updateShopForMembership(userId, createdShopId, {
      name: `Membership branch edited ${suffix}`,
      businessName: `Membership business ${suffix}`,
    });
    assert.equal(editedInactiveShop.businessName, `Membership business ${suffix}`);
    await assert.rejects(
      switchShopForUser(userId, createdShopId),
      (error) => error.code === 'SHOP_ACCESS_DENIED',
    );
    assert.equal((await runAuth(identityToken, homeShopId)).authError, null, 'the user can continue in another active shop');

    const reactivatedShop = await updateShopStatusForUser(userId, createdShopId, 'ACTIVE', { ipAddress: '127.0.0.1' });
    assert.equal(reactivatedShop.status, 'ACTIVE');
    await pool.query(
      "UPDATE user_shop_memberships SET role = 'OWNER' WHERE user_id = ? AND shop_id = ?",
      [userId, homeShopId],
    );
    await pool.query(
      "UPDATE user_shop_memberships SET status = 'suspended' WHERE user_id = ? AND shop_id = ?",
      [userId, createdShopId],
    );
    await assert.rejects(
      updateShopStatusForUser(userId, homeShopId, 'INACTIVE', { ipAddress: '127.0.0.1' }),
      (error) => error.code === 'LAST_ACTIVE_SHOP',
    );
  } finally {
    const cleanupIds = [homeShopId, createdShopId].filter(Boolean);
    if (cleanupIds.length) {
      await pool.query(`DELETE FROM shops WHERE id IN (${cleanupIds.map(() => '?').join(', ')})`, cleanupIds);
    }
    await pool.end();
  }
});