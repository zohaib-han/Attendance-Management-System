import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "../styles/FacultyDashboard.module.css";
import HeaderMain from "./HeaderMain";
import SideBar from "./SideBar";
import { motion } from "framer-motion";
import { FiCheck, FiX } from "react-icons/fi";

// Notification Component
const Notification = ({ id, message, type, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <motion.div
      className={`${styles.notification} ${styles[type]}`}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      {type === "success" ? (
        <FiCheck className={styles.notificationIcon} />
      ) : (
        <FiX className={styles.notificationIcon} />
      )}
      <span>{message}</span>
    </motion.div>
  );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <motion.div
      className={styles.confirmationDialog}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={styles.confirmationContent}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p>{message}</p>
        <div className={styles.confirmationButtons}>
          <motion.button
            className={styles.confirmButton}
            onClick={onConfirm}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Confirm
          </motion.button>
          <motion.button
            className={styles.cancelButton}
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ErrorMessages = ({ errors }) => {
  if (!errors || errors.length === 0) return null;
  return (
    <div>
      {errors.map((error, index) => (
        <div key={index} className={styles.errorMessage}>
          {error.path ? `${error.msg} (${error.path})` : error.msg}
        </div>
      ))}
    </div>
  );
};

export { Notification, ConfirmationDialog, ErrorMessages };
