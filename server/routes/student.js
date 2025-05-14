
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

const validateStudent = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('roll_no').trim().isLength({ min: 1, max: 50 }).withMessage('Roll number must be between 1 and 50 characters'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('class_id').isInt({ min: 1 }).withMessage('Invalid class ID'),
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Invalid student ID'),
];

const validateStudentId = [
  param('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
];

router.get('/', async (req, res) => {
  try {
    const students = await Student.find().lean();
    const classIds = [...new Set(students.map(student => student.class_id))];
    const classes = await Class.find({ id: { $in: classIds } }).lean();

    const classMap = classes.reduce((map, cls) => {
      map[cls.id] = cls;
      return map;
    }, {});

    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      roll_no: student.roll_no,
      email: student.email,
      phone: student.phone,
      class_id: student.class_id,
      class_name: classMap[student.class_id]?.class_name || null,
      section: classMap[student.class_id]?.section || null,
    }));

    res.json(formattedStudents);
  } catch (err) {
    console.error('Database error in GET /:', err);
    res.status(500).json({ message: 'An error occurred while fetching students' });
  }
});

router.get('/:student_id', validateStudentId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:student_id:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { student_id } = req.params;

  try {
    const student = await Student.findOne({ id: student_id }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const cls = await Class.findOne({ id: student.class_id }).lean();

    res.json([{
      id: student.id,
      name: student.name,
      roll_no: student.roll_no,
      email: student.email,
      phone: student.phone,
      class_id: student.class_id,
      class_name: cls ? cls.class_name : null,
      section: cls ? cls.section : null,
    }]);
  } catch (err) {
    console.error('Database error in GET /:student_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching student' });
  }
});

router.post('/', validateStudent, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { name, roll_no, email, password, phone, class_id } = req.body;
  const sanitizedName = xss(name);
  const sanitizedRollNo = xss(roll_no);
  const sanitizedEmail = xss(email);
  const sanitizedPhone = phone ? xss(phone) : null;

  try {
    const existingStudent = await Student.findOne({ $or: [{ email: sanitizedEmail }, { roll_no: sanitizedRollNo }] });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this email or roll number already exists' });
    }

    const classExists = await Class.findOne({ id: class_id });
    if (!classExists) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name: sanitizedName,
      roll_no: sanitizedRollNo,
      email: sanitizedEmail,
      password: hashedPassword,
      phone: sanitizedPhone,
      class_id,
    });

    res.json({ message: 'Student created successfully', studentId: student.id });
  } catch (err) {
    console.error('Database error in POST /:', err);
    res.status(500).json({ message: 'An error occurred while creating student' });
  }
});

router.put('/:id', validateId, validateStudent, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /:id:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { id } = req.params;
  const { name, roll_no, email, password, phone, class_id } = req.body;
  const sanitizedName = xss(name);
  const sanitizedRollNo = xss(roll_no);
  const sanitizedEmail = xss(email);
  const sanitizedPhone = phone ? xss(phone) : null;

  try {
    const student = await Student.findOne({ id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const duplicate = await Student.findOne({
      $or: [{ email: sanitizedEmail }, { roll_no: sanitizedRollNo }],
      id: { $ne: id },
    });
    if (duplicate) {
      return res.status(400).json({ message: 'Email or roll number already in use' });
    }

    const classExists = await Class.findOne({ id: class_id });
    if (!classExists) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const updateData = {
      name: sanitizedName,
      roll_no: sanitizedRollNo,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      class_id,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await Student.updateOne({ id }, updateData);
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    console.error('Database error in PUT /:id:', err);
    res.status(500).json({ message: 'An error occurred while updating student' });
  }
});

router.delete('/:id', validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in DELETE /:id:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const result = await Student.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Database error in DELETE /:id:', err);
    res.status(500).json({ message: 'An error occurred while deleting student' });
  }
});

router.get('/:id/class', validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:id/class:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const student = await Student.findOne({ id }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const cls = await Class.findOne({ id: student.class_id }).lean();

    res.json({
      id: student.id,
      name: student.name,
      roll_no: student.roll_no,
      email: student.email,
      phone: student.phone,
      class_id: student.class_id,
      class_name: cls ? cls.class_name : null,
      section: cls ? cls.section : null,
    });
  } catch (err) {
    console.error('Database error in GET /:id/class:', err);
    res.status(500).json({ message: 'An error occurred while fetching class' });
  }
});

router.get('/:student_id/subjects', validateStudentId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:student_id/subjects:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { student_id } = req.params;

  try {
    const student = await Student.findOne({ id: student_id }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const assignments = await ClassFacultySubject.find({ class_id: student.class_id }).lean();
    const subjectIds = [...new Set(assignments.map(a => a.subject_id))];
    const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();

    const formattedSubjects = subjects.map(sub => ({
      id: sub.id,
      name: sub.name,
    }));

    res.json(formattedSubjects);
  } catch (err) {
    console.error('Database error in GET /:student_id/subjects:', err);
    res.status(500).json({ message: 'An error occurred while fetching subjects' });
  }
});

router.get('/:student_id/subject/:subject_id', [
  param('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
  param('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /:student_id/subject/:subject_id:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { student_id, subject_id } = req.params;

  try {
    const student = await Student.findOne({ id: student_id }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subject = await Subject.findOne({ id: subject_id }).lean();
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const cls = await Class.findOne({ id: student.class_id }).lean();
    const attendanceRecords = await Attendance.find({
      student_id,
      subject_id,
      class_id: student.class_id,
    }).lean();

    const formattedRecords = attendanceRecords.map(record => ({
      date: record.date,
      status: record.status,
      subject_name: subject.name,
      class_name: cls ? cls.class_name : null,
      section: cls ? cls.section : null,
    }));

    res.json(formattedRecords);
  } catch (err) {
    console.error('Database error in GET /:student_id/subject/:subject_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching attendance' });
  }
});

module.exports = router;
