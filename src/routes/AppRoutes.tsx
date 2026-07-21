import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Auth/Login";
import CompanyRegister from "../pages/Auth/CompanyRegister";
import CompanyDashboard from "../pages/Company/Dashboard/CompanyDashboard";
import CreateDrive from "../pages/Company/CreateDrive/CreateDrive";
import StudentDashboard from "../pages/Student/Dashboard/StudentDashboard";
import ActivateInvitation from "../pages/Student/ActivateInvitation";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/company/register" element={<CompanyRegister />} />
      <Route path="/company/login" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/company/dashboard" element={<CompanyDashboard />} />
      <Route path="/company/create-drive" element={<CreateDrive />} />
      <Route path="/student/activate/:token" element={<ActivateInvitation />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
    </Routes>
  );
}
