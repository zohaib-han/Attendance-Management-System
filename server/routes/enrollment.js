const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const xss = require("xss");
const {
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
} = require("../db");

const validateAssignment = [
  body("class_id").isInt({ min: 1 }).withMessage("Invalid class ID"),
  body("faculty_id").isInt({ min: 1 }).withMessage("Invalid faculty ID"),
  body("subject_id").isInt({ min: 1 }).withMessage("Invalid subject ID"),
];

const validateId = [
  param("id").isMongoId().withMessage("Invalid assignment ID"), // Uses _id
];

router.post("/assign", validateAssignment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in POST /assign:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid input data", errors: errors.array() });
  }

  const { class_id, faculty_id, subject_id } = req.body;

  try {
    const classExists = await Class.findOne({ id: class_id });
    if (!classExists) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    const facultyExists = await Faculty.findOne({ id: faculty_id });
    if (!facultyExists) {
      return res.status(400).json({ message: "Invalid faculty ID" });
    }

    const subjectExists = await Subject.findOne({ id: subject_id });
    if (!subjectExists) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const existingSubjectAssignment = await ClassFacultySubject.findOne({
      class_id,
      subject_id,
      faculty_id: { $ne: faculty_id },
    });
    if (existingSubjectAssignment) {
      const fac = await Faculty.findOne({
        id: existingSubjectAssignment.faculty_id,
      });
      return res
        .status(400)
        .json({
          message: `This subject is already assigned to ${fac.name} in this class`,
        });
    }

    const existingAssignment = await ClassFacultySubject.findOne({
      class_id,
      faculty_id,
      subject_id,
    });
    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "This assignment already exists" });
    }

    const assignment = await ClassFacultySubject.create({
      class_id,
      faculty_id,
      subject_id,
    });
    res.json({
      message: "Assignment created successfully",
      id: assignment._id,
    });
  } catch (err) {
    console.error("Database error in POST /assign:", err);
    res
      .status(500)
      .json({ message: "An error occurred while creating assignment" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const assignments = await ClassFacultySubject.find().lean();
    const classIds = [...new Set(assignments.map((a) => a.class_id))];
    const facultyIds = [...new Set(assignments.map((a) => a.faculty_id))];
    const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];

    const classes = await Class.find({ id: { $in: classIds } }).lean();
    const faculties = await Faculty.find({ id: { $in: facultyIds } }).lean();
    const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();

    const classMap = classes.reduce((map, cls) => {
      map[cls.id] = cls;
      return map;
    }, {});
    const facultyMap = faculties.reduce((map, fac) => {
      map[fac.id] = fac;
      return map;
    }, {});
    const subjectMap = subjects.reduce((map, sub) => {
      map[sub.id] = sub;
      return map;
    }, {});

    const formattedAssignments = assignments.map((assign) => ({
      id: assign._id,
      class_name: classMap[assign.class_id]?.class_name || "Unknown",
      section: classMap[assign.class_id]?.section || "Unknown",
      faculty_name: facultyMap[assign.faculty_id]?.name || "Unknown",
      subject_name: subjectMap[assign.subject_id]?.name || "Unknown",
    }));

    res.json(formattedAssignments);
  } catch (err) {
    console.error("Database error in GET /all:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching assignments" });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in DELETE /:id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid assignment ID", errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const result = await ClassFacultySubject.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("Database error in DELETE /:id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting assignment" });
  }
});

router.get("/:id/:type", async (req, res) => {
  const { id, type } = req.params;

  try {
    let result;
    if (type === "class") {
      result = await ClassFacultySubject.find({ class_id: id });
    } else if (type === "faculty") {
      result = await ClassFacultySubject.find({ faculty_id: id });
    } else if (type === "subject") {
      result = await ClassFacultySubject.find({ subject_id: id });
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

      return res.json({ count: result.length || 0 });
    
  } catch (err) {
    console.error("Database error in getting /:id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while getting assignment" });
  }
});

module.exports = router;
