const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9A-Z]{15}$/;

const pushError = (errors, field, message) => {
  errors.push({ field, message });
};

export const validateShopUpdateInput = (payload = {}) => {
  const errors = [];

  if (!payload.name || String(payload.name).trim().length < 2) {
    pushError(errors, 'name', 'Shop name is required.');
  }

  if (!payload.businessName || String(payload.businessName).trim().length < 2) {
    pushError(errors, 'businessName', 'Business name is required.');
  }

  if (!payload.phone || !PHONE_REGEX.test(String(payload.phone).trim())) {
    pushError(errors, 'phone', 'A valid Indian phone number is required.');
  }

  if (!payload.email || !EMAIL_REGEX.test(String(payload.email).trim())) {
    pushError(errors, 'email', 'A valid shop email is required.');
  }

  if (!payload.address || String(payload.address).trim().length < 5) {
    pushError(errors, 'address', 'Address is required.');
  }

  if (!payload.city || String(payload.city).trim().length < 2) {
    pushError(errors, 'city', 'City is required.');
  }

  if (!payload.state || String(payload.state).trim().length < 2) {
    pushError(errors, 'state', 'State is required.');
  }

  if (!payload.pincode || !/^\d{6}$/.test(String(payload.pincode).trim())) {
    pushError(errors, 'pincode', 'A valid 6-digit pincode is required.');
  }

  if (payload.gstNumber && !GST_REGEX.test(String(payload.gstNumber).trim().toUpperCase())) {
    pushError(errors, 'gstNumber', 'GST number must be 15 characters and alphanumeric.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
