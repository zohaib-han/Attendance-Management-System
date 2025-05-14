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

const validateClass = [
  body("class_name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Class name must be between 1 and 50 characters"),
  body("section")
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage("Section must be between 1 and 10 characters"),
];

const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Invalid class ID"),
];

router.get("/all", async (req, res) => {
  try {
    const classes = await Class.find().select("id class_name section");
    res.json(
      classes.map((cls) => ({
        id: cls.id,
        class_name: cls.class_name,
        section: cls.section,
      }))
    );
  } catch (err) {
    console.error("Database error in GET /all:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching classes" });
  }
});

router.post("/", validateClass, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in POST /:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid input data", errors: errors.array() });
  }

  const { class_name, section } = req.body;
  const sanitizedClassName = xss(class_name);
  const sanitizedSection = xss(section);

  try {
    const existingClass = await Class.findOne({
      class_name: sanitizedClassName,
      section: sanitizedSection,
    });
    if (existingClass) {
      return res
        .status(400)
        .json({ message: "Class with this name and section already exists" });
    }

    const newClass = await Class.create({
      class_name: sanitizedClassName,
      section: sanitizedSection,
    });

    res.json({
      message: "Class created successfully",
      class: {
        id: newClass.id,
        class_name: newClass.class_name,
        section: newClass.section,
      },
    });
  } catch (err) {
    console.error("Database error in POST /:", err);
    res.status(500).json({ message: "An error occurred while creating class" });
  }
});

router.get("/:id/students", validateId, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.error("Validation errors in GET /:id/students:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid class ID", errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const students = await Student.find({ class_id: id }).select(
      "id name roll_no email phone"
    );
    res.json(
      students.map((student) => ({
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        email: student.email,
        phone: student.phone,
      }))
    );
  } catch (err) {
    console.error("Database error in GET /:id/students:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching students" });
  }
});

router.put("/:id", validateId, validateClass, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in PUT /:id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid input data", errors: errors.array() });
  }

  const { id } = req.params;
  const { class_name, section } = req.body;
  const sanitizedClassName = xss(class_name);
  const sanitizedSection = xss(section);

  try {
    const existingClass = await Class.findOne({ id });
    if (!existingClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    const duplicate = await Class.findOne({
      class_name: sanitizedClassName,
      section: sanitizedSection,
      id: { $ne: id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ message: "Class with this name and section already exists" });
    }

    await Class.updateOne(
      { id },
      { class_name: sanitizedClassName, section: sanitizedSection }
    );
    res.json({ message: "Class updated successfully" });
  } catch (err) {
    console.error("Database error in PUT /:id:", err);
    res.status(500).json({ message: "An error occurred while updating class" });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in DELETE /:id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid class ID", errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const studentCount = await Student.countDocuments({ class_id: id });
    if (studentCount > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete class with enrolled students" });
    }

    const result = await Class.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Class not found" });
    } else {
      await ClassFacultySubject.deleteMany({ class_id: id });
    }
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error("Database error in DELETE /:id:", err);
    res.status(500).json({ message: "An error occurred while deleting class" });
  }
});

router.get("/students/:class_id", validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(
      "Validation errors in GET /students/:class_id:",
      errors.array()
    );
    return res
      .status(400)
      .json({ message: "Invalid class ID", errors: errors.array() });
  }

  const { class_id } = req.params;

  try {
    const students = await Student.find({ class_id }).select(
      "id name roll_no email"
    );
    res.json(
      students.map((student) => ({
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        email: student.email,
      }))
    );
  } catch (err) {
    console.error("Database error in GET /students/:class_id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching students" });
  }
});

module.exports = router;
