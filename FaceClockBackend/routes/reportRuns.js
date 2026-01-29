const express = require('express');
const mongoose = require('mongoose');
const ReportRun = require('../models/ReportRun');

const router = express.Router();

/**
 * GET /api/report-runs
 * Query params:
 *   - hostCompanyId: filter runs for a host company (ownerType=HostCompany)
 *   - ownerType: Admin | HostCompany
 *   - ownerId: ObjectId of the owner
 *   - reportType: weekly | monthly | late | missing
 *   - status: queued | generated | sent | failed
 *   - limit: number of records to return (default 25, max 100)
 *   - skip: pagination offset (default 0)
 */
router.get('/', async (req, res) => {
  try {
    const {
      hostCompanyId,
      ownerType,
      ownerId,
      reportType,
      status,
      limit = 25,
      skip = 0
    } = req.query;

    const filter = {};

    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ success: false, error: 'Invalid hostCompanyId' });
      }
      filter.ownerType = 'HostCompany';
      filter.ownerId = hostCompanyId;
    } else {
      if (ownerType) filter.ownerType = ownerType;
      if (ownerId) {
        if (!mongoose.Types.ObjectId.isValid(ownerId)) {
          return res.status(400).json({ success: false, error: 'Invalid ownerId' });
        }
        filter.ownerId = ownerId;
      }
    }

    if (reportType) filter.reportType = reportType;
    if (status) filter.status = status;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const safeSkip = Math.max(parseInt(skip, 10) || 0, 0);

    const [runs, total] = await Promise.all([
      ReportRun.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip(safeSkip)
        .lean(),
      ReportRun.countDocuments(filter)
    ]);

    res.json({
      success: true,
      runs,
      total,
      page: Math.floor(safeSkip / safeLimit) + 1,
      pages: Math.ceil(total / safeLimit)
    });
  } catch (error) {
    console.error('Error fetching report runs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report runs' });
  }
});

module.exports = router;
