const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { requireAuth } = require('../middleware/authMiddleware');

const avatarsDir = path.join(__dirname, '../public/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

router.get('/:userId', requireAuth, async (req, res) => {
  try {
    if (parseInt(req.params.userId) !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (parseInt(req.params.userId) !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    const { display_name, email, department, avatar_type, avatar_value, reminders_enabled, consent_to_aggregate } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (display_name !== undefined) user.display_name = display_name;
    if (department !== undefined) user.department = department;
    if (avatar_type !== undefined) user.avatar_type = avatar_type;
    
    // Email update
    if (email !== undefined) {
      const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({ error: 'Please enter a valid email address.' });
        }
        const existing = await User.findOne({
          where: {
            email: cleanEmail,
            id: { [Op.ne]: req.user.id }
          }
        });
        if (existing) {
          return res.status(400).json({ error: 'This email is already in use by another account.' });
        }
      }
      user.email = cleanEmail;
    }

    // Convert string booleans if necessary
    if (reminders_enabled !== undefined) user.reminders_enabled = reminders_enabled === 'true' || reminders_enabled === true;
    if (consent_to_aggregate !== undefined) user.consent_to_aggregate = consent_to_aggregate === 'true' || consent_to_aggregate === true;
    
    if (req.file && avatar_type === 'photo') {
      user.avatar_value = '/avatars/' + req.file.filename;
    } else if (avatar_type === 'preset' && avatar_value) {
      user.avatar_value = avatar_value;
    }
    
    await user.save();
    
    const updated = user.toJSON();
    delete updated.password_hash;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId/password', requireAuth, async (req, res) => {
  try {
    if (parseInt(req.params.userId) !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing passwords' });
    
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.password_hash) return res.status(400).json({ error: 'No password set' });
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });
    
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
