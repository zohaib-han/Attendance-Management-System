
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const xss = require('xss');
const { Class,
  Student,
  Faculty,
  Subject,
  ClassFacultySubject,
  Attendance,
  Admin,
  ActivityLog,
  SchoolEvent,
  Query, } = require('../db');

const validateFaculty = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .optional()
    .isLength({ min: 6 }) 
    .withMessage('Password must be at least 6 characters'),
];

const validateId = [
  param('id').customSanitizer((value) => parseInt(value)).isInt({ min: 1 }).withMessage('Invalid faculty ID'),
];
const validateFacultyId = [
  param('faculty_id').customSanitizer((value) => parseInt(value)).isInt({ min: 1 }).withMessage('Invalid faculty ID'),
];

router.get('/all', async (req, res) => {
  try {
    const faculties = await Faculty.find().select('id name email');
    res.json(faculties.map(fac => ({ id: fac.id, name: fac.name, email: fac.email })));
  } catch (err) {
    console.error('Database error in GET /all:', err);
    res.status(500).json({ message: 'An error occurred while fetching faculty' });
  }
});

router.post('/', validateFaculty, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { name, email, password } = req.body;
  const sanitizedName = xss(name);
  const sanitizedEmail = xss(email);

  try {
    const existingFaculty = await Faculty.findOne({ email: sanitizedEmail });
    if (existingFaculty) {
      return res.status(400).json({ message: 'Faculty with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const faculty = await Faculty.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
    });

    res.json({ message: 'Faculty created successfully', id: faculty.id });
  } catch (err) {
    console.error('Database error in POST /:', err);
    res.status(500).json({ message: 'An error occurred while creating faculty' });
  }
});

router.put('/update/:id', validateId, validateFaculty, async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /update/:id:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { id } = req.params;
  const { name, email, password } = req.body;
  const sanitizedName = xss(name);
  const sanitizedEmail = xss(email);

  try {
    const faculty = await Faculty.findOne({ id });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const duplicate = await Faculty.findOne({ email: sanitizedEmail, id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ message: 'Email already in use by another faculty' });
    }

    const updateData = {
      name: sanitizedName,
      email: sanitizedEmail,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await Faculty.updateOne({ id }, updateData);
    res.json({ message: 'Faculty updated successfully' });
  } catch (err) {
    console.error('Database error in PUT /update/:id:', err);
    res.status(500).json({ message: 'An error occurred while updating faculty' });
  }
});

router.get('/:faculty_id', validateFacultyId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    
    return res.status(400).json({ message: 'Invalid faculty ID', errors: errors.array() });
  }

  const { faculty_id } = req.params;

  try {
    const faculty = await Faculty.findOne({ id: faculty_id }).select('id name email');
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    res.json([{ id: faculty.id, name: faculty.name, email: faculty.email }]);
  } catch (err) {
    console.error('Database error in GET /:faculty_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching faculty' });
  }
});

router.delete('/:id', validateId, async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in DELETE /:id:', errors.array());
    return res.status(400).json({ message: 'Invalid faculty ID', errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const result = await Faculty.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    else
    {
      await ClassFacultySubject.deleteMany({ faculty_id: id });
    }
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err) {
    console.error('Database error in DELETE /:id:', err);
    res.status(500).json({ message: 'An error occurred while deleting faculty' });
  }
});

router.get('/assignments/:faculty_id', validateFacultyId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid faculty ID', errors: errors.array() });
  }

  const { faculty_id } = req.params;

  try {
    // Fetch assignments
    const assignments = await ClassFacultySubject.find({ faculty_id }).lean();

    // Get unique class_id and subject_id values
    const classIds = [...new Set(assignments.map(a => a.class_id))];
    const subjectIds = [...new Set(assignments.map(a => a.subject_id))];

    // Fetch classes and subjects
    const classes = await Class.find({ id: { $in: classIds } })
      .select('id class_name section')
      .lean();
    const subjects = await Subject.find({ id: { $in: subjectIds } })
      .select('id name')
      .lean();

    // Create lookup maps
    const classMap = new Map(classes.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    // Format assignments
    const formattedAssignments = assignments.map(assign => ({
      id: assign._id,
      class_name: classMap.get(assign.class_id)?.class_name || 'Unknown Class',
      class_id: assign.class_id,
      section: classMap.get(assign.class_id)?.section || 'Unknown Section',
      subject: subjectMap.get(assign.subject_id)?.name || 'Unknown Subject',
    }));

    res.json(formattedAssignments);
  } catch (err) {
    console.error('Database error in GET /assignments/:faculty_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching assignments' });
  }
});

router.get('/:subject_id/faculty', [
  param('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid subject ID', errors: errors.array() });
  }

  const { subject_id } = req.params;

  try {
    const assignment = await ClassFacultySubject.findOne({ subject_id });
    if (!assignment) {
      return res.status(404).json({ message: 'No faculty assigned to this subject' });
    }
    res.json({ faculty_id: assignment.faculty_id });
  } catch (err) {
    console.error('Database error in GET /:subject_id/faculty:', err);
    res.status(500).json({ message: 'An error occurred while fetching faculty' });
  }
});

module.exports = router;
