import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import RegisterHospital from './pages/RegisterHospital';
import RegisterWorker from './pages/RegisterWorker';
import Dashboard from './pages/Dashboard';
import PostJob from './pages/PostJob';
import EditProfile from './pages/EditProfile';
import EditHospital from './pages/EditHospital'; // 새로 추가

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/hospital" element={<RegisterHospital />} />
        <Route path="/register/worker" element={<RegisterWorker />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hospital/post" element={<PostJob />} />
        <Route path="/worker/profile" element={<EditProfile />} />
        
        {/* 병원 정보 수정 경로 추가 */}
        <Route path="/hospital/edit" element={<EditHospital />} />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;