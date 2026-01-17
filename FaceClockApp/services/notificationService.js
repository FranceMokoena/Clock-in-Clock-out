import API_BASE_URL from '../config/api';

export async function fetchNotifications({ limit = 50, params = '' } = {}) {
  try {
    const url = `${API_BASE_URL}/notifications?limit=${limit}${params ? '&' + params : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('fetchNotifications failed', res.status);
      return [];
    }
    const data = await res.json();
    // Support two shapes: { notifications: [...] } or direct array
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.notifications)) return data.notifications;
    return [];
  } catch (err) {
    console.warn('fetchNotifications error:', err);
    return [];
  }
}

export async function fetchUnreadCount() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || data.unread || 0;
  } catch (err) {
    console.warn('fetchUnreadCount error:', err);
    return 0;
  }
}

export async function markAllAsRead() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      console.warn('markAllAsRead failed', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('markAllAsRead error:', err);
    return false;
  }
}

export default {
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
};
