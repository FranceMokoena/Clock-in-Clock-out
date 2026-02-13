import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationBell from '../../components/NotificationBell';

export default function InternDashboard({ navigation, route }) {
  const { theme } = useTheme();
  const userInfo = route?.params?.userInfo || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today', 'weekly', 'monthly'
  const [attendanceData, setAttendanceData] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaveCount, setLeaveCount] = useState(0);
  const [profilePicture, setProfilePicture] = useState(userInfo?.profilePicture || null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const dynamicStyles = getDynamicStyles(theme);
  const activeRoute = route?.name;
  const profilePictureKey = userInfo?.id
    ? `internProfilePicture:${userInfo.id}`
    : 'internProfilePicture';

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, userInfo.id]);

  useEffect(() => {
    let isMounted = true;

    const loadStoredProfilePicture = async () => {
      if (!profilePictureKey) return;
      try {
        const storedPicture = await AsyncStorage.getItem(profilePictureKey);
        if (!isMounted) return;

        if (userInfo?.profilePicture) {
          if (storedPicture !== userInfo.profilePicture) {
            await AsyncStorage.setItem(profilePictureKey, userInfo.profilePicture);
            await AsyncStorage.setItem('internProfilePicture', userInfo.profilePicture);
          }
          setProfilePicture(userInfo.profilePicture);
          return;
        }

        if (storedPicture) {
          setProfilePicture(storedPicture);
          return;
        }

        const fallbackPicture = await AsyncStorage.getItem('internProfilePicture');
        if (fallbackPicture) {
          setProfilePicture(fallbackPicture);
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };

    loadStoredProfilePicture();

    return () => {
      isMounted = false;
    };
  }, [profilePictureKey, userInfo?.profilePicture]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Create backend endpoint /staff/intern/dashboard
      // For now, use mock data or existing endpoints
      try {
        const response = await axios.get(`${API_BASE_URL}/staff/intern/dashboard`, {
          params: {
            internId: userInfo.id,
            period: selectedPeriod,
          },
        });

        if (response.data) {
          setAttendanceData(response.data.attendance);
          setStats(response.data.stats);
        }
      } catch (error) {
        // Backend endpoint doesn't exist yet, use empty data
        console.log('Dashboard endpoint not available, using placeholder data');
        setAttendanceData([]);
        setStats({
          totalHours: '0.0',
          daysPresent: '0',
          attendanceRate: '0',
        });
      }

      // Fetch leave application count for quick actions badge
      try {
        const leaveRes = await axios.get(`${API_BASE_URL}/staff/intern/leave-applications`, {
          params: { internId: userInfo.id },
        });
        if (leaveRes.data?.applications) {
          setLeaveCount(leaveRes.data.applications.length);
        } else {
          setLeaveCount(0);
        }
      } catch (error) {
        console.log('Leave count fetch failed, falling back to zero');
        setLeaveCount(0);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      setAttendanceData([]);
      setStats({
        totalHours: '0.0',
        daysPresent: '0',
        attendanceRate: '0',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleAvatarPress = () => {
    if (profilePicture) {
      // If there's a profile picture, show the preview modal
      setShowProfilePreview(true);
    } else {
      // If no picture, directly go to upload
      pickAndUploadProfilePicture();
    }
  };

  const pickAndUploadProfilePicture = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        setUploadingProfile(true);

        try {
          // Get token for auth
          const token = await AsyncStorage.getItem('userToken');

          // Create FormData for upload
          const formData = new FormData();
          formData.append('profilePicture', {
            uri: selectedImage.uri,
            type: 'image/jpeg',
            name: `profile_${userInfo.id}_${Date.now()}.jpg`,
          });

          // Upload to backend
          const uploadUrl = `${API_BASE_URL}/staff/intern/upload-profile-picture`;
          console.log('📸 Uploading profile picture to:', uploadUrl);
          console.log('📸 Intern ID:', userInfo.id);

          const uploadResponse = await axios.post(
            uploadUrl,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`,
              },
              params: {
                internId: userInfo.id,
              },
            }
          );

            if (uploadResponse.data?.profilePicture) {
              const newProfilePicture = uploadResponse.data.profilePicture;
              setProfilePicture(newProfilePicture);
              await AsyncStorage.multiSet([
                [profilePictureKey, newProfilePicture],
                ['internProfilePicture', newProfilePicture],
              ]);
              Alert.alert('Success', 'Profile picture updated successfully!');
            }
        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('Upload Failed', error.response?.data?.error || 'Failed to upload profile picture');
        } finally {
          setUploadingProfile(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHours = (hoursStr) => {
    const totalMinutes = Math.round(parseFloat(hoursStr || '0') * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const getExpectedDays = () => {
    if (stats?.expectedDays !== undefined && stats?.expectedDays !== null) {
      return stats.expectedDays;
    }
    if (selectedPeriod === 'today') return 1;
    if (selectedPeriod === 'weekly') return 5;
    // monthly: count weekdays in current month
    const now = new Date();
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let weekdayCount = 0;
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day >= 1 && day <= 5) {
        weekdayCount += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return weekdayCount;
  };

  const menuItems = [
    { label: 'Overview', route: 'InternDashboard', icon: 'dashboard', params: { userInfo } },
    { label: 'Recents', route: 'Recents', icon: 'history', params: { userInfo } },
    { label: 'Leave Applications', route: 'InternApplications', icon: 'event-note', params: { userInfo } },
    { label: 'Attendance Corrections', route: 'InternAttendanceCorrections', icon: 'schedule', params: { userInfo } },
    { label: 'My Attendance', route: 'InternAttendance', icon: 'access-time', params: { attendanceData, stats, userInfo, selectedPeriod } },
    { label: 'My Caselogs', route: 'InternReports', icon: 'bar-chart', params: { userInfo } },
    { label: 'My Payroll', route: 'InternPayroll', icon: 'attach-money', params: { userInfo } },
    { label: 'Rotation Plan', route: 'InternRotationPlan', icon: 'event', params: { userInfo } },
  ];

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, dynamicStyles.backButton]}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Intern Dashboard Overview</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NotificationBell navigation={navigation} />
          <TouchableOpacity
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={styles.menuButton}
          >
            <Text style={[styles.menuIcon, dynamicStyles.menuIcon]}>
              {sidebarCollapsed ? '☰' : '✕'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {!sidebarCollapsed && (
          <View style={[styles.sidebar, dynamicStyles.sidebar]}>
            {menuItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.sidebarItem,
                    dynamicStyles.sidebarItem,
                    isActive && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive],
                  ]}
                  onPress={() => {
                    navigation.navigate(item.route, item.params);
                    setSidebarCollapsed(true);
                  }}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={isActive ? '#fff' : theme.text}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.sidebarItemText,
                      dynamicStyles.sidebarItemText,
                      isActive && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive],
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.contentArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Welcome Section */}
            <View style={[styles.welcomeCard, dynamicStyles.card]}>
              <View style={styles.welcomeHeader}>
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={handleAvatarPress}
                  disabled={uploadingProfile}
                >
                  {uploadingProfile && (
                    <View style={[styles.avatar, styles.uploadingOverlay]}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  {!uploadingProfile && profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.primary || '#3166AE' }]}>
                      <Text style={styles.avatarText}>
                        {(userInfo.fullName || userInfo.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.uploadBadge}>
                    <Text style={styles.uploadBadgeText}>+</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.welcomeTitle, dynamicStyles.text]}>
                    Welcome, {userInfo.fullName || userInfo.name}
                  </Text>
                  <Text style={[styles.welcomeSubtitle, dynamicStyles.textSecondary]}>
                    {userInfo.department || 'Department'} • {userInfo.company || userInfo.hostCompanyName || 'Company'}
                  </Text>
                  <Text style={[styles.welcomeSubtitle, dynamicStyles.textSecondary]}>
                    Mentor: {userInfo.mentorName || 'Not assigned'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'today' && [styles.periodButtonActive, dynamicStyles.primary],
                ]}
                onPress={() => setSelectedPeriod('today')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'today' && styles.periodButtonTextActive,
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'weekly' && [styles.periodButtonActive, dynamicStyles.primary],
                ]}
                onPress={() => setSelectedPeriod('weekly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'weekly' && styles.periodButtonTextActive,
                  ]}
                >
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'monthly' && [styles.periodButtonActive, dynamicStyles.primary],
                ]}
                onPress={() => setSelectedPeriod('monthly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'monthly' && styles.periodButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary || '#3166AE'} />
                <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>Loading...</Text>
              </View>
            ) : (
              <>
                {/* Stats Cards */}
                {stats && (
                  <View style={styles.statsContainer}>
                    <View style={[styles.statCard, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>
                        {formatHours(stats.totalHours || '0.0')}
                      </Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Hours Worked</Text>
                    </View>
                    <View style={[styles.statCard, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>
                        {(stats.daysPresent || '0') + '/' + getExpectedDays()}
                      </Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Days Present</Text>
                    </View>
                    <View style={[styles.statCard, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>
                        {stats.attendanceRate || '0'}%
                      </Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Attendance Rate</Text>
                    </View>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionCard, dynamicStyles.card]}
                    onPress={() => navigation.navigate('InternReports', { userInfo })}
                  >
                    <Text style={styles.actionIcon}>📋</Text>
                    <Text style={[styles.actionText, dynamicStyles.text]}>My Caselogs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionCard, dynamicStyles.card]}
                    onPress={() => navigation.navigate('InternAttendance', { attendanceData, stats, userInfo, selectedPeriod })}
                  >
                    <Text style={styles.actionIcon}>📊</Text>
                    <Text style={[styles.actionText, dynamicStyles.text]}>My Attendance</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionCard, dynamicStyles.card]}
                    onPress={() => navigation.navigate('InternApplications', { userInfo, focus: 'leave' })}
                  >
                    <View style={styles.actionBadgeContainer}>
                      <Text style={styles.actionIcon}>📄</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{leaveCount}</Text>
                      </View>
                    </View>
                    <Text style={[styles.actionText, dynamicStyles.text]}>MY APPLICATIONS</Text>
                  </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, dynamicStyles.card]}
                onPress={() => navigation.navigate('InternPayroll', { userInfo })}
              >
                    <Text style={styles.actionIcon}>💰</Text>
                    <Text style={[styles.actionText, dynamicStyles.text]}>Payroll</Text>
                  </TouchableOpacity>
                </View>

                {/* Recent Attendance */}
                <View style={[styles.attendanceCard, dynamicStyles.card]}>
                  <View style={styles.attendanceCardHeader}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>Recent Attendance</Text>
                    <TouchableOpacity
                      style={styles.viewAllButtonCompact}
                      onPress={() => navigation.navigate('InternAttendance', { attendanceData, stats, userInfo, selectedPeriod })}
                    >
                      <Text style={styles.viewAllTextCompact}>View All →</Text>
                    </TouchableOpacity>
                  </View>
                  {attendanceData && attendanceData.length > 0 ? (
                    attendanceData.slice(0, 3).map((record, index) => (
                      <View key={index} style={styles.attendanceRowCompact}>
                        <Text style={[styles.dateTextCompact, dynamicStyles.text]}>
                          {formatDate(record.date)}
                        </Text>
                        <Text style={[styles.timeTextCompact, dynamicStyles.textSecondary]}>
                          {formatTime(record.clockIn)} - {formatTime(record.clockOut)}
                        </Text>
                        <Text style={[styles.hoursTextCompact, { color: theme.primary || '#3166AE' }]}>
                          {record.hoursWorked || '0.0'}h
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyTextCompact, dynamicStyles.textSecondary]}>
                      No attendance records yet.
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Profile Picture Preview Modal */}
      <Modal
        visible={showProfilePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfilePreview(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowProfilePreview(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {/* Full profile picture */}
          <Image
            source={{ uri: profilePicture }}
            style={styles.fullProfileImage}
            resizeMode="contain"
          />

          {/* Action buttons */}
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowProfilePreview(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                setShowProfilePreview(false);
                pickAndUploadProfilePicture();
              }}
            >
              <Text style={styles.modalButtonTextPrimary}>Change Picture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.background,
  },
  header: {
    borderBottomColor: theme.border || '#e5e7eb',
  },
  backButton: {
    backgroundColor: theme.buttonSecondary || '#f3f4f6',
  },
  backButtonText: {
    color: theme.primary || '#3166AE',
  },
  headerTitle: {
    color: theme.text,
  },
  menuIcon: {
    color: theme.primary || '#3166AE',
  },
  card: {
    backgroundColor: theme.card || '#ffffff',
    borderColor: theme.border || '#e5e7eb',
  },
  text: {
    color: theme.text,
  },
  textSecondary: {
    color: theme.textSecondary || '#6b7280',
  },
  sidebar: {
    backgroundColor: theme.card || '#ffffff',
    borderRightColor: theme.border || '#e5e7eb',
  },
  sidebarItem: {
    backgroundColor: theme.surface || theme.card || '#ffffff',
  },
  sidebarItemActive: {
    backgroundColor: theme.primary || '#3166AE',
  },
  sidebarItemText: {
    color: theme.text,
  },
  sidebarItemTextActive: {
    color: '#fff',
  },
  primary: {
    backgroundColor: theme.primary || '#3166AE',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#3166AE',
  },
  scrollView: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    maxWidth: '50%',
    borderRightWidth: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    padding: 16,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItemActive: {
    // Active state handled by dynamic styles
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#fff',
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3166AE20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    backgroundColor: '#00000050',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  uploadBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3166AE',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#3166AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  attendanceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attendanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllButtonCompact: {
    backgroundColor: '#3166AE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAllTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  attendanceRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dateTextCompact: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  timeTextCompact: {
    flex: 1.5,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  hoursTextCompact: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyTextCompact: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Profile Preview Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000090',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  fullProfileImage: {
    width: '90%',
    height: '60%',
    borderRadius: 16,
    marginBottom: 30,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '90%',
    paddingHorizontal: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#3166AE',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonTextSecondary: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
});

