import React, { useContext, useEffect, useState } from 'react';
import { MdNotifications } from 'react-icons/md';
import { NotificationContext } from './NotificationContext';
import './NotificationBell.css';

export default function NotificationBell({ onClick }) {
  const { unreadCount } = useContext(NotificationContext);
  const [shake, setShake] = useState(false);

  // Trigger shake animation when there are unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setShake(true);
      // Stop shaking after 30 seconds
      const timer = setTimeout(() => setShake(false), 30000);
      return () => clearTimeout(timer);
    } else {
      setShake(false);
    }
  }, [unreadCount]);

  return (
    <div
      className={`bell-container ${shake && unreadCount > 0 ? 'shake' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <MdNotifications className="bell-icon" />
      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
