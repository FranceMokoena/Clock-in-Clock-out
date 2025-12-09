import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Graduation Cap Logo Component
const GraduationCapLogo = () => {
  // Try to load cappp.jpg, fallback to a placeholder if missing
  let imageSource;
  try {
    imageSource = require('../assets/IS_HAT_LOGO.png');
  } catch (error) {
    // Fallback: Use APP-ICON.png if NEW-LOGO.jpeg is missing
    console.warn('⚠️ NEW-LOGO.jpeg not found, using fallback icon');
    imageSource = require('../assets/IS_HAT_LOGO.png');
  }

  return (
    <Image
      source={imageSource}
      style={styles.capImage}
      resizeMode="cover"
    />
  );
};

export default function MainMenu({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const dynamicStyles = getDynamicStyles(theme);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Theme Toggle - Top Left */}
      <TouchableOpacity
        style={[styles.themeButton, dynamicStyles.themeButton]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Text style={[styles.themeIcon, dynamicStyles.themeIcon]}>
          {isDarkMode ? '☀️' : '🌙'}
        </Text>
      </TouchableOpacity>

      {/* Admin Icon - Top Right */}
      <TouchableOpacity
        style={[styles.adminButton, dynamicStyles.adminButton]}
        onPress={() => navigation.navigate('AdminLogin')}
        activeOpacity={0.7}
      >
        <Text style={styles.adminIcon}>+</Text>
      </TouchableOpacity>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <GraduationCapLogo />
          </View>
          <View style={styles.textHeader}>
            <View style={styles.titleBar}>
              <Text style={styles.titleText}>INTERNSHIP SUCCESS</Text>
            </View>
            <Text style={styles.tagline}>
              Professional Recruitment, Placement, Management
            </Text>
            <Text style={styles.benefitHighlight}>
              Benefit from a Structured Internship Program
            </Text>
            <Text style={styles.subtitle}>
              CLOCK-IN / CLOCK-OUT SYSTEM
            </Text>
          </View>
        </View>

        {/* Main Actions Section - 2x2 Grid */}
        <View style={styles.actionsContainer}>
          <View style={styles.buttonGrid}>
            {/* Clock In Button */}
            <TouchableOpacity
              style={[styles.gridButton, dynamicStyles.gridButton]}
              onPress={() => navigation.navigate('ClockIn', { clockType: 'in' })}
              activeOpacity={0.8}
            >
              <Text style={styles.gridButtonIcon}>🕐</Text>
              <Text style={[styles.gridButtonText, dynamicStyles.gridButtonText]}>Clock In</Text>
            </TouchableOpacity>

            {/* Clock Out Button */}
            <TouchableOpacity
              style={[styles.gridButton, dynamicStyles.gridButton]}
              onPress={() => navigation.navigate('ClockIn', { clockType: 'out' })}
              activeOpacity={0.8}
            >
              <Text style={styles.gridButtonIcon}>🕐</Text>
              <Text style={[styles.gridButtonText, dynamicStyles.gridButtonText]}>Clock Out</Text>
            </TouchableOpacity>

            {/* Start Break Button */}
            <TouchableOpacity
              style={[styles.gridButton, dynamicStyles.gridButton]}
              onPress={() => navigation.navigate('ClockIn', { clockType: 'break_start' })}
              activeOpacity={0.8}
            >
              <Text style={styles.gridButtonIcon}>☕</Text>
              <Text style={[styles.gridButtonText, dynamicStyles.gridButtonText]}>Start Break</Text>
            </TouchableOpacity>

            {/* End Break Button */}
            <TouchableOpacity
              style={[styles.gridButton, dynamicStyles.gridButton]}
              onPress={() => navigation.navigate('ClockIn', { clockType: 'break_end' })}
              activeOpacity={0.8}
            >
              <Text style={styles.gridButtonIcon}>☕</Text>
              <Text style={[styles.gridButtonText, dynamicStyles.gridButtonText]}>End Break</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, dynamicStyles.footerText]}>Secure • Fast • Reliable</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Dynamic styles based on theme
const getDynamicStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.background,
  },
  themeIcon: {
    color: theme.buttonText,
  },
  gridButton: {
    backgroundColor: theme.gridButton,
  },
  gridButtonText: {
    color: theme.gridButtonText,
  },
  footerText: {
    color: theme.text,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 2,
    paddingBottom: 1,
    paddingTop: -100,
  },
  themeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: '#3166AE',
  },
  themeIcon: {
    fontSize: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
    paddingTop: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: 100,
  },
  textHeader: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  titleBar: {
    width: '100%',
    backgroundColor: '#3166AE',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
    textAlign: 'center',
    color: '#ffffff',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
    color: '#94a3b8',
  },
  benefitHighlight: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 4,
    backgroundColor: '#3166AE',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  capImage: {
    width: 300,
    height: 250,
  },
  adminButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3166AE',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  adminIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
    lineHeight: 28,
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: -10,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: -10,
    PaddingVertical: 10,
  },
  gridButton: {
    width: (width - 60) / 2,
    aspectRatio: 1,
    backgroundColor: '#374151',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gridButtonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  gridButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 10,
  },
  footerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
