
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Database');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Counter schema for auto-incrementing IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'faculty', 'class', 'subject'
  sequence_value: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

// Function to get next ID
const getNextSequenceValue = async (sequenceName) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

// Class Schema
const ClassSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  class_name: { type: String, required: true },
  section: { type: String, required: true },
});

ClassSchema.pre('save', async function (next) {
  if (!this.id) {
    this.id = await getNextSequenceValue('class');
  }
  next();
});

// Student Schema
const StudentSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  roll_no: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  class_id: { type: Number, required: true }, // Reference to Class.id, not _id
});

StudentSchema.pre('save', async function (next) {
  if (!this.id) {
    this.id = await getNextSequenceValue('student');
  }
  next();
});

// Faculty Schema
const FacultySchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

FacultySchema.pre('save', async function (next) {
  if (!this.id) {
    this.id = await getNextSequenceValue('faculty');
  }
  next();
});

// Subject Schema
const SubjectSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
});

SubjectSchema.pre('save', async function (next) {
  if (!this.id) {
    this.id = await getNextSequenceValue('subject');
  }
  next();
});

// ClassFacultySubject Schema
const ClassFacultySubjectSchema = new mongoose.Schema({
  class_id: { type: Number, required: true }, // Reference to Class.id
  faculty_id: { type: Number, required: true }, // Reference to Faculty.id
  subject_id: { type: Number, required: true }, // Reference to Subject.id
});

// Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  class_id: { type: Number, required: true }, // Reference to Class.id
  student_id: { type: Number, required: true }, // Reference to Student.id
  faculty_id: { type: Number, required: true }, // Reference to Faculty.id
  subject_id: { type: Number, required: true }, // Reference to Subject.id
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true },
});

// Admin Schema
const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// ActivityLog Schema
const ActivityLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// SchoolEvent Schema
const SchoolEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
});

// Query Schema
const QuerySchema = new mongoose.Schema({
  student_id: { type: Number, required: true }, // Reference to Student.id
  faculty_id: { type: Number, required: true }, // Reference to Faculty.id
  subject: { type: String, required: true },
  message: { type: String, required: true },
  reply: { type: String },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Closed'], default: 'Pending' },
  timestamp: { type: Date, default: Date.now },
});

// Create models
const Class = mongoose.model('Class', ClassSchema);
const Student = mongoose.model('Student', StudentSchema);
const Faculty = mongoose.model('Faculty', FacultySchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const ClassFacultySubject = mongoose.model('ClassFacultySubject', ClassFacultySubjectSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const SchoolEvent = mongoose.model('SchoolEvent', SchoolEventSchema);
const Query = mongoose.model('Query', QuerySchema);

module.exports = {
  connectDB,
  Class,
  Student,
  Faculty,
  Subject,
  ClassFacultySubject,
  Attendance,
  Admin,
  ActivityLog,
  SchoolEvent,
  Query,
};
