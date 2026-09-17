const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, PasswordResetToken } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'mode-mentor-secret-key-2026';

// POST /api/auth/login — accepts employeeId or email
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID or email and password are required.' });
    }

    const trimmedIdentifier = employeeId.trim();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { employee_or_student_id: trimmedIdentifier },
          { email: trimmedIdentifier.toLowerCase() }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        id: user.id,
        employeeId: user.employee_or_student_id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        department: user.department,
        avatarType: user.avatar_type,
        avatarValue: user.avatar_value
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { employeeId, email, department, role, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    const cleanId = employeeId.trim();
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      const existingEmail = await User.findOne({ where: { email: cleanEmail } });
      if (existingEmail) {
        return res.status(400).json({ error: 'This email is already registered — please log in or use a different email.' });
      }
    }

    let existingUser = await User.findOne({ where: { employee_or_student_id: cleanId } });
    if (existingUser) {
      return res.status(400).json({ error: 'This ID is already registered — please log in instead or use a different ID.' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      employee_or_student_id: cleanId,
      email: cleanEmail,
      department: department || null,
      role: role || 'employee',
      password_hash
    });
    
    res.status(201).json({
      message: 'Account created! Please log in with your credentials.',
      user: {
        id: user.id,
        employeeId: user.employee_or_student_id,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This ID or email is already registered.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Admin ID and password are required.' });
    }

    const trimmedIdentifier = employeeId.trim();
    const user = await User.findOne({
      where: {
        role: 'admin',
        [Op.or]: [
          { employee_or_student_id: trimmedIdentifier },
          { email: trimmedIdentifier.toLowerCase() }
        ]
      }
    });
    
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminMode@2026';
    let isValid = false;

    if (user && user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else if (password === adminPass) {
      isValid = !!user;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }
    
    const token = jwt.sign({ id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        id: user.id,
        employeeId: user.employee_or_student_id,
        email: user.email,
        role: 'admin',
        department: user.department
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Please enter your Employee ID or registered email address.' });
    }

    const cleanInput = identifier.trim();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { employee_or_student_id: cleanInput },
          { email: cleanInput.toLowerCase() }
        ]
      }
    });

    // If user doesn't exist or has no registered email, return generic friendly message
    // so attackers cannot enumerate valid user IDs/emails
    if (!user || !user.email) {
      return res.json({
        success: true,
        message: 'If an account matching that ID or email exists with an email address on file, a password reset link has been sent.'
      });
    }

    // Invalidate any existing unused reset tokens for this user
    await PasswordResetToken.update(
      { used: true },
      { where: { user_id: user.id, used: false } }
    );

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false
    });

    // Send email via Gmail
    try {
      await sendPasswordResetEmail(user.email, rawToken, user.display_name || user.employee_or_student_id);
    } catch (emailErr) {
      console.error('[Auth] Failed to send password reset email:', emailErr);
      return res.status(500).json({ error: 'Failed to send password reset email. Please try again later or contact support.' });
    }

    res.json({
      success: true,
      message: `A password reset link has been sent to ${user.email.replace(/(?<=.{2}).(?=.*@)/g, '*')}. Please check your inbox and spam folder.`
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ error: err.message || 'Error processing password reset request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await PasswordResetToken.findOne({
      where: {
        token_hash: tokenHash,
        used: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({
        error: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    const user = await User.findByPk(resetRecord.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash });
    await resetRecord.update({ used: true });

    res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ error: err.message || 'Error resetting password.' });
  }
});

module.exports = router;
