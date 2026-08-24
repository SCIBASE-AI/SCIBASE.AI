import { Router } from 'express';
import { createBounty, getBounties, submitProposal } from '../controllers/bountyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createBounty);
router.get('/', getBounties);
router.post('/:id/submit', authenticate, submitProposal);

export default router;
