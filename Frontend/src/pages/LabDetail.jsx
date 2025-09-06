// src/pages/LabDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import Card from "../components/Card";
import FileInput from "../components/FileInput";
import useAuth from "../auth/useAuth";
import {
  FileText,
  Download,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Upload,
  Award,
  AlertCircle,
  Play,
  Square,
  FileUp,
  GraduationCap,
  BarChart3,
  NotebookText,
  ClockAlert
} from "lucide-react";

const BASE_HOST = "http://localhost:5036";
// const BASE_HOST = "";
export default function LabDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student states
  const [mySubmission, setMySubmission] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewSubmission, setPreviewSubmission] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);

  // Teacher states
  const [submissions, setSubmissions] = useState([]);
  const [submissionsSample, setSubmissionsSample] = useState([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, graded: 0 });
  const [attendanceMap, setAttendanceMap] = useState({});

  // Common UI
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lateReason, setLateReason] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const role = (user?.role ?? "").toString().toLowerCase();
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setMessage({ type: "", text: "" });
      try {
        const labData = await api.getLab(id);
        if (!mounted) return;
        setLab(labData);

        if (isStudent) {
          try {
            const mine = await api.getMySubmission(id);
            if (mine) setMySubmission(normalizeSubmission(mine));
          } catch (err) {
            if (err.message && !/not\s*found/i.test(err.message)) {
              setMessage({ type: "error", text: err.message });
            }
          }

          try {
            const report = await api.getLabAttendanceReport(id);
            console.log(report)
            const att = report.filter((data) => data.studentId == user.id)[0];
            if (att) {
              setAttendance(normalizeAttendance(att));
            }
          } catch (err) {
            console.log(err)
            // ignore if not found, assume not clocked in
          }
        }

        if (isTeacher) {
          try {
            const subs = await api.getSubmissions(id);
            const mapped = (subs || []).map(normalizeSubmission);
            setSubmissions(mapped);
            setSubmissionsSample(mapped.slice(0, 8));
            const total = mapped.length;
            const submitted = mapped.filter(s => !!s.fileUrl).length;
            const graded = mapped.filter(s => s.status === "graded").length;
            setStats({ total, submitted, graded });
          } catch (err) {
            setMessage({ type: "error", text: err.message || "Failed to load submissions" });
          }

          try {
            const report = await api.getLabAttendanceReport(id);
            console.log(report)
            const attMap = report.reduce((acc, a) => {
              acc[a.studentId] = {
                clockInTime: a.clockInTime ? new Date(a.clockInTime) : null,
                clockOutTime: a.clockOutTime ? new Date(a.clockOutTime) : null,
                lateReason: a.lateReason,
                status: a.status
              };
              return acc;
            }, {});
            setAttendanceMap(attMap);
          } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Failed to load attendance data" });
          }
        }
      } catch (err) {
        setMessage({ type: "error", text: err.message || "Failed to load lab details" });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      if (previewUrl) {
        try { window.URL.revokeObjectURL(previewUrl); } catch {
          // ignore
        }
      }
    };
  }, [id, isStudent, isTeacher, previewUrl, user]);

  function normalizeSubmission(s) {
    return {
      id: s.id ?? s._id ?? s.Id,
      studentId: s.studentId ?? s.StudentId,
      studentName: s.studentName ?? s.StudentName ?? s.student?.name ?? s.Student?.Name ?? "Student",
      email: s.email ?? s.Email ?? s.student?.email ?? s.Student?.Email ?? "",
      fileName: s.fileName ?? s.FileName,
      fileSize: s.fileSize ?? s.FileSize,
      fileUrl: s.fileUrl ?? s.FileUrl,
      submittedAt: s.submittedAt ? new Date(s.submittedAt) : s.SubmittedAt ? new Date(s.SubmittedAt) : null,
      marks: s.marks ?? s.Marks ?? null,
      maxMarks: s.maxMarks ?? s.MaxMarks ?? 100,
      feedback: s.feedback ?? s.Feedback ?? "",
      status: (s.status ?? s.Status ?? (s.marks != null ? "graded" : "pending") ?? "pending").toString().toLowerCase(),
    };
  }

  function normalizeAttendance(a) {
    return {
      clockInTime: a.clockInTime ? new Date(a.clockInTime) : null,
      clockOutTime: a.clockOutTime ? new Date(a.clockOutTime) : null,
      lateReason: a.lateReason ?? "",
      status: a.status ?? "unknown"
    };
  }

  const hasClockedIn = !!attendance?.clockInTime;
  const isClockedIn = hasClockedIn && !attendance?.clockOutTime;

  const isLabActive = useCallback(() => {
    if (!lab) return false;
    const now = new Date();
    const start = new Date(lab.startTime);
    const end = new Date(lab.endTime);
    return now >= start && now <= end;
  }, [lab]);

  const canSubmit = useCallback(() => {
    if (!lab) return false;
    const now = new Date();
    const deadline = new Date(lab.submissionDeadline);
    return now <= deadline;
  }, [lab]);

  const getLabStatus = () => {
    if (!lab) return { text: "Unknown", color: "muted", icon: AlertCircle };
    const now = new Date();
    const start = new Date(lab.startTime);
    const end = new Date(lab.endTime);

    if (now < start) return { text: "Scheduled", color: "warning", icon: Clock };
    if (now >= start && now <= end) return { text: "Active", color: "success", icon: Play };
    return { text: "Ended", color: "error", icon: Square };
  };

  const getSubmissionStatus = () => {
    if (!lab) return { text: "Unknown", color: "muted" };
    const now = new Date();
    const deadline = new Date(lab.submissionDeadline);

    if (now <= deadline) return { text: "Open", color: "success" };
    return { text: "Closed", color: "error" };
  };

  async function handleClockIn() {
    setMessage({ type: "", text: "" });
    if (!isLabActive()) {
      setMessage({ type: "error", text: "You can only clock in during lab hours." });
      return;
    }
    if (hasClockedIn) {
      setMessage({ type: "error", text: "You have already clocked in." });
      return;
    }
    setLoadingAction(true);
    try {
      await api.clockIn({ labId: id, lateReason });
      setAttendance({ clockInTime: new Date(), clockOutTime: null, lateReason });
      setMessage({ type: "success", text: "Clocked in successfully." });
      setLateReason("");
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Clock in failed" });
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleClockOut() {
    setMessage({ type: "", text: "" });
    if (!isClockedIn) {
      setMessage({ type: "error", text: "You need to clock in first." });
      return;
    }
    if (!isLabActive()) {
      setMessage({ type: "error", text: "Lab session has ended." });
      return;
    }
    setLoadingAction(true);
    try {
      await api.clockOut(id);
      setAttendance(prev => ({ ...prev, clockOutTime: new Date() }));
      setMessage({ type: "success", text: "Clocked out successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Clock out failed" });
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleSubmit() {
    setMessage({ type: "", text: "" });
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a file to upload." });
      return;
    }
    if (!canSubmit()) {
      setMessage({ type: "error", text: "Submission deadline has passed." });
      return;
    }
    setSubmitting(true);
    try {
      await api.submit(id, selectedFile);
      setMessage({ type: "success", text: "Work submitted successfully." });
      try {
        const mine = await api.getMySubmission(id);
        setMySubmission(normalizeSubmission(mine));
      } catch {
        // ignore
      }
      setSelectedFile(null);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  }

  const handlePreview = async (submission) => {
    setMessage({ type: "", text: "" });
    if (!submission?.id || !submission?.fileUrl) {
      setMessage({ type: "error", text: "Invalid submission or no file available." });
      return;
    }
    setPreviewLoading(true);
    try {
      const fileExtension = submission.fileName?.toLowerCase().split('.').pop();
      let previewUrl;

      if (['doc', 'docx'].includes(fileExtension)) {
        // Use Google Docs Viewer for .doc/.docx files
        previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(submission.fileUrl)}&embedded=true`;
      } else {
        // Fetch blob URL for PDFs and images
        const { blobUrl } = await api.getSubmissionBlobUrl(submission.id);
        if (previewUrl) {
          try {
            window.URL.revokeObjectURL(previewUrl);
          } catch {
            console.log("Error revoking previous blob URL");
          }
        }
        previewUrl = blobUrl;
      }

      setPreviewUrl(previewUrl);
      setPreviewSubmission(submission);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Preview failed" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const clearPreview = () => {
    if (previewUrl) try { window.URL.revokeObjectURL(previewUrl); } catch {
      console.log("something went wrong")
    };
    setPreviewUrl(null);
    setPreviewSubmission(null);
  };

  const handleDownload = async (submission) => {
    setMessage({ type: "", text: "" });
    try {
      await api.downloadSubmissionFile(submission.id, submission.fileName || "submission");
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Download failed" });
    }
  };
  async function handleDownloadReport(format = "pdf") {
    setMessage({ type: "", text: "" });
    try {
      const url = `${BASE_HOST}/api/attendance/report/${"68bc097b4b1055b658d5a857"}?format=${encodeURIComponent(format)}`;
      const filename = `attendance_${id}.${format === "pdf" ? "pdf" : "csv"}`;
      await api.downloadFileWithAuth(url, filename);
      setMessage({ type: "success", text: `Report ${filename} downloaded.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Report download failed" });
    }
  };

  const participantList = (() => {
    const byId = {};
    submissions.forEach(s => {
      if (!s) return;
      byId[s.studentId] = {
        id: s.studentId,
        name: s.studentName || "Student",
        email: s.email || "",
        submitted: !!s.fileUrl,
        status: s.status,
        marks: s.marks,
        attendance: attendanceMap[s.studentId] || null
      };
    });
    return Object.values(byId);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-400" />
      </div>
    );
  }

  if (!lab) {
    return (
      <Card className="text-center py-12 bg-white/60 border">
        <AlertCircle className="w-14 h-14 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Lab Not Found</h3>
        <p className="text-slate-600">This lab may have been deleted or you don't have access to it.</p>
      </Card>
    );
  }

  const labStatus = getLabStatus();
  const submissionStatus = getSubmissionStatus();
  const StatusIcon = labStatus.icon;

  return (
    <div className="space-y-8">
      {/* Hero Header (refined) */}
      <div className="rounded-2xl shadow-md bg-white text-black p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/30 rounded-full">
                <NotebookText strokeWidth={2} className="w-7 h-7 text-black/60" />
              </div>
              <div className="w-full">
                <div className="flex flex-row w-full justify-between items-center">
                  <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                    {lab.subject?.name || "Lab Session"}
                  </h1>
                  <div className="flex flex-row items-center gap-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${labStatus.color === 'success' ? 'bg-emerald-600/20 text-emerald-700' :
                      labStatus.color === 'warning' ? 'bg-amber-600/20 text-amber-700' :
                        'bg-red-700/20 border border-red-500/50 text-red-700'
                      }`}>
                      <StatusIcon className={`w-4 h-4 ${labStatus.text === "Active" ? "text-emerald-500 fill-emerald-500" :
                        labStatus.text === "Scheduled" ? "text-amber-500" :
                          "text-red-800 fill-red-600"
                        }`} />
                      <span>{labStatus.text}</span>
                    </div>

                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${submissionStatus.color === 'success' ? 'bg-emerald-600/20 text-emerald-800' : 'bg-red-700/20 border border-red-500/50 text-red-800'
                      }`}>
                      <Calendar strokeWidth={2} className={`w-4 h-4 ${submissionStatus.text === "Closed" ? "text-red-800" : "text-emerald-500"}`} />
                      <span>Submissions {submissionStatus.text}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {lab.subject?.code ? `${lab.subject.code} • ${lab.teacher?.department || ""}` : lab.teacher?.department}
                </div>
              </div>
            </div>

            <div className={`mt-4 grid grid-cols-1 ${isTeacher ? "sm:grid-cols-10" : "sm:grid-cols-9"} gap-4`}>
              <div className="rounded-lg col-span-3 bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs text-slate-600">Instructor</div>
                <div className="mt-1 text-base font-semibold text-slate-800">
                  {lab.teacher?.name || "Not assigned"}
                </div>
                <div className="mt-1 text-xs text-slate-600 break-words">
                  {lab.teacher?.email || "—"}
                </div>
              </div>

              <div className="rounded-lg col-span-3 bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs text-slate-600">Schedule</div>
                <div className="mt-2 text-sm text-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800">Starts</span>
                    <span className="font-medium">{new Date(lab.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-600">Ends</span>
                    <span className="text-slate-600">{new Date(lab.endTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg col-span-3 bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
                <div className="text-xs text-slate-600">Submission Deadline</div>
                <div className="mt-2 text-sm text-slate-800">
                  <div className="font-medium">{new Date(lab.submissionDeadline).toLocaleString()}</div>
                  <div className="text-xs text-slate-600 mt-1">(local time)</div>
                </div>
              </div>

              {isTeacher && (
                <div className="flex flex-col justify-start col-span-1 items-center w-full gap-2">
                  <button
                    onClick={() => handleDownloadReport("csv")}
                    className="w-full px-4 py-3 text-center flex bg-emerald-600/80 font-bold text-white rounded-md hover:bg-emerald-600 transition justify-center items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={() => handleDownloadReport("pdf")}
                    className="w-full px-4 py-3 text-center flex bg-red-600/80 font-bold text-white rounded-md hover:bg-red-600 transition justify-center items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Student View */}
      {isStudent && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lab Info */}
            <Card className="p-5 bg-white border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                Lab Schedule
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Duration</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {Math.round((new Date(lab.endTime) - new Date(lab.startTime)) / 60000)} minutes
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Status</div>
                  <div className={`text-lg font-semibold ${labStatus.text === 'Active' ? 'text-emerald-600' :
                    labStatus.text === 'Scheduled' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                    {labStatus.text}
                  </div>
                </div>
              </div>
            </Card>

            {/* Attendance */}
            <Card className="p-5 bg-white border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                Attendance
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Reason for late arrival (optional)
                  </label>
                  <input
                    disabled={!isLabActive() || hasClockedIn || loadingAction}
                    type="text"
                    placeholder="Optional reason for being late"
                    value={(!isLabActive() || hasClockedIn || loadingAction) ? attendance.lateReason : lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClockIn}
                    disabled={!isLabActive() || hasClockedIn || loadingAction}
                    className={`flex-1 px-5 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${isLabActive() && !hasClockedIn && !loadingAction
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 cursor-not-allowed"
                      }`}
                  >
                    <Play className="w-4 h-4" />
                    {loadingAction ? "Clocking In..." : "Clock In"}
                  </button>
                  <button
                    onClick={handleClockOut}
                    disabled={!isLabActive() || !isClockedIn || loadingAction}
                    className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${isLabActive() && isClockedIn && !loadingAction
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-slate-100 text-slate-600 cursor-not-allowed"
                      }`}
                  >
                    <Square className="w-4 h-4" />
                    {loadingAction ? "Clocking Out..." : "Clock Out"}
                  </button>
                </div>

                {hasClockedIn ? (
                  <div className="mt-4 text-sm tracking-wide text-slate-600 text-center flex flex-col gap-4">
                    <div className="flex flex-row justify-between items-center">
                      Clocked in at: {attendance.clockInTime.toLocaleString()}
                      {attendance.clockOutTime && (
                        <span className="">
                          Clocked out at: {attendance.clockOutTime.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {attendance.lateReason && (
                      <span className=" text-red-500 font-semibold">
                        Late reason: {attendance.lateReason}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">You have not clocked in yet.</p>
                )}
              </div>
            </Card>

            {/* Submission */}
            <Card className="p-5 bg-white border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-600" />
                  Submit Your Work
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${mySubmission ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {mySubmission ? 'Submitted' : 'Not Submitted'}
                </div>
              </div>

              <div className={`mb-5 p-3 rounded-md ${canSubmit() ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                <div className={`text-sm font-medium ${canSubmit() ? 'text-emerald-800' : 'text-red-800'}`}>
                  {canSubmit() ? 'You can submit your work before the deadline.' : 'Submission deadline has passed. Submissions are closed.'}
                </div>
              </div>

              <FileInput onChange={setSelectedFile} disabled={!canSubmit()} />

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit() || !selectedFile}
                  className={`flex-1 py-2 px-5 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${canSubmit() && !submitting && selectedFile
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-100 text-slate-600 cursor-not-allowed"
                    }`}
                >
                  <FileUp className="w-4 h-4" />
                  {submitting ? "Uploading..." : "Submit Work"}
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={!selectedFile}
                  className="px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </Card>

            {/* My Submission */}
            {mySubmission && (
              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Your Submission
                </h3>

                <div className="bg-slate-50 rounded-md p-4">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 mb-1">File Name</div>
                      <div className="font-medium text-slate-800 mb-3">{mySubmission.fileName}</div>

                      <div className="text-xs text-slate-500 mb-1">Submitted At</div>
                      <div className="text-sm text-slate-700 mb-4">
                        {mySubmission.submittedAt ? mySubmission.submittedAt.toLocaleString() : "N/A"}
                      </div>

                      {mySubmission.marks != null ? (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-md border border-emerald-100">
                          <Award className="w-5 h-5 text-emerald-600" />
                          <div>
                            <div className="font-semibold text-emerald-800">
                              Graded: {mySubmission.marks}/{mySubmission.maxMarks}
                            </div>
                            {mySubmission.feedback && (
                              <div className="text-sm text-emerald-700 mt-1">
                                "{mySubmission.feedback}"
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-800 bg-amber-50 px-3 py-2 rounded-md">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Awaiting grading</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => { !previewLoading && handlePreview(mySubmission); }}
                        disabled={previewLoading}
                        className="px-3 py-2 bg-slate-300 rounded-md hover:bg-slate-200 transition inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        <Eye className="w-4 h-4" />
                        {previewLoading ? "Loading..." : "Preview"}
                      </button>
                      <button
                        onClick={() => api.downloadSubmissionFile(mySubmission.id, mySubmission.fileName)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                  {previewUrl && (
                    <div className="mt-5 border-t pt-5">
                      {mySubmission.fileName?.toLowerCase().endsWith(".pdf") ||
                        mySubmission.fileName?.toLowerCase().endsWith(".doc") ||
                        mySubmission.fileName?.toLowerCase().endsWith(".docx") ? (
                        <iframe
                          title="submission-preview"
                          src={previewUrl}
                          className="w-full h-80 border rounded-md"
                        />
                      ) : (
                        <img
                          alt="preview"
                          src={previewUrl}
                          className="w-full max-h-80 object-contain border rounded-md"
                        />
                      )}
                      <div className="mt-3 flex justify-between items-center text-sm text-slate-500">
                        <span>File preview</span>
                        <button
                          onClick={clearPreview}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Close Preview
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Student Sidebar */}
          <div className="space-y-6">
            <Card className="p-4 bg-white border-slate-100 shadow-sm">
              <h3 className="text-md font-semibold text-slate-800 mb-3">Lab Information</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700">Subject Code</div>
                  <div className="text-slate-600">{lab.subject?.code || "—"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">Department</div>
                  <div className="text-slate-600">{lab.teacher?.department || "—"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">Lab ID</div>
                  <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                    {lab.id}
                  </div>
                </div>
              </div>
            </Card>

            {mySubmission?.status === "graded" && (
              <Card className="p-4 border-emerald-100 bg-emerald-50 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-md font-semibold text-emerald-800">Your Grade</h3>
                </div>
                <div className="text-2xl font-bold text-emerald-700 mb-1">
                  {mySubmission.marks}/{mySubmission.maxMarks}
                </div>
                <div className="text-sm text-emerald-600">
                  {((mySubmission.marks / mySubmission.maxMarks) * 100).toFixed(1)}%
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Teacher View */}
      {isTeacher && (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Total Students</div>
                    <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                  </div>
                  <Users className="w-7 h-7 text-slate-500" />
                </div>
              </Card>

              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Submitted</div>
                    <div className="text-2xl font-bold text-emerald-700">{stats.submitted}</div>
                  </div>
                  <FileUp className="w-7 h-7 text-emerald-500" />
                </div>
              </Card>

              <Card className="p-5 bg-white border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Graded</div>
                    <div className="text-2xl font-bold text-indigo-700">{stats.graded}</div>
                  </div>
                  <GraduationCap className="w-7 h-7 text-indigo-500" />
                </div>
              </Card>
            </div>

            {/* Recent Submissions */}
            <Card className="p-5 bg-white border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-7 h-7 text-slate-600" />
                  Lab Submissions
                </h3>
                <Link
                  to={`/labs/${lab.id}/grading`}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition inline-flex items-center gap-2 text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Open Grading Panel
                </Link>
              </div>

              {submissionsSample.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                  <div className="text-slate-500 font-medium">No submissions yet</div>
                  <div className="text-slate-600 text-sm mt-1">Students haven't submitted their work yet</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissionsSample.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100 hover:shadow-sm transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${s.status === 'graded' ? 'bg-emerald-600' :
                          s.fileUrl ? 'bg-indigo-600' : 'bg-slate-400'
                          }`}>
                          {s.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{s.studentName}</div>
                          <div className="text-xs text-slate-500">{s.email}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            {s.fileName} • {s.submittedAt ? s.submittedAt.toLocaleString() : 'Not submitted'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`px-4 py-4 rounded-md text-sm font-medium ${s.status === 'graded' ? 'bg-emerald-100 text-emerald-800' :
                          s.fileUrl ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {s.status === 'graded' ? `${s.marks}/${s.maxMarks}` :
                            s.fileUrl ? 'Submitted' : 'Pending'}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => !previewLoading && handlePreview(s)}
                            disabled={!s.fileUrl || previewLoading}
                            className="px-4 py-4 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                          >
                            <Eye className="w-5 h-5" />
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(s)}
                            disabled={!s.fileUrl}
                            className="px-4 py-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                          >
                            <Download className="w-5 h-5" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {submissions.length > submissionsSample.length && (
                    <div className="text-center pt-4 border-t">
                      <Link
                        to={`/labs/${lab.id}/grading`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View all {submissions.length} submissions →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Students Overview */}
            <Card className="p-5 bg-white border-slate-100 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-7 h-7 text-slate-600" />
                Students Overview
              </h3>

              {participantList.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-slate-500">No student data available</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {participantList.map(p => (
                    <div key={p.id} className="flex flex-col w-full   p-3 bg-white border border-slate-100 rounded-md hover:shadow-sm transition">
                      <div className=" flex flex-row justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${p.submitted ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.email}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className={`text-sm uppercase font-bold ${p.submitted ? 'text-emerald-600' : 'text-slate-500'
                            }`}>
                            <span className="capitalize text-base font-medium text-gray-600">Work :</span>  {p.submitted ? 'Submitted' : 'Not submitted'}
                          </div>
                          <div className={`text-sm uppercase font-bold ${p.status == "pending" ? 'text-yellow-600' : 'text-emerald-500'
                            }`}>
                            <span className="capitalize text-base font-medium text-gray-600">Grading :</span>  {p.status}
                          </div>
                          {p.marks != null && (<div className={`text-sm uppercase font-bold ${p.marks ? 'text-blue-600' : 'text-yellow-500'
                            }`}>
                            <span className="capitalize text-base font-medium text-gray-600">Score:</span>  {p.marks ? `${p.marks}/100` : "? / 100"}
                          </div>)}

                        </div>

                      </div>
                      {p.attendance ? (
                        <div className=" flex flex-col mt-5 pl-10 tracking-wide">
                          <div className="flex flex-row w-full justify-between items-center">
                            <div className="text-sm text-slate-600">
                              Clock in: {p.attendance.clockInTime?.toLocaleString() || 'Not clocked in'}
                            </div>
                            <div className="text-sm text-slate-600">
                              Clock out: {p.attendance.clockOutTime?.toLocaleString() || 'Not clocked out'}
                            </div>
                          </div>
                          {p.attendance.lateReason && (
                            <div className="text-base mt-4 font-semibold text-red-600">
                              Late Reason: {p.attendance.lateReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">
                          No attendance record
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Teacher Sidebar */}
          <div className="space-y-6">
            <Card className="p-4 bg-white border-slate-100 shadow-sm">
              <h3 className="text-md font-semibold text-slate-800 mb-3">Quick Actions</h3>

              <div className="space-y-3">
                <Link
                  to={`/labs/${lab.id}/grading`}
                  className="w-full inline-flex text-sm items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Grade Submissions
                </Link>

                <button
                  onClick={() => handleDownloadReport("csv")}
                  className="w-full inline-flex text-sm items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV Report
                </button>

                <button
                  onClick={() => handleDownloadReport("pdf")}
                  className="w-full inline-flex text-sm items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export PDF Report
                </button>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-100 shadow-sm">
              <h3 className="text-md font-semibold text-slate-800 mb-3">Lab Summary</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700">Duration</div>
                  <div className="text-slate-600">
                    {Math.round((new Date(lab.endTime) - new Date(lab.startTime)) / 60000)} minutes
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">Subject Code</div>
                  <div className="text-slate-600">{lab.subject?.code || "—"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">Department</div>
                  <div className="text-slate-600">{lab.teacher?.department || "—"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700">Lab ID</div>
                  <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                    {lab.id}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-100 shadow-sm">
              <h3 className="text-md font-semibold text-slate-800 mb-3">Completion Rate</h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Submissions</span>
                    <span className="font-medium">{stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Graded</span>
                    <span className="font-medium">{stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.total > 0 ? (stats.graded / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">File Preview</h3>
              <button
                onClick={clearPreview}
                className="p-2 hover:bg-slate-100 rounded-md transition"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {previewSubmission?.fileName?.toLowerCase().endsWith(".pdf") ||
                previewSubmission?.fileName?.toLowerCase().endsWith(".doc") ||
                previewSubmission?.fileName?.toLowerCase().endsWith(".docx") ? (
                <iframe
                  title="file-preview"
                  src={previewUrl}
                  className="w-full h-96 border rounded-md"
                />
              ) : (
                <img
                  alt="file-preview"
                  src={previewUrl}
                  className="w-full max-h-96 object-contain border rounded-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message.text && (
        <div className={`fixed bottom-6 right-6 p-3 rounded-md shadow-lg text-sm font-medium max-w-md z-40 ${message.type === "error"
          ? "bg-rose-50 text-rose-700 border border-rose-100"
          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}>
          <div className="flex items-center gap-3">
            {message.type === "error" ? (
              <XCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
            <div>{message.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}