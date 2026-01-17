import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import MainMenu from './screens/MainMenu';
import RegisterStaff from './screens/RegisterStaff';
import ClockIn from './screens/Shared/ClockIn';
import Recents from './screens/Shared/Recents';
import AdminLogin from './screens/AdminLogin';
import AdminDashboard from './screens/AdminDashboard';
import InternLogin from './screens/Intern/Login';
import InternDashboard from './screens/Intern/Dashboard';
import InternAttendance from './screens/Intern/Attendance';
import InternApplications from './screens/Intern/Applications';
import InternPayroll from './screens/Intern/Payroll';
import InternReports from './screens/Intern/InternReports';
import InternAttendanceCorrections from './screens/Intern/AttendanceCorrections';
import InternRotationPlan from './screens/Intern/RotationPlan';
import UnifiedLogin from './screens/UnifiedLogin';

const Stack = createNativeStackNavigator();

function FaceSplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in quickly, then gently zoom the entire splash card over time
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 6400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, scaleAnim, scanAnim]);

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 40],
  });

  return (
    <View style={styles.splashRoot}>
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.splashCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.splashFaceFrame}>
          <Animated.View
            style={[
              styles.splashScanLine,
              {
                transform: [{ translateY: scanTranslateY }],
              },
            ]}
          />
          <Text style={styles.splashFaceIcon}>👤</Text>
        </View>
        <Text style={styles.splashTitle}>Secure Face Clock In System</Text>
        <Text style={styles.splashSubtitle}>
          Bank-grade face verification for reliable time tracking.
        </Text>
      </Animated.View>
    </View>
  );
}

function AppNavigator() {
  const { theme, isDarkMode } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="MainMenu"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainMenu" component={MainMenu} />
        <Stack.Screen name="RegisterStaff" component={RegisterStaff} />
        <Stack.Screen name="ClockIn" component={ClockIn} />
        <Stack.Screen name="Recents" component={Recents} />
        <Stack.Screen name="AdminLogin" component={AdminLogin} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="InternLogin" component={InternLogin} />
        <Stack.Screen name="InternDashboard" component={InternDashboard} />
        <Stack.Screen name="InternAttendance" component={InternAttendance} />
        <Stack.Screen name="InternApplications" component={InternApplications} />
        <Stack.Screen name="InternPayroll" component={InternPayroll} />
        <Stack.Screen name="InternReports" component={InternReports} />
        <Stack.Screen name="InternAttendanceCorrections" component={InternAttendanceCorrections} />
        <Stack.Screen name="InternRotationPlan" component={InternRotationPlan} />
        <Stack.Screen name="UnifiedLogin" component={UnifiedLogin} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider recipientId={userId} recipientType={userType}>
          {showSplash ? <FaceSplashScreen /> : <AppNavigator />}
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashCard: {
    width: 260,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1d4ed8',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    alignItems: 'center',
  },
  splashFaceFrame: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  splashScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#38bdf8',
    opacity: 0.9,
  },
  splashFaceIcon: {
    fontSize: 40,
    color: '#e5e7eb',
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 6,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
