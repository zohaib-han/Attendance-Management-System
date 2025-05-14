import { useState, useEffect } from "react";
import Logo from "../images/dp.png";
import ProfilePic from "../images/dp.png";
import styles from "../styles/HeaderMain.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiBell, FiLogOut, FiMenu, FiSettings } from "react-icons/fi";
import { motion } from "framer-motion";
import sanitizeHtml from "sanitize-html";
import he from "he";
import {
  FiHome,
  FiUsers,
  FiAward,
  FiBook,
  FiBookOpen,
  FiLink,
  FiEye,
  FiEdit,
  FiClock,
  FiUser,
  FiClipboard,
} from "react-icons/fi";

const HeaderMain = ({ pageType, activeSection, setActiveSection, isDark }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [queries, setQueries] = useState(localStorage.getItem("notify") || []);
  const [totalQuery, setTotalQuery] = useState(
    localStorage.getItem("notifylength") || 0
  );

  const navigate = useNavigate();

  const getSectionIcon = () => {
    switch (activeSection) {
      case "Dashboard":
        return <FiHome size={24} />;
      case "Manage Students":
        return <FiUsers size={24} />;
      case "Manage Faculty":
        return <FiAward size={24} />;
      case "Manage Classes":
        return <FiBookOpen size={24} />;
      case "Manage Subjects":
        return <FiBook size={24} />;
      case "Assign Faculty":
        return <FiLink size={24} />;
      case "Mark Attendance":
        return <FiClipboard size={24} />;
      case "View Attendance":
        return <FiEye size={24} />;
      case "Edit Attendance":
        return <FiEdit size={24} />;
      case "view Attendance":
        return <FiEye size={24} />;
      case "Profile":
        return <FiUser size={24} />;
      case "View Classes":
        return <FiBookOpen size={24} />;

      default:
        return <FiSettings size={24} />;
    }
  };

  useEffect(() => {
    const userToken = localStorage.getItem("token");
    let facultyId = null;
    let studentId = null;
    if (localStorage.getItem("role") === "faculty")
      facultyId = localStorage.getItem("user_id");
    else if (localStorage.getItem("role") === "student")
      studentId = localStorage.getItem("user_id");

    if (userToken || facultyId || studentId) {
      setIsAuthenticated(true);
      fetchUserInfo(facultyId, studentId, userToken);
    }
  }, []);

  const fetchUserInfo = async (facultyId, studentId, userToken) => {
    try {
      let response;
      if (facultyId) {
        response = await axios.get(`/api/faculty/${facultyId}`);
        setUserName(response.data[0].name);
      } else if (studentId) {
        response = await axios.get(`/api/students/${studentId}`);
        setUserName(response.data[0].name);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const handleLogOut = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserName("");
    navigate("/");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const fetchQueries = async (faculty_id, student_id, role) => {
    if ((!student_id && !faculty_id) || !role) return;
    try {
      let res = null;
      if (role === "faculty") res = await axios.get(`/api/query/${faculty_id}`);
      else if (role === "student")
        res = await axios.get(`/api/query/${student_id}/queries`);
      setQueries(
        res.data.map((query) => ({
          ...query,
          subject: he.encode(
            sanitizeHtml(query.subject, {
              allowedTags: [],
              allowedAttributes: {},
            })
          ),
          message: he.encode(
            sanitizeHtml(query.message, {
              allowedTags: [],
              allowedAttributes: {},
            })
          ),
          reply: query.reply
            ? he.encode(
                sanitizeHtml(query.reply, {
                  allowedTags: [],
                  allowedAttributes: {},
                })
              )
            : null,
          faculty_name: he.encode(
            sanitizeHtml(query.faculty_name, {
              allowedTags: [],
              allowedAttributes: {},
            })
          ),
          status: sanitizeHtml(query.status, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }))
      );
    } catch (error) {
      console.error("Error fetching queries:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      let facultyId = null;
      let studentId = null;
      const role = localStorage.getItem("role");

      if (role === "faculty") facultyId = localStorage.getItem("user_id");
      else if (role === "student") studentId = localStorage.getItem("user_id");

      fetchQueries(facultyId, studentId, role);
    }, 500);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    if (localStorage.getItem("role") === "admin") {
      setNotifications(0);
    } else if (queries.length > 0) {
      setNotifications(queries.length - totalQuery);
      localStorage.setItem("notify", queries);
      localStorage.setItem("notifylength", queries.length - totalQuery);
    }
  }, [queries.length]);

  return (
    <header
      className={styles.header}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.headerLeft}>
        <div
          className={`${styles.headicon} ${styles.sectionHeader} ${
            !isDark ? styles.darktext : ""
          }`}
        >
          {getSectionIcon()}
          <h2 className={`${styles.head} ${!isDark ? styles.darktext : ""}`}>
            {activeSection}
          </h2>
        </div>
      </div>

      <div className={styles.headerRight}>
        <motion.div
          className={`${styles.notification} ${!isDark ? styles.darktext : ""}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (
              localStorage.getItem("user_id") &&
              localStorage.getItem("role") !== "admin"
            ) {
              if (notifications > 0) {
                setTotalQuery(notifications);
                localStorage.setItem("notify", queries);
                localStorage.setItem("notifylength", notifications);

                setNotifications(0);
              }

              setActiveSection("Email Queries");
            }
          }}
        >
          <FiBell size={20} />
          {notifications > 0 && (
            <span className={styles.notificationBadge}>{notifications}</span>
          )}
        </motion.div>

        <div className={styles.profile}>
          <motion.img
            src={ProfilePic}
            alt="Profile"
            className={styles.profilePic}
            onClick={toggleDropdown}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          />
          <div className={styles.profileInfo}>
            <motion.div
              className={`${styles.name} ${!isDark ? styles.darktext : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {userName || "Admin"}
            </motion.div>
            <div
              className={`${styles.designation} ${
                !isDark ? styles.darktext : ""
              }`}
            >
              {pageType === "admin"
                ? "Administrator"
                : pageType === "faculty"
                ? "Faculty"
                : "Student"}
            </div>
          </div>
        </div>

        {isDropdownOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.button
              className={styles.dropdownItem}
              onClick={handleLogOut}
              whileHover={{ backgroundColor: "#f5f3ff" }}
            >
              <FiLogOut size={16} />
              <span>Logout</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {isMobileMenuOpen && (
        <motion.div
          className={styles.mobileMenu}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
        >
          <button onClick={toggleMobileMenu} className={styles.closeButton}>
            <FiMenu size={24} />
          </button>
          {/* Add mobile menu items here if needed */}
        </motion.div>
      )}
    </header>
  );
};

export default HeaderMain;
