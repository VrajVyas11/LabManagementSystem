import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import useAuth from "../auth/useAuth";
import { api } from "../api";

export default function CreateLab() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [formData, setFormData] = useState({
    subjectId: "",
    startTime: "",
    endTime: "",
    submissionDeadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    // Enhanced validation
    if (!formData.subjectId.trim()) {
      return setError("Subject ID (or name) is required.");
    }
    
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const submission = formData.submissionDeadline 
      ? new Date(formData.submissionDeadline)
      : end;

    if (end <= start) {
      return setError("End time must be after start time.");
    }
    if (submission < end) {
      return setError("Submission deadline must be after lab end time.");
    }

    setSaving(true);
    try {
      await api.createLab({
        subjectId: formData.subjectId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        submissionDeadline: submission.toISOString()
      });
      nav("/labs");
    } catch (err) {
      setError(err.message || "Failed to create lab");
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role?.toLowerCase() !== "teacher") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <div className="text-center p-6">
            <div className="text-red-600 text-xl font-semibold mb-2">
              Access Restricted
            </div>
            <p className="text-gray-600">
              Only teachers can create labs. Please contact your administrator if you think this is a mistake.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-5">
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Create Lab</h2>
          <p className="text-gray-600 mt-1">
            Schedule a new lab session for your students
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Subject ID or Name
            </label>
            <input
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              name="subjectId"
              value={formData.subjectId}
              onChange={handleChange}
              placeholder="e.g. CS101 or Computer Science"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter either the subject code or full name
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Start Time
              </label>
              <input
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                End Time
              </label>
              <input
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Submission Deadline
            </label>
            <input
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              type="datetime-local"
              name="submissionDeadline"
              value={formData.submissionDeadline}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. If not set, defaults to lab end time
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => nav("/labs")}
              className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create Lab"
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}