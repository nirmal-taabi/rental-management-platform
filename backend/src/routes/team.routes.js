import express from 'express';
import {
  createTeamMember,
  getTeam,
  updateTeamMemberStatus,
} from '../controllers/team.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorization.middleware.js';

const router = express.Router();
router.use(authMiddleware, authorizeRoles('OWNER'));

router.get('/', getTeam);
router.post('/', createTeamMember);
router.patch('/:userId/status', updateTeamMemberStatus);

export default router;
