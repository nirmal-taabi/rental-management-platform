const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

const pushError = (errors, field, message) => {
  errors.push({ field, message });
};

export const validateCustomerInput = (payload = {}) => {
  const errors = [];
  const firstName = String(payload.firstName || '').trim();
  const lastName = String(payload.lastName || '').trim();
  const phone = String(payload.phone || '').trim();
  const alternatePhone = String(payload.alternatePhone || '').trim();
  const email = String(payload.email || '').trim();
  const address = String(payload.address || '').trim();
  const city = String(payload.city || '').trim();
  const state = String(payload.state || '').trim();
  const pincode = String(payload.pincode || '').trim();
  const notes = String(payload.notes || '').trim();

  if (!firstName || firstName.length < 2 || firstName.length > 100) {
    pushError(errors, 'firstName', 'First name is required and must be 2-100 characters long.');
  }

  if (lastName && lastName.length > 100) {
    pushError(errors, 'lastName', 'Last name must be 100 characters or fewer.');
  }

  if (!phone || !PHONE_REGEX.test(phone)) {
    pushError(errors, 'phone', 'A valid Indian phone number is required.');
  }

  if (alternatePhone && !PHONE_REGEX.test(alternatePhone)) {
    pushError(errors, 'alternatePhone', 'Alternate phone must be a valid Indian phone number.');
  }

  if (email && !EMAIL_REGEX.test(email)) {
    pushError(errors, 'email', 'A valid email is required when provided.');
  }

  if (address && address.length > 255) {
    pushError(errors, 'address', 'Address must be 255 characters or fewer.');
  }

  if (city && city.length > 100) {
    pushError(errors, 'city', 'City must be 100 characters or fewer.');
  }

  if (state && state.length > 100) {
    pushError(errors, 'state', 'State must be 100 characters or fewer.');
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    pushError(errors, 'pincode', 'Pincode must be a 6-digit Indian pincode.');
  }

  if (notes && notes.length > 1000) {
    pushError(errors, 'notes', 'Notes must be 1000 characters or fewer.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCustomerDraftInput = (payload = {}) => {
  const errors = [];
  const fieldLimits = {
    firstName: 100,
    lastName: 100,
    phone: 30,
    alternatePhone: 30,
    email: 150,
    address: 255,
    city: 100,
    state: 100,
    pincode: 20,
    notes: 1000,
  };

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, errors: [{ field: 'body', message: 'Draft data must be an object.' }] };
  }

  Object.entries(payload).forEach(([field, value]) => {
    if (!Object.hasOwn(fieldLimits, field)) {
      pushError(errors, field, 'This field cannot be saved in a customer draft.');
    } else if (typeof value !== 'string') {
      pushError(errors, field, 'Draft fields must be text values.');
    } else if (value.length > fieldLimits[field]) {
      pushError(errors, field, `${field} must be ${fieldLimits[field]} characters or fewer.`);
    }
  });

  return { isValid: errors.length === 0, errors };
};

export const validateCustomerStatusInput = (payload = {}) => {
  const errors = [];
  const status = String(payload.status || '').trim().toUpperCase();
  const allowedStatuses = ['ACTIVE', 'INACTIVE'];

  if (!allowedStatuses.includes(status)) {
    pushError(errors, 'status', 'Status must be ACTIVE or INACTIVE.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
