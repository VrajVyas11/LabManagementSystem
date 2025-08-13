// src/pages/LabDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import Card from "../components/Card";
import FileInput from "../components/FileInput";
import useAuth from "../auth/useAuth";

export default function LabDetail() {
  const { id } = useParams();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getLab(id)
      .then((data) => {
        if (!mounted) return;
        setLab(data);
      })
      .catch(() =>
        setMessage({
          type: "error",
          text: "Failed to load lab details"
        })
      )
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  const isLabActive = () => {
    if (!lab) return false;
    const now = new Date();
    const start = new Date(lab.startTime);
    const end = new Date(lab.endTime);
    return now >= start && now <= end;
  };

  const canSubmit = () => {
    if (!lab) return false;
    const now = new Date();
    const deadline = new Date(lab.submissionDeadline);
    return now <= deadline;
  };

  async function handleClockIn() {
    setMessage({ type: "", text: "" });
    if (!isLabActive()) {
      return setMessage({
        type: "error",
        text: "You can only clock in during lab hours"
      });
    }

    try {
      await api.clockIn(id);
      setMessage({
        type: "success",
        text: "Successfully clocked in"
      });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  }

  async function handleClockOut() {
    setMessage({ type: "", text: "" });
    try {
      await api.clockOut(id);
      setMessage({
        type: "success",
        text: "Successfully clocked out"
      });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  }

  async function handleSubmit() {
    setMessage({ type: "", text: "" });
    if (!selected) {
      return setMessage({
        type: "error",
        text: "Please select a file to upload"
      });
    }

    if (!canSubmit()) {
      return setMessage({
        type: "error",
        text: "Submission deadline has passed"
      });
    }

    setSubmitting(true);
    try {
      await api.submit(id, selected);
      setMessage({
        type: "success",
        text: "Work submitted successfully"
      });
      setSelected(null);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lab) {
    return (
      <Card className="text-center py-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Lab Not Found</h3>
        <p className="text-gray-600">This lab may have been deleted or you don't have access to it.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 ">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{lab.subject?.name || "Lab Session"}</h2>
            <p className="text-gray-600 mt-1">Instructor: {lab.teacher?.name || "Not Assigned"}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">ID: {lab.id}</div>

            {/* Grade submissions button only for teachers */}
            {user?.role?.toString().toLowerCase() === "teacher" && (
              <Link
                to={`/labs/${lab.id}/grading`}
                className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Grade Submissions
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Start Time</div>
              <div className="font-medium text-gray-800">{new Date(lab.startTime).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">End Time</div>
              <div className="font-medium text-gray-800">{new Date(lab.endTime).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Submission Deadline</div>
              <div className="font-medium text-gray-800">{new Date(lab.submissionDeadline).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Duration</div>
              <div className="font-medium text-gray-800">
                {Math.round((new Date(lab.endTime) - new Date(lab.startTime)) / 60000)} minutes
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <button
                onClick={handleClockIn}
                disabled={!isLabActive()}
                className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                  isLabActive() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Clock In
              </button>
              <button
                onClick={handleClockOut}
                className="w-full py-2 px-4 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all duration-200"
              >
                Clock Out
              </button>
            </div>

            <div className="border-t pt-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Submit Your Work</div>

              {/* Students: show file input */}
              {user?.role?.toString().toLowerCase() === "student" ? (
                <>
                  <FileInput onChange={setSelected} disabled={!canSubmit()} className="mb-3" />
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !canSubmit()}
                      className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                        canSubmit() && !submitting ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {submitting ? "Uploading..." : "Upload"}
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      disabled={!selected}
                      className="py-2 px-4 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200"
                    >
                      Reset
                    </button>
                  </div>
                </>
              ) : (
                // Non-students (teachers/admins): show a short note instead of upload UI
                <div className="text-sm text-gray-600">Only students can upload submissions. Teachers can view & grade submissions.</div>
              )}
            </div>

            {message.text && (
              <div
                className={`p-4 rounded-lg text-sm ${message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}
              >
                {message.text}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}