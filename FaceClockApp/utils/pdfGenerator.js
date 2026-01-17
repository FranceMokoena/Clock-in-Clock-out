/**
 * 📄 PDF Generator Utility for React Native
 * 
 * Generates PDFs for dashboard exports
 * Uses expo-print for native PDF generation
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Generate Dashboard PDF - Captures ALL dashboard data
 * Includes pie charts, stat cards, and all metrics
 * NO CUSTOM DESIGN - Just dashboard data in PDF format
 */
export const generateDashboardPDF = async (stats, userName = 'Admin') => {
  try {
    // Prepare pie chart data
    const attendancePieData = [
      { label: 'Present', value: stats.currentlyIn || 0, color: '#4CAF50' },
      { label: 'Absent', value: Math.max(0, (stats.totalStaff || 0) - (stats.currentlyIn || 0)), color: '#F44336' },
    ];
    
    const statusPieData = [
      { label: 'On Time', value: Math.max(0, (stats.clockInsToday || 0) - (stats.lateArrivals || 0)), color: '#2196F3' },
      { label: 'Late', value: stats.lateArrivals || 0, color: '#FF9800' },
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
              padding: 20px;
              color: #1f2937;
              font-size: 12px;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 3px solid #3166AE;
              padding-bottom: 15px;
            }
            
            .header h1 {
              color: #3166AE;
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            
            .header p {
              color: #6b7280;
              margin: 5px 0 0 0;
              font-size: 11px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #3166AE;
              margin-top: 20px;
              margin-bottom: 12px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            
            .charts-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .chart-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              background: #f9fafb;
            }
            
            .chart-title {
              font-size: 13px;
              font-weight: 600;
              color: #3166AE;
              margin-bottom: 12px;
              text-align: center;
            }
            
            .pie-chart {
              width: 100%;
              height: 150px;
              margin-bottom: 12px;
              background: white;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .chart-legend {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            
            .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 11px;
            }
            
            .legend-color {
              width: 16px;
              height: 16px;
              border-radius: 2px;
              flex-shrink: 0;
            }
            
            .stats-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            
            .stat-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background: #f9fafb;
            }
            
            .stat-card-top {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 8px;
            }
            
            .stat-icon-container {
              width: 40px;
              height: 40px;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              flex-shrink: 0;
            }
            
            .stat-value {
              font-size: 24px;
              font-weight: 700;
              color: #3166AE;
            }
            
            .stat-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 500;
            }
            
            .late-arrivals-section {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background: #FFF5F5;
              margin-top: 20px;
            }
            
            .late-arrivals-title {
              font-size: 13px;
              font-weight: 600;
              color: #ED3438;
              margin-bottom: 12px;
            }
            
            .late-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            
            .late-item:last-child {
              border-bottom: none;
            }
            
            .late-item-name {
              font-weight: 600;
              color: #1f2937;
            }
            
            .late-item-time {
              color: #ED3438;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
            }
            
            .metadata {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <!-- HEADER -->
          <div class="header">
            <h1>📊 Admin Dashboard Report</h1>
            <p>Real-time System Overview</p>
            <p>Generated: ${new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>By: ${userName}</p>
          </div>
          
          <!-- PIE CHARTS -->
          <div class="section-title">📈 Key Metrics Overview</div>
          <div class="charts-container">
            <!-- Attendance Status Chart -->
            <div class="chart-card">
              <div class="chart-title">Attendance Status</div>
              <div class="pie-chart">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="${attendancePieData[0].color}" 
                    style="stroke: white; stroke-width: 2;"/>
                  <text x="60" y="65" text-anchor="middle" font-size="16" font-weight="bold" fill="white">${attendancePieData[0].value}</text>
                </svg>
              </div>
              <div class="chart-legend">
                ${attendancePieData.map(item => `
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: ${item.color};"></div>
                    <span>${item.label}: ${item.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Clock-In Status Chart -->
            <div class="chart-card">
              <div class="chart-title">Clock-In Status</div>
              <div class="pie-chart">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="${statusPieData[0].color}" 
                    style="stroke: white; stroke-width: 2;"/>
                  <text x="60" y="65" text-anchor="middle" font-size="16" font-weight="bold" fill="white">${statusPieData[0].value}</text>
                </svg>
              </div>
              <div class="chart-legend">
                ${statusPieData.map(item => `
                  <div class="legend-item">
                    <div class="legend-color" style="background-color: ${item.color};"></div>
                    <span>${item.label}: ${item.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <!-- STAT CARDS -->
          <div class="section-title">📊 Dashboard Statistics</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #E3F2FD;">👥</div>
                <div class="stat-value">${stats.totalStaff || 0}</div>
              </div>
              <div class="stat-label">Total Staff</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #E3F2FD;">⏰</div>
                <div class="stat-value">${stats.clockInsToday || 0}</div>
              </div>
              <div class="stat-label">Clock-Ins Today</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #E3F2FD;">✅</div>
                <div class="stat-value">${stats.currentlyIn || 0}</div>
              </div>
              <div class="stat-label">Currently In</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #FFEBEE;">⚠️</div>
                <div class="stat-value" style="color: ${(stats.lateArrivals || 0) > 0 ? '#ED3438' : '#4CAF50'};">${stats.lateArrivals || 0}</div>
              </div>
              <div class="stat-label">Late Arrivals</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #E3F2FD;">📝</div>
                <div class="stat-value">${stats.pendingLeaveCount || 0}</div>
              </div>
              <div class="stat-label">Pending Leave Applications</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-card-top">
                <div class="stat-icon-container" style="background-color: #FFF3E0;">⏰</div>
                <div class="stat-value">${stats.pendingCorrectionsCount || 0}</div>
              </div>
              <div class="stat-label">Pending Corrections</div>
            </div>
          </div>
          
          <!-- LATE ARRIVALS LIST -->
          ${(stats.lateArrivalsList && stats.lateArrivalsList.length > 0) ? `
            <div class="late-arrivals-section">
              <div class="late-arrivals-title">🔴 Late Arrivals Today</div>
              ${stats.lateArrivalsList.map(item => `
                <div class="late-item">
                  <div>
                    <div class="late-item-name">${item.staffName || 'N/A'}</div>
                    <div class="late-item-time">${item.time || 'N/A'}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- FOOTER -->
          <div class="footer">
            <div class="metadata">
              <span>Clock-In Management System</span>
              <span>Official Export</span>
            </div>
            <div style="margin-top: 8px;">
              This document contains sensitive information. Handle with care.
            </div>
          </div>
        </body>
      </html>
    `;
    
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Dashboard',
      });
      return { success: true, filePath: uri };
    }
  } catch (error) {
    console.error('Error generating dashboard PDF:', error);
    Alert.alert('Error', 'Failed to generate PDF: ' + error.message);
    return { success: false, error: error.message };
  }
};

export default {
  generateDashboardPDF,
};
