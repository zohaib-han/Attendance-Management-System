
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const expressSanitizer = require('express-sanitizer');
const bcrypt = require('bcryptjs');
const { connectDB, Admin, Student, Faculty, Class, Subject } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(expressSanitizer());
app.use(helmet());
app.use(xssClean());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use(limiter);

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const facultyRoutes = require('./routes/faculty');
const attendanceRoutes = require('./routes/attendance');
const classRoutes = require('./routes/class');
const subjectRoutes = require('./routes/subject');
const assignmentRoutes = require('./routes/enrollment');
const queryRoutes = require('./routes/query');

app.use('/api/login', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/enrollments', assignmentRoutes);
app.use('/api/query', queryRoutes);

// Database connection and seeding
const startServer = async () => {
  await connectDB();

  // Seed admin
  const insertAdmin = async () => {
    const email = 'admin@system.com';
    const plainPassword = 'admin123';
    try {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        console.log('✅ Admin already exists.');
        return;
      }
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await Admin.create({
        name: 'Admin',
        email,
        password: hashedPassword,
      });
      console.log('✅ Admin inserted.');
    } catch (err) {
      console.error('Admin insert error:', err);
    }
  };

  // Seed students
  const insertStudents = async () => {
    try {
      const existingStudents = await Student.findOne({ email: { $in: ['z@g.com', 'jane@example.com'] } });
      if (existingStudents) {
        console.log('✅ Students already exist.');
        return;
      }
      const hashedPassword = await bcrypt.hash('123', 10);
      await Student.create([
        {
          name: 'Aohaib',
          roll_no: '001',
          email: 'z@g.com',
          password: hashedPassword,
          phone: '1234567890',
          class_id: 1,
        },
        {
          name: 'Jane Smith',
          roll_no: '002',
          email: 'jane@example.com',
          password: hashedPassword,
          phone: '0987654321',
          class_id: 1,
        },
      ]);
      console.log('✅ Students inserted.');
    } catch (err) {
      console.error('Student insert error:', err);
    }
  };

  // Seed faculty
  const insertFaculty = async () => {
    try {
      const existingFaculty = await Faculty.findOne({ email: { $in: ['f@g.com', 'bob@example.com'] } });
      
      
      if (existingFaculty) {
        console.log('✅ Faculty already exist.');
        return;
      }
      const hashedPassword = await bcrypt.hash('faculty123', 10);
      await Faculty.create([
        {
          name: 'Sir ali',
          email: 'f@g.com',
          password: hashedPassword,
        },
        {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          password: hashedPassword,
        },
      ]);
      console.log('✅ Faculty inserted.');
    } catch (err) {
      console.error('Faculty insert error:', err);
    }
  };

  // Seed classes
  const insertClasses = async () => {
    try {
      const existingClass = await Class.findOne({
  $or: [
    { class_name: '7', section: 'A' },
    { class_name: '8', section: 'B' },
  ]
});
      if (existingClass) {
        console.log('✅ Classes already exist.');
        return;
      }
      await Class.create([
        {
          class_name: '7',
          section: 'A',
        },
        {
          class_name: '8',
          section: 'B',
        },
      ]);
      console.log('✅ Classes inserted.');
    } catch (err) {
      console.error('Class insert error:', err);
    }
  };

  // Seed subjects
  const insertSubjects = async () => {
    try {
      const existingSubject = await Subject.find({
      name: { $in: ['Math', 'Science'] }
    });
      if (existingSubject) {
        console.log('✅ Subjects already exist.');
        return;
      }
      await Subject.create([
        {
          name: 'Math',
        },
        {
          name: 'Science',
        },
      ]);
      console.log('✅ Subjects inserted.');
    } catch (err) {
      console.error('Subject insert error:', err);
    }
  };

   await insertAdmin();
  await insertClasses();
  await insertSubjects();
  await insertStudents();
  await insertFaculty();

  const PORT = 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
