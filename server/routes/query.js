
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
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

const validateQuery = [
  body('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
  body('faculty_id').isInt({ min: 1 }).withMessage('Invalid faculty ID'),
  body('subject').trim().isLength({ min: 1, max: 100 }).withMessage('Subject must be between 1 and 100 characters'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters'),
];

const validateReply = [
  body('reply').trim().isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters'),
];

const validateId = [
  param('id').isMongoId().withMessage('Invalid query ID'), // Uses _id
];

const validateFacultyId = [
  param('faculty_id').isInt({ min: 1 }).withMessage('Invalid faculty ID'),
];

const validateStudentId = [
  param('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
];

router.post('/', validateQuery, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { student_id, faculty_id, subject, message } = req.body;
  const sanitizedSubject = xss(subject);
  const sanitizedMessage = xss(message);

  try {
    const student = await Student.findOne({ id: student_id });
    if (!student) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const faculty = await Faculty.findOne({ id: faculty_id });
    if (!faculty) {
      return res.status(400).json({ message: 'Invalid faculty ID' });
    }

    const query = await Query.create({
      student_id,
      faculty_id,
      subject: sanitizedSubject,
      message: sanitizedMessage,
    });

    res.json({ message: 'Query submitted successfully', queryId: query._id });
  } catch (err) {
    console.error('Database error in POST /:', err);
    res.status(500).json({ message: 'An error occurred while submitting query' });
  }
});

router.get('/:faculty_id', validateFacultyId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:faculty_id:', errors.array());
    return res.status(400).json({ message: 'Invalid faculty ID', errors: errors.array() });
  }

  const { faculty_id } = req.params;

  try {
    const queries = await Query.find({ faculty_id, status: 'Pending' }).lean();
    const studentIds = [...new Set(queries.map(q => q.student_id))];
    const students = await Student.find({ id: { $in: studentIds } }).lean();

    const studentMap = students.reduce((map, student) => {
      map[student.id] = student;
      return map;
    }, {});

    const formattedQueries = queries.map(q => ({
      id: q._id,
      student_id: q.student_id,
      subject: q.subject,
      message: q.message,
      reply: q.reply,
      status: q.status,
      timestamp: q.timestamp,
      student_name: studentMap[q.student_id]?.name || 'Unknown',
    }));

    res.json(formattedQueries);
  } catch (err) {
    console.error('Database error in GET /:faculty_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching queries' });
  }
});

router.get('/:student_id/queries', validateStudentId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:student_id/queries:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { student_id } = req.params;

  try {
    const queries = await Query.find({ student_id }).lean();
    const facultyIds = [...new Set(queries.map(q => q.faculty_id))];
    const faculties = await Faculty.find({ id: { $in: facultyIds } }).lean();

    const facultyMap = faculties.reduce((map, fac) => {
      map[fac.id] = fac;
      return map;
    }, {});

    const formattedQueries = queries.map(q => ({
      id: q._id,
      subject: q.subject,
      message: q.message,
      reply: q.reply,
      status: q.status,
      timestamp: q.timestamp,
      faculty_name: facultyMap[q.faculty_id]?.name || 'Unknown',
    }));

    res.json(formattedQueries);
  } catch (err) {
    console.error('Database error in GET /:student_id/queries:', err);
    res.status(500).json({ message: 'An error occurred while fetching queries' });
  }
});

router.put('/:id/close', validateId, [
  body('role').isIn(['student', 'faculty']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /:id/close:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status === 'Closed') {
      return res.status(400).json({ message: 'Query is already closed' });
    }

    await Query.updateOne({ _id: id }, { status: 'Closed' });
    res.json({ message: 'Query closed successfully' });
  } catch (err) {
    console.error('Database error in PUT /:id/close:', err);
    res.status(500).json({ message: 'An error occurred while closing query' });
  }
});

router.put('/:id/accept', validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /:id/accept:', errors.array());
    return res.status(400).json({ message: 'Invalid query ID', errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const query = await Query.findById(id);
    console.log("query: ",query);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'Pending') {
      return res.status(400).json({ message: 'Query is not Pending' });
    }

    await Query.updateOne({ _id: id }, { status: 'Accepted' });
    res.json({ message: 'Query accepted successfully' });
  } catch (err) {
    console.error('Database error in PUT /:id/accept:', err);
    res.status(500).json({ message: 'An error occurred while accepting query' });
  }
});

router.put('/:id/reject', validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /:id/reject:', errors.array());
    return res.status(400).json({ message: 'Invalid query ID', errors: errors.array() });
  }

  const { id } = req.params;

  try {

    const query = await Query.findById(id);
    
    console.log("query: ",query);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'Pending') {
      return res.status(400).json({ message: 'Query is not Pending' });
    }

    await Query.updateOne({ _id: id }, { status: 'Rejected' });
    res.json({ message: 'Query rejected successfully' });
  } catch (err) {
    console.error('Database error in PUT /:id/reject:', err);
    res.status(500).json({ message: 'An error occurred while rejecting query' });
  }
});

router.put('/:id/reply', validateId, validateReply, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /:id/reply:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { id } = req.params;
  const { reply } = req.body;
  const sanitizedReply = xss(reply);

  try {
    const query = await Query.findById(id);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    await Query.updateOne({ _id: id }, { reply: sanitizedReply });
    res.json({ message: 'Reply submitted successfully' });
  } catch (err) {
    console.error('Database error in PUT /:id/reply:', err);
    res.status(500).json({ message: 'An error occurred while submitting reply' });
  }
});

module.exports = router;
