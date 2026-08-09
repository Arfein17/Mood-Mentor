const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mode-mentor-secret-key-2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
        return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    const user = await User.findOne({ where: { employee_or_student_id: employeeId } });
    if (!user) {
        // Return generic message to prevent leaking IDs
        return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash || '');
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, employeeId: user.employee_or_student_id, role: user.role, department: user.department } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { employeeId, department, role, password } = req.body;
    if (!employeeId || !password) {
        return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    let user = await User.findOne({ where: { employee_or_student_id: employeeId } });
    if (user) return res.status(400).json({ error: 'User already exists. Please login.' });
    
    const password_hash = await bcrypt.hash(password, 10);
    user = await User.create({ employee_or_student_id: employeeId, department, role: role || 'employee', password_hash });
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user.id, employeeId: user.employee_or_student_id, role: user.role, department: user.department } });
  } catch (err) {
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

    const user = await User.findOne({ where: { employee_or_student_id: employeeId, role: 'admin' } });
    
    // Check old env variable first for fallback during migration
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminMode@2026';
    let isValid = false;

    if (user && user.password_hash) {
       isValid = await bcrypt.compare(password, user.password_hash);
    } else if (password === adminPass) {
       // Allow env fallback if admin exists but has no hash yet
       isValid = !!user;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }
    
    const token = jwt.sign({ id: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, employeeId: user.employee_or_student_id, role: 'admin', department: user.department } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
