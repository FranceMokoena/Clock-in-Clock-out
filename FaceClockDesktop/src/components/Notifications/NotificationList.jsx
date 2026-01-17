import React, { useContext } from 'react';
import { MdClose } from 'react-icons/md';
import { NotificationContext } from './NotificationContext';
import { formatNotificationType, getNotificationIcon, formatTimeAgo, getNotificationNavigation } from './notificationUtils';
import './NotificationList.css';

export default function NotificationList({ onSelect, onClose }) {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useContext(NotificationContext);
  const unreadNotifications = notifications.filter(n => !n.isRead);

  const handleNotificationClick = (notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    // Call parent's onSelect with navigation info - ALWAYS navigate to RECENTS
    onSelect({
      ...notification,
      navigateTo: 'recents' // Always go to RECENTS view when clicking a notification
    });
    onClose();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="notification-list-modal-overlay">
      <div className="notification-list-modal">
        <div className="notification-list-header">
          <div className="header-left">
            <h2>Notifications</h2>
            {unreadNotifications.length > 0 && (
              <span className="unread-badge">{unreadNotifications.length} Unread</span>
            )}
          </div>
          <div className="header-right">
            {unreadNotifications.length > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllAsRead} title="Mark all as read">
                Mark all as read
              </button>
            )}
            <button className="close-btn" onClick={onClose} title="Close notifications">
              <MdClose size={24} />
            </button>
          </div>
        </div>

        <div className="notification-list-container">
          {loading ? (
            <div className="notification-loading">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <p>✨ No notifications yet</p>
              <p className="empty-subtitle">Check back soon for updates</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${
                    index === 0 ? 'first' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-wrapper">
                    <div className="notification-icon-wrapper">
                      <div className="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    <div className="notification-content">
                      <div className="notification-header">
                        <h4 className="notification-title">
                          {formatNotificationType(notification.type)}
                        </h4>
                        <span className="notification-time">
                          {formatTimeAgo(new Date(notification.createdAt))}
                        </span>
                      </div>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      {notification.details && (
                        <div className="notification-details">
                          {Object.entries(notification.details).map(([key, value]) => (
                            <div key={key} className="detail-item">
                              <span className="detail-key">{key}:</span>
                              <span className="detail-value">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="notification-actions">
                      {!notification.isRead && (
                        <div className="unread-indicator" title="Unread"></div>
                      )}
                      <button
                        className="notification-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <MdClose size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="notification-list-footer">
          <p className="notification-count">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadNotifications.length > 0 && ` • ${unreadNotifications.length} unread`}
          </p>
        </div>
      </div>
    </div>
  );
}
