// src/pages/TeacherGrading.jsx
import React, { useState, useEffect,useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  User,
  Calendar,
  Clock,
  Save,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  FileScan,
  X,
} from "lucide-react";
import Card from "../components/Card";
import { api } from "../api";
import useAuth from "../auth/useAuth";

// const BASE_HOST = "http://localhost:5036";
const BASE_HOST = ""

export default function TeacherGrading() {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const labId = params.labId ?? params.id ?? null;

  const [lab, setLab] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [gradeForm, setGradeForm] = useState({
    marks: "",
    maxMarks: 100,
    feedback: "",
    status: "pending",
  });
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const isTeacher = user?.role?.toString().toLowerCase() === "teacher";

  // preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (!labId) throw new Error("Missing labId in route");
        const labData = await api.getLab(labId);
        setLab(labData);

        if (isTeacher) {
          const subs = await api.getSubmissions(labId);
          setSubmissions((subs || []).map(normalizeSubmission));
        } else {
          const sub = await api.getMySubmission(labId);
          if (sub) setSubmissions([normalizeSubmission(sub)]);
          else setSubmissions([]);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [labId, isTeacher]);

  function normalizeSubmission(s) {
    return {
      id: s.id ?? s.Id ?? s._id,
      studentId: s.studentId ?? s.StudentId ?? s.Student?.Id ?? s.Student?._id,
      studentName:
        s.studentName ??
        s.StudentName ??
        s.student?.name ??
        s.Student?.Name ??
        s.Student?.Name ??
        s.Student?.name ??
        s.Student?.Username ??
        "Student",
      email:
        s.email ??
        s.Email ??
        s.studentEmail ??
        s.Student?.Email ??
        s.Student?.email ??
        "",
      fileName: s.fileName ?? s.FileName ?? s.File?.Name ?? s.FileName,
      fileSize: s.fileSize ?? s.FileSize ?? s.file?.size ?? s.FileSize,
      fileUrl: s.fileUrl ?? s.FileUrl ?? s.file?.url ?? s.FileUrl,
      submittedAt: s.submittedAt
        ? new Date(s.submittedAt)
        : s.SubmittedAt
          ? new Date(s.SubmittedAt)
          : s.submittedAt && new Date(s.submittedAt),
      marks: s.marks ?? s.Marks ?? null,
      maxMarks: s.maxMarks ?? s.MaxMarks ?? 100,
      feedback: s.feedback ?? s.Feedback ?? "",
      status:
        (s.status ??
          s.Status ??
          (s.marks != null ? "graded" : "pending") ??
          "pending"
        ).toString().toLowerCase(),
    };
  }

  useEffect(() => {
    if (selectedSubmission) {
      setGradeForm({
        marks: selectedSubmission.marks ?? "",
        maxMarks: selectedSubmission.maxMarks ?? 100,
        feedback: selectedSubmission.feedback ?? "",
        status: selectedSubmission.status ?? "pending",
      });
      // revoke any previous preview and reset when selection changes
      if (previewUrl) {
        try {
          window.URL.revokeObjectURL(previewUrl);
        } catch {
          console.log("something went wrong")
        }
        setPreviewUrl(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubmission]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try {
          window.URL.revokeObjectURL(previewUrl);
        } catch {
          console.log("something went wrong")
        }
      }
    };
  }, [previewUrl]);

  // Teachers only: grade
  const handleGradeSubmit = async () => {
    if (!isTeacher) return;
    if (!selectedSubmission) return;
    setGrading(true);
    setError("");
    try {
      if (gradeForm.marks !== "" && Number.isNaN(Number(gradeForm.marks)))
        throw new Error("Marks must be numeric");
      const payload = {
        marks: gradeForm.marks === "" ? null : Number(gradeForm.marks),
        maxMarks: Number(gradeForm.maxMarks || 100),
        feedback: gradeForm.feedback,
      };
      const updated = await api.gradeSubmission(selectedSubmission.id, payload);

      const normalizedUpdated = {
        id: updated.id ?? updated.Id ?? updated._id ?? selectedSubmission.id,
        marks: updated.marks ?? updated.Marks ?? payload.marks,
        maxMarks: updated.maxMarks ?? updated.MaxMarks ?? payload.maxMarks,
        feedback: updated.feedback ?? updated.Feedback ?? payload.feedback,
        status:
          (updated.status ??
            updated.Status ??
            (payload.marks != null ? "graded" : "reviewed")).toString().toLowerCase(),
      };

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id ? { ...s, ...normalizedUpdated } : s
        )
      );
      setSelectedSubmission(null);
      // revoke preview if any
      if (previewUrl) {
        try {
          window.URL.revokeObjectURL(previewUrl);
        } catch {
          console.log("something went wrong")
        }
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error("Failed to grade:", err);
      setError(err.message || "Failed to grade");
    } finally {
      setGrading(false);
    }
  };

  // Download file (save)
  const handleDownloadSubmission = async (submission) => {
    setError("");
    try {
      await api.downloadSubmissionFile(submission.id, submission.fileName || "submission");
    } catch (err) {
      console.error(err);
      setError(err.message || "Download failed");
    }
  };

  // Preview file inline (create blob URL)
  const handlePreviewSubmission = useCallback(async (submission) => {
    setError("");
    if (!submission?.id) return setError("Invalid submission");
    setPreviewLoading(true);
    if (previewUrl) {
      try {
        window.URL.revokeObjectURL(previewUrl);
      } catch {
        console.log("something went wrong")
      }
      setPreviewUrl(null);
    }
    try {
      const { blobUrl } = await api.getSubmissionBlobUrl(submission.id);
      setPreviewUrl(blobUrl);
      setShowPreview(true)
    } catch (err) {
      console.error("Preview failed:", err);
      setError(err.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  },[previewUrl]);

  // UI helpers
  const getStatusColor = (status) => {
    switch (status) {
      case "graded":
        return "text-green-700 bg-green-50 border-green-200";
      case "reviewed":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "pending":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "graded":
        return <CheckCircle className="w-4 h-4" />;
      case "reviewed":
        return <Eye className="w-4 h-4" />;
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  // download attendance report helper (kept here)
  async function downloadReport(format = "pdf") {
    try {
      const url = `${BASE_HOST}/api/attendance/report/${labId}?format=${encodeURIComponent(format)}`;
      const filename = `attendance_report_${labId}.${format === "pdf" ? "pdf" : "csv"}`;
      await api.downloadFileWithAuth(url, filename);
    } catch (err) {
      console.log({ type: "error", text: err.message || "Download failed" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="max-w-7xl  p-6 space-y-6">
        <div className="flex items-center justify-betwee  w-full">
          <div className="flex items-center n w-full gap-4">
            <button
              onClick={() => navigate(`/labs/${labId}`)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-fit">
              <h1 className="text-3xl font-bold text-slate-900">Submissions</h1>
              <p className="text-slate-600 mt-1">
                {lab?.subject?.name ?? lab?.Subject?.Name ?? "Lab"} • {submissions.length} submission(s)
              </p>
            </div>
          </div>
          <div className=" flex justify-center items-center flex-row gap-4">
            <button
              onClick={() => downloadReport("csv")}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={() => downloadReport("pdf")}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

        {isTeacher && (
          <div className="flex gap-1 bg-white shadow-sm rounded-xl p-1">
            {[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "reviewed", label: "Reviewed" },
              { value: "graded", label: "Graded" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-center ${filter === option.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                {option.label}{" "}
                <span className="ml-2 text-xs opacity-75">
                  ({option.value == "all" ? submissions.length : submissions.filter((i) => i.status == option.value).length})
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Student Submissions</h2>
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No submissions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(isTeacher ? submissions.filter((s) => (filter === "all" ? true : s.status === filter)) : submissions).map(
                    (submission) => (
                      <div className="space-y-4">
                        <div
                          key={submission.id}
                          className={`p-4 border-2 rounded-xl ${selectedSubmission?.id === submission.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                            }`}
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{submission.studentName}</h3>
                                <p className="text-sm text-slate-600">{submission.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                                {getStatusIcon(submission.status)} {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </span>
                              {submission.marks != null && <p className="text-sm text-slate-600 mt-1">{submission.marks}/{submission.maxMarks}</p>}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1"><FileText className="w-4 h-4" />{submission.fileName}</div>
                            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{submission.submittedAt ? submission.submittedAt.toLocaleDateString() : ""}</div>
                            <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{submission.submittedAt ? submission.submittedAt.toLocaleTimeString() : ""}</div>
                          </div>
                        </div>

                        {previewUrl && showPreview && (
                          <div className="mb-6">
                            <div className=" flex flex-row w-full justify-between items-center">
                              <span className=" flex flex-row w-full justify-start items-center gap-3 my-5 font-semibold">
                                <FileScan className="w-7 h-7" />
                                Submission Preview
                              </span>
                              <button
                                onClick={() => { setShowPreview(prev => !prev) }}><X className="w-5 h-5" /></button>
                            </div>
                            <div className="border rounded overflow-hidden" style={{ minHeight: 400 }}>
                              {selectedSubmission.fileName && selectedSubmission.fileName.toLowerCase().endsWith(".pdf") ? (
                                <iframe src={previewUrl} title="Submission preview" className="w-full h-[600px]" />
                              ) : (
                                <img src={previewUrl} alt="submission preview" className="w-full object-contain" />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">Tip: use Download to save the original file.</div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {selectedSubmission ? (
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{isTeacher ? "Grade Submission" : "Your Submission"}</h3>
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{selectedSubmission.studentName}</h4>
                      <p className="text-sm text-slate-600">{selectedSubmission.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>File: {selectedSubmission.fileName}</span>
                    <span>Size: {selectedSubmission.fileSize || "—"}</span>
                  </div>
                </div>

                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => handleDownloadSubmission(selectedSubmission)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={() => handlePreviewSubmission(selectedSubmission)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <Eye className="w-4 h-4" /> {previewLoading ? "Loading..." : "Preview"}
                  </button>
                </div>

                {isTeacher ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Marks</label>
                        <input
                          type="number"
                          value={gradeForm.marks ?? ""}
                          onChange={(e) => setGradeForm((prev) => ({ ...prev, marks: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="0"
                          min="0"
                          max={gradeForm.maxMarks}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Marks</label>
                        <input
                          type="number"
                          value={gradeForm.maxMarks}
                          onChange={(e) => setGradeForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="100"
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                      <select
                        value={gradeForm.status}
                        onChange={(e) => setGradeForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="graded">Graded</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Feedback</label>
                      <textarea
                        value={gradeForm.feedback}
                        onChange={(e) => setGradeForm((prev) => ({ ...prev, feedback: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="Provide feedback to the student..."
                      />
                    </div>

                    <button
                      onClick={handleGradeSubmit}
                      disabled={grading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" /> {grading ? "Saving..." : "Save Grade"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-slate-700">
                      <div><strong>Status:</strong> {selectedSubmission.status}</div>
                      <div className="mt-2"><strong>Marks:</strong> {selectedSubmission.marks ?? "Not graded yet"} / {selectedSubmission.maxMarks}</div>
                      <div className="mt-2"><strong>Feedback:</strong></div>
                      <div className="mt-1 p-3 bg-white border rounded text-sm text-slate-700">{selectedSubmission.feedback || "No feedback yet"}</div>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Select a submission to view details</p>
                </div>
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Grading Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Total Submissions</span><span className="font-medium">{submissions.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Graded</span><span className="font-medium text-green-600">{submissions.filter((s) => s.status === "graded").length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Pending</span><span className="font-medium text-yellow-600">{submissions.filter((s) => s.status === "pending").length}</span></div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${submissions.length > 0 ? (submissions.filter((s) => s.status === "graded").length / submissions.length) * 100 : 0}%` }}></div></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}