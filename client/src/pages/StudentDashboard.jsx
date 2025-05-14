import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "../styles/StudentDashboard.module.css";
import HeaderMain from "../components/HeaderMain";
import SideBar from "../components/SideBar";
import { motion } from "framer-motion";
import Modal from "react-modal";
import sanitizeHtml from "sanitize-html";
import he from "he";
import { jwtDecode } from "jwt-decode";
import {
  Notification,
  ConfirmationDialog,
  ErrorMessages,
} from "../components/Notification";
Modal.setAppElement("#root");
import {
  FiDownload,
  FiCalendar,
  FiUser,
  FiAlertTriangle,
  FiMail,
} from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

const COLORS = ["#0088FE", "#FFBB28", "#FF8042", "#00C49F"];

const StudentDashboard = () => {
  const [activeSection, setActiveSection] = useState("View Attendance");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [lowAttendanceWarning, setLowAttendanceWarning] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [queryError, setQueryError] = useState([]);
  const [queriesError, setQueriesError] = useState([]);

  // Decode JWT to get student_id
  const token = localStorage.getItem("token");
  const student_id = token ? jwtDecode(token).id : null;

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

  useEffect(() => {
    if (!student_id || isNaN(student_id) || parseInt(student_id) < 1) {
      setQueriesError([
        { msg: "Session expired or invalid student ID. Please log in again." },
      ]);
      window.location.href = "/";
    } else {
      fetchStudentInfo();
      fetchAttendanceSubjects();
    }
  }, [student_id]);

  const fetchStudentInfo = async () => {
    if (!student_id || isNaN(student_id) || parseInt(student_id) < 1) return;
    try {
      const res = await axios.get(`/api/students/${student_id}/class`);
      setClassInfo({
        ...res.data,
        name: sanitizeHtml(res.data.name, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        class_name: sanitizeHtml(res.data.class_name, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        section: sanitizeHtml(res.data.section, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        roll_no: sanitizeHtml(res.data.roll_no, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        email: sanitizeHtml(res.data.email, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        phone: res.data.phone
          ? sanitizeHtml(res.data.phone, {
              allowedTags: [],
              allowedAttributes: {},
            })
          : null,
      });
    } catch (error) {
      console.error("Error fetching student info:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
    }
  };

  const fetchAttendanceSubjects = async () => {
    if (!student_id || isNaN(student_id) || parseInt(student_id) < 1) return;
    try {
      const res = await axios.get(`/api/students/${student_id}/subjects`);
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

  const fetchAttendance = async (subject_id) => {
    if (!subject_id || !student_id) return;
    setIsLoading(true);
    setSelectedSubject(subject_id);

    try {
      const res = await axios.get(
        `/api/students/${student_id}/subject/${subject_id}`
      );
      setAttendanceHistory(
        res.data.map((record) => ({
          ...record,
          date: sanitizeHtml(record.date, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          status: sanitizeHtml(record.status, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          subject_name: sanitizeHtml(record.subject_name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }))
      );
      calculateAttendancePercentage(res.data);
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

  const calculateAttendancePercentage = (records) => {
    const totalDays = records.length;
    const presentDays = records.filter(
      (record) => record.status === "Present"
    ).length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    setAttendancePercentage(percentage.toFixed(2));
    setLowAttendanceWarning(percentage < 75);
  };

  const downloadAttendance = () => {
    if (!selectedSubject) {
      showNotification("Please select a subject first.", "error");
      return;
    }

    const subjectName =
      subjects.find((s) => s.id === selectedSubject)?.name || "Attendance";
    let csvContent = "Date,Status,Subject\n";

    attendanceHistory.forEach((record) => {
      csvContent += `${record.date.split("T")[0]},${record.status},${
        record.subject_name
      }\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subjectName}_Attendance.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getAttendanceData = () => {
    const present = attendanceHistory.filter(
      (r) => r.status === "Present"
    ).length;
    const absent = attendanceHistory.filter(
      (r) => r.status === "Absent"
    ).length;
    const late = attendanceHistory.filter((r) => r.status === "Late").length;

    return [
      { name: "Present", value: present },
      { name: "Absent", value: absent },
      { name: "Late", value: late },
    ];
  };

  const [isDark, setIsDark] = useState(true);

  const darkMode = (isDarkm) => {
    setIsDark(isDarkm);
  };

  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");

  const sendQuery = async () => {
    if (!querySubject || !queryMessage) {
      setQueryError([{ msg: "Please fill in all fields." }]);
      return;
    }

    // Validate for angle brackets and curly braces in queryMessage
    if (
      queryMessage.includes("<") ||
      queryMessage.includes(">") ||
      queryMessage.includes("{") ||
      queryMessage.includes("}")
    ) {
      setQueryError([
        { msg: "Message should not contain '<', '>', '{', or '}' characters." },
      ]);
      return;
    }

    const sanitizedSubject = sanitizeHtml(
      subjects.find((s) => s.id === parseInt(querySubject))?.name ||
        querySubject,
      { allowedTags: [], allowedAttributes: {} }
    );
    const sanitizedMessage = sanitizeHtml(queryMessage, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (
      !sanitizedSubject ||
      !sanitizedMessage ||
      sanitizedMessage.trim() === ""
    ) {
      setQueryError([{ msg: "Invalid subject or message content." }]);
      return;
    }

    try {
      const res = await axios.get(`/api/faculty/${querySubject}/faculty`);
      const faculty_id = res.data.faculty_id;

      if (!faculty_id) {
        setQueryError([{ msg: "No faculty assigned to this subject." }]);
        return;
      }

      await axios.post("/api/query", {
        student_id,
        faculty_id,
        subject: sanitizedSubject,
        message: sanitizedMessage,
      });
      setQueryError([]);
      showNotification("Query sent successfully!", "success");
      setIsQueryModalOpen(false);
      setQuerySubject("");
      setQueryMessage("");
      fetchQueries();
    } catch (error) {
      console.error("Error sending query:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueryError(
        errorData?.errors
          ? errorData.errors
          : [
              {
                msg:
                  errorData?.message ||
                  "Failed to send query. Please try again.",
              },
            ]
      );
    }
  };

  const [queries, setQueries] = useState([]);

  const fetchQueries = async () => {
    if (!student_id) return;
    try {
      const res = await axios.get(`/api/query/${student_id}/queries`);
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
      setQueriesError([]);
    } catch (error) {
      console.error("Error fetching queries:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      const errorData = error.response?.data;
      setQueriesError(
        errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to fetch queries." }]
      );
    }
  };

  const handleCloseQuery = async (id) => {
    if (!id) return;
    try {
      await axios.put(`/api/query/${id}/close`, { role: "student" });
      setQueriesError([]);
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
      setQueriesError(
        errorData?.errors
          ? errorData.errors
          : [{ msg: errorData?.message || "Failed to close query." }]
      );
    }
  };

  useEffect(() => {
    if (activeSection === "Email Queries") {
      fetchQueries();
    } else {
      setQueriesError([]);
    }
    setSelectedSubject("");
  }, [activeSection]);

  useEffect(() => {
    fetchQueries();
    if (queries.length > 0) {
      localStorage.setItem("notify", queries);
      localStorage.setItem("notifylength", queries.length);
    }
  }, []);

  return (
    <div className={styles.studentDashboard}>
      <SideBar
        setActiveSection={setActiveSection}
        page="student"
        activeSection={activeSection}
        classInfo={classInfo}
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
          pageType="student"
          activeSection={activeSection}
          isDark={isDark}
          setActiveSection={setActiveSection}
        />
        <motion.div
          className={`${styles.contentContainer}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeSection === "View Attendance" && (
            <div className={styles.sectionContainer}>
              <div className={styles.controlGroup}>
                <div className={styles.formGroup}>
                  <label
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    Select Subject:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => fetchAttendance(e.target.value)}
                    className={styles.subjectSelect}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className={styles.loader}>Loading...</div>
              ) : (
                selectedSubject && (
                  <>
                    <div className={styles.attendanceSummary}>
                      <div className={styles.attendanceStats}>
                        <h3>Overall Attendance: {attendancePercentage}%</h3>
                        {lowAttendanceWarning && (
                          <div className={styles.warning}>
                            <FiAlertTriangle />
                            <span>Warning: Your attendance is below 75%</span>
                          </div>
                        )}
                      </div>

                      {attendanceHistory.length > 0 && (
                        <div className={styles.chartContainer}>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={getAttendanceData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) =>
                                  `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {getAttendanceData().map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {attendanceHistory.length > 0 ? (
                      <>
                        <div className={styles.tableWrapper}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Subject</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceHistory.map((record) => (
                                <motion.tr
                                  key={`${record.date.split("T")[0]}-${
                                    record.subject_id
                                  }`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <td>{record.date.split("T")[0]}</td>
                                  <td
                                    className={`${styles.statusCell} ${
                                      styles[record.status.toLowerCase()]
                                    }`}
                                  >
                                    {record.status}
                                  </td>
                                  <td>{record.subject_name}</td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <motion.button
                          className={styles.primaryButton}
                          onClick={downloadAttendance}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FiDownload />
                          <span>Download Attendance Report</span>
                        </motion.button>
                      </>
                    ) : (
                      <p className={styles.infoMessage}>
                        No attendance records found for this subject.
                      </p>
                    )}
                  </>
                )
              )}
            </div>
          )}

          {activeSection === "Profile" && (
            <div className={styles.sectionContainer}>
              {classInfo && (
                <div className={styles.profileCard}>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Name:</span>
                    <span>{classInfo.name}</span>
                  </div>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Class:</span>
                    <span>
                      {classInfo.class_name} {classInfo.section}
                    </span>
                  </div>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Roll Number:</span>
                    <span>{classInfo.roll_no}</span>
                  </div>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Email:</span>
                    <span>{classInfo.email}</span>
                  </div>
                  <div
                    className={`${styles.profileField} ${
                      !isDark ? styles.darktext : ""
                    }`}
                  >
                    <span className={styles.fieldLabel}>Phone:</span>
                    <span>{classInfo.phone || "Not provided"}</span>
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
                Your Queries
              </h2>
              <ErrorMessages errors={queriesError} />
              {queries.length > 0 ? (
                queries.map((query) => (
                  <div key={query.id} className={styles.queryCard}>
                    <h3>{query.subject}</h3>
                    <p>{query.message}</p>
                    {query.reply && (
                      <p>
                        <strong>Reply:</strong> {query.reply}
                      </p>
                    )}
                    <p>
                      <strong>Status:</strong> {query.status}
                    </p>
                    <p>
                      <strong>Faculty:</strong> {query.faculty_name}
                    </p>
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
                ))
              ) : (
                <p className={styles.infoMessage}>No queries found.</p>
              )}
            </div>
          )}
        </motion.div>
      </main>
      <button
        className={styles.floatingButton}
        onClick={() => {
          setIsQueryModalOpen(true);
          setQueryError([]);
        }}
      >
        <FiMail size={24} />
      </button>

      <Modal
        isOpen={isQueryModalOpen}
        onRequestClose={() => {
          setIsQueryModalOpen(false);
          setQueryError([]);
        }}
        className={styles.queryModal}
        overlayClassName={styles.modalOverlay}
      >
        <h2>Send Query</h2>
        <ErrorMessages errors={queryError} />
        <select
          value={querySubject}
          onChange={(e) => setQuerySubject(e.target.value)}
          className={styles.subjectSelect}
        >
          <option value="">-- Select Subject --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Message"
          value={queryMessage}
          onChange={(e) => setQueryMessage(e.target.value)}
        />
        <button onClick={sendQuery} className={styles.primaryButton}>
          Send
        </button>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
