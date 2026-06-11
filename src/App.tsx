import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import RobotList from '@/pages/RobotList';
import RobotDetail from '@/pages/RobotDetail';
import TaskCenter from '@/pages/TaskCenter';
import TaskCreate from '@/pages/TaskCreate';
import ScanConfirm from '@/pages/ScanConfirm';
import FaultCenter from '@/pages/FaultCenter';
import ReportCenter from '@/pages/ReportCenter';
import ReportExport from '@/pages/ReportExport';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/robots" element={<RobotList />} />
          <Route path="/robots/:id" element={<RobotDetail />} />
          <Route path="/tasks" element={<TaskCenter />} />
          <Route path="/tasks/create" element={<TaskCreate />} />
          <Route path="/scan" element={<ScanConfirm />} />
          <Route path="/faults" element={<FaultCenter />} />
          <Route path="/reports" element={<ReportCenter />} />
          <Route path="/reports/export" element={<ReportExport />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
