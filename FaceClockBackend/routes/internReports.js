const express = require('express');
const router = express.Router();
const InternReport = require('../models/InternReport');

/**
 * POST /api/intern-reports
 * Create a new intern report
 * Accessible by: HOST_COMPANY, ADMIN
 */
router.post('/', async (req, res) => {
  try {
    const {
      internId,
      hostCompanyId,
      reportType,
      severity,
      title,
      description,
      incidentDate,
      supportingNotes,
      submittedByRole,
      submittedByUserId
    } = req.body;

    // Validation
    if (!internId || !hostCompanyId || !reportType || !severity || !title || !description || !incidentDate || !submittedByRole) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: internId, hostCompanyId, reportType, severity, title, description, incidentDate, submittedByRole'
      });
    }

    // Validate enums
    const validReportTypes = ['Behavioural Concern', 'Policy Violation', 'Attendance Concern', 'Performance Concern', 'General Observation'];
    const validSeverities = ['Low', 'Medium', 'High'];
    const validRoles = ['HOST_COMPANY', 'ADMIN'];

    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    if (!validRoles.includes(submittedByRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid submittedByRole. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Create the report
    const newReport = new InternReport({
      internId,
      hostCompanyId,
      reportType,
      severity,
      title,
      description,
      incidentDate: new Date(incidentDate),
      supportingNotes: supportingNotes || null,
      submittedByRole,
      submittedByUserId: submittedByUserId || null,
      status: 'Submitted'
    });

    const savedReport = await newReport.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: savedReport
    });
  } catch (error) {
    console.error('Error creating intern report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create intern report'
    });
  }
});

/**
 * GET /api/intern-reports
 * Fetch intern reports with role-based filtering
 * Query params:
 *   - internId: specific intern (required for HOST_COMPANY, optional for ADMIN)
 *   - hostCompanyId: for scoping (required for HOST_COMPANY, optional for ADMIN)
 *   - userRole: HOST_COMPANY or ADMIN (required to determine access)
 *   - limit: number of records (default 50)
 *   - skip: pagination offset (default 0)
 */
router.get('/', async (req, res) => {
  try {
    const {
      internId,
      hostCompanyId,
      userRole,
      limit = 50,
      skip = 0
    } = req.query;

    // Build query based on role
    let query = {};

    if (userRole === 'HOST_COMPANY') {
      // Host Company can only see reports they submitted for their interns
      if (!hostCompanyId) {
        return res.status(400).json({
          success: false,
          error: 'Host Company users must provide hostCompanyId'
        });
      }
      query.hostCompanyId = hostCompanyId;
      query.submittedByRole = 'HOST_COMPANY';

      // If internId is provided, filter by that
      if (internId) {
        query.internId = internId;
      }
    } else if (userRole === 'ADMIN') {
      // Admin can see all reports, optionally filtered by hostCompanyId or internId
      if (hostCompanyId) {
        query.hostCompanyId = hostCompanyId;
      }
      if (internId) {
        query.internId = internId;
      }
    } else if (userRole === 'INTERN') {
      // Interns can only see reports about themselves (read-only)
      if (!internId) {
        return res.status(400).json({
          success: false,
          error: 'Interns must provide internId'
        });
      }
      query.internId = internId;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid userRole. Must be HOST_COMPANY, ADMIN, or INTERN'
      });
    }

    // Fetch reports with pagination
    const reports = await InternReport.find(query)
      .populate('internId', 'name surname idNumber department')
      .populate('hostCompanyId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await InternReport.countDocuments(query);

    res.status(200).json({
      success: true,
      reports,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching intern reports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch intern reports'
    });
  }
});

/**
 * GET /api/intern-reports/:reportId
 * Fetch a single report by ID with role-based access
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userRole, userId, hostCompanyId } = req.query;

    const report = await InternReport.findById(reportId)
      .populate('internId', 'name surname idNumber department')
      .populate('hostCompanyId', 'name');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check access based on role
    if (userRole === 'HOST_COMPANY') {
      if (report.hostCompanyId._id.toString() !== hostCompanyId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this report'
        });
      }
    } else if (userRole === 'INTERN') {
      if (report.internId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this report'
        });
      }
    }
    // ADMIN can view any report

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error fetching intern report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch intern report'
    });
  }
});

/**
 * PATCH /api/intern-reports/:reportId
 * Update report status (ADMIN only)
 */
router.patch('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userRole, status, adminNotes, reviewedByUserId } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update reports'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (reviewedByUserId) updateData.reviewedByUserId = reviewedByUserId;
    if (status && status !== 'Submitted') {
      updateData.reviewedAt = new Date();
    }

    const updatedReport = await InternReport.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true, runValidators: true }
    ).populate('internId', 'name surname idNumber department')
     .populate('hostCompanyId', 'name');

    if (!updatedReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating intern report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update intern report'
    });
  }
});

module.exports = router;
