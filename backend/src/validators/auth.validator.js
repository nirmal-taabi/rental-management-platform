const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9A-Z]{15}$/;

const pushError = (errors, field, message) => {
  errors.push({ field, message });
};

export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be 72 bytes or fewer.';

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include uppercase, lowercase, number, and special character.';
  }

  return null;
};

export const validateForgotPasswordInput = (payload = {}) => {
  const errors = [];
  const email = String(payload.email || '').trim();
  if (!email || email.length > 150 || !EMAIL_REGEX.test(email)) {
    pushError(errors, 'email', 'A valid email is required.');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateResetPasswordInput = (payload = {}) => {
  const errors = [];
  if (!/^[a-f0-9]{64}$/i.test(String(payload.token || ''))) {
    pushError(errors, 'token', 'A valid password reset link is required.');
  }
  const passwordError = validatePassword(String(payload.newPassword || ''));
  if (passwordError) pushError(errors, 'newPassword', passwordError);
  if (payload.confirmPassword !== payload.newPassword) {
    pushError(errors, 'confirmPassword', 'Passwords do not match.');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateRegisterInput = (payload = {}) => {
  const errors = [];
  const owner = payload.owner || {};
  const shop = payload.shop || {};

  if (!owner.firstName || String(owner.firstName).trim().length < 2) {
    pushError(errors, 'owner.firstName', 'Owner first name is required.');
  }

  if (!owner.lastName || String(owner.lastName).trim().length < 2) {
    pushError(errors, 'owner.lastName', 'Owner last name is required.');
  }

  if (!owner.email || !EMAIL_REGEX.test(String(owner.email).trim())) {
    pushError(errors, 'owner.email', 'A valid owner email is required.');
  }

  if (!owner.phone || !PHONE_REGEX.test(String(owner.phone).trim())) {
    pushError(errors, 'owner.phone', 'A valid Indian phone number is required.');
  }

  const passwordError = validatePassword(owner.password);
  if (passwordError) {
    pushError(errors, 'owner.password', passwordError);
  }

  if (!owner.confirmPassword || owner.confirmPassword !== owner.password) {
    pushError(errors, 'owner.confirmPassword', 'Passwords do not match.');
  }

  if (!shop.name || String(shop.name).trim().length < 2) {
    pushError(errors, 'shop.name', 'Shop name is required.');
  }

  if (!shop.businessName || String(shop.businessName).trim().length < 2) {
    pushError(errors, 'shop.businessName', 'Business name is required.');
  }

  if (!shop.phone || !PHONE_REGEX.test(String(shop.phone).trim())) {
    pushError(errors, 'shop.phone', 'A valid shop phone number is required.');
  }

  if (!shop.email || !EMAIL_REGEX.test(String(shop.email).trim())) {
    pushError(errors, 'shop.email', 'A valid shop email is required.');
  }

  if (!shop.address || String(shop.address).trim().length < 5) {
    pushError(errors, 'shop.address', 'Shop address is required.');
  }

  if (!shop.city || String(shop.city).trim().length < 2) {
    pushError(errors, 'shop.city', 'City is required.');
  }

  if (!shop.state || String(shop.state).trim().length < 2) {
    pushError(errors, 'shop.state', 'State is required.');
  }

  if (!shop.pincode || !/^\d{6}$/.test(String(shop.pincode).trim())) {
    pushError(errors, 'shop.pincode', 'A valid 6-digit pincode is required.');
  }

  if (shop.gstNumber && !GST_REGEX.test(String(shop.gstNumber).trim().toUpperCase())) {
    pushError(errors, 'shop.gstNumber', 'GST number must be 15 characters and alphanumeric.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateLoginInput = (payload = {}) => {
  const errors = [];
  const email = String(payload.email || '').trim();
  const password = String(payload.password || '');

  if (!email || !EMAIL_REGEX.test(email)) {
    pushError(errors, 'email', 'A valid email is required.');
  }

  if (!password || password.length < 8) {
    pushError(errors, 'password', 'Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
