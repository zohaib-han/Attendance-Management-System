
const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
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

const validateAttendance = [
  body('class_id').isInt({ min: 1 }).withMessage('Invalid class ID'),
  body('faculty_id').isInt({ min: 1 }).withMessage('Invalid faculty ID'),
  body('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('attendance').isArray().withMessage('Attendance must be an array'),
  body('attendance[*].id').isInt({ min: 1 }).withMessage('Invalid student ID in attendance'),
  body('attendance[*].status').isIn(['Present', 'Absent', 'Late']).withMessage('Invalid status'),
];

const validateParams = [
  param('class_id').isInt({ min: 1 }).withMessage('Invalid class ID'),
  param('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
  param('date').isISO8601().withMessage('Invalid date format'),
];

const validateStudentSubject = [
  param('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
  param('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
];

const validateStudent = [
  param('student_id').isInt({ min: 1 }).withMessage('Invalid student ID'),
];

router.post('/', validateAttendance, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in POST /:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }
  
  
  const { class_id, faculty_id, subject_id, date, attendance } = req.body;
  const sanitizedDate = xss(date);

  try {
    const classExists = await Class.findOne({ id: class_id });
    if (!classExists) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const subjectExists = await Subject.findOne({ id: subject_id });
    if (!subjectExists) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const facultyExists = await Faculty.findOne({ id: faculty_id });
    if (!facultyExists) {
      return res.status(400).json({ message: 'Invalid faculty ID' });
    }

    for (const att of attendance) {
      const student = await Student.findOne({ id: att.id });
      
      
      if (!student || student.class_id !== class_id) {
        return res.status(400).json({ message: `Invalid student ID: ${att.id}` });
      }
    }
    

    const attendanceRecords = attendance.map(att => ({
      class_id,
      student_id: att.id,
      faculty_id,
      subject_id,
      date: sanitizedDate,
      status: att.status,
    }));

    await Attendance.insertMany(attendanceRecords);

    const {class_name, section} = await Class.findOne({ id: class_id });
    const subject = await Subject.findOne({ id: subject_id });
    const faculty = await Faculty.findOne({ id: faculty_id });
    
    

    await ActivityLog.create({
      type: 'attendance',
      message: `Attendance marked by ${faculty.name} for class: ${class_name}-${section}, subject: ${subject.name} on ${sanitizedDate}`,
    });

    res.json({ message: 'Attendance recorded successfully' });
  } catch (err) {
    console.error('Database error in POST /:', err);
    res.status(500).json({ message: 'An error occurred while recording attendance' });
  }
});

router.get('/records/:class_id/:subject_id/:date', validateParams, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /records/:class_id/:subject_id/:date:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { class_id, subject_id, date } = req.params;

  try {
    const records = await Attendance.find({ class_id, subject_id, date }).lean();
    const studentIds = [...new Set(records.map(record => record.student_id))];
    const students = await Student.find({ id: { $in: studentIds } }).lean();

    const studentMap = students.reduce((map, student) => {
      map[student.id] = student;
      return map;
    }, {});

    const formattedRecords = records
      .filter(record => studentMap[record.student_id])
      .map(record => ({
        id: record.student_id,
        name: studentMap[record.student_id].name,
        status: record.status,
      }));

    res.json(formattedRecords);
  } catch (err) {
    console.error('Database error in GET /records/:class_id/:subject_id/:date:', err);
    res.status(500).json({ message: 'An error occurred while fetching attendance records' });
  }
});

router.get('/class-students/:class_id', [
  param('class_id').isInt({ min: 1 }).withMessage('Invalid class ID'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /class-students/:class_id:', errors.array());
    return res.status(400).json({ message: 'Invalid class ID', errors: errors.array() });
  }

  const { class_id } = req.params;

  try {
    const students = await Student.find({ class_id }).select('id name').lean();
    res.json(students.map(student => ({ id: student.id, name: student.name })));
  } catch (err) {
    console.error('Database error in GET /class-students/:class_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching students' });
  }
});

router.put('/edit', validateAttendance, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in PUT /edit:', errors.array());
    return res.status(400).json({ message: 'Invalid input data', errors: errors.array() });
  }

  const { class_id, faculty_id, subject_id, date, attendance } = req.body;
  const sanitizedDate = xss(date);

  try {
    const classExists = await Class.findOne({ id: class_id });
    if (!classExists) {
      return res.status(400).json({ message: 'Invalid class ID' });
    }

    const subjectExists = await Subject.findOne({ id: subject_id });
    if (!subjectExists) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const facultyExists = await Faculty.findOne({ id: faculty_id });
    if (!facultyExists) {
      return res.status(400).json({ message: 'Invalid faculty ID' });
    }

    for (const att of attendance) {
      const student = await Student.findOne({ id: att.id });
      if (!student || student.class_id !== class_id) {
        return res.status(400).json({ message: `Invalid student ID: ${att.id}` });
      }

      await Attendance.updateOne(
        { class_id, student_id: att.id, subject_id, date: sanitizedDate },
        { status: att.status },
        { upsert: true }
      );
    }

    await ActivityLog.create({
      type: 'attendance',
      message: `Attendance updated for class ${class_id}, subject ${subject_id} on ${sanitizedDate}`,
    });

    res.json({ message: 'Attendance updated successfully' });
  } catch (err) {
    console.error('Database error in PUT /edit:', err);
    res.status(500).json({ message: 'An error occurred while updating attendance' });
  }
});

