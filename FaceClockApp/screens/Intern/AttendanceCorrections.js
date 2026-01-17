import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function AttendanceCorrections({ navigation }) {
  const { theme } = useTheme();
  const dynamicStyles = getDynamicStyles(theme);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, dynamicStyles.backButton]}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Attendance Corrections</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, dynamicStyles.text]}>Coming Soon</Text>
        <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
          We will work it out.
        </Text>
      </View>
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
  text: {
    color: theme.text,
  },
  textSecondary: {
    color: theme.textSecondary || '#6b7280',
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
