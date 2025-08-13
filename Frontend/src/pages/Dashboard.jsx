// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, Users, Timer, BookOpen } from "lucide-react";
import useAuth from "../auth/useAuth";
import Card from "../components/Card";
import { api } from "../api";

// Utility functions
const getLabStatus = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "active";
  return "finished";
};

const formatTimeRemaining = (targetTime) => {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Status Badge Component
const StatusBadge = ({ status, children }) => {
  const styles = {
    upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    finished: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {children}
    </span>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch labs
    let mounted = true;
    api
      .listLabs()
      .then((data) => {
        if (!mounted) return;
        // Normalize dates (some DTOs may have StartTime property)
        const normalized = (data || []).map((l) => ({
          id: l.id ?? l.Id ?? l._id,
          startTime: l.startTime ?? l.StartTime ?? l.startTimeString ?? l.StartTimeString ?? l.startTime,
          endTime: l.endTime ?? l.EndTime ?? l.endTimeString ?? l.EndTimeString ?? l.endTime,
          subject: l.subject ?? l.Subject ?? (l.subjectDoc ? { name: l.subjectDoc.Name, code: l.subjectDoc.Code } : null),
          teacher: l.teacher ?? l.Teacher ?? (l.teacherDoc ? { name: l.teacherDoc.Name } : null),
          // keep raw doc for further things
          raw: l,
        }));
        setLabs(normalized);
      })
      .catch((err) => {
        console.error("Failed to load labs:", err);
        setLabs([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // classify labs
  const upcomingLabs = labs.filter((lab) => {
    // upcoming = start > now
    try {
      const start = new Date(lab.startTime);
      // const end = new Date(lab.endTime);
      const now = new Date();
      return start > now;
    } catch {
      return false;
    }
  });

  const activeLabs = labs.filter((lab) => {
    try {
      const start = new Date(lab.startTime);
      const end = new Date(lab.endTime);
      const now = new Date();
      return now >= start && now <= end;
    } catch {
      return false;
    }
  });

  const finishedLabs = labs.filter((lab) => {
    try {
      const end = new Date(lab.endTime);
      const now = new Date();
      return end < now;
    } catch {
      return false;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
            <p className="text-slate-600 mt-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} • MSU FoTE
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role?.toLowerCase() === "teacher" ? (
              <>
                <Link
                  to="/labs/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Create Lab
                </Link>
                <Link
                  to="/labs"
                  className="bg-white border border-slate-300 hover:border-slate-400 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Manage Labs
                </Link>
              </>
            ) : (
              <Link
                to="/labs"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                View All Labs
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Labs</p>
                <p className="text-3xl font-bold text-slate-900">{labs.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active Labs</p>
                <p className="text-3xl font-bold text-slate-900">{activeLabs.length}</p>
              </div>
              <Timer className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Upcoming</p>
                <p className="text-3xl font-bold text-slate-900">{upcomingLabs.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Active Labs */}
        {activeLabs.length > 0 && (
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Active Labs</h3>
                <p className="text-slate-600">Labs currently in session</p>
              </div>
            </div>
            <div className="grid gap-4">
              {activeLabs.map((lab) => (
                <div key={lab.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                      <h4 className="font-semibold text-slate-900">{lab.subject?.name || "Unnamed Lab"}</h4>
                      <p className="text-sm text-slate-600">{lab.subject?.code || "N/A"} • {lab.teacher?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="active">
                      <Timer className="w-3 h-3" />
                      Active
                    </StatusBadge>
                    <Link to={`/labs/${lab.id}`} className="block mt-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                      Join Lab →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}


        {/* Finished Labs (separate section) */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Finished Labs</h3>
              <p className="text-slate-600">Past labs that have ended (click to view submissions & grade)</p>
            </div>
          </div>

          {finishedLabs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No finished labs yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {finishedLabs.map((lab) => {
                const end = new Date(lab.endTime);
                return (
                  <div key={lab.id} className="flex items-center justify-between p-6 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{new Date(lab.startTime).getDate()}</div>
                        <div className="text-xs text-slate-600 uppercase">{new Date(lab.startTime).toLocaleDateString("en", { month: "short" })}</div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">{lab.subject?.name || "Unnamed Lab"}</h4>
                        <p className="text-slate-600 flex items-center gap-2"><BookOpen className="w-4 h-4" /> {lab.subject?.code || "N/A"} • {lab.teacher?.name || "Unknown"}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1"><Clock className="w-4 h-4" /> Ended {end.toLocaleDateString()} • {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge status="finished">
                        <Clock className="w-3 h-3" />
                        Finished
                      </StatusBadge>

                      <div className="mt-3 space-y-2">
                        <div className="mt-3 space-y-2">
                          {user?.role?.toString().toLowerCase() !== "teacher" ? (
                            <Link to={`/labs/${lab.id}/grading`} className="block text-sm text-blue-600 hover:text-blue-700 font-medium">View Submissions & Grade →</Link>
                          ) : (
                            <Link to={`/labs/${lab.id}`} className="block text-sm text-blue-600 hover:text-blue-700 font-medium">View Submissions</Link>
                          )}
                          <Link to={`/labs/${lab.id}`} className="block text-xs text-slate-500 hover:text-slate-700">View Lab details</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Labs */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Upcoming Labs</h3>
              <p className="text-slate-600">Your scheduled lab sessions</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading labs...</p>
            </div>
          ) : upcomingLabs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No scheduled labs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingLabs.map((lab) => {
                const status = getLabStatus(lab.startTime, lab.endTime);
                const timeRemaining = status === "upcoming" ? formatTimeRemaining(lab.startTime) : null;

                return (
                  <div key={lab.id} className="flex items-center justify-between p-6 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{new Date(lab.startTime).getDate()}</div>
                        <div className="text-xs text-slate-600 uppercase">{new Date(lab.startTime).toLocaleDateString("en", { month: "short" })}</div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">{lab.subject?.name || "Unnamed Lab"}</h4>
                        <p className="text-slate-600 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {lab.subject?.code || "N/A"} • {lab.teacher?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(lab.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(lab.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={status}>
                        {status === "upcoming" && <Clock className="w-3 h-3" />}
                        {status === "active" && <Timer className="w-3 h-3" />}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </StatusBadge>
                      {timeRemaining && <p className="text-xs text-slate-600 mt-1">Starts in {timeRemaining}</p>}
                      <Link to={`/labs/${lab.id}`} className="block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">View Details →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}