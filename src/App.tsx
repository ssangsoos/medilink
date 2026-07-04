import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import RegisterHospital from './pages/RegisterHospital';
import RegisterWorker from './pages/RegisterWorker';
import Dashboard from './pages/Dashboard';
import PostJob from './pages/PostJob';
import MyJobs from './pages/MyJobs';
import EditJob from './pages/EditJob';
import EditProfile from './pages/EditProfile';
import EditHospital from './pages/EditHospital'; // 새로 추가
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RouteGuard from './components/RouteGuard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/hospital" element={<RegisterHospital />} />
        <Route path="/register/worker" element={<RegisterWorker />} />
        <Route path="/dashboard" element={<RouteGuard allow="any"><Dashboard /></RouteGuard>} />
        <Route path="/hospital/post" element={<RouteGuard allow="hospital"><PostJob /></RouteGuard>} />
        <Route path="/hospital/jobs" element={<RouteGuard allow="hospital"><MyJobs /></RouteGuard>} />
        <Route path="/hospital/jobs/:id/edit" element={<RouteGuard allow="hospital"><EditJob /></RouteGuard>} />
        <Route path="/worker/profile" element={<RouteGuard allow="worker"><EditProfile /></RouteGuard>} />

        {/* 병원 정보 수정 경로 추가 */}
        <Route path="/hospital/edit" element={<RouteGuard allow="hospital"><EditHospital /></RouteGuard>} />

        {/* 법적 페이지 */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;