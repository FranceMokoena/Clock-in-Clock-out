import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config/api';

function InternReports({ route, navigation }) {
  const { userInfo } = route?.params || {};
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('userToken');

      if (!userInfo?.id) {
        setError('User information not found');
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/intern-reports?internId=${userInfo.id}&userRole=INTERN`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [userInfo?.id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'High': '#d32f2f',
      'Medium': '#f57c00',
      'Low': '#fbc02d',
    };
    return colors[severity] || '#666666';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Submitted': '#2196f3',
      'Reviewed': '#4caf50',
      'Actioned': '#9c27b0',
    };
    return colors[status] || '#666666';
  };

  const dynamicStyles = {
    container: {
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    },
    text: {
      color: theme === 'dark' ? '#ffffff' : '#333333',
    },
    card: {
      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
    },
  };

  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={[styles.loadingText, dynamicStyles.text]}>Loading caselogs...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.card]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Issued Caselogs</Text>
        <View style={{ width: 30 }} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView style={styles.reportsList}>
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, dynamicStyles.text]}>No caselogs found</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report._id} style={[styles.reportCard, dynamicStyles.card]}>
              <View style={styles.reportHeader}>
                <Text style={[styles.reportType, dynamicStyles.text]}>{report.reportType}</Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) }]}>
                  <Text style={styles.severityText}>{report.severity}</Text>
                </View>
              </View>

              <Text style={[styles.reportTitle, dynamicStyles.text]}>{report.title}</Text>
              <Text style={[styles.reportDescription, dynamicStyles.text]}>{report.description}</Text>

              {report.supportingNotes && (
                <View style={styles.notesContainer}>
                  <Text style={[styles.notesLabel, dynamicStyles.text]}>Supporting Notes:</Text>
                  <Text style={[styles.notesText, dynamicStyles.text]}>{report.supportingNotes}</Text>
                </View>
              )}

              <View style={styles.metadataContainer}>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, dynamicStyles.text]}>Incident Date:</Text>
                  <Text style={[styles.metadataValue, dynamicStyles.text]}>{formatDate(report.incidentDate)}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, dynamicStyles.text]}>Host Company:</Text>
                  <Text style={[styles.metadataValue, dynamicStyles.text]}>{report.hostCompanyId?.name || 'N/A'}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, dynamicStyles.text]}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>
                </View>
              </View>

              {report.adminNotes && (
                <View style={styles.adminNotesContainer}>
                  <Text style={[styles.adminNotesLabel, dynamicStyles.text]}>Admin Notes:</Text>
                  <Text style={[styles.adminNotesText, dynamicStyles.text]}>{report.adminNotes}</Text>
                </View>
              )}

              {report.reviewedAt && (
                <View style={styles.reviewContainer}>
                  <Text style={[styles.reviewLabel, dynamicStyles.text]}>Reviewed on: {formatDate(report.reviewedAt)}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  reportsList: {
    flex: 1,
    padding: 12,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reportCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  notesContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metadataContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  metadataValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  adminNotesContainer: {
    backgroundColor: 'rgba(156, 39, 176, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#9c27b0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#9c27b0',
  },
  adminNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4caf50',
  },
});

export default InternReports;
