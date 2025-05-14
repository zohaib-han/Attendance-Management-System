import React, { useState, useEffect } from "react";
import axios from "axios";
import sanitizeHtml from "sanitize-html";
import styles from "../styles/AdminDashboard.module.css";
import HeaderMain from "../components/HeaderMain";
import SideBar from "../components/SideBar";
import {
  Notification,
  ConfirmationDialog,
  ErrorMessages,
} from "../components/Notification";
import { motion, useAnimation } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import isEmail from "validator/lib/isEmail";
import {
  FiHome,
  FiUsers,
  FiAward,
  FiBook,
  FiUser,
  FiSettings,
  FiPlus,
  FiEye,
  FiTrash2,
  FiEdit2,
  FiSave,
  FiCheck,
  FiX,
  FiBookOpen,
  FiLink,
  FiCalendar,
  FiActivity,
} from "react-icons/fi";
import { IoEye, IoEyeOff } from "react-icons/io5";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";

// Axios interceptor for JWT
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user_id");
      window.location.href = "/";
    } else if (error.response?.status === 403) {
      showNotification(
        "Access denied: You are not authorized to perform this action.",
        "error"
      );
    } else if (error.response?.status === 429) {
      showNotification("Too many requests, please try again later.", "error");
    }
    return Promise.reject(error);
  }
);

// CountUp component for animating numbers
const CountUp = ({ end, duration = 1 }) => {
  const controls = useAnimation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    controls.start({
      count: end,
      transition: { duration, ease: [0.4, 0, 0.2, 1.5] },
    });
  }, [end, duration, controls]);

  return (
    <motion.p
      animate={controls}
      onUpdate={(latest) => setCount(Math.floor(latest.count))}
    >
      {count}
    </motion.p>
  );
};

