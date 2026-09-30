import express from 'express';
import { check } from 'express-validator';
import { getExample } from '../controllers/example.controller.js';

const router = express.Router();

router.get('/:id', [check('id').isInt().withMessage('Id must be an integer')], getExample);

export default router;
