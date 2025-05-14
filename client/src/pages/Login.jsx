import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import xss from "xss";
import axios from "axios";
import styles from "../styles/Login.module.css";

// Validation schema using Yup
// Validation schema using Yup
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const validateForm = async () => {
    try {
      await loginSchema.validate({ email, password }, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const isValid = await validateForm();
    if (!isValid) return;

    const sanitizedEmail = xss(email);
    const sanitizedPassword = xss(password);

    try {
      const response = await axios.post("/api/login/logged", {
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      const { token, role, id } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user_id", id);

      if (role === "faculty") {
        navigate("/faculty-dashboard");
      } else if (role === "student") {
        navigate("/student-dashboard");
      } else {
        navigate("/admin-dashboard");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      if (error.response?.status === 429) {
        setServerError("Too many login attempts, please try again later.");
      } else if (error.response?.status === 401) {
        setServerError("Invalid email or password.");
      } else if (error.response?.status === 405) {
        setServerError("Invalid request method.");
      } else {
        setServerError(xss(errorMessage));
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2>Login</h2>
      {serverError && <p className={styles.error}>{serverError}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <p className={styles.error}>{errors.password}</p>}
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
