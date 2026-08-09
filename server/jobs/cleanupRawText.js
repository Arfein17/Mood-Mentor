const cron = require('node-cron');
const { Op } = require('sequelize');
const { Checkin } = require('../models');

// Run every day at midnight to scrub raw text older than 30 days
cron.schedule('0 0 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);
    const [updatedRows] = await Checkin.update(
      { raw_text: null },
      {
        where: {
          created_at: { [Op.lt]: thirtyDaysAgo },
          raw_text: { [Op.not]: null }
        }
      }
    );
    console.log(`[Job] cleanupRawText: Scrubbed raw_text from ${updatedRows} checkins older than 30 days.`);
  } catch (err) {
    console.error(`[Job] cleanupRawText Error:`, err);
  }
});
