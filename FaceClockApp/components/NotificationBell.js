import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

/**
 * 🔔 NOTIFICATION BELL COMPONENT
 * 
 * Displays a bell icon with unread count badge.
 * Navigates to Recents screen when tapped.
 */
function NotificationBellContent({ navigation }) {
  const { unreadCount } = useNotifications();

  const handleBellPress = () => {
    navigation?.navigate('Recents');
  };

  return (
    <TouchableOpacity
      onPress={handleBellPress}
      style={styles.bellButton}
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
      accessibilityRole="button"
    >
      <Text style={styles.bellIcon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#ff4444' }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationBell({ navigation }) {
  try {
    return <NotificationBellContent navigation={navigation} />;
  } catch (error) {
    // Fallback if hook fails
    console.log('NotificationBell error:', error);
    return null;
  }
}

const styles = StyleSheet.create({
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