router.get('/student/:student_id/subject/:subject_id', validateStudentSubject, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /student/:student_id/subject/:subject_id:', errors.array());
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
    const records = await Attendance.find({ student_id, subject_id }).lean();

    const formattedRecords = records.map(record => ({
      date: record.date,
      status: record.status,
      subject_name: subject.name,
      class_name: cls ? cls.class_name : null,
      section: cls ? cls.section : null,
    }));

    res.json(formattedRecords);
  } catch (err) {
    console.error('Database error in GET /student/:student_id/subject/:subject_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching attendance' });
  }
});

router.get('/student/:student_id', validateStudent, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /student/:student_id:', errors.array());
    return res.status(400).json({ message: 'Invalid student ID', errors: errors.array() });
  }

  const { student_id } = req.params;

  try {
    const records = await Attendance.find({ student_id }).lean();
    const subjectIds = [...new Set(records.map(record => record.subject_id))];
    const classIds = [...new Set(records.map(record => record.class_id))];

    const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();
    const classes = await Class.find({ id: { $in: classIds } }).lean();

    const subjectMap = subjects.reduce((map, sub) => {
      map[sub.id] = sub;
      return map;
    }, {});
    const classMap = classes.reduce((map, cls) => {
      map[cls.id] = cls;
      return map;
    }, {});

    const formattedRecords = records.map(record => ({
      date: record.date,
      status: record.status,
      subject: subjectMap[record.subject_id]?.name || 'Unknown',
      class_name: classMap[record.class_id]?.class_name || 'Unknown',
      section: classMap[record.class_id]?.section || 'Unknown',
    }));

    res.json(formattedRecords);
  } catch (err) {
    console.error('Database error in GET /student/:student_id:', err);
    res.status(500).json({ message: 'An error occurred while fetching attendance history' });
  }
});

router.get('/stats', [
  query('class_id').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  query('subject_id').optional().isInt({ min: 1 }).withMessage('Invalid subject ID'),
  query('date').optional().isISO8601().withMessage('Invalid date format'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in GET /stats:', errors.array());
    return res.status(400).json({ message: 'Invalid query parameters', errors: errors.array() });
  }

  const { class_id, subject_id, date } = req.query;

  try {
    const query = {};
    if (class_id) query.class_id = Number(class_id);
    if (subject_id) query.subject_id = Number(subject_id);
    if (date) query.date = xss(date);

    const records = await Attendance.find(query).lean();

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length,
    };

    res.json(stats);
  } catch (err) {
    console.error('Database error in GET /stats:', err);
    res.status(500).json({ message: 'An error occurred while fetching attendance stats' });
  }
});

router.get(
  '/trend',
  [
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    query('year').optional().isInt({ min: 2000 }).withMessage('Invalid year'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors in GET /trend:', errors.array());
      return res.status(400).json({ message: 'Invalid query parameters', errors: errors.array() });
    }

    let { month, year } = req.query;
    month = month ? parseInt(month, 10) : null;
    year = year ? parseInt(year, 10) : null;

    try {
      const query = {};
      if (month && year) {
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
        query.date = { $gte: startDate, $lte: endDate };
      }

      const trend = await Attendance.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $substr: ['$date', 0, 10] },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
        {
          $project: {
            date: '$_id',
            present: 1,
            absent: 1,
            late: 1,
            _id: 0
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({
        data: trend,
        message: trend.length ? 'Attendance trend fetched successfully' : 'No attendance records found',
      });
    } catch (err) {
      console.error('Database error in GET /trend:', err);
      res.status(500).json({
        message: 'Failed to fetch attendance trend',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

router.get('/activity-log', async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .lean();
    res.json(logs);
  } catch (err) {
    console.error('Database error in GET /activity-log:', err);
    res.status(500).json({ message: 'An error occurred while fetching activity logs' });
  }
});

router.get(
  '/summary',
  [
    query('class_id').isInt({ min: 1 }).withMessage('Invalid class ID'),
    query('subject_id').isInt({ min: 1 }).withMessage('Invalid subject ID'),
    query('date').isDate().withMessage('Invalid date (YYYY-MM-DD)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors in GET /summary:', errors.array());
      return res.status(400).json({ message: 'Invalid query parameters', errors: errors.array() });
    }

    const { class_id, subject_id, date } = req.query;

    try {
      const query = {
        class_id: Number(class_id),
        subject_id: Number(subject_id),
        date: date,
      };

      const summary = await Attendance.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0,
          },
        },
        { $sort: { status: 1 } },
      ]);

      const formattedSummary = {
        Present: 0,
        Absent: 0,
        Late: 0,
      };

      summary.forEach((item) => {
        formattedSummary[item.status] = item.count;
      });

      res.json([formattedSummary]);
    } catch (err) {
      console.error('Database error in GET /summary:', err);
      res.status(500).json({
        message: 'Failed to fetch attendance summary',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

module.exports = router;
