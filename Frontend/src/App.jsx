import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Labs from "./pages/Labs";
import LabDetail from "./pages/LabDetail";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateLab from "./pages/CreateLab";
import TeacherGrading from "./pages/TeacherGrading";
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/labs"
            element={
              <ProtectedRoute>
                <Labs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/labs/:id"
            element={
              <ProtectedRoute>
                <LabDetail />
              </ProtectedRoute>
            }
          />
<Route path="/labs/:id/grading"
element={
  <ProtectedRoute>
    <TeacherGrading/>
  </ProtectedRoute>
}
/>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/labs/create"
            element={
              <ProtectedRoute>
                <CreateLab />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div className="p-8">Page not found</div>} />
        </Routes>
      </main>
    </div>
  );
}