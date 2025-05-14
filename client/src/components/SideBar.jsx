import React, { useState, useEffect } from "react";
import styles from "../styles/SideBar.module.css";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FiHome,
  FiUsers,
  FiBook,
  FiCalendar,
  FiEdit,
  FiEye,
  FiUser,
  FiLogOut,
  FiAward,
  FiClipboard,
  FiSettings,
  FiBookOpen,
  FiChevronRight,
  FiChevronLeft,
  FiSun,
  FiMoon,
  FiLink,
  FiMail,
} from "react-icons/fi";
import { motion } from "framer-motion";

function SideBar({
  setActiveSection,
  page,
  activeSection,
  classInfo,
  onToggle,
  darkMode,
}) {
  const [faculty_name, setFacultyName] = useState("");
  const [student_name, setStudentName] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  let faculty_id = null;
  let student_id = null;
  if (localStorage.getItem("role") === "faculty")
    faculty_id = localStorage.getItem("user_id");
  else if (localStorage.getItem("role") === "student")
    student_id = localStorage.getItem("user_id");

  const fetchFaculty = async () => {
    if (!faculty_id) return;
    try {
      const res = await axios.get(`/api/faculty/${faculty_id}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setFacultyName(res.data[0].name);
      }
    } catch (err) {
      console.error("Error fetching faculty info:", err);
    }
  };

  const fetchStudent = async () => {
    if (!student_id) return;
    try {
      const res = await axios.get(`/api/students/${student_id}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setStudentName(res.data[0].name);
      }
    } catch (err) {
      console.error("Error fetching student info:", err);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchStudent();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle("dark", !isDarkMode);
    darkMode(isDarkMode);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (onToggle) {
      onToggle(!isOpen ? 250 : 80);
    }
  };

  const sidebarVariants = {
    open: { width: 250 },
    closed: { width: 80 },
  };

  const linkVariants = {
    hover: {
      scale: 1.05,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98 },
  };

  const toggleButtonVariants = {
    hover: {
      scale: 1.1,
      boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
    },
    tap: { scale: 0.9 },
  };

  const ballVariants = {
    light: { x: 0 },
    dark: { x: 24 },
  };

  const textVariants = {
    open: { opacity: 1, width: 150 },
    closed: { opacity: 0, width: 0 },
  };

  return (
    <motion.nav
      className={`${styles.sidebar} ${isDarkMode ? styles.darkMode : ""} ${
        !isOpen ? styles.centered : ""
      } `}
      initial="closed"
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.button
        className={styles.toggleButton}
        onClick={handleToggle}
        whileHover="hover"
        whileTap="tap"
        variants={toggleButtonVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {isOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
      </motion.button>

      {page === "admin" && (
        <>
          <div className={styles.sidebarHeader}>
            {isOpen && <FiSettings size={24} className={styles.sidebarIcon} />}
            <motion.div
              className={styles.sidebarText}
              initial="closed"
              animate={isOpen ? "open" : "closed"}
              variants={textVariants}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <h2>Admin Panel</h2>
            </motion.div>
          </div>

          <ul className={styles.navList}>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Dashboard")}
                className={`${styles.navLink} ${
                  activeSection === "Dashboard" ? styles.active : ""
                }`}
              >
                <FiHome size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Dashboard
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Manage Students")}
                className={`${styles.navLink} ${
                  activeSection === "Manage Students" ? styles.active : ""
                }`}
              >
                <FiUsers size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Manage Students
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Manage Faculty")}
                className={`${styles.navLink} ${
                  activeSection === "Manage Faculty" ? styles.active : ""
                }`}
              >
                <FiAward size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Manage Faculty
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Manage Classes")}
                className={`${styles.navLink} ${
                  activeSection === "Manage Classes" ? styles.active : ""
                }`}
              >
                <FiBookOpen size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Manage Classes
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Manage Subjects")}
                className={`${styles.navLink} ${
                  activeSection === "Manage Subjects" ? styles.active : ""
                }`}
              >
                <FiBook size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Manage Subjects
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Assign Faculty")}
                className={`${styles.navLink} ${
                  activeSection === "Assign Faculty" ? styles.active : ""
                }`}
              >
                <FiLink size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Assign Faculty
                  </motion.span>
                )}
              </Link>
            </motion.li>
          </ul>
        </>
      )}

      {page === "faculty" && (
        <>
          <div className={styles.sidebarHeader}>
            {isOpen && <FiAward size={24} className={styles.sidebarIcon} />}
            <motion.div
              className={styles.sidebarText}
              initial="closed"
              animate={isOpen ? "open" : "closed"}
              variants={textVariants}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <h2>Faculty Panel</h2>
              <p className={styles.welcomeMsg}>Welcome, {faculty_name}</p>
            </motion.div>
          </div>

          <ul className={styles.navList}>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Mark Attendance")}
                className={`${styles.navLink} ${
                  activeSection === "Mark Attendance" ? styles.active : ""
                }`}
              >
                <FiClipboard size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Mark Attendance
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("View Attendance")}
                className={`${styles.navLink} ${
                  activeSection === "View Attendance" ? styles.active : ""
                }`}
              >
                <FiEye size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    View Attendance
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Edit Attendance")}
                className={`${styles.navLink} ${
                  activeSection === "Edit Attendance" ? styles.active : ""
                }`}
              >
                <FiEdit size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Edit Attendance
                  </motion.span>
                )}
              </Link>
            </motion.li>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("View Classes")}
                className={`${styles.navLink} ${
                  activeSection === "View Classes" ? styles.active : ""
                }`}
              >
                <FiBookOpen size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    View Classes
                  </motion.span>
                )}
              </Link>
            </motion.li>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Profile")}
                className={`${styles.navLink} ${
                  activeSection === "Profile" ? styles.active : ""
                }`}
              >
                <FiUser size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Profile
                  </motion.span>
                )}
              </Link>
            </motion.li>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Email Queries")}
                className={`${styles.navLink} ${
                  activeSection === "Email Queries" ? styles.active : ""
                }`}
              >
                <FiMail size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Email Queries
                  </motion.span>
                )}
              </Link>
            </motion.li>
          </ul>
        </>
      )}

      {page === "student" && (
        <>
          <div className={styles.sidebarHeader}>
            {isOpen && <FiUser size={24} className={styles.sidebarIcon} />}
            <motion.div
              className={styles.sidebarText}
              initial="closed"
              animate={isOpen ? "open" : "closed"}
              variants={textVariants}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <h2>Student Panel</h2>
              <p className={styles.welcomeMsg}>Welcome, {student_name}</p>
            </motion.div>
          </div>

          <ul className={styles.navList}>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("View Attendance")}
                className={`${styles.navLink} ${
                  activeSection === "View Attendance" ? styles.active : ""
                }`}
              >
                <FiEye size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    View Attendance
                  </motion.span>
                )}
              </Link>
            </motion.li>

            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Profile")}
                className={`${styles.navLink} ${
                  activeSection === "Profile" ? styles.active : ""
                }`}
              >
                <FiUser size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Profile
                  </motion.span>
                )}
              </Link>
            </motion.li>
            <motion.li
              whileHover="hover"
              whileTap="tap"
              variants={linkVariants}
            >
              <Link
                onClick={() => setActiveSection("Email Queries")}
                className={`${styles.navLink} ${
                  activeSection === "Email Queries" ? styles.active : ""
                }`}
              >
                <FiMail size={15} className={styles.navIcon} />
                {isOpen && (
                  <motion.span
                    className={styles.navText}
                    initial="closed"
                    animate={isOpen ? "open" : "closed"}
                    variants={textVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Email Queries
                  </motion.span>
                )}
              </Link>
            </motion.li>
          </ul>
        </>
      )}

      <div className={styles.footer}>
        <motion.div whileHover="hover" whileTap="tap" variants={linkVariants}>
          <Link
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className={`${styles.navLink} ${!isOpen ? styles.centerit : ""} `}
          >
            <FiLogOut size={15} className={styles.navIcon} />
            {isOpen && (
              <motion.span
                className={styles.navText}
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                variants={textVariants}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                Logout
              </motion.span>
            )}
          </Link>
        </motion.div>

        <motion.div
          className={styles.nightModeContainer}
          whileHover="hover"
          whileTap="tap"
        >
          {isOpen && (
            <div className={styles.modeWrapper}>
              {isDarkMode ? (
                <motion.div
                  className={styles.modeIconText}
                  initial="closed"
                  animate={isOpen ? "open" : "closed"}
                  variants={textVariants}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <FiMoon size={15} className={styles.moonIcon} />
                  <motion.span className={styles.navText}>
                    Dark Mode
                  </motion.span>
                </motion.div>
              ) : (
                <motion.div
                  className={styles.modeIconText}
                  initial="closed"
                  animate={isOpen ? "open" : "closed"}
                  variants={textVariants}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <FiSun size={15} className={styles.sunIcon} />
                  <motion.span className={styles.navText}>
                    Light Mode
                  </motion.span>
                </motion.div>
              )}
            </div>
          )}
          <button
            className={`${styles.toggleSwitch} ${
              isDarkMode ? styles.dark : ""
            }`}
            onClick={toggleDarkMode}
          >
            <motion.div
              className={styles.toggleBall}
              animate={isDarkMode ? "dark" : "light"}
              variants={ballVariants}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </button>
        </motion.div>
      </div>
    </motion.nav>
  );
}

export default SideBar;
