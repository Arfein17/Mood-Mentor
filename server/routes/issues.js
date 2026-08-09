const express = require('express');
const router = express.Router();
const { AdminIssueReport } = require('../models');

// POST /api/issues/report
router.post('/report', async (req, res) => {
  try {
    const { category, department } = req.body;
    // Explicitly NO user_id stored to maintain absolute anonymity
    const report = await AdminIssueReport.create({ category, department });
    res.status(201).json({ success: true, reportId: report.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
