import React, { useState, useEffect } from 'react';
import {
  MdMenu,
  MdDashboard,
  MdPeople,
  MdAssignment,
  MdEdit,
  MdBusiness,
  MdFolder,
  MdWarning,
  MdBarChart,
  MdLogout,
  MdAutoAwesome,
  MdFileDownload,
  MdPhoneAndroid,
  MdHistory,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, staffAPI, leaveAPI, attendanceAPI, hostCompanyAPI } from '../services/api';
import { generateDashboardPDF } from '../utils/pdfGenerator';
import NotificationBell from '../components/Notifications/NotificationBell';
import NotificationList from '../components/Notifications/NotificationList';
import { NotificationProvider } from '../components/Notifications/NotificationContext';
import StaffList from '../components/StaffList';
import HostCompanies from '../components/HostCompanies';
import Departments from '../components/Departments';
import LeaveApplications from '../components/LeaveApplications';
import AttendanceCorrections from '../components/AttendanceCorrections';
import NotAccountable from '../components/NotAccountable';
import Reports from '../components/Reports';
import RotationPlan from '../components/RotationPlan';
import Devices from '../components/Devices';
import Recents from '../components/Recents';
import './Dashboard.css';

function Dashboard() {
  const { user, logout, isAdmin, isHostCompany } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('fc_desktop_sidebar_collapsed') === 'true';
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);

  const hostCompanyId = isHostCompany ? user?.id : null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fc_desktop_sidebar_collapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    loadDashboardData();
  }, [hostCompanyId, isHostCompany]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Dashboard stats
      const statsResponse = await dashboardAPI.getStats(hostCompanyId);
      let baseStats = statsResponse.success ? statsResponse.stats : {};

      // Enrich with staff info
      try {
        const staffParams = {
          fullData: 'true',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          ...(isHostCompany && hostCompanyId ? { hostCompanyId } : {}),
        };
        const staffRes = await staffAPI.getAll(staffParams);
        if (staffRes.success && Array.isArray(staffRes.staff)) {
          const staff = staffRes.staff;
          baseStats = {
            ...baseStats,
            totalInterns: staff.filter(s => s.role === 'Intern').length,
            activeStaff: staff.filter(s => s.isActive !== false).length,
          };
        }
      } catch (err) {
        console.warn('Staff stats error:', err);
      }
      setStats(baseStats);

      // Pending leave
      try {
        const leaveRes = await leaveAPI.getAll({
          reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
          status: 'pending',
          ...(isHostCompany && hostCompanyId ? { hostCompanyId } : {}),
        });
        setPendingLeaveCount(leaveRes.success && Array.isArray(leaveRes.applications) ? leaveRes.applications.length : 0);
      } catch { }

      // Pending corrections
      try {
        const corrRes = await attendanceAPI.getCorrections({
          reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
          status: 'pending',
          ...(isHostCompany && hostCompanyId ? { hostCompanyId } : {}),
        });
        setPendingCorrectionsCount(corrRes.success && Array.isArray(corrRes.corrections) ? corrRes.corrections.length : 0);
      } catch { }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading dashboard data...</p>
        </div>
      );
    }

    const attendancePieData = stats
      ? [
        { label: 'Present', value: stats.currentlyIn || 0, color: '#4CAF50' },
        { label: 'Absent', value: Math.max(0, (stats.totalStaff || 0) - (stats.currentlyIn || 0)), color: '#F44336' },
      ]
      : [];

    const statusPieData = stats
      ? [
        { label: 'On Time', value: Math.max(0, (stats.clockInsToday || 0) - (stats.lateArrivals || 0)), color: '#2196F3' },
        { label: 'Late', value: stats.lateArrivals || 0, color: '#FF9800' },
      ]
      : [];

    return (
      <div className="overview-container">
        <h2>Dashboard Overview</h2>
        <div className="overview-layout">
          {stats && (
            <div className="charts-column">
              <div className="chart-card">
                <div className="chart-header"><h3>Attendance Status</h3></div>
                <PieChart data={attendancePieData} size={180} />
              </div>
              <div className="chart-card">
                <div className="chart-header"><h3>Clock-In Status</h3></div>
                <PieChart data={statusPieData} size={160} />
              </div>
            </div>
          )}
          {stats && (
            <div className="stats-column">
              <div className="stats-grid">
                <StatCard icon={<MdPeople />} value={stats.totalStaff || 0} label="Total Staff" />
                <StatCard icon={<MdAssignment />} value={stats.totalInterns || 0} label="Total Interns" />
                <StatCard icon={<MdBarChart />} value={stats.clockInsToday || 0} label="Clock-Ins Today" />
                <StatCard icon={<MdDashboard />} value={stats.currentlyIn || 0} label="Currently In" />
                {stats.lateArrivals > 0 && <StatCard icon={<MdWarning />} value={stats.lateArrivals} label="Late Arrivals" warning />}
                {isAdmin && <StatCard icon={<MdBusiness />} value={stats.totalCompanies || 0} label="Host Companies" clickable onClick={() => setActiveView('companies')} />}
                {pendingLeaveCount > 0 && <StatCard icon={<MdAssignment />} value={pendingLeaveCount} label="Pending Leave" warning />}
                {pendingCorrectionsCount > 0 && <StatCard icon={<MdEdit />} value={pendingCorrectionsCount} label="Pending Corrections" warning />}
              </div>
            </div>
          )}
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            {pendingLeaveCount > 0 && <ActionCard label="Review Leave Applications" icon="📋" badge={pendingLeaveCount} onClick={() => setActiveView('leaveApplications')} />}
            {pendingCorrectionsCount > 0 && <ActionCard label="Review Corrections" icon="✏️" badge={pendingCorrectionsCount} onClick={() => setActiveView('attendanceCorrections')} />}
            <ActionCard label="View All Staff" icon="👥" onClick={() => setActiveView('staff')} />
            {isAdmin && (
              <>
                <ActionCard label="Manage Companies" icon="🏢" onClick={() => setActiveView('companies')} />
                <ActionCard label="Manage Departments" icon="📁" onClick={() => setActiveView('departments')} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <NotificationProvider recipientId={user?.id} recipientType={isAdmin ? 'Admin' : isHostCompany ? 'HostCompany' : 'User'}>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <button type="button" className="header-menu-button" onClick={() => setSidebarCollapsed(prev => !prev)}>
              <MdMenu />
            </button>
            <div className="header-title-group">
              <h1>Professional Recruitment, Placement and Management</h1>
            </div>
          </div>
          <div className="header-right">
            <button className="export-button" onClick={async () => {
              const result = await generateDashboardPDF({ totalStaff: stats?.totalStaff || 0, clockInsToday: stats?.clockInsToday || 0, currentlyIn: stats?.currentlyIn || 0, lateArrivals: stats?.lateArrivals || 0, pendingLeaveCount, pendingCorrectionsCount }, user?.name || 'Admin');
              alert(result.success ? '✅ Dashboard exported!' : `❌ ${result.error || 'Export failed'}`);
            }}><MdFileDownload /> Export</button>

            <div className="notification-bell-container" style={{ position: 'relative' }}>
              <NotificationBell onClick={() => setShowNotifications(prev => !prev)} />
              {showNotifications && (
                <NotificationList
                  onClose={() => setShowNotifications(false)}
                  onSelect={(n) => {
                    setShowNotifications(false);
                    // Use the navigateTo field from notification utils
                    const view = n.navigateTo || 'overview';
                    setActiveView(view);
                  }}
                />
              )}
            </div>

            <div className="user-info">
              <span className="user-name">{user?.name || user?.username || 'User'}</span>
              {isHostCompany && user?.companyName && <span className="company-name">{user.companyName}</span>}
            </div>

            <button onClick={logout} className="logout-button"><MdLogout /> Logout</button>
          </div>
        </header>

        <div className="dashboard-content">
          <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <nav className="sidebar-nav">
              <SidebarButton icon={<MdDashboard />} label="Overview" active={activeView === 'overview'} onClick={() => setActiveView('overview')} />
              <SidebarButton icon={<MdHistory />} label="Recents" active={activeView === 'recents'} onClick={() => setActiveView('recents')} />
              <SidebarButton icon={<MdPeople />} label="Staff & Interns" active={activeView === 'staff'} onClick={() => setActiveView('staff')} />
              <SidebarButton icon={<MdAssignment />} label="Leave Applications" badge={pendingLeaveCount} active={activeView === 'leaveApplications'} onClick={() => setActiveView('leaveApplications')} />
              <SidebarButton icon={<MdEdit />} label="Attendance Corrections" badge={pendingCorrectionsCount} active={activeView === 'attendanceCorrections'} onClick={() => setActiveView('attendanceCorrections')} />
              {isAdmin && <SidebarButton icon={<MdBusiness />} label="Host Companies" active={activeView === 'companies'} onClick={() => setActiveView('companies')} />}
              <SidebarButton icon={<MdFolder />} label="Departments" active={activeView === 'departments'} onClick={() => setActiveView('departments')} />
              <SidebarButton icon={<MdWarning />} label="Not Accountable" active={activeView === 'notAccountable'} onClick={() => setActiveView('notAccountable')} />
              <SidebarButton icon={<MdAutoAwesome />} label="Rotation Plan" active={activeView === 'rotationPlan'} onClick={() => setActiveView('rotationPlan')} />
              <SidebarButton icon={<MdBarChart />} label="Case Logs" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
              <SidebarButton icon={<MdPhoneAndroid />} label="Devices" active={activeView === 'devices'} onClick={() => setActiveView('devices')} />
            </nav>
          </aside>

          <main className="dashboard-main">
            {activeView === 'overview' && renderOverview()}
            {activeView === 'recents' && <Recents isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'staff' && <StaffList hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'leaveApplications' && <LeaveApplications isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} onSwitchToCorrections={() => setActiveView('attendanceCorrections')} />}
            {activeView === 'attendanceCorrections' && <AttendanceCorrections isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} onSwitchToLeave={() => setActiveView('leaveApplications')} />}
            {activeView === 'companies' && <HostCompanies isAdmin={isAdmin} />}
            {activeView === 'departments' && <Departments isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'devices' && <Devices isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'notAccountable' && <NotAccountable isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'rotationPlan' && <RotationPlan isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
            {activeView === 'reports' && <Reports isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}

// Helper components
const StatCard = ({ icon, value, label, warning = false, clickable = false, onClick }) => (
  <div className={`stat-card ${warning ? 'stat-card-warning' : ''} ${clickable ? 'clickable-stat-card' : ''}`} onClick={clickable ? onClick : undefined}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

const ActionCard = ({ label, icon, badge, onClick }) => (
  <button className="action-card" onClick={onClick}>
    <span className="action-icon">{icon}</span>
    <span className="action-label">{label}</span>
    {badge > 0 && <span className="action-badge">{badge}</span>}
  </button>
);

const SidebarButton = ({ icon, label, badge, active, onClick }) => (
  <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
    {badge > 0 && <span className="nav-badge">{badge}</span>}
  </button>
);

// PieChart component
function PieChart({ data, size = 200 }) {
  const total = (data || []).reduce((sum, item) => sum + (item.value || 0), 0);
  if (!data || data.length === 0 || total === 0) return <div className="pie-chart-empty"><span>No data</span></div>;

  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAccumulator = 0;

  return (
    <div className="pie-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2},${size / 2})`}>
          <circle r={radius} fill="none" stroke="#e5e7eb" strokeWidth="24" />
          {data.map((slice, index) => {
            const fraction = slice.value / total;
            const dash = `${fraction * circumference} ${circumference}`;
            const offset = -offsetAccumulator;
            offsetAccumulator += fraction * circumference;
            if (slice.value <= 0) return null;
            return <circle key={index} r={radius} fill="none" stroke={slice.color} strokeWidth="24" strokeDasharray={dash} strokeDashoffset={offset} transform="rotate(-90)" />
          })}
        </g>
      </svg>
      <div className="pie-chart-center">
        <div className="pie-chart-total">{total}</div>
        <div className="pie-chart-label">Total</div>
      </div>
      <div className="pie-chart-legend">
        {data.map((item, index) => (
          <div key={index} className="pie-chart-legend-item">
            <span className="pie-chart-legend-color" style={{ backgroundColor: item.color }} />
            <span className="pie-chart-legend-text">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;