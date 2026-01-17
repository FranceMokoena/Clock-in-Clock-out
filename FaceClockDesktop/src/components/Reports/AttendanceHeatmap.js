import React from 'react';
import './AttendanceHeatmap.css';

function AttendanceHeatmap({ data }) {
  // Get calendar days for the month
  const getCalendarDays = () => {
    const dates = Object.keys(data);
    if (dates.length === 0) return [];

    const firstDate = new Date(dates[0]);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toDateString();
      calendarDays.push({
        day,
        dateStr,
        data: data[dateStr]
      });
    }

    return calendarDays;
  };

  const getHeatmapColor = (dayData) => {
    if (!dayData) return '#e5e7eb'; // empty cell
    if (dayData.missedClockOut) return '#ef4444'; // Red - Absent/Missed
    if (dayData.isLate) return '#fbbf24'; // Yellow - Late/Partial
    return '#10b981'; // Green - Present/On-time
  };

  const getHeatmapLabel = (dayData) => {
    if (!dayData) return '';
    if (dayData.missedClockOut) return 'Absent';
    if (dayData.isLate) return 'Late';
    return 'Present';
  };

  const calendarDays = getCalendarDays();
  const monthName = calendarDays[0]?.dateStr 
    ? new Date(calendarDays[0].dateStr).toLocaleString('default', { month: 'long', year: 'numeric' })
    : 'Calendar';

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="attendance-heatmap">
      <div className="heatmap-header-section">
        <h4>{monthName}</h4>
        <div className="heatmap-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
            <span>Present</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
            <span>Late/Partial</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Absent</span>
          </div>
        </div>
      </div>

      <div className="heatmap-calendar">
        {weekDays.map(day => (
          <div key={day} className="heatmap-weekday">
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className="heatmap-day"
            style={{
              backgroundColor: getHeatmapColor(day?.data),
              cursor: day?.data ? 'pointer' : 'default'
            }}
            title={day ? `${day.day} - ${getHeatmapLabel(day?.data)}` : ''}
          >
            {day ? day.day : ''}
          </div>
        ))}
      </div>

      <div className="heatmap-stats">
        <div className="stat-item">
          <span className="stat-label">Total Days Tracked:</span>
          <span className="stat-value">{Object.keys(data).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Days Present:</span>
          <span className="stat-value" style={{ color: '#10b981' }}>
            {Object.values(data).filter(d => !d.missedClockOut && !d.isLate).length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Days Late:</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>
            {Object.values(data).filter(d => d.isLate && !d.missedClockOut).length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Days Absent:</span>
          <span className="stat-value" style={{ color: '#ef4444' }}>
            {Object.values(data).filter(d => d.missedClockOut).length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceHeatmap;
