/**
 * 🏦 BANK-GRADE Quality Indicator
 * Live circular progress indicator showing real-time quality score
 * Based on actual backend validation results
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Circular quality indicator with animated progress
 */
export function QualityIndicator({ quality = 0, size = 80, theme }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate to current quality value
    Animated.timing(animatedValue, {
      toValue: quality,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [quality]);

  const circumference = 2 * Math.PI * (size / 2 - 5);
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Get color based on quality
  const getColor = () => {
    if (quality >= 85) return '#10b981'; // Green
    if (quality >= 70) return '#3b82f6'; // Blue
    if (quality >= 50) return '#8b5cf6'; // Purple
    return '#f59e0b'; // Orange
  };

  const color = getColor();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#e5e7eb',
          },
        ]}
      />
      
      {/* Animated progress - Simplified version for React Native */}
      <View
        style={[
          styles.progressCircle,
          {
            width: size - 10,
            height: size - 10,
            borderRadius: (size - 10) / 2,
            borderColor: color,
            borderWidth: 4,
            borderTopColor: quality >= 100 ? color : 'transparent',
            borderRightColor: quality >= 75 ? color : 'transparent',
            borderBottomColor: quality >= 50 ? color : 'transparent',
            borderLeftColor: quality >= 25 ? color : 'transparent',
            transform: [{ rotate: `${(quality / 100) * 360}deg` }],
          },
        ]}
      />

      {/* Center text */}
      <View style={styles.center}>
        <Text style={[styles.qualityText, { color, fontSize: size * 0.2 }]}>
          {quality.toFixed(0)}
        </Text>
        <Text style={[styles.percentText, { fontSize: size * 0.1 }]}>%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderWidth: 4,
  },
  progressCircle: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  qualityText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  percentText: {
    color: '#6b7280',
    fontWeight: '500',
  },
});

