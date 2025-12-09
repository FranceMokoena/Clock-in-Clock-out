/**
 * 🏦 BANK-GRADE Professional Real-Time Feedback System
 * Modern, professional feedback UI based on actual backend validation
 * No assumptions, no faking - only real data from backend analysis
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Professional feedback component with live metrics
 * Displays real-time analysis from backend validation
 */
export function ProfessionalFeedback({ 
  feedback,
  metadata = {},
  quality = 0,
  isReady = false,
  issues = [],
  theme
}) {
  // Extract metrics from metadata
  const faceSize = metadata.faceSize || 0;
  const faceCount = metadata.faceCount || 0;
  const angle = metadata.angle || 0;
  const distance = metadata.distance || 'unknown';
  const size = metadata.size || 'unknown';

  // Determine status and colors based on actual backend response
  const getStatusInfo = () => {
    if (issues.length > 0) {
      // Check for critical issues first
      if (issues.includes('multiple_faces')) {
        return {
          status: 'error',
          color: '#ED3438', // Red
          icon: '⚠️',
          bgColor: '#fef2f2',
          borderColor: '#fecaca',
        };
      }
      if (issues.includes('no_face') || faceCount === 0) {
        return {
          status: 'searching',
          color: '#fbbf24', // Amber
          icon: '👤',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
        };
      }
      if (issues.includes('too_small') || issues.includes('too_far')) {
        return {
          status: 'adjusting',
          color: '#f59e0b', // Orange
          icon: '📏',
          bgColor: '#fff7ed',
          borderColor: '#fed7aa',
        };
      }
      if (issues.includes('too_large') || issues.includes('too_close')) {
        return {
          status: 'adjusting',
          color: '#f59e0b',
          icon: '📏',
          bgColor: '#fff7ed',
          borderColor: '#fed7aa',
        };
      }
      if (issues.includes('angle_too_tilted') || Math.abs(angle) > 10) {
        return {
          status: 'adjusting',
          color: '#f59e0b',
          icon: '👀',
          bgColor: '#fff7ed',
          borderColor: '#fed7aa',
        };
      }
      // Generic issue
      return {
        status: 'adjusting',
        color: '#f59e0b',
        icon: '⚙️',
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
      };
    }

    // No issues - check quality
    if (isReady && quality >= 85) {
      return {
        status: 'ready',
        color: '#10b981', // Green
        icon: '✓',
        bgColor: '#ecfdf5',
        borderColor: '#86efac',
      };
    }
    if (quality >= 70) {
      return {
        status: 'good',
        color: '#3b82f6', // Blue
        icon: '✓',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
      };
    }
    if (quality >= 50) {
      return {
        status: 'improving',
        color: '#8b5cf6', // Purple
        icon: '↑',
        bgColor: '#faf5ff',
        borderColor: '#c4b5fd',
      };
    }

    // Default searching state
    return {
      status: 'searching',
      color: '#fbbf24',
      icon: '👤',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: statusInfo.bgColor,
        borderColor: statusInfo.borderColor,
      }
    ]}>
      {/* Main Status Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: statusInfo.color + '20' }]}>
          <Text style={[styles.icon, { color: statusInfo.color }]}>
            {statusInfo.icon}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {feedback || 'Position your face in the circle'}
          </Text>
          {isReady && (
            <Text style={[styles.readyText, { color: statusInfo.color }]}>
              Ready to capture
            </Text>
          )}
        </View>
      </View>

      {/* Live Metrics - Only show if we have data */}
      {(faceCount > 0 || quality > 0) && (
        <View style={styles.metricsContainer}>
          {/* Quality Score */}
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Quality</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { 
                width: `${quality}%`,
                backgroundColor: quality >= 85 ? '#10b981' : 
                                quality >= 70 ? '#3b82f6' : 
                                quality >= 50 ? '#8b5cf6' : '#f59e0b'
              }]} />
            </View>
            <Text style={[styles.metricValue, { color: statusInfo.color }]}>
              {quality.toFixed(0)}%
            </Text>
          </View>

          {/* Face Size */}
          {faceSize > 0 && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Face Size</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.min(100, (faceSize / 1500) * 100)}%`,
                  backgroundColor: faceSize >= 150 && faceSize <= 2000 ? '#10b981' : '#f59e0b'
                }]} />
              </View>
              <Text style={[styles.metricValue, { color: statusInfo.color }]}>
                {faceSize.toFixed(0)}px
              </Text>
            </View>
          )}

          {/* Face Angle */}
          {Math.abs(angle) > 0 && (
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Angle</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.max(0, 100 - (Math.abs(angle) / 15) * 100)}%`,
                  backgroundColor: Math.abs(angle) <= 10 ? '#10b981' : '#f59e0b'
                }]} />
              </View>
              <Text style={[styles.metricValue, { color: statusInfo.color }]}>
                {Math.abs(angle).toFixed(1)}°
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Issues List - Show specific issues */}
      {issues.length > 0 && !isReady && (
        <View style={styles.issuesContainer}>
          {issues.map((issue, index) => (
            <View key={index} style={styles.issueItem}>
              <Text style={[styles.issueIcon, { color: statusInfo.color }]}>•</Text>
              <Text style={[styles.issueText, { color: statusInfo.color }]}>
                {getIssueMessage(issue)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Get user-friendly message for specific issue
 */
function getIssueMessage(issue) {
  const messages = {
    'no_face': 'No face detected in frame',
    'multiple_faces': 'Multiple faces detected - only one person allowed',
    'too_small': 'Face too small - move closer',
    'too_large': 'Face too large - move further away',
    'too_far': 'Too far from camera - move closer',
    'too_close': 'Too close to camera - step back',
    'angle_too_tilted': 'Face angle too tilted - look straight',
    'low_quality': 'Image quality too low - improve lighting',
    'blur': 'Image too blurry - hold still',
    'brightness': 'Lighting issue - adjust brightness',
  };
  return messages[issue] || issue;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  metricsContainer: {
    marginTop: 8,
  },
  metric: {
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  issuesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  issueIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  issueText: {
    fontSize: 13,
    flex: 1,
  },
});

