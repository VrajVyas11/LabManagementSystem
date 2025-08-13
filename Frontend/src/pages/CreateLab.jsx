// src/pages/CreateLab.jsx
import React, { useEffect, useState } from "react";
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
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getSubjects()
      .then((list) => {
        if (!mounted) return;
        // normalize shapes
        const normalized = (list || []).map((s) => ({
          id: s.id ?? s.Id ?? s._id,
          name: s.name ?? s.Name ?? s.Code ?? String(s.id),
        }));
        setSubjects(normalized);
      })
      .catch((err) => {
        console.warn("Failed to load subjects:", err);
        setSubjects([]);
      })
      .finally(() => {
        if (mounted) setLoadingSubjects(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!formData.subjectId) {
      return setError("Please select a subject.");
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const submission = formData.submissionDeadline ? new Date(formData.submissionDeadline) : end;

    if (isNaN(start.valueOf()) || isNaN(end.valueOf())) {
      return setError("Please provide valid start and end times.");
    }

    if (end <= start) {
      return setError("End time must be after start time.");
    }
    if (submission < end) {
      return setError("Submission deadline must be after lab end time.");
    }

    setSaving(true);
    try {
      const payload = {
        subjectId: formData.subjectId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        submissionDeadline: submission.toISOString(),
      };
      const created = await api.createLab(payload);
      if (created) nav("/labs");
      else setError("Failed to create lab");
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
            <div className="text-red-600 text-xl font-semibold mb-2">Access Restricted</div>
            <p className="text-gray-600">Only teachers can create labs. Please contact your administrator if you think this is a mistake.</p>
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
          <p className="text-gray-600 mt-1">Schedule a new lab session for your students</p>
        </div>

        {error && <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>

            {loadingSubjects ? (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">Loading subjects...</div>
            ) : (
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                required
              >
                <option value="">Select subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <p className="text-xs text-gray-500 mt-1">Select the subject for which you are creating the lab</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">End Time</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1 block">Submission Deadline</label>
            <input
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              type="datetime-local"
              name="submissionDeadline"
              value={formData.submissionDeadline}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">Optional. If not set, defaults to lab end time</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => nav("/labs")} className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200">
              {saving ? "Creating..." : "Create Lab"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}