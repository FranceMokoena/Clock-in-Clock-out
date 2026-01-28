import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { getDeviceHeaders } from '../utils/deviceInfo';
import { ensureNotificationConnection } from '../utils/notificationHandler';

export default function UnifiedLogin({ navigation }) {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState({ title: '', message: '', type: 'info' });
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const dynamicStyles = getDynamicStyles(theme);

  // Show professional message modal
  const showProfessionalMessage = (title, message, type = 'error') => {
    setMessageModalData({ title, message, type });
    setShowMessageModal(true);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showProfessionalMessage(
        'Credentials Required',
        'Please enter both username/ID and password to continue.',
        'warning'
      );
      return;
    }

    setLoading(true);
    try {
      // First, try Admin/Host Company login
      try {
        const response = await axios.post(`${API_BASE_URL}/staff/login`, {
          username: username.trim(),
          password: password
        });
        
        if (response.data && response.data.success) {
          const userInfo = response.data.user;
          await ensureNotificationConnection(userInfo.id, userInfo.type || userInfo.role, API_BASE_URL);
          
          // Route based on user type
          if (userInfo.type === 'admin') {
            navigation.navigate('AdminDashboard', { userInfo });
          } else if (userInfo.type === 'hostCompany') {
            // TODO: Navigate to HostCompanyDashboard when it's created
            // For now, navigate to AdminDashboard
            navigation.navigate('AdminDashboard', { userInfo });
          } else {
            navigation.navigate('AdminDashboard', { userInfo });
          }
          setLoading(false);
          return;
        }
      } catch (adminError) {
        // If admin/host company login fails (404 or 401), try intern login
        const status = adminError.response?.status;
        if (status === 404) {
          console.log('Admin/Host login endpoint not found (404), trying intern login...');
        } else if (status === 401) {
          console.log('Admin/Host login failed (401), trying intern login...');
        } else {
          console.log('Admin/Host login error:', adminError.message);
        }
      }

      // Try Intern login
      try {
        const formData = new FormData();
        formData.append('idNumber', username.trim());
        formData.append('password', password);

        const deviceHeaders = await getDeviceHeaders();

        const response = await axios.post(`${API_BASE_URL}/staff/intern/login`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-device-useragent': deviceHeaders.userAgent,
            'x-device-platform': deviceHeaders.platform,
            'x-device-language': deviceHeaders.language,
            'x-device-timezone': deviceHeaders.timezone,
            'x-device-id': deviceHeaders.deviceId,
            'x-device-info': deviceHeaders.deviceInfo,
            'x-device-hash': deviceHeaders.deviceHash,
          },
          timeout: 10000, // 10 second timeout
        });
        
        if (response.data && response.data.success) {
          const userInfo = response.data.user;
          await ensureNotificationConnection(userInfo.id, userInfo.type || userInfo.role, API_BASE_URL);
          navigation.navigate('InternDashboard', { userInfo });
          setLoading(false);
          return;
        } else {
          showProfessionalMessage(
            'Authentication Failed',
            response.data?.error || 'Invalid credentials. Please check your username/ID and password.',
            'error'
          );
        }
      } catch (internError) {
        console.error('Intern login error:', internError);
        const status = internError.response?.status;
        const errorData = internError.response?.data;
        
        if (status === 404) {
          showProfessionalMessage(
            'Endpoint Not Found',
            'The login endpoint is not available. Please check if the backend server is running.',
            'error'
          );
        } else if (status === 401) {
          showProfessionalMessage(
            'Authentication Failed',
            errorData?.error || 'Invalid ID number or password. Please check your credentials.',
            'error'
          );
        } else if (internError.code === 'ECONNABORTED' || internError.message === 'Network Error') {
          showProfessionalMessage(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.',
            'error'
          );
        } else {
          showProfessionalMessage(
            'Login Error',
            errorData?.error || internError.message || 'Failed to login. Please try again.',
            'error'
          );
        }
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      showProfessionalMessage(
        'Login Error',
        error.response?.data?.error || error.message || 'An unexpected error occurred. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Government-Style Header */}
          <View style={[styles.header, dynamicStyles.header]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, dynamicStyles.backButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={theme.primary || '#3166AE'} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>SECURE LOGIN</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Government-Style Login Form */}
          <View style={[styles.formContainer, dynamicStyles.formContainer]}>
            {/* Security Badge */}
            

            {/* Logo Section - Government Style */}
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, dynamicStyles.logoCircle]}>
                <MaterialIcons name="lock" size={48} color="#3166AE" />
              </View>
              <View style={[styles.logoUnderline, dynamicStyles.logoUnderline]} />
            </View>
            
            <Text style={[styles.formTitle, dynamicStyles.formTitle]}>Internship Success</Text>
            <Text style={[styles.formSubtitle, dynamicStyles.formSubtitle]}>
              Access your official employee dashboard
            </Text>

            {/* Divider */}
            <View style={[styles.divider, dynamicStyles.divider]} />

            {/* Username/ID Input */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="person" size={16} color="#3166AE" />
                <Text style={[styles.label, dynamicStyles.label]}>Username or ID Number</Text>
              </View>
              <View style={[styles.inputWrapper, dynamicStyles.inputWrapper]}>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="Enter username or ID number"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input with Show/Hide Toggle */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="lock" size={16} color="#3166AE" />
                <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
              </View>
              <View style={[styles.inputWrapper, dynamicStyles.inputWrapper]}>
                <TextInput
                  style={[styles.input, dynamicStyles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={18} 
                    color="#3166AE" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                dynamicStyles.loginButton,
                (!username.trim() || !password.trim() || loading) && [styles.loginButtonDisabled, dynamicStyles.loginButtonDisabled],
              ]}
              onPress={handleLogin}
              disabled={!username.trim() || !password.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.loginButtonText}>AUTHENTICATING</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>SIGN IN</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Help Link - Forgot Password Information */}
            <TouchableOpacity
              onPress={() => setShowForgotPasswordModal(true)}
              style={styles.helpLink}
              activeOpacity={0.6}
            >
              <MaterialIcons name="help" size={14} color="#3166AE" style={{marginRight: 4}} />
              <Text style={[styles.helpLinkText, dynamicStyles.helpLinkText]}>Forgot Password?</Text>
            </TouchableOpacity>

           
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Professional Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.messageModalContent, dynamicStyles.messageModalContent]}>
            <View style={[
              styles.messageIconContainer,
              messageModalData.type === 'error' && styles.messageIconError,
              messageModalData.type === 'warning' && styles.messageIconWarning,
            ]}>
              <Text style={styles.messageIcon}>
                {messageModalData.type === 'error' ? '✕' : '⚠'}
              </Text>
            </View>
            
            <Text style={[styles.messageModalTitle, dynamicStyles.messageModalTitle]}>
              {messageModalData.title}
            </Text>
            
            <Text style={[styles.messageModalText, dynamicStyles.messageModalText]}>
              {messageModalData.message}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.messageModalButton,
                dynamicStyles.messageModalButton,
                messageModalData.type === 'error' && styles.messageModalButtonError,
                messageModalData.type === 'warning' && styles.messageModalButtonWarning,
              ]}
              onPress={() => setShowMessageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.messageModalButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Help Modal - Professional Government Style */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={[styles.forgotPasswordOverlay, dynamicStyles.forgotPasswordOverlay]}>
          <View style={[styles.forgotPasswordModal, dynamicStyles.forgotPasswordModal]}>
            {/* Header */}
            <View style={[styles.forgotPasswordHeader, dynamicStyles.forgotPasswordHeader]}>
              <TouchableOpacity
                onPress={() => setShowForgotPasswordModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={28} color="#3166AE" />
              </TouchableOpacity>
              <Text style={[styles.forgotPasswordTitle, dynamicStyles.forgotPasswordTitle]}>PASSWORD RECOVERY</Text>
              <View style={styles.headerPlaceholder} />
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.forgotPasswordContent} showsVerticalScrollIndicator={false}>
              {/* Info Section */}
              <View style={[styles.forgotPasswordInfoBox, dynamicStyles.forgotPasswordInfoBox]}>
                <View style={[styles.infoIconContainer, dynamicStyles.infoIconContainer]}>
                  <MaterialIcons name="info" size={28} color="#3166AE" />
                </View>
                <Text style={[styles.forgotPasswordInfoTitle, dynamicStyles.forgotPasswordInfoTitle]}>
                  Password Reset Assistance
                </Text>
                <Text style={[styles.forgotPasswordInfoText, dynamicStyles.forgotPasswordInfoText]}>
                  If you have forgotten your password, please contact the appropriate support team for your account type.
                </Text>
              </View>

              {/* Divider */}
              <View style={[styles.forgotPasswordDivider, dynamicStyles.forgotPasswordDivider]} />

              {/* Support Options */}
              <Text style={[styles.supportOptionsTitle, dynamicStyles.supportOptionsTitle]}>CONTACT SUPPORT</Text>

              {/* Intern Option */}
              <View style={[styles.supportOption, dynamicStyles.supportOption]}>
                <View style={[styles.supportOptionIconBox, dynamicStyles.supportOptionIconBox]}>
                  <MaterialIcons name="person" size={24} color="#3166AE" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={[styles.supportOptionTitle, dynamicStyles.supportOptionTitle]}>Interns</Text>
                  <Text style={[styles.supportOptionText, dynamicStyles.supportOptionText]}>
                    Contact your host employer directly for password assistance.
                  </Text>
                </View>
              </View>

              {/* Host Employer Option */}
              <View style={[styles.supportOption, dynamicStyles.supportOption]}>
                <View style={[styles.supportOptionIconBox, dynamicStyles.supportOptionIconBox]}>
                  <MaterialIcons name="business" size={24} color="#3166AE" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={[styles.supportOptionTitle, dynamicStyles.supportOptionTitle]}>Host Employers</Text>
                  <Text style={[styles.supportOptionText, dynamicStyles.supportOptionText]}>
                    Contact the Internship Success System Administrator for account recovery.
                  </Text>
                </View>
              </View>

              {/* Admin Option */}
              <View style={[styles.supportOption, dynamicStyles.supportOption]}>
                <View style={[styles.supportOptionIconBox, dynamicStyles.supportOptionIconBox]}>
                  <MaterialIcons name="admin-panel-settings" size={24} color="#3166AE" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={[styles.supportOptionTitle, dynamicStyles.supportOptionTitle]}>System Administrators</Text>
                  <Text style={[styles.supportOptionText, dynamicStyles.supportOptionText]}>
                    Contact your IT System Support for password reset procedures.
                  </Text>
                </View>
              </View>

              {/* Security Notice */}
              <View style={[styles.securityNoticeBox, dynamicStyles.securityNoticeBox]}>
                <MaterialIcons name="security" size={20} color="#3166AE" />
                <Text style={[styles.securityNoticeText, dynamicStyles.securityNoticeText]}>
                  This is a secure intership success portal. Never share your password or credentials with anyone.
                </Text>
              </View>
            </ScrollView>

            {/* Footer Button */}
            <TouchableOpacity
              style={[styles.closeForgotPasswordButton, dynamicStyles.closeForgotPasswordButton]}
              onPress={() => setShowForgotPasswordModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeForgotPasswordButtonText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Dynamic styles based on theme
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
  formContainer: {
    backgroundColor: theme.card || '#ffffff',
  },
  formTitle: {
    color: theme.text,
  },
  formSubtitle: {
    color: theme.textSecondary || '#6b7280',
  },
  label: {
    color: theme.text,
  },
  inputWrapper: {
    backgroundColor: theme.inputBackground || '#f9fafb',
    borderColor: theme.inputBorder || '#e5e7eb',
  },
  input: {
    color: theme.inputText || theme.text,
  },
  loginButton: {
    backgroundColor: theme.primary || '#3166AE',
  },
  loginButtonDisabled: {
    backgroundColor: theme.buttonSecondary || '#9ca3af',
    opacity: 0.6,
  },
  helpLinkText: {
    color: theme.primary || '#3166AE',
  },
  securityNote: {
    backgroundColor: theme.buttonSecondary || '#f3f4f6',
  },
  securityText: {
    color: theme.textSecondary || '#6b7280',
  },
  backButtonText: {
    color: theme.primary || '#3166AE',
  },
  headerTitle: {
    color: theme.text,
  },
  logoCircle: {
    backgroundColor: (theme.primary || '#3166AE') + '15',
  },
  logoUnderline: {
    backgroundColor: theme.primary || '#3166AE',
  },
  securityBadge: {
    backgroundColor: (theme.primary || '#3166AE') + '10',
    borderColor: theme.primary || '#3166AE',
  },
  securityBadgeText: {
    color: theme.primary || '#3166AE',
  },
  divider: {
    backgroundColor: theme.border || '#e5e7eb',
  },
  footerInfo: {
    backgroundColor: theme.buttonSecondary || '#f3f4f6',
  },
  footerText: {
    color: theme.textSecondary || '#6b7280',
  },
  modalOverlay: {
    backgroundColor: theme.overlay || 'rgba(0, 0, 0, 0.5)',
  },
  messageModalContent: {
    backgroundColor: theme.card || '#fff',
    shadowColor: theme.shadow || '#000',
  },
  messageModalTitle: {
    color: theme.text,
  },
  messageModalText: {
    color: theme.textSecondary || '#4a5568',
  },
  messageModalButton: {
    backgroundColor: theme.primary || '#3166AE',
  },
  messageModalButtonError: {
    backgroundColor: '#ED3438',
  },
  messageModalButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  forgotPasswordOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  forgotPasswordModal: {
    backgroundColor: theme.card || '#fff',
  },
  forgotPasswordHeader: {
    backgroundColor: '#f8f9fa',
    borderBottomColor: theme.border || '#e5e7eb',
  },
  forgotPasswordTitle: {
    color: theme.text,
  },
  forgotPasswordInfoBox: {
    backgroundColor: (theme.primary || '#3166AE') + '10',
  },
  forgotPasswordInfoTitle: {
    color: theme.text,
  },
  forgotPasswordInfoText: {
    color: theme.textSecondary || '#6b7280',
  },
  forgotPasswordDivider: {
    backgroundColor: theme.border || '#e5e7eb',
  },
  supportOptionsTitle: {
    color: theme.text,
  },
  supportOption: {
    backgroundColor: theme.buttonSecondary || '#f9fafb',
  },
  supportOptionIconBox: {
    backgroundColor: (theme.primary || '#3166AE') + '15',
  },
  supportOptionTitle: {
    color: theme.text,
  },
  supportOptionText: {
    color: theme.textSecondary || '#6b7280',
  },
  securityNoticeBox: {
    backgroundColor: '#fff3cd',
  },
  securityNoticeText: {
    color: '#856404',
  },
  closeForgotPasswordButton: {
    backgroundColor: theme.primary || '#3166AE',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    width: 44,
    height: 44,
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#1a1a1a',
  },
  placeholder: {
    width: 44,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  // Security Badge
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3166AE',
    backgroundColor: '#3166AE10',
    marginBottom: 20,
    alignSelf: 'center',
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3166AE',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3166AE15',
    borderWidth: 2.5,
    borderColor: '#3166AE',
    marginBottom: 12,
  },
  logoUnderline: {
    width: 40,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#3166AE',
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    color: '#1a1a1a',
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
    fontWeight: '400',
    paddingHorizontal: 8,
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#e5e7eb',
    marginBottom: 28,
    marginHorizontal: 0,
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#374151',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.3,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  loginButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Help Link Styles
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  helpLinkText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#3166AE',
    textDecorationLine: 'underline',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
    gap: 10,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#6b7280',
    flex: 1,
  },
  // Footer Info
  footerInfo: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Forgot Password Modal Styles
  forgotPasswordOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  forgotPasswordModal: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  forgotPasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  forgotPasswordTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 28,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  forgotPasswordContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 20,
  },
  // Info Box
  forgotPasswordInfoBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#3166AE10',
    borderWidth: 1.5,
    borderColor: '#3166AE30',
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3166AE20',
    marginBottom: 12,
  },
  forgotPasswordInfoTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
    color: '#1a1a1a',
  },
  forgotPasswordInfoText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.2,
    color: '#6b7280',
  },
  // Divider
  forgotPasswordDivider: {
    height: 1.5,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  // Support Options Title
  supportOptionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  // Support Options
  supportOption: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    gap: 12,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  supportOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3166AE15',
  },
  supportOptionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  supportOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  supportOptionText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    letterSpacing: 0.2,
    color: '#6b7280',
  },
  // Security Notice
  securityNoticeBox: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fffbec',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: 0.2,
    color: '#92400e',
  },
  // Close Button
  closeForgotPasswordButton: {
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#3166AE',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  closeForgotPasswordButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Professional Message Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '88%',
    maxWidth: 420,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  messageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  messageIconError: {
    backgroundColor: '#fee2e2',
  },
  messageIconWarning: {
    backgroundColor: '#fef3c7',
  },
  messageIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ED3438',
  },
  messageModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  messageModalText: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  messageModalButton: {
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  messageModalButtonError: {
    backgroundColor: '#ED3438',
  },
  messageModalButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  messageModalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

