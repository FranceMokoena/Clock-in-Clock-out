import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import StaffDetailsScreen from './screens/StaffDetails';
import LeaveApplicationDetails from './screens/LeaveApplicationDetails';
import AttendanceCorrectionDetails from './screens/AttendanceCorrectionDetails';
import AttendanceTimesheetReport from './screens/AttendanceTimesheetReport';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#ED3438', marginBottom: '20px', fontWeight: 700 }}>Application Error</h1>
          <p style={{ color: '#4a5568', marginBottom: '10px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3166AE',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#3166AE'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/staff/:staffId"
                element={
                  <ProtectedRoute>
                    <StaffDetailsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave-applications/:applicationId"
                element={
                  <ProtectedRoute>
                    <LeaveApplicationDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance-corrections/:correctionId"
                element={
                  <ProtectedRoute>
                    <AttendanceCorrectionDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/attendance-timesheet"
                element={
                  <ProtectedRoute>
                    <AttendanceTimesheetReport />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

