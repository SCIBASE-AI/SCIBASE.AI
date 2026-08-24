import { Request, Response } from 'express';
import Bounty from '../models/Bounty';
import Submission from '../models/Submission';

export const createBounty = async (req: Request, res: Response) => {
  try {
    const bounty = new Bounty({ ...req.body, postedBy: req.user.id });
    await bounty.save();
    res.status(201).json(bounty);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getBounties = async (req: Request, res: Response) => {
  try {
    const bounties = await Bounty.find({ status: 'open' });
    res.json(bounties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const submitProposal = async (req: Request, res: Response) => {
  try {
    const submission = new Submission({
      bountyId: req.params.id,
      submittedBy: req.user.id,
      ...req.body
    });
    await submission.save();
    res.status(201).json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
