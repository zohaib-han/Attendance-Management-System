const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const xss = require('xss');
const { Admin, Student, Faculty } = require('../db');

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'student', 'faculty']).withMessage('Invalid role'),
];

router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /register:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { name, email, password, role } = req.body;
  const sanitizedName = xss(name);
  const sanitizedEmail = xss(email);

  try {
    let Model;
    switch (role) {
      case 'admin':
        Model = Admin;
        break;
      case 'student':
        Model = Student;
        break;
      case 'faculty':
        Model = Faculty;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    const existingUser = await Model.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = role === 'admin' ? {
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
    } : {
      id: undefined,
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
    };

    if (role === 'student') {
      userData.roll_no = `RN${Date.now()}`;
      userData.class_id = 1;
    }

    const user = await Model.create(userData);
    res.json({ message: 'User registered successfully', id: role !== 'admin' ? user.id : undefined });
  } catch (err) {
    console.error('Database error in POST /register:', err);
    res.status(500).json({ message: 'An error occurred while registering user' });
  }
});

router.post('/logged', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /logged:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await Admin.findOne({ email });
    let role = 'admin';

    if (!user) {
      user = await Student.findOne({ email });
      role = 'student';
    }

    if (!user) {
      user = await Faculty.findOne({ email });
      role = 'faculty';
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: role === 'admin' ? user._id : user.id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role, id: role === 'admin' ? user._id : user.id });
  } catch (err) {
    if (err.message.includes('secretOrPrivateKey')) {
      console.error('JWT configuration error:', err.message);
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.error('Database error in POST /logged:', err);
    return res.status(500).json({ message: 'An error occurred while logging in' });
  }
});

router.all('/logged', (req, res) => {
  res.status(405).json({ message: 'Method not allowed. Use POST to login.' });
});

module.exports = router;