const AdminDashboard = () => {
  // Check authentication immediately
  const token = localStorage.getItem("token");
  let admin_id = null;
  try {
    admin_id = token ? jwtDecode(token).id : null;
  } catch (error) {
    console.error("Error decoding token:", error);
  }
  const [notifications, setNotifications] = useState([]);
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    message: "",
    id: null,
    onConfirm: null,
  });

  const showNotification = (message, type) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const showConfirmation = (message, id, onConfirm) => {
    setConfirmation({
      isOpen: true,
      message,
      id,
      onConfirm,
    });
  };

  const handleConfirm = () => {
    confirmation.onConfirm(confirmation.id);
    setConfirmation({ isOpen: false, message: "", id: null, onConfirm: null });
  };

  const handleCancel = () => {
    setConfirmation({ isOpen: false, message: "", id: null, onConfirm: null });
  };
  if (!admin_id) {
    showNotification("Session expired. Please log in again.", "error");
    window.location.href = "/";
    return null; // Prevent rendering
  }

  const [facultyView, setFacultyView] = useState("add");
  const [enrollmentTab, setEnrollmentTab] = useState("assign");
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [studentTab, setStudentTab] = useState("add");
  const [classTab, setClassTab] = useState("add");
  const [subjectTab, setSubjectTab] = useState("add");
  const [sidebarWidth, setSidebarWidth] = useState(80);

  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats1Data, setStats1Data] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  });
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [errors, setErrors] = useState({});
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    roll_no: "",
    phone: "",
    class_id: "",
  });

  const [newFaculty, setNewFaculty] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [newClass, setNewClass] = useState({
    class_name: "",
    section: "",
  });

  const [newSubject, setNewSubject] = useState({
    name: "",
  });

  const [newAssignment, setNewAssignment] = useState({
    class_id: "",
    faculty_id: "",
    subject_id: "",
  });

  const [stats1, setStats1] = useState({
    class_id: "1",
    subject_id: "1",
    date: new Date().toISOString().split("T")[0],
  });

  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  const [isLoading, setIsLoading] = useState({
    students: false,
    faculty: false,
    classes: false,
    subjects: false,
    assignments: false,
    attendance: false,
    activityLog: false,
  });

  useEffect(() => {
    fetchStudents();
    fetchFaculty();
    fetchClasses();
    fetchSubjects();
    fetchAssignments();
    fetchAttendanceStats();
    fetchActivityLog();
  }, []);

  const fetchStudents = async () => {
    setIsLoading((prev) => ({ ...prev, students: true }));
    try {
      const res = await axios.get("/api/students");
      setStudents(res.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch students. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, students: false }));
    }
  };

  const fetchFaculty = async () => {
    setIsLoading((prev) => ({ ...prev, faculty: true }));
    try {
      const res = await axios.get("/api/faculty/all");
      setFaculty(res.data);
    } catch (error) {
      console.error("Error fetching faculty:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch faculty. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, faculty: false }));
    }
  };

  const fetchClasses = async () => {
    setIsLoading((prev) => ({ ...prev, classes: true }));
    try {
      const res = await axios.get("/api/classes/all");
      setClasses(res.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch classes. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, classes: false }));
    }
  };

  const fetchSubjects = async () => {
    setIsLoading((prev) => ({ ...prev, subjects: true }));
    try {
      const res = await axios.get("/api/subjects/all");
      setSubjects(res.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch subjects. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, subjects: false }));
    }
  };

  const fetchAssignments = async () => {
    setIsLoading((prev) => ({ ...prev, assignments: true }));
    try {
      const res = await axios.get("/api/enrollments/all");
      setAssignments(res.data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch assignments. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, assignments: false }));
    }
  };

  const fetchAttendanceStats = async () => {
    setIsLoading((prev) => ({ ...prev, attendance: true }));
    try {
      const res = await axios.get("/api/attendance/stats");
      setAttendanceStats(res.data);
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch attendance stats. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, attendance: false }));
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchAttendanceTrend = async () => {
    if (!selectedMonth || selectedMonth < 1 || selectedMonth > 12) {
      showNotification("Please select a valid month (1–12).", "error");
      return;
    }
    if (
      !selectedYear ||
      selectedYear < 2000 ||
      selectedYear > new Date().getFullYear()
    ) {
      showNotification("Please select a valid year.", "error");
      return;
    }

    setIsLoading((prev) => ({ ...prev, attendance: true }));
    try {
      const res = await axios.get("/api/attendance/trend", {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setAttendanceTrend(res.data.data);
      if (!res.data.data.length) {
        showNotification(
          "No attendance records found for the selected period.",
          "info"
        );
      }
    } catch (error) {
      console.error("Error fetching attendance trend:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch attendance trend. Please try again.";
      showNotification(errorMessage, "error");
    } finally {
      setIsLoading((prev) => ({ ...prev, attendance: false }));
    }
  };

  useEffect(() => {
    fetchAttendanceTrend();
  }, [selectedMonth, selectedYear]);

  const fetchActivityLog = async () => {
    setIsLoading((prev) => ({ ...prev, activityLog: true }));
    try {
      const res = await axios.get("/api/attendance/activity-log");
      setActivityLog(res.data);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      showNotification(
        error.response.data.message ||
          "Failed to fetch activity log. Please try again.",
        "error"
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, activityLog: false }));
    }
  };

  // Sanitize input values
  const sanitizeInput = (value) =>
    sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });

  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setNewStudent({ ...newStudent, [name]: sanitizedValue });
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFacultyChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setNewFaculty({ ...newFaculty, [name]: sanitizedValue });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleClassChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setNewClass({ ...newClass, [name]: sanitizedValue });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubjectChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setNewSubject({ ...newSubject, [name]: sanitizedValue });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;
    setNewAssignment({ ...newAssignment, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleStats1Change = (e) => {
    const { name, value } = e.target;
    setStats1({ ...stats1, [name]: value });
  };

  const deleteStudent = async (id) => {
    if (!id) return;
    showConfirmation(
      "Are you sure you want to delete this student?",
      id,
      async (confirmedId) => {
        try {
          await axios.delete(`/api/students/${confirmedId}`);
          fetchStudents();
          showNotification("Student deleted successfully!", "success");
        } catch (error) {
          console.error("Error deleting student:", error);
          showNotification(
            error.response.data.message ||
              "Failed to delete student. Please try again.",
            "error"
          );
        }
      }
    );
  };
  const fetchCount = async (id, type) => {
    if (!id) return "";
    try {
      const res = await axios.get(`/api/enrollments/${id}/${type}`);
      if (res.data.count > 0 && type === "faculty") {
        return "This will delete all assignments of this faculty";
      }
      if (res.data.count > 0 && type === "class") {
        return "This will delete all assignments of this class";
      }
      if (res.data.count > 0 && type === "subject") {
        return "This will delete all assignments of this subject";
      }
      if (res.data.count === 0) {
        return "Are you sure you want to delete this?";
      }
    } catch (error) {
      console.error(`Error fetching ${type} count:`, error);
      showNotification(
        error.response.data.message ||
          `Failed to fetch ${type} count. Please try again.`,
        "error"
      );
    }
  };
  const deleteFaculty = async (id) => {
    if (!id) return;
    const check = await fetchCount(id, "faculty");

    showConfirmation(`${check}`, id, async (confirmedId) => {
      try {
        await axios.delete(`/api/faculty/${confirmedId}`);
        fetchFaculty();
        showNotification("Faculty deleted successfully!", "success");
        fetchAssignments();
      } catch (error) {
        console.error("Error deleting faculty:", error);
        showNotification(
          error.response.data.message ||
            "Failed to delete faculty. Please try again.",
          "error"
        );
      }
    });
  };

  const deleteClass = async (id) => {
    if (!id) return;
    const check = await fetchCount(id, "class");
    showConfirmation(`${check}`, id, async (confirmedId) => {
      try {
        await axios.delete(`/api/classes/${confirmedId}`);
        fetchClasses();
        showNotification("Class deleted successfully!", "success");
        fetchAssignments();
      } catch (error) {
        console.error("Error deleting class:", error);
        showNotification(error.response.data.message, "error");
      }
    });
  };

  const deleteSubject = async (id) => {
    if (!id) return;
    const check = await fetchCount(id, "subject");
    showConfirmation(`${check}`, id, async (confirmedId) => {
      try {
        await axios.delete(`/api/subjects/${confirmedId}`);
        fetchSubjects();
        showNotification("Subject deleted successfully!", "success");
        fetchAssignments();
      } catch (error) {
        console.error("Error deleting subject:", error);
        showNotification(
          error.response.data.message || "Failed to delete Subject",
          "error"
        );
      }
    });
  };

  const assignFaculty = async () => {
    const { class_id, faculty_id, subject_id } = newAssignment;
    if (!class_id || !faculty_id || !subject_id) {
      setErrors({
        class_id: !class_id ? "Class is required." : "",
        faculty_id: !faculty_id ? "Faculty is required." : "",
        subject_id: !subject_id ? "Subject is required." : "",
      });
      return;
    }

    try {
      await axios.post("/api/enrollments/assign", {
        class_id,
        faculty_id,
        subject_id,
      });
      showNotification("Faculty assigned successfully!", "success");
      fetchAssignments();
      setNewAssignment({ class_id: "", faculty_id: "", subject_id: "" });
    } catch (error) {
      console.error("Error assigning faculty:", error);
      if (error.response?.status === 400) {
        showNotification(error.response.data.message, "error");
      } else {
        showNotification(
          "Failed to assign faculty. Please try again.",
          "error"
        );
      }
    }
  };

  const deleteAssignment = async (id) => {
    if (!id) return;
    showConfirmation(
      "Are you sure you want to delete this assignment?",
      id,
      async (confirmedId) => {
        try {
          await axios.delete(`/api/enrollments/${confirmedId}`);
          showNotification("Assignment deleted successfully!", "success");
          fetchAssignments();
        } catch (error) {
          console.error("Error deleting assignment:", error);
          showNotification(
            error.response.data.message || "Failed to delete assignment",
            "error"
          );
        }
      }
    );
  };

  const validateStudent = (student) => {
    const errors = {};
    if (!student.name.trim()) {
      errors.name = "Name is required.";
    } else if (!/^[a-zA-Z\s]{1,100}$/.test(student.name)) {
      errors.name =
        "Name must be 1-100 characters and contain only letters and spaces.";
    }

    if (!student.email.trim()) {
      errors.email = "Email is required.";
    } else if (!isEmail(student.email)) {
      errors.email = "Invalid email format.";
    }

    if (!student.password && !editingStudentId) {
      errors.password = "Password is required";
    } else if (student.password && student.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    } else if (
      student.password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{6,50}$/.test(
        student.password
      )
    ) {
      errors.password =
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.";
    }

    if (!student.roll_no.trim()) {
      errors.roll_no = "Roll number is required.";
    } else if (!/^[a-zA-Z0-9-]{1,20}$/.test(student.roll_no)) {
      errors.roll_no =
        "Roll number must be 1-20 characters and contain only letters, numbers, and hyphens.";
    }

    if (!student.phone) {
      errors.phone = "Phone is required.";
    } else if (student.phone && !/^[0-9+-\s]{10,15}$/.test(student.phone)) {
      errors.phone =
        "Phone number must be 10-15 characters and contain only numbers, plus, hyphens, and spaces.";
    }

    if (!student.class_id) {
      errors.class_id = "Class is required.";
    }

    return errors;
  };

  const validateFaculty = (faculty) => {
    const errors = {};
    if (!faculty.name.trim()) {
      errors.name = "Name is required.";
    } else if (!/^[a-zA-Z\s]{1,100}$/.test(faculty.name)) {
      errors.name =
        "Name must be 1-100 characters and contain only letters and spaces.";
    }

    if (!faculty.email.trim()) {
      errors.email = "Email is required.";
    } else if (!isEmail(faculty.email)) {
      errors.email = "Invalid email format.";
    }

    if (!faculty.password && !editingFacultyId) {
      errors.password = "Password is required";
    } else if (faculty.password && faculty.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    } else if (
      faculty.password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{6,50}$/.test(
        faculty.password
      )
    ) {
      errors.password =
        "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.";
    }

    return errors;
  };

  const validateClass = (cls) => {
    const errors = {};

    // Validate class_name (must be number between 1 and 12)
    const classNum = parseInt(cls.class_name, 10);
    if (!cls.class_name.trim()) {
      errors.class_name = "Class name is required.";
    } else if (
      !/^\d{1,2}$/.test(cls.class_name) ||
      classNum < 1 ||
      classNum > 12
    ) {
      errors.class_name = "Class name must be a number from 1 to 12.";
    }

    // Validate section (must be a single letter)
    if (!cls.section.trim()) {
      errors.section = "Section is required.";
    } else if (!/^[a-zA-Z]$/.test(cls.section)) {
      errors.section = "Section must be a single letter (A-Z or a-z).";
    }

    return errors;
  };

  const validateSubject = (subject) => {
    const errors = {};
    if (!subject.name.trim()) {
      errors.name = "Subject name is required.";
    } else if (!/^[a-zA-Z0-9\s-]{1,100}$/.test(subject.name)) {
      errors.name =
        "Subject name must be 1-100 characters and contain only letters, numbers, spaces, and hyphens.";
    }

    return errors;
  };

  const addStudent = async () => {
    if (!newStudent) return;
    const errors = validateStudent(newStudent);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      if (editingStudentId) {
        await axios.put(`/api/students/${editingStudentId}`, newStudent);
        showNotification("Student updated successfully!", "success");
      } else {
        await axios.post("/api/students", newStudent);
        showNotification("Student added successfully!", "success");
      }
      fetchStudents();
      setNewStudent({
        name: "",
        email: "",
        password: "",
        roll_no: "",
        phone: "",
        class_id: "",
      });
      setEditingStudentId(null);
      setErrors({});
    } catch (error) {
      console.error("Error adding/updating student:", error);
      if (error.response?.status === 400) {
        showNotification(error.response.data.message, "error");
      } else {
        showNotification(
          "Failed to add/update student. Please try again.",
          "error"
        );
      }
    }
  };

  const addFaculty = async () => {
    const errors = validateFaculty(newFaculty);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      if (editingFacultyId) {
        await axios.put(`/api/faculty/update/${editingFacultyId}`, newFaculty);
        showNotification("Faculty updated successfully!", "success");
      } else {
        await axios.post("/api/faculty", newFaculty);
        showNotification("Faculty added successfully!", "success");
      }
      fetchFaculty();
      setNewFaculty({ name: "", email: "", password: "" });
      setEditingFacultyId(null);
      setErrors({});
    } catch (error) {
      console.error("Error adding/updating faculty:", error);
      if (error.response?.status === 400) {
        showNotification(error.response.data.message, "error");
      } else {
        showNotification(
          "Failed to add/update faculty. Please try again.",
          "error"
        );
      }
    }
  };

  const addClass = async () => {
    const errors = validateClass(newClass);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      if (editingClassId) {
        await axios.put(`/api/classes/${editingClassId}`, newClass);
        showNotification("Class updated successfully!", "success");
      } else {
        await axios.post("/api/classes", newClass);
        showNotification("Class added successfully!", "success");
      }
      fetchClasses();
      setNewClass({ class_name: "", section: "" });
      setEditingClassId(null);
      setErrors({});
    } catch (error) {
      console.error("Error adding/updating class:", error);
      if (error.response?.status === 400) {
        showNotification(error.response.data.message, "error");
      } else {
        showNotification(
          "Failed to add/update class. Please try again.",
          "error"
        );
      }
    }
  };

  const addSubject = async () => {
    const errors = validateSubject(newSubject);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      if (editingSubjectId) {
        await axios.put(`/api/subjects/${editingSubjectId}`, newSubject);
        showNotification("Subject updated successfully!", "success");
      } else {
        await axios.post("/api/subjects", newSubject);
        showNotification("Subject added successfully!", "success");
      }
      fetchSubjects();
      setNewSubject({ name: "" });
      setEditingSubjectId(null);
      setErrors({});
    } catch (error) {
      console.error("Error adding/updating subject:", error);
      if (error.response?.status === 400) {
        showNotification(error.response.data.message, "error");
      } else {
        showNotification(
          "Failed to add/update subject. Please try again.",
          "error"
        );
      }
    }
  };

  const getDashboardData = async () => {
    if (!stats1.subject_id || !stats1.class_id || !stats1.date) {
      showNotification("Please provide class, subject, and date.", "error");
      return;
    }

    try {
      const res = await axios.get("/api/attendance/summary", {
        params: {
          subject_id: stats1.subject_id,
          class_id: stats1.class_id,
          date: stats1.date,
        },
      });
      setStats1Data(res.data);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch attendance summary. Please try again.";
      showNotification(errorMessage, "error");
    }
  };

  useEffect(() => {
    getDashboardData();
  }, [stats1.class_id, stats1.subject_id, stats1.date]);

  const [isDark, setIsDark] = useState(true);

  const darkMode = (isDarkm) => {
    setIsDark(isDarkm);
  };

  useEffect(() => {
    setErrors({});
    setNewStudent({
      name: "",
      email: "",
      password: "",
      roll_no: "",
      phone: "",
      class_id: "",
    });
    setNewFaculty({ name: "", email: "", password: "" });
    setNewClass({ class_name: "", section: "" });
    setNewSubject({ name: "" });
    setNewAssignment({ class_id: "", faculty_id: "", subject_id: "" });
  }, [activeSection]);

  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showFacultyPassword, setShowFacultyPassword] = useState(false);

  return (
    <div className={styles.adminDashboard}>
      <SideBar
        setActiveSection={setActiveSection}
        page="admin"
        activeSection={activeSection}
        onToggle={setSidebarWidth}
        darkMode={darkMode}
      />
      <main
        className={`${styles.dashboardContent}  ${!isDark ? styles.dark : ""}`}
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className={styles.notificationContainer}>
          {notifications.map((notification) => (
            <Notification
              key={notification.id}
              id={notification.id}
              message={notification.message}
              type={notification.type}
              onRemove={removeNotification}
            />
          ))}
          {confirmation.isOpen && (
            <ConfirmationDialog
              message={confirmation.message}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
        </div>
        <HeaderMain
          pageType="home"
          activeSection={activeSection}
          isDark={isDark}
          setActiveSection={setActiveSection}
          queries={0}
        />
        <motion.div
          className={styles.contentContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeSection === "Dashboard" && (
            <div className={styles.sectionContainer}>
              <div className={styles.statsGrid}>
                <motion.div
                  className={styles.statCard}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiUsers size={25} />
                  <h5>Total Students</h5>
                  <CountUp end={students.length} />
                </motion.div>
                <motion.div
                  className={styles.statCard}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiAward size={25} />
                  <h5>Total Faculty</h5>
                  <CountUp end={faculty.length} />
                </motion.div>
                <motion.div
                  className={styles.statCard}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiBookOpen size={25} />
                  <h5>Total Classes</h5>
                  <CountUp end={classes.length} />
                </motion.div>
                <motion.div
                  className={styles.statCard}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiBook size={25} />
                  <h5>Total Subjects</h5>
                  <CountUp end={subjects.length} />
                </motion.div>
              </div>
              <div className={styles.dashboardStats}>
                <div className={styles.chartContainer}>
                  <div className={styles.stats1Form}>
                    <h5 className={`${!isDark ? styles.darktext : ""}`}>
                      Attendance (Trend)
                    </h5>
                    <div className={styles.inputGroup1}>
                      <select
                        name="month"
                        value={selectedMonth}
                        onChange={(e) =>
                          setSelectedMonth(Number(e.target.value))
                        }
                      >
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      <select
                        name="year"
                        value={selectedYear}
                        onChange={(e) =>
                          setSelectedYear(Number(e.target.value))
                        }
                      >
                        {Array.from({ length: 5 }, (_, i) => (
                          <option key={i} value={new Date().getFullYear() - i}>
                            {new Date().getFullYear() - i}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.chartContainercharts}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          interval={1}
                          stroke={!isDark ? "#ffffff" : "#000000"}
                          tick={{ fill: !isDark ? "#ffffff" : "#000000" }}
                          tickFormatter={(date) => {
                            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
                              return "";
                            const [year, month, day] = date.split("-");
                            return `${day}`;
                          }}
                        />
                        <YAxis
                          stroke={!isDark ? "#ffffff" : "#000000"}
                          tick={{ fill: !isDark ? "#ffffff" : "#000000" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: !isDark ? "#333" : "#fff",
                            color: !isDark ? "#fff" : "#000",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: !isDark ? "#fff" : "#000" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="present"
                          stroke="#40a9ff"
                          name="Present"
                        />
                        <Line
                          type="monotone"
                          dataKey="absent"
                          stroke="#dc2626"
                          name="Absent"
                        />
                        <Line
                          type="monotone"
                          dataKey="late"
                          stroke="#f59e0b"
                          name="Late"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartContainer}>
                  <div className={styles.stats1Form}>
                    <h5 className={`${!isDark ? styles.darktext : ""}`}>
                      Attendance by Class
                    </h5>
                    <div className={styles.inputGroup1}>
                      <select
                        name="class_id"
                        value={stats1.class_id}
                        onChange={handleStats1Change}
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name} {cls.section}
                          </option>
                        ))}
                      </select>
                      <select
                        name="subject_id"
                        value={stats1.subject_id}
                        onChange={handleStats1Change}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="date"
                        type="date"
                        value={stats1.date}
                        onChange={handleStats1Change}
                      />
                    </div>
                  </div>
                  <div className={styles.chartContainercharts}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats1Data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          stroke={!isDark ? "#ffffff" : "#000000"}
                          tick={{ fill: !isDark ? "#ffffff" : "#000000" }}
                          hide
                        />
                        <YAxis
                          stroke={!isDark ? "#ffffff" : "#000000"}
                          tick={{ fill: !isDark ? "#ffffff" : "#000000" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: !isDark ? "#333" : "#fff",
                            color: !isDark ? "#fff" : "#000",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: !isDark ? "#fff" : "#000" }}
                        />
                        <Bar dataKey="Present" fill="#40a9ff" name="Present" />
                        <Bar dataKey="Absent" fill="#ff4d4f" name="Absent" />
                        <Bar dataKey="Late" fill="#facc15" name="Late" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.chartContainer}>
                  <h5 className={`${!isDark ? styles.darktext : ""}`}>
                    Recent Activity Log
                  </h5>
                  {isLoading.activityLog ? (
                    <div className={styles.loader}>Loading activity log...</div>
                  ) : (
                    <div className={styles.activityLog}>
                      {(showAllLogs
                        ? activityLog
                        : activityLog.slice(0, 5)
                      ).map((log, index) => (
                        <motion.div
                          key={index}
                          className={styles.activityItem}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <FiActivity size={20} />
                          <div>
                            <p>{log.message}</p>
                            <span
                              className={`${!isDark ? styles.darktext : ""}`}
                            >
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      {activityLog.length > 5 && (
                        <motion.button
                          className={`${styles.viewAllButton} ${
                            !isDark ? styles.darkButton : ""
                          }`}
                          onClick={() => setShowAllLogs(!showAllLogs)}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                          }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          {showAllLogs ? "Show Less" : "View All"}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Manage Students" && (
            <div className={styles.sectionContainer}>
              <div className={styles.tabSwitcher}>
                <motion.button
                  className={`${styles.tabButton} ${
                    studentTab === "add" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setStudentTab("add")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus />
                  <span>Add Student</span>
                </motion.button>
                <motion.button
                  className={`${styles.tabButton} ${
                    studentTab === "view" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setStudentTab("view")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiEye />
                  <span>View Students</span>
                </motion.button>
              </div>

              {studentTab === "add" && (
                <motion.div
                  className={styles.formContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={newStudent.name}
                      onChange={handleStudentChange}
                      autoComplete="off"
                      className={errors.name ? styles.inputError : ""}
                    />
                    {errors.name && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.name}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={newStudent.email}
                      onChange={handleStudentChange}
                      autoComplete="off"
                      className={errors.email ? styles.inputError : ""}
                    />
                    {errors.email && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.email}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Password
                    </label>
                    <div className={styles.passwordContainer}>
                      <input
                        type={showStudentPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={newStudent.password}
                        onChange={handleStudentChange}
                        autoComplete="new-password"
                        className={errors.password ? styles.inputError : ""}
                      />
                      <span
                        className={styles.eyeIcon}
                        onMouseDown={() => setShowStudentPassword(true)}
                        onMouseUp={() => setShowStudentPassword(false)}
                        onMouseLeave={() => setShowStudentPassword(false)}
                      >
                        {showStudentPassword ? <IoEyeOff /> : <IoEye />}
                      </span>
                    </div>
                    {errors.password && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.password}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Roll Number
                    </label>
                    <input
                      type="text"
                      name="roll_no"
                      placeholder="Roll Number"
                      value={newStudent.roll_no}
                      onChange={handleStudentChange}
                      autoComplete="off"
                      className={errors.roll_no ? styles.inputError : ""}
                    />
                    {errors.roll_no && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.roll_no}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="Phone Number"
                      value={newStudent.phone}
                      onChange={handleStudentChange}
                      autoComplete="off"
                      className={errors.phone ? styles.inputError : ""}
                    />
                    {errors.phone && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.phone}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Class
                    </label>
                    <select
                      name="class_id"
                      value={newStudent.class_id}
                      onChange={handleStudentChange}
                      className={errors.class_id ? styles.inputError : ""}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name} {cls.section}
                        </option>
                      ))}
                    </select>
                    {errors.class_id && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.class_id}
                      </motion.span>
                    )}
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={addStudent}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span>
                      {editingStudentId ? "Update Student" : "Add Student"}
                    </span>
                  </motion.button>

                  {editingStudentId && (
                    <motion.button
                      className={styles.primaryButton}
                      onClick={() => {
                        setNewStudent({
                          name: "",
                          email: "",
                          password: "",
                          roll_no: "",
                          phone: "",
                          class_id: "",
                        });
                        setEditingStudentId(null);
                        setErrors({});
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiX />
                      <span className={` ${!isDark ? styles.darktext : ""}`}>
                        Cancel
                      </span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {studentTab === "view" && (
                <motion.div
                  className={styles.tableContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading.students ? (
                    <div className={styles.loader}>Loading students...</div>
                  ) : (
                    <div className={styles.responsiveTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Roll No</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Class</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td>{student.id}</td>
                              <td>{student.name}</td>
                              <td>{student.roll_no}</td>
                              <td>{student.email}</td>
                              <td>{student.phone}</td>
                              <td>
                                {student.class_name} {student.section}
                              </td>
                              <td className={styles.actionsCell}>
                                <motion.button
                                  className={styles.editButton}
                                  onClick={() => {
                                    setNewStudent({
                                      name: student.name,
                                      email: student.email,
                                      password: "",
                                      roll_no: student.roll_no,
                                      phone: student.phone,
                                      class_id: student.class_id,
                                    });
                                    setEditingStudentId(student.id);
                                    setStudentTab("add");
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiEdit2 />
                                </motion.button>
                                <motion.button
                                  className={styles.deleteButton}
                                  onClick={() => deleteStudent(student.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeSection === "Manage Faculty" && (
            <div className={styles.sectionContainer}>
              <div className={styles.tabSwitcher}>
                <motion.button
                  className={`${styles.tabButton} ${
                    facultyView === "add" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setFacultyView("add")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus />
                  <span>Add Faculty</span>
                </motion.button>
                <motion.button
                  className={`${styles.tabButton} ${
                    facultyView === "list" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setFacultyView("list")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiEye />
                  <span>View Faculty</span>
                </motion.button>
              </div>

              {facultyView === "add" && (
                <motion.div
                  className={styles.formContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Faculty Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Faculty Name"
                      value={newFaculty.name}
                      onChange={handleFacultyChange}
                      autoComplete="off"
                      className={errors.name ? styles.inputError : ""}
                    />
                    {errors.name && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.name}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={newFaculty.email}
                      onChange={handleFacultyChange}
                      autoComplete="off"
                      className={errors.email ? styles.inputError : ""}
                    />
                    {errors.email && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.email}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Password
                    </label>
                    <div className={styles.passwordContainer}>
                      <input
                        type={showFacultyPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={newFaculty.password}
                        onChange={handleFacultyChange}
                        autoComplete="new-password"
                        className={errors.password ? styles.inputError : ""}
                      />
                      <span
                        className={styles.eyeIcon}
                        onMouseDown={() => setShowFacultyPassword(true)}
                        onMouseUp={() => setShowFacultyPassword(false)}
                        onMouseLeave={() => setShowFacultyPassword(false)}
                      >
                        {showFacultyPassword ? <IoEyeOff /> : <IoEye />}
                      </span>
                    </div>
                    {errors.password && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.password}
                      </motion.span>
                    )}
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={addFaculty}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span className={` ${!isDark ? styles.darktext : ""}`}>
                      {editingFacultyId ? "Update Faculty" : "Add Faculty"}
                    </span>
                  </motion.button>

                  {editingFacultyId && (
                    <motion.button
                      className={styles.primaryButton}
                      onClick={() => {
                        setNewFaculty({ name: "", email: "", password: "" });
                        setEditingFacultyId(null);
                        setErrors({});
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiX />
                      <span className={` ${!isDark ? styles.darktext : ""}`}>
                        Cancel
                      </span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {facultyView === "list" && (
                <motion.div
                  className={styles.tableContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading.faculty ? (
                    <div className={styles.loader}>Loading faculty...</div>
                  ) : (
                    <div className={styles.responsiveTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faculty.map((fac) => (
                            <motion.tr
                              key={fac.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td>{fac.id}</td>
                              <td>{fac.name}</td>
                              <td>{fac.email}</td>
                              <td className={styles.actionsCell}>
                                <motion.button
                                  className={styles.editButton}
                                  onClick={() => {
                                    setNewFaculty({
                                      name: fac.name,
                                      email: fac.email,
                                      password: "",
                                    });
                                    setEditingFacultyId(fac.id);
                                    setFacultyView("add");
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiEdit2 />
                                </motion.button>
                                <motion.button
                                  className={styles.deleteButton}
                                  onClick={() => deleteFaculty(fac.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeSection === "Manage Classes" && (
            <div className={styles.sectionContainer}>
              <div className={styles.tabSwitcher}>
                <motion.button
                  className={`${styles.tabButton} ${
                    classTab === "add" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setClassTab("add")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus />
                  <span>Add Class</span>
                </motion.button>
                <motion.button
                  className={`${styles.tabButton} ${
                    classTab === "view" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setClassTab("view")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiEye />
                  <span>View Classes</span>
                </motion.button>
              </div>

              {classTab === "add" && (
                <motion.div
                  className={styles.formContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Class Name
                    </label>
                    <input
                      type="text"
                      name="class_name"
                      placeholder="Class (e.g., 7, 8, 9)"
                      value={newClass.class_name}
                      onChange={handleClassChange}
                      autoComplete="off"
                      className={errors.class_name ? styles.inputError : ""}
                    />
                    {errors.class_name && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.class_name}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Section
                    </label>
                    <input
                      type="text"
                      name="section"
                      placeholder="Section (e.g., A, B, C)"
                      value={newClass.section}
                      onChange={handleClassChange}
                      autoComplete="off"
                      className={errors.section ? styles.inputError : ""}
                    />
                    {errors.section && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.section}
                      </motion.span>
                    )}
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={addClass}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span className={` ${!isDark ? styles.darktext : ""}`}>
                      {editingClassId ? "Update Class" : "Add Class"}
                    </span>
                  </motion.button>

                  {editingClassId && (
                    <motion.button
                      className={styles.primaryButton}
                      onClick={() => {
                        setNewClass({ class_name: "", section: "" });
                        setEditingClassId(null);
                        setErrors({});
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiX />
                      <span className={` ${!isDark ? styles.darktext : ""}`}>
                        Cancel
                      </span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {classTab === "view" && (
                <motion.div
                  className={styles.tableContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading.classes ? (
                    <div className={styles.loader}>Loading classes...</div>
                  ) : (
                    <div className={styles.responsiveTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Class</th>
                            <th>Section</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classes.map((cls) => (
                            <motion.tr
                              key={cls.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td>{cls.id}</td>
                              <td>{cls.class_name}</td>
                              <td>{cls.section}</td>
                              <td className={styles.actionsCell}>
                                <motion.button
                                  className={styles.editButton}
                                  onClick={() => {
                                    setNewClass({
                                      class_name: cls.class_name,
                                      section: cls.section,
                                    });
                                    setEditingClassId(cls.id);
                                    setClassTab("add");
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiEdit2 />
                                </motion.button>
                                <motion.button
                                  className={styles.deleteButton}
                                  onClick={() => deleteClass(cls.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeSection === "Manage Subjects" && (
            <div className={styles.sectionContainer}>
              <div className={styles.tabSwitcher}>
                <motion.button
                  className={`${styles.tabButton} ${
                    subjectTab === "add" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setSubjectTab("add")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus />
                  <span>Add Subject</span>
                </motion.button>
                <motion.button
                  className={`${styles.tabButton} ${
                    subjectTab === "view" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setSubjectTab("view")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiEye />
                  <span>View Subjects</span>
                </motion.button>
              </div>

              {subjectTab === "add" && (
                <motion.div
                  className={styles.formContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Subject Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Subject Name"
                      value={newSubject.name}
                      onChange={handleSubjectChange}
                      autoComplete="off"
                      className={errors.name ? styles.inputError : ""}
                    />
                    {errors.name && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.name}
                      </motion.span>
                    )}
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={addSubject}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span className={` ${!isDark ? styles.darktext : ""}`}>
                      {editingSubjectId ? "Update Subject" : "Add Subject"}
                    </span>
                  </motion.button>

                  {editingSubjectId && (
                    <motion.button
                      className={styles.primaryButton}
                      onClick={() => {
                        setNewSubject({ name: "" });
                        setEditingSubjectId(null);
                        setErrors({});
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiX />
                      <span className={` ${!isDark ? styles.darktext : ""}`}>
                        Cancel
                      </span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {subjectTab === "view" && (
                <motion.div
                  className={styles.tableContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading.subjects ? (
                    <div className={styles.loader}>Loading subjects...</div>
                  ) : (
                    <div className={styles.responsiveTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Subject Name</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((sub) => (
                            <motion.tr
                              key={sub.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td>{sub.id}</td>
                              <td>{sub.name}</td>
                              <td className={styles.actionsCell}>
                                <motion.button
                                  className={styles.editButton}
                                  onClick={() => {
                                    setNewSubject({
                                      name: sub.name,
                                    });
                                    setEditingSubjectId(sub.id);
                                    setSubjectTab("add");
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiEdit2 />
                                </motion.button>
                                <motion.button
                                  className={styles.deleteButton}
                                  onClick={() => deleteSubject(sub.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeSection === "Assign Faculty" && (
            <div className={styles.sectionContainer}>
              <div className={styles.tabSwitcher}>
                <motion.button
                  className={`${styles.tabButton} ${
                    enrollmentTab === "assign" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setEnrollmentTab("assign")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiPlus />
                  <span>Assign Faculty</span>
                </motion.button>
                <motion.button
                  className={`${styles.tabButton} ${
                    enrollmentTab === "view" ? styles.activeTab : ""
                  } ${!isDark ? styles.darktext : ""}`}
                  onClick={() => setEnrollmentTab("view")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiEye />
                  <span>View Assignments</span>
                </motion.button>
              </div>

              {enrollmentTab === "assign" && (
                <motion.div
                  className={styles.formContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Select Class
                    </label>
                    <select
                      name="class_id"
                      value={newAssignment.class_id}
                      onChange={handleAssignmentChange}
                      className={errors.class_id ? styles.inputError : ""}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name} {cls.section}
                        </option>
                      ))}
                    </select>
                    {errors.class_id && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.class_id}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Select Faculty
                    </label>
                    <select
                      name="faculty_id"
                      value={newAssignment.faculty_id}
                      onChange={handleAssignmentChange}
                      className={errors.faculty_id ? styles.inputError : ""}
                    >
                      <option value="">Select Faculty</option>
                      {faculty.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name}
                        </option>
                      ))}
                    </select>
                    {errors.faculty_id && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.faculty_id}
                      </motion.span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={` ${!isDark ? styles.darktext : ""}`}>
                      Select Subject
                    </label>
                    <select
                      name="subject_id"
                      value={newAssignment.subject_id}
                      onChange={handleAssignmentChange}
                      className={errors.subject_id ? styles.inputError : ""}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject_id && (
                      <motion.span
                        className={styles.errorText}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {errors.subject_id}
                      </motion.span>
                    )}
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={assignFaculty}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span className={` ${!isDark ? styles.darktext : ""}`}>
                      Assign Faculty
                    </span>
                  </motion.button>
                </motion.div>
              )}

              {enrollmentTab === "view" && (
                <motion.div
                  className={styles.tableContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading.assignments ? (
                    <div className={styles.loader}>Loading assignments...</div>
                  ) : (
                    <div className={styles.responsiveTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>Class</th>
                            <th>Faculty</th>
                            <th>Subject</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((assign) => (
                            <motion.tr
                              key={assign.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td>
                                {assign.class_name} {assign.section}
                              </td>
                              <td>{assign.faculty_name}</td>
                              <td>{assign.subject_name}</td>
                              <td className={styles.actionsCell}>
                                <motion.button
                                  className={styles.deleteButton}
                                  onClick={() => deleteAssignment(assign.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiTrash2 />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
