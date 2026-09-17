'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Checkin } = require('../models');
const { sendCheckinReminderEmail } = require('../services/emailService');

/**
 * Sends daily reminder to all users who have:
 *  - reminders_enabled === true
 *  - a valid email on file
 *  - haven't checked in yet today
 */
async function runDailyCheckinReminders() {
  console.log('[Job] dailyReminders: Starting check-in reminder job...');
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Find all eligible users
    const users = await User.findAll({
      where: {
        reminders_enabled: true,
        email: { [Op.ne]: null }
      },
      attributes: ['id', 'email', 'display_name', 'employee_or_student_id']
    });

    if (!users || users.length === 0) {
      console.log('[Job] dailyReminders: No eligible users with email found.');
      return;
    }

    let sentCount = 0;
    for (const user of users) {
      // Check if user already submitted a check-in today
      const todayCheckin = await Checkin.findOne({
        where: {
          user_id: user.id,
          created_at: { [Op.gte]: startOfToday }
        }
      });

      if (!todayCheckin) {
        try {
          await sendCheckinReminderEmail(
            user.email,
            user.display_name || user.employee_or_student_id
          );
          sentCount++;
        } catch (mailErr) {
          console.warn(`[Job] dailyReminders: Failed to send to ${user.email}:`, mailErr.message);
        }
      }
    }

    console.log(`[Job] dailyReminders: Sent ${sentCount} reminder email(s) out of ${users.length} eligible user(s).`);
  } catch (err) {
    console.error('[Job] dailyReminders Error:', err);
  }
}

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  runDailyCheckinReminders();
});

module.exports = { runDailyCheckinReminders };
