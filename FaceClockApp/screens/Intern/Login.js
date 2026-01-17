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
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { getDeviceHeaders } from '../../utils/deviceInfo';

export default function InternLogin({ navigation }) {
  const { theme } = useTheme();
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState({ title: '', message: '', type: 'info' });
  const dynamicStyles = getDynamicStyles(theme);

  // Show professional message modal
  const showProfessionalMessage = (title, message, type = 'error') => {
    setMessageModalData({ title, message, type });
    setShowMessageModal(true);
  };

  const handleLogin = async () => {
    if (!idNumber.trim() || !password.trim()) {
      showProfessionalMessage(
        'Credentials Required',
        'Please enter both ID number and password to continue.',
        'warning'
      );
      return;
    }

    setLoading(true);
    try {
      // For test accounts (intern1/intern123), allow password-only login
      // For production, this would require face recognition
      const formData = new FormData();
      formData.append('idNumber', idNumber.trim());
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
      });
      
      if (response.data && response.data.success) {
        // Store user info and navigate to dashboard
        const userInfo = response.data.user;
        navigation.navigate('InternDashboard', { userInfo });
      } else {
        showProfessionalMessage(
          'Authentication Failed',
          response.data?.error || 'Invalid ID number or password. Please check your credentials and try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to login. Please try again.';
      showProfessionalMessage(
        'Login Error',
        errorMessage,
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
          {/* Professional Header */}
          <View style={[styles.header, dynamicStyles.header]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, dynamicStyles.backButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Intern Portal</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Professional Login Form */}
          <View style={[styles.formContainer, dynamicStyles.formContainer]}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, dynamicStyles.logoCircle]}>
                <MaterialIcons name="person" size={42} color="#3166AE" />
              </View>
            </View>
            
            <Text style={[styles.formTitle, dynamicStyles.formTitle]}>Intern Login</Text>
            <Text style={[styles.formSubtitle, dynamicStyles.formSubtitle]}>
              Enter your ID number and password to access your dashboard
            </Text>

            {/* ID Number Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>ID Number</Text>
              <View style={[styles.inputWrapper, dynamicStyles.inputWrapper]}>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="Enter your ID number (e.g., intern1)"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  value={idNumber}
                  onChangeText={setIdNumber}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input with Show/Hide Toggle */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
              <View style={[styles.inputWrapper, dynamicStyles.inputWrapper]}>
                <TextInput
                  style={[styles.input, dynamicStyles.input, styles.passwordInput]}
                  placeholder="Enter your password (e.g., intern123)"
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
                  <Text style={styles.eyeIcon}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                dynamicStyles.loginButton,
                (!idNumber.trim() || !password.trim() || loading) && [styles.loginButtonDisabled, dynamicStyles.loginButtonDisabled],
              ]}
              onPress={handleLogin}
              disabled={!idNumber.trim() || !password.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.loginButtonText}>Authenticating...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.securityNote, dynamicStyles.securityNote]}>
              <Text style={[styles.securityText, dynamicStyles.securityText]}>
                Test credentials: intern1 / intern123
              </Text>
            </View>
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
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  formSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 44,
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    elevation: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 8,
    marginRight: 8,
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
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  securityNote: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  securityText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    color: '#6b7280',
  },
  // Professional Message Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  messageIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  messageIconError: {
    backgroundColor: '#fee2e2',
  },
  messageIconWarning: {
    backgroundColor: '#fef3c7',
  },
  messageIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ED3438',
  },
  messageModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  messageModalText: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  messageModalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
