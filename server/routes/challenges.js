const express = require('express');
const router = express.Router();
const { Challenge, ChallengeParticipant } = require('../models');
const { awardPoints } = require('../services/gamification');

// POST /api/challenges
router.post('/', async (req, res) => {
  try {
    const challenge = await Challenge.create(req.body);
    res.status(201).json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/challenges/:id/join
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const participant = await ChallengeParticipant.create({
      challenge_id: id,
      user_id: userId,
      status: 'joined'
    });
    res.status(201).json(participant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/challenges/:id/complete
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    await ChallengeParticipant.update(
      { status: 'completed', completed_at: new Date() },
      { where: { challenge_id: id, user_id: userId } }
    );
    
    await awardPoints(userId, 'challenge');
    res.json({ success: true, message: 'Challenge completed and points awarded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
