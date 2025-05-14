import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "../styles/FacultyDashboard.module.css";
import HeaderMain from "../components/HeaderMain";
import SideBar from "../components/SideBar";
import {
  Notification,
  ConfirmationDialog,
  ErrorMessages,
} from "../components/Notification";
import { motion } from "framer-motion";
import sanitizeHtml from "sanitize-html";
import he from "he";
import { jwtDecode } from "jwt-decode";
import {
  FiCalendar,
  FiEdit2,
  FiEye,
  FiSave,
  FiUsers,
  FiBook,
  FiClock,
  FiMail,
  FiSend,
  FiCheck,
  FiX,
} from "react-icons/fi";

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

const FacultyDashboard = () => {
  // Check authentication immediately
  const token = localStorage.getItem("token");
  let faculty_id = null;
  try {
    faculty_id = token ? jwtDecode(token).id : null;
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

  if (!faculty_id) {
    showNotification("Session expired. Please log in again.", "error");
    window.location.href = "/";
    return null; // Prevent rendering
  }

  const [activeSection, setActiveSection] = useState("Mark Attendance");
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [queries, setQueries] = useState([]);
  const [queriesError, setQueriesError] = useState({});
  const [loadbtn, setloadbtn] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const darkMode = (isDarkm) => {
    setIsDark(isDarkm);
  };

  useEffect(() => {
    fetchFacultyClasses();
    fetchSubjects();
    fetchPersonalInfo();
  }, [faculty_id]);

  const fetchFacultyClasses = async () => {
    try {
      const res = await axios.get(`/api/faculty/assignments/${faculty_id}`);
      setClasses(
        res.data.map((cls) => ({
          ...cls,
          class_name: sanitizeHtml(cls.class_name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          section: sanitizeHtml(cls.section, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          subject: sanitizeHtml(cls.subject, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }))
      );
    } catch (error) {
      console.error("Error fetching classes:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`/api/subjects/${faculty_id}`);
      setSubjects(
        res.data.map((subject) => ({
          ...subject,
          name: sanitizeHtml(subject.name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }))
      );
    } catch (error) {
      console.error("Error fetching subjects:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  const handleClassChange = (e) => {
    const clas = e.target.value;
    setSelectedClass(clas);
  };

  const fetchClassStudents = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) return;
    const id = selectedClass;

    if (!id) return;
    setIsLoading(true);

    try {
      const res = await axios.get(`/api/classes/${id}/students`);
      const res2 = await axios.get(
        `/api/attendance/records/${selectedClass}/${selectedSubject}/${selectedDate}`
      );

      if (res2.data.length <= 0) {
        const studentsWithAttendance = res.data.map((student) => ({
          ...student,
          name: sanitizeHtml(student.name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          status: "Absent",
        }));

        setStudents(studentsWithAttendance);
        setAttendance(studentsWithAttendance);
        setIsLocked(false);
      } else {
        setAttendance(
          res2.data.map((record) => ({
            ...record,
            name: sanitizeHtml(record.name, {
              allowedTags: [],
              allowedAttributes: {},
            }),
            status: sanitizeHtml(record.status, {
              allowedTags: [],
              allowedAttributes: {},
            }),
          }))
        );
        setIsLocked(true);
      }

      setloadbtn(true);
    } catch (error) {
      console.error("Error fetching students:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
  };

  useEffect(() => {
    setloadbtn(false);
    setEditMode(false);
  }, [activeSection]);

  const fetchAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate) return;
    setIsLoading(true);
    try {
      const res = await axios.get(
        `/api/attendance/records/${selectedClass}/${selectedSubject}/${selectedDate}`
      );
      setloadbtn(true);
      if (res.data.length > 0) {
        setAttendance(
          res.data.map((record) => ({
            ...record,
            name: sanitizeHtml(record.name, {
              allowedTags: [],
              allowedAttributes: {},
            }),
            status: sanitizeHtml(record.status, {
              allowedTags: [],
              allowedAttributes: {},
            }),
          }))
        );
        setIsLocked(true);
      } else {
        setAttendance(
          students.map((student) => ({
            id: student.id,
            name: student.name,
            status: "Absent",
          }))
        );
        setIsLocked(false);
      }
      if (res.data.length <= 0 && activeSection === "View Attendance") {
        setloadbtn(false);
        showNotification("No Records found for this date", "error");
      }
    } catch (error) {
      console.error("Error fetching attendance:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const changeAttendanceStatus = (studentId, status) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  const submitAttendance = async () => {
    if (!selectedDate || !selectedClass || !selectedSubject) {
      showNotification("Please select date, class, and subject", "error");
      return;
    }

    try {
      await axios.post("/api/attendance", {
        class_id: parseInt(selectedClass, 10),
        faculty_id,
        subject_id: selectedSubject,
        date: selectedDate,
        attendance: attendance.map(({ id, status }) => ({
          id,
          status,
        })),
      });
      showNotification("Attendance submitted successfully!", "success");
      setIsLocked(true);
    } catch (error) {
      console.error("Error submitting attendance:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  const updateAttendance = async () => {
    if (!selectedDate || !selectedClass || !selectedSubject) {
      showNotification("Please select date, class, and subject", "error");
      return;
    }

    try {
      const payload = {
        class_id: parseInt(selectedClass, 10),
        faculty_id,
        subject_id: selectedSubject,
        date: selectedDate,
        attendance: attendance.map((student) => ({
          id: student.id,
          status: student.status,
        })),
      };

      const response = await axios.put("/api/attendance/edit", payload);

      if (response.data.message) {
        showNotification(response.data.message, "success");
        setEditMode(false);
        fetchAttendance();
      }
    } catch (error) {
      console.error("Error updating attendance:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      showNotification(
        "Failed to update attendance. Please try again.",
        "error"
      );
    }
  };

  const enterEditMode = async () => {
    if (!selectedDate || !selectedClass || !selectedSubject) {
      showNotification("Please select date, class, and subject", "error");
      return;
    }

    try {
      const res = await axios.get(
        `/api/attendance/records/${selectedClass}/${selectedSubject}/${selectedDate}`
      );

      if (res.data.length > 0) {
        setAttendance(
          res.data.map((record) => ({
            ...record,
            name: sanitizeHtml(record.name, {
              allowedTags: [],
              allowedAttributes: {},
            }),
            status: sanitizeHtml(record.status, {
              allowedTags: [],
              allowedAttributes: {},
            }),
          }))
        );
        setEditMode(true);
      } else {
        showNotification("No attendance records found for this date", "error");
        setEditMode(false);
      }
    } catch (error) {
      console.error("Error fetching attendance:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  const [profileInfo, setProfileInfo] = useState(null);

  const fetchPersonalInfo = async () => {
    try {
      const res = await axios.get(`/api/faculty/${faculty_id}`);
      setProfileInfo(
        res.data.map((info) => ({
          ...info,
          name: sanitizeHtml(info.name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          email: sanitizeHtml(info.email, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }))
      );
    } catch (error) {
      console.error("Error fetching faculty info:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  useEffect(() => {
    fetchPersonalInfo();
  }, [activeSection]);

  const fetchQueries = async () => {
    try {
      const res = await axios.get(`/api/query/${faculty_id}`);
      setQueries(
        res.data.map((q) => ({
          ...q,
          subject: he.encode(
            sanitizeHtml(q.subject, { allowedTags: [], allowedAttributes: {} })
          ),
          message: he.encode(
            sanitizeHtml(q.message, { allowedTags: [], allowedAttributes: {} })
          ),
          student_name: he.encode(
            sanitizeHtml(q.student_name, {
              allowedTags: [],
              allowedAttributes: {},
            })
          ),
          status: he.encode(
            sanitizeHtml(q.status, { allowedTags: [], allowedAttributes: {} })
          ),
          timestamp: he.encode(
            sanitizeHtml(q.timestamp, {
              allowedTags: [],
              allowedAttributes: {},
            })
          ),
          action: "",
          reply: "",
          error: [],
        }))
      );
      setQueriesError({});
    } catch (error) {
      console.error("Error fetching queries:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError({
        general: errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to fetch queries." }],
      });
    }
  };

  useEffect(() => {
    if (activeSection === "Email Queries") {
      fetchQueries();
    } else {
      setQueriesError({});
    }
  }, [activeSection]);

  const handleAcceptQuery = async (id) => {
    if (!id) return;
    try {
      await axios.put(`/api/query/${id}/accept`);
      setQueriesError((prev) => ({ ...prev, [id]: [] }));
      fetchQueries();
    } catch (error) {
      console.error("Error accepting query:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError((prev) => ({
        ...prev,
        [id]: errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to accept query." }],
      }));
    }
  };

  const handleRejectQuery = async (id) => {
    if (!id) return;
    try {
      await axios.put(`/api/query/${id}/reject`);
      setQueriesError((prev) => ({ ...prev, [id]: [] }));
      fetchQueries();
    } catch (error) {
      console.error("Error rejecting query:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError((prev) => ({
        ...prev,
        [id]: errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to reject query." }],
      }));
    }
  };

  const handleReplyQuery = async (id, reply, action) => {
    if (!action) {
      setQueriesError((prev) => ({
        ...prev,
        [id]: [
          { msg: "Please select Accept or Reject before sending the reply." },
        ],
      }));
      return;
    }
    if (!id) return;

    // Validate for angle brackets and curly braces in reply
    if (
      reply.includes("<") ||
      reply.includes(">") ||
      reply.includes("{") ||
      reply.includes("}")
    ) {
      setQueriesError((prev) => ({
        ...prev,
        [id]: [
          { msg: "Reply should not contain '<', '>', '{', or '}' characters." },
        ],
      }));
      return;
    }

    const sanitizedReply = sanitizeHtml(reply, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (!sanitizedReply || sanitizedReply.trim() === "") {
      setQueriesError((prev) => ({
        ...prev,
        [id]: [{ msg: "Reply cannot be empty or invalid." }],
      }));
      return;
    }

    try {
      await axios.put(`/api/query/${id}/reply`, { reply: sanitizedReply });

      if (action === "accept") {
        await handleAcceptQuery(id);
      } else if (action === "reject") {
        await handleRejectQuery(id);
      }

      setQueriesError((prev) => ({ ...prev, [id]: [] }));
      showNotification("Reply sent successfully.", "success");
      fetchQueries();
    } catch (error) {
      console.error("Error replying to query:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError((prev) => ({
        ...prev,
        [id]: errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to send reply." }],
      }));
    }
  };

  const handleCloseQuery = async (id) => {
    if (!id) return;
    try {
      await axios.put(`/api/query/${id}/close`, { role: "faculty" });
      setQueriesError((prev) => ({ ...prev, [id]: [] }));
      showNotification("Query closed successfully.", "success");
      fetchQueries();
    } catch (error) {
      console.error("Error closing query:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError((prev) => ({
        ...prev,
        [id]: errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to close query." }],
      }));
    }
  };

  useEffect(() => {
    fetchQueries();
    if (queries.length > 0) {
      localStorage.setItem("notify", queries);
      localStorage.setItem("notifylength", queries.length);
    }
  }, []);

  return (
    <div className={styles.facultyDashboard}>
      <SideBar
        setActiveSection={setActiveSection}
        page="faculty"
        activeSection={activeSection}
        onToggle={setSidebarWidth}
        darkMode={darkMode}
      />
      <main
        className={`${styles.dashboardContent} ${!isDark ? styles.dark : ""}`}
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
          pageType="faculty"
          activeSection={activeSection}
          isDark={isDark}
          setActiveSection={setActiveSection}
        />
        <motion.div
          className={`${styles.contentContainer} ${!isDark ? styles.dark : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeSection === "Mark Attendance" && (
            <div className={styles.sectionContainer}>
              <div className={styles.controlGroup}>
                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Class:
                  </label>
                  <select value={selectedClass} onChange={handleClassChange}>
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name} {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Subject:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Date:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>

              <motion.button
                className={styles.secondaryButton}
                onClick={fetchClassStudents}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiUsers />
                <span>Load Attendance</span>
              </motion.button>

              {!isLoading && loadbtn && (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((student) => (
                          <motion.tr
                            key={
                              student.id || `${student.name}-${Math.random()}`
                            }
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td>{student.id}</td>
                            <td>{student.name}</td>
                            <td>
                              <select
                                value={student.status}
                                onChange={(e) =>
                                  changeAttendanceStatus(
                                    student.id,
                                    e.target.value
                                  )
                                }
                                disabled={isLocked}
                                className={styles.statusSelect}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                              </select>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!isLocked ? (
                    <motion.button
                      className={styles.primaryButton}
                      onClick={submitAttendance}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiSave />
                      <span>Submit Attendance</span>
                    </motion.button>
                  ) : (
                    <div className={styles.infoMessage}>
                      Attendance already marked. Use Edit section to modify.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === "View Attendance" && (
            <div className={styles.sectionContainer}>
              <div className={styles.controlGroup}>
                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Class:
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name} {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Subject:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Date:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>

              <motion.button
                className={styles.secondaryButton}
                onClick={fetchAttendance}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiUsers />
                <span>Load Attendance</span>
              </motion.button>

              {!isLoading && loadbtn && attendance.length > 0 && (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((student) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td>{student.id}</td>
                            <td>{student.name}</td>
                            <td
                              className={`${styles.statusCell} ${
                                styles[student.status.toLowerCase()]
                              }`}
                            >
                              {student.status}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === "Edit Attendance" && (
            <div className={styles.sectionContainer}>
              <div className={styles.controlGroup}>
                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Class:
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name} {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Subject:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={` ${!isDark ? styles.darktext : ""}`}>
                    Select Date:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
              <motion.button
                className={styles.secondaryButton}
                onClick={enterEditMode}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiUsers />
                <span>Load Attendance</span>
              </motion.button>
              {!isLoading && editMode && attendance.length > 0 && (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((student) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td>{student.id}</td>
                            <td>{student.name}</td>
                            <td>
                              <select
                                value={student.status}
                                onChange={(e) =>
                                  changeAttendanceStatus(
                                    student.id,
                                    e.target.value
                                  )
                                }
                                className={styles.statusSelect}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                              </select>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <motion.button
                    className={styles.primaryButton}
                    onClick={updateAttendance}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiSave />
                    <span>Update Attendance</span>
                  </motion.button>
                </>
              )}
            </div>
          )}
          {activeSection === "View Classes" && (
            <div className={styles.sectionContainer}>
              {classes.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <motion.tr
                          key={cls.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td>{cls.class_name}</td>
                          <td>{cls.section}</td>
                          <td>{cls.subject}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.infoMessage}>
                  No classes assigned to this faculty.
                </div>
              )}
            </div>
          )}
          {activeSection === "Profile" && (
            <div className={styles.sectionContainer}>
              {profileInfo && profileInfo[0] && (
                <div className={styles.profileCard}>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Name:</span>
                    <span>{profileInfo[0].name}</span>
                  </div>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Email:</span>
                    <span>{profileInfo[0].email}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSection === "Email Queries" && (
            <div className={styles.sectionContainer}>
              <h2
                className={`${styles.sectionHeader} ${
                  !isDark ? styles.darktext : ""
                }`}
              >
                Student Queries
              </h2>
              <ErrorMessages errors={queriesError.general} />
              {queries.length > 0 ? (
                queries.map((query) => (
                  <motion.div
                    key={query.id}
                    className={styles.queryCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className={styles.queryContent}>
                      <div className={styles.queryDetails}>
                        <h3>{query.subject}</h3>
                        <p>
                          <strong>Message:</strong> {query.message}
                        </p>
                        <p>
                          <strong>From:</strong> {query.student_name}
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date(query.timestamp).toLocaleString()}
                        </p>
                        <p>
                          <strong>Status:</strong> {query.status}
                        </p>
                      </div>
                      <div className={styles.queryActions}>
                        <ErrorMessages errors={queriesError[query.id]} />
                        <div className={styles.toggleGroup}>
                          <label>
                            <input
                              type="radio"
                              name={`query-${query.id}`}
                              value="accept"
                              checked={query.action === "accept"}
                              onChange={(e) =>
                                setQueries((prev) =>
                                  prev.map((q) =>
                                    q.id === query.id
                                      ? { ...q, action: e.target.value }
                                      : q
                                  )
                                )
                              }
                            />
                            Accept
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`query-${query.id}`}
                              value="reject"
                              checked={query.action === "reject"}
                              onChange={(e) =>
                                setQueries((prev) =>
                                  prev.map((q) =>
                                    q.id === query.id
                                      ? { ...q, action: e.target.value }
                                      : q
                                  )
                                )
                              }
                            />
                            Reject
                          </label>
                        </div>
                        <div className={styles.replyGroup}>
                          <input
                            type="text"
                            placeholder="Type your reply..."
                            value={query.reply || ""}
                            onChange={(e) =>
                              setQueries((prev) =>
                                prev.map((q) =>
                                  q.id === query.id
                                    ? { ...q, reply: e.target.value }
                                    : q
                                )
                              )
                            }
                          />
                          <motion.button
                            className={styles.sendButton}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              handleReplyQuery(
                                query.id,
                                query.reply || "",
                                query.action
                              )
                            }
                          >
                            <FiSend size={16} />
                          </motion.button>
                        </div>
                        {/* {query.status !== "Closed" && (
                          <motion.button
                            className={styles.primaryButton}
                            onClick={() => handleCloseQuery(query.id)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Close Query
                          </motion.button>
                        )} */}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className={styles.infoMessage}>No queries found.</p>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default FacultyDashboard;
