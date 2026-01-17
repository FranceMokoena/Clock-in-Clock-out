import React from 'react';
import ReportsIndex from './Reports/ReportsIndex';

function Reports({ isAdmin, hostCompanyId, isHostCompany }) {
  return <ReportsIndex isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />;
}

export default Reports;

