import { body } from 'express-validator';

export const validateExamplePayload = [
  body('name').isString().withMessage('Name is required').trim().notEmpty(),
  body('email').optional().isEmail().withMessage('Email must be valid'),
];
