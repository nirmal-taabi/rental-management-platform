import express from 'express';
import { listCitiesForState, listStates } from '../controllers/location.controller.js';

const router = express.Router();

router.get('/states', listStates);
router.get('/states/:stateId/cities', listCitiesForState);

export default router;