// src/pages/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Edit3,
  Save,
  X,
  User,
  Mail,
  BookOpen,
  Calendar,
  Clock,
  Award,
  Settings,
  Shield,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import Card from "../components/Card";
import { api } from "../api";

/**
 * Stable ProfileField component to prevent remounting and losing focus.
 * Props:
 * - label, value: display
 * - field: key in editData
 * - Icon: optional lucide icon component
 * - isEditing, editData, setEditData
 * - type: "text" | "email" | "tel" | "textarea"
 * - disabled: boolean
 * - autoFocus: boolean
 */
function ProfileField({
  label,
  value,
  field,
  Icon,
  isEditing,
  editData,
  setEditData,
  type = "text",
  disabled = false,
  autoFocus = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus && isEditing && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const val = ref.current.value;
      ref.current.setSelectionRange(val.length, val.length);
    }
  }, [autoFocus, isEditing]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>

      {isEditing && !disabled ? (
        type === "textarea" ? (
          <textarea
            ref={ref}
            value={editData[field] ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, [field]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        ) : (
          <input
            ref={ref}
            type={type}
            value={editData[field] ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, [field]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        )
      ) : (
        <p className="text-slate-900 py-2 px-3 bg-slate-50 rounded-lg">{value || "Not specified"}</p>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    department: "",
    contactNumber: "",
    bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [stats, setStats] = useState({
    totalLabs: 0,
    attendedLabs: 0,
    submittedAssignments: 0,
    averageGrade: 0,
  });

  useEffect(() => {
    if (user) {
      setEditData({
        name: user.name ?? "",
        email: user.email ?? "",
        department: user.department ?? "",
        contactNumber: user.contactNumber ?? "",
        bio: user.bio ?? "",
      });
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const data = await api.getUserStats();
      if (data) {
        setStats({
          totalLabs: data.totalLabs ?? 0,
          attendedLabs: data.attendedLabs ?? 0,
          submittedAssignments: data.submittedAssignments ?? 0,
          averageGrade: data.averageGrade ?? 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
      // keep defaults
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Basic client-side validation
    if (!editData.name || editData.name.trim().length < 2) {
      setMessage({ type: "error", text: "Name must be at least 2 characters." });
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: editData.name.trim(),
        department: editData.department?.trim(),
        contactNumber: editData.contactNumber?.trim(),
        bio: editData.bio?.trim(),
      };

      const updated = await api.updateProfile(payload);
      // update global user state - API returns updated user object similar to GET /me
      if (updated) {
        setUser((prev) => ({ ...prev, ...updated }));
      } else {
        // fallback: merge locally
        setUser((prev) => ({ ...prev, ...payload }));
      }

      setMessage({ type: "success", text: "Profile updated successfully." });
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      // If server returned validation errors (model state), it might be an object
      const text = err?.message ?? "Failed to update profile";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: user.name ?? "",
      email: user.email ?? "",
      department: user.department ?? "",
      contactNumber: user.contactNumber ?? "",
      bio: user.bio ?? "",
    });
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  };

  const attendanceRate = stats.totalLabs > 0 ? Math.round((stats.attendedLabs / stats.totalLabs) * 100) : 0;
  const submissionRate = stats.totalLabs > 0 ? Math.round((stats.submittedAssignments / stats.totalLabs) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
            <p className="text-slate-600 mt-1">Manage your account information and preferences</p>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  {isEditing && (
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{user?.name}</h2>
                  <p className="text-slate-600 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {user?.role ? user.role.toString() : "User"} • MSU FoTE
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Member since {new Date().toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ProfileField
                  label="Full Name"
                  value={user?.name}
                  field="name"
                  Icon={User}
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                  autoFocus={true}
                />

                <ProfileField
                  label="Email Address"
                  value={user?.email}
                  field="email"
                  Icon={Mail}
                  type="email"
                  disabled={true}
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />

                <ProfileField
                  label="Department"
                  value={user?.department}
                  field="department"
                  Icon={BookOpen}
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />

                <ProfileField
                  label="Contact Number"
                  value={editData.contactNumber}
                  field="contactNumber"
                  Icon={Settings}
                  type="tel"
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />
              </div>

              <div className="mt-6">
                <ProfileField
                  label="Bio"
                  value={editData.bio}
                  field="bio"
                  Icon={User}
                  type="textarea"
                  isEditing={isEditing}
                  editData={editData}
                  setEditData={setEditData}
                />
              </div>
            </Card>

            {/* Activity Stats (students only) */}
            {user?.role?.toString().toLowerCase() === "student" && (
              <Card>
                <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Academic Performance
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Total Labs</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.totalLabs}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Attended</p>
                        <p className="text-2xl font-bold text-green-900">{attendanceRate}%</p>
                      </div>
                      <Clock className="w-8 h-8 text-green-500" />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-sm font-medium">Submitted</p>
                        <p className="text-2xl font-bold text-purple-900">{submissionRate}%</p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-600 text-sm font-medium">Avg Grade</p>
                        <p className="text-2xl font-bold text-amber-900">{stats.averageGrade}%</p>
                      </div>
                      <Award className="w-8 h-8 text-amber-500" />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Account Type</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{user?.role?.toString() ?? "User"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Last Login</span>
                  <span className="text-sm text-slate-900">Today</span>
                </div>
              </div>
            </Card>

            {user?.role?.toString().toLowerCase() === "student" && (
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Attendance Rate</span>
                    <span className="font-semibold text-slate-900">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${attendanceRate}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Submission Rate</span>
                    <span className="font-semibold text-slate-900">{submissionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${submissionRate}%` }} />
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Security</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">Change Password</button>
                <button className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">Two-Factor Authentication</button>
                <button className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">Login History</button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}