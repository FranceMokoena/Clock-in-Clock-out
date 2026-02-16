import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import '../styles.css';
import { UserIcon, LockIcon, LoginIcon, XIcon } from "./Icons";
import { useAuth } from '../context/AuthContext';
import loginLogo from '../assets/IS_Internship Success (Benefit)_LOGO.png';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await login(username, password);
      if (response.success) {
        if (typeof onLogin === 'function') {
          onLogin();
        }
        navigate('/dashboard');
      } else {
        setError(response.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Invalid username or password!");
    } finally {
      setIsLoading(false);
    }
  };

  const words = [
    { text: "Collaboration & synergy", isDark: true, lines: ["Collaboration &", "synergy"] },
    { text: "Accountability", isDark: true, lines: ["Accountability"] },
    { text: "Continuous Learning Innovation", isDark: true, lines: ["Continuous Learning", "Innovation"] },
    { text: "Embrace Diversity", isDark: true, lines: ["Embrace", "Diversity"] },
    { text: "Honesty Integrity & Ethics", isDark: false, lines: ["Honesty Integrity", "& Ethics"] },
    { text: "Enthusiasm & Passion", isDark: false, lines: ["Enthusiasm &", "Passion"] }
  ];

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="logo-container">
          <img
            src={loginLogo}
            alt="Face-clock logo"
            className="left-logo"
          />
        </div>
        <div className="values-container">
          <div className="circle-center-fixed">
            <div className="center-text">OUR VALUES</div>
          </div>
          <div className="rotating-circle">
            <div className="circle-ring"></div>
            {words.map((word, index) => {
              const angle = (index * 360) / words.length - 90;
              const radius = 125;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <div
                  key={index}
                  className="circle-word"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`
                  }}
                >
                  <div className={`word-circle ${word.isDark ? 'dark-blue' : 'light-gray'}`}>
                    {word.lines.map((line, i) => (
                      <div key={i} className="word-line">{line}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">Internship Success Face-Clock</h1>
            <p className="login-subtitle">Administrative & Host Company Access</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <XIcon className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <UserIcon />
                <span>Username</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group password-group">
              <label className="form-label">
                <LockIcon />
                <span>Password</span>
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? (
                <span className="btn-loading">Logging in...</span>
              ) : (
                <>
                  <LoginIcon />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">© 2026 Face-clock. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
