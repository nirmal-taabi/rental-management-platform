const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;

const validatePassword = (password) => (
  password.length >= 8
  && Buffer.byteLength(password, 'utf8') <= 72
  && /[A-Z]/.test(password)
  && /[a-z]/.test(password)
  && /[0-9]/.test(password)
  && /[^A-Za-z0-9]/.test(password)
);

export const validateStaffCreateInput = (payload = {}) => {
  const errors = [];
  const firstName = String(payload.firstName || '').trim();
  const lastName = String(payload.lastName || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const password = String(payload.temporaryPassword || '');

  if (firstName.length < 2 || firstName.length > 100) {
    errors.push({ field: 'firstName', message: 'First name must be between 2 and 100 characters.' });
  }
  if (lastName.length > 100) {
    errors.push({ field: 'lastName', message: 'Last name must be 100 characters or fewer.' });
  }
  if (email.length > 150 || !EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Provide a valid staff email address.' });
  }
  if (phone && (phone.length > 30 || !PHONE_REGEX.test(phone))) {
    errors.push({ field: 'phone', message: 'Provide a valid Indian phone number.' });
  }
  if (!validatePassword(password)) {
    errors.push({
      field: 'temporaryPassword',
      message: 'Temporary password must be 8-72 bytes and include uppercase, lowercase, number, and special character.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { firstName, lastName, email: email.toLowerCase(), phone, temporaryPassword: password },
  };
};

export const validateStaffStatusInput = (payload = {}) => {
  const status = String(payload.status || '').trim().toLowerCase();
  const errors = ['active', 'suspended'].includes(status)
    ? []
    : [{ field: 'status', message: 'Status must be active or suspended.' }];
  return { isValid: errors.length === 0, errors, status };
};

export const validatePasswordChangeInput = (payload = {}) => {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  const errors = [];

  if (!currentPassword) errors.push({ field: 'currentPassword', message: 'Current password is required.' });
  if (!validatePassword(newPassword)) {
    errors.push({
      field: 'newPassword',
      message: 'New password must be 8-72 bytes and include uppercase, lowercase, number, and special character.',
    });
  }
  if (currentPassword && currentPassword === newPassword) {
    errors.push({ field: 'newPassword', message: 'Choose a new password different from the temporary password.' });
  }

  return { isValid: errors.length === 0, errors, value: { currentPassword, newPassword } };
};
