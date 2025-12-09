import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme colors
export const lightTheme = {
  mode: 'light',
  // Backgrounds
  background: '#ffffff',
  surface: '#f8f9fa',
  card: '#ffffff',
  // Text
  text: '#1a1a1a',
  textSecondary: '#4a5568',
  textTertiary: '#718096',
  // Primary colors
  primary: '#3166AE',
  primaryLight: '#4C7FBE',
  primaryDark: '#254E8C',
  // Buttons
  button: '#3166AE',
  buttonText: '#ffffff',
  buttonSecondary: '#e2e8f0',
  buttonSecondaryText: '#2d3748',
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  // Status
  success: '#10b981',
  error: '#ED3438',
  warning: '#f59e0b',
  // Shadows
  shadow: '#000000',
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  // Camera overlay
  cameraOverlay: 'rgba(0, 0, 0, 0.6)',
  // Input
  inputBackground: '#f7fafc',
  inputBorder: '#e2e8f0',
  inputText: '#2d3748',
  // Grid buttons
  gridButton: '#374151',
  gridButtonText: '#ffffff',
};

export const darkTheme = {
  mode: 'dark',
  // Backgrounds
  background: '#000000',
  surface: '#111827',
  card: '#1f2937',
  // Text
  text: '#ffffff',
  textSecondary: '#d1d5db',
  textTertiary: '#9ca3af',
  // Primary colors
  primary: '#3166AE',
  primaryLight: '#4C7FBE',
  primaryDark: '#254E8C',
  // Buttons
  button: '#3166AE',
  buttonText: '#ffffff',
  buttonSecondary: '#374151',
  buttonSecondaryText: '#ffffff',
  // Borders
  border: '#374151',
  borderLight: '#4b5563',
  // Status
  success: '#10b981',
  error: '#ED3438',
  warning: '#f59e0b',
  // Shadows
  shadow: '#000000',
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  // Camera overlay
  cameraOverlay: 'rgba(0, 0, 0, 0.6)',
  // Input
  inputBackground: '#1f2937',
  inputBorder: '#374151',
  inputText: '#ffffff',
  // Grid buttons
  gridButton: '#374151',
  gridButtonText: '#ffffff',
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

