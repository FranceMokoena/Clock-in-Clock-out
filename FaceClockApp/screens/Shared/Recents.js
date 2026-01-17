import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { fetchNotifications } from '../../services/notificationService';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

const { width } = Dimensions.get('window');

const Recents = ({ navigation, route, onBack }) => {
  const { theme } = useTheme();
  const { notifications, markAllAsRead } = useNotifications();
  const userInfo = route?.params?.userInfo || {};
  
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLastTen, setShowLastTen] = useState(true);
  const [hostCompanies, setHostCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedHostCompany, setSelectedHostCompany] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // use centralized API_BASE_URL so emulator/device resolves correctly
  const isIntern = userInfo.role === 'Intern' || userInfo.type === 'Intern';

  // Mark all notifications as read when Recents screen opens
  useEffect(() => {
    console.log('📋 Recents screen opened, marking all as read');
    markAllAsRead().then(() => {
      console.log('✅ Recents: markAllAsRead completed');
    });
  }, []); // empty array - run only once on mount

  // Load host companies on component mount (only for admin/host company views)
  useEffect(() => {
    if (!isIntern) {
      loadHostCompanies();
    }
  }, []);

  // Filter notifications based on selected filters
  useEffect(() => {
    filterNotifications();
  }, [notifications, showLastTen, selectedHostCompany, selectedDepartment]);

  const loadHostCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/admin/host-companies`);
      if (response.ok) {
        const data = await response.json();
        if (data.companies) {
          setHostCompanies(data.companies);
          console.log('✅ Loaded host companies:', data.companies.length);
        }
      }
    } catch (error) {
      console.error('Error loading host companies:', error);
    }
  };

  const loadDepartments = async (companyId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/staff/admin/departments/all?hostCompanyId=${companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.departments) {
          setDepartments(data.departments);
          console.log('✅ Loaded departments:', data.departments.length);
        }
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Apply Last 10 filter
    if (showLastTen) {
      filtered = filtered.slice(0, 10);
    }

    // Apply host company filter (only for admin/host company views)
    if (!isIntern && selectedHostCompany) {
      filtered = filtered.filter(
        n => n.data?.payload?.hostCompanyId === selectedHostCompany
      );
    }

    // Apply department filter (only for admin/host company views)
    if (!isIntern && selectedDepartment) {
      filtered = filtered.filter(
        n => n.data?.payload?.departmentId === selectedDepartment
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleHostCompanySelect = (companyId) => {
    setSelectedHostCompany(companyId);
    setSelectedDepartment(null);
    setDepartments([]);
    if (companyId) {
      loadDepartments(companyId);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (!isIntern) {
        await loadHostCompanies();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      'CLOCKIN_SUCCESS': '✅',
      'CLOCKOUT_SUCCESS': '⏹️',
      'LATE_CLOCKIN': '⚠️',
      'MISSING_CLOCKIN': '❌',
      'STAFF_REGISTERED': '👤',
      'INTERN_REGISTERED': '🎓',
      'DEVICE_APPROVED': '✨',
      'DEVICE_REGISTERED': '📱',
      'DEPARTMENT_CREATED': '📂',
      'DEPARTMENT_UPDATED': '📝',
      'LEAVE_REQUEST': '📋',
      'LEAVE_APPROVED': '✅',
      'LEAVE_REJECTED': '❌',
      'CORRECTION_APPROVED': '✅',
      'CORRECTION_REJECTED': '❌',
      'HOST_COMPANY_CREATED': '🏢',
      'HOST_COMPANY_UPDATED': '🏢',
      'INTERN_REPORTED': '⚠️',
      'INTERN_FLAGGED': '🚩',
      'INTERN_NOT_ACCOUNTABLE': '⚠️',
      'INTERN_MISSING_CLOCKIN': '❌',
      'INTERN_MISSING_CLOCKOUT': '❌',
      'STAFF_CLOCKIN': '✅',
      'STAFF_CLOCKOUT': '⏹️',
      'STAFF_CLOCKIN_LATE': '⏰',
      'STAFF_MISSING_CLOCKIN': '❌',
      'STAFF_MISSING_CLOCKOUT': '❌',
      'STAFF_ABSENT': '📋',
      'REPORT_ACTION_TAKEN': '✅'
    };
    return iconMap[type] || '📢';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const renderNotificationItem = ({ item }) => (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 8,
        marginVertical: 6,
        borderRadius: 8,
        overflow: 'hidden'
      }}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.isRead ? theme.surface : theme.primary + '15',
            borderLeftColor: item.isRead ? theme.textSecondary : theme.primary,
            flex: 1
          }
        ]}
        onPress={() => {
          // Mark as read if needed
          if (!item.isRead) {
            // Could add mark as read logic here
          }
        }}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(item.type)}
            </Text>
            <Text
              style={[
                styles.notificationTitle,
                { color: item.isRead ? theme.textSecondary : theme.text }
              ]}
              numberOfLines={1}
            >
              {item.type?.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text
            style={[
              styles.notificationMessage,
              { color: item.isRead ? theme.textTertiary : theme.text }
            ]}
            numberOfLines={2}
          >
            {item.message || item.data?.message || 'No message'}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 8
        }}
        onPress={() => {
          Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await axios.delete(`${API_BASE_URL}/notifications/${item._id}`);
                    onRefresh();
                  } catch (error) {
                    console.error('Error deleting notification:', error);
                    Alert.alert('Error', 'Failed to delete notification');
                  }
                }
              }
            ]
          );
        }}
      >
        <Text style={{ fontSize: 12, color: theme.textSecondary }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.surface, borderBottomColor: theme.border },
    dropdownContainer: { backgroundColor: theme.surface },
    filterButton: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
    filterButtonText: { color: theme.primary },
    activFilterButton: { backgroundColor: theme.primary },
    activeFilterButtonText: { color: '#fff' }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => onBack ? onBack() : navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>📋 Recent Activities</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {filteredNotifications.length} activities
          </Text>
        </View>
        {filteredNotifications.length > 0 && (
          <TouchableOpacity
            style={{ padding: 8, marginRight: 8 }}
            onPress={() => {
              Alert.alert(
                'Clear Notifications',
                'What would you like to do?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // Delete all notifications for current user
                        await axios.delete(`${API_BASE_URL}/notifications/delete-all`, {
                          data: {
                            recipientId: userInfo.id || userInfo._id,
                            recipientType: userInfo.role || userInfo.type
                          }
                        });
                        Alert.alert('Success', 'All notifications cleared');
                        onRefresh();
                      } catch (error) {
                        console.error('Error clearing notifications:', error);
                        Alert.alert('Error', 'Failed to clear notifications');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item._id || `${item.type}-${item.createdAt}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No recent activities
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Activities will appear here
            </Text>
          </View>
        }
        ListHeaderComponent={
          !isIntern ? (
            <>
              {/* Filter Controls */}
              <View style={[styles.filterControls, dynamicStyles.dropdownContainer]}>
                {/* Last 10 / All Toggle */}
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      showLastTen
                        ? dynamicStyles.activFilterButton
                        : dynamicStyles.filterButton
                    ]}
                    onPress={() => setShowLastTen(true)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        showLastTen
                          ? dynamicStyles.activeFilterButtonText
                          : dynamicStyles.filterButtonText
                      ]}
                    >
                      Last 10
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      !showLastTen
                        ? dynamicStyles.activFilterButton
                        : dynamicStyles.filterButton
                    ]}
                    onPress={() => setShowLastTen(false)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        !showLastTen
                          ? dynamicStyles.activeFilterButtonText
                          : dynamicStyles.filterButtonText
                      ]}
                    >
                      All Activities
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Host Company Filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      !selectedHostCompany && dynamicStyles.activFilterButton
                    ]}
                    onPress={() => handleHostCompanySelect(null)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        !selectedHostCompany && { color: '#fff' }
                      ]}
                    >
                      All Companies
                    </Text>
                  </TouchableOpacity>

                  {hostCompanies.map((company) => (
                    <TouchableOpacity
                      key={company._id}
                      style={[
                        styles.filterPill,
                        selectedHostCompany === company._id &&
                        dynamicStyles.activFilterButton
                      ]}
                      onPress={() => handleHostCompanySelect(company._id)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          selectedHostCompany === company._id && { color: '#fff' }
                        ]}
                      >
                        {company.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Department Filter */}
                {selectedHostCompany && departments.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        !selectedDepartment && dynamicStyles.activFilterButton
                      ]}
                      onPress={() => setSelectedDepartment(null)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          !selectedDepartment && { color: '#fff' }
                        ]}
                      >
                        All Departments
                      </Text>
                    </TouchableOpacity>

                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept._id}
                        style={[
                          styles.filterPill,
                          selectedDepartment === dept._id &&
                          dynamicStyles.activFilterButton
                        ]}
                        onPress={() => setSelectedDepartment(dept._id)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            selectedDepartment === dept._id && { color: '#fff' }
                          ]}
                        >
                          {dept.departmentName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '600'
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1,
    marginLeft: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400'
  },
  filterControls: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center'
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600'
  },
  filterScroll: {
    marginBottom: 8
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start'
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500'
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  notificationItem: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 6
  },
  notificationContent: {
    flex: 1
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  notificationIcon: {
    fontSize: 18,
    marginRight: 8
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '400'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400'
  }
});

export default Recents;
