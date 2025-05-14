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

// Validation middleware
const validateSubject = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Subject name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage(
      "Subject name can only contain letters, numbers, spaces, and hyphens"
    ),
];

const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Invalid subject ID"),
];

const validateFacultyId = [
  param("faculty_id").isInt({ min: 1 }).withMessage("Invalid faculty ID"),
];

// Get all subjects
router.get("/all", async (req, res) => {
  try {
    const subjects = await Subject.find().select("id name");
    res.json(subjects.map((sub) => ({ id: sub.id, name: sub.name })));
  } catch (err) {
    console.error("Database error in GET /all:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching subjects" });
  }
});

// Create new subject
router.post("/", validateSubject, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in POST /:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid input data", errors: errors.array() });
  }

  const { name } = req.body;
  const sanitizedName = xss(name);

  try {
    const existingSubject = await Subject.findOne({ name: sanitizedName });
    if (existingSubject) {
      return res
        .status(400)
        .json({ message: "Subject with this name already exists" });
    }

    const subject = await Subject.create({ name: sanitizedName });
    res.json({ message: "Subject created successfully", id: subject.id });
  } catch (err) {
    console.error("Database error in POST /:", err);
    res
      .status(500)
      .json({ message: "An error occurred while creating subject" });
  }
});

// Update subject
router.put("/:id", validateId, validateSubject, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in PUT /:id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid input data", errors: errors.array() });
  }

  const { id } = req.params;
  const { name } = req.body;
  const sanitizedName = xss(name);

  try {
    const existing = await Subject.findOne({ id });
    if (!existing) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const duplicate = await Subject.findOne({
      name: sanitizedName,
      id: { $ne: id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ message: "Subject with this name already exists" });
    }

    await Subject.updateOne({ id }, { name: sanitizedName });
    res.json({ message: "Subject updated successfully" });
  } catch (err) {
    console.error("Database error in PUT /:id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while updating subject" });
  }
});

// Delete subject
router.delete("/:id", validateId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in DELETE /:id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid subject ID", errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const result = await Subject.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Subject not found" });
    } else {
      await ClassFacultySubject.deleteMany({ subject_id: id });
    }
    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Database error in DELETE /:id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting subject" });
  }
});

// Get subjects taught by a faculty
router.get("/:faculty_id", validateFacultyId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in GET /:faculty_id:", errors.array());
    return res
      .status(400)
      .json({ message: "Invalid faculty ID", errors: errors.array() });
  }

  const { faculty_id } = req.params;

  try {
    const assignments = await ClassFacultySubject.find({ faculty_id }).lean();

    // Get unique subject_ids
    const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];

    // Fetch subjects matching subject_ids
    const subjects = await Subject.find({ id: { $in: subjectIds } })
      .select("id name")
      .lean();

    // Ensure subjects is an array of { id, name }
    const formattedSubjects = subjects.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    res.json(formattedSubjects);
  } catch (err) {
    console.error("Database error in GET /:faculty_id:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching subjects" });
  }
});

module.exports = router;
