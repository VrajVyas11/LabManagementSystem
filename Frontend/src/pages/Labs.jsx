import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar, Upload, Timer, CheckCircle, XCircle, BookOpen, SquareArrowOutUpRight } from "lucide-react";
import Card from "../components/Card";
import { api } from "../api";

// Utility functions
const getLabStatus = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'ended';
};

const getSubmissionStatus = (submissionDeadline) => {
  const now = new Date();
  const deadline = new Date(submissionDeadline);
  return now <= deadline ? 'open' : 'closed';
};

// Status Badge Component
const StatusBadge = ({ status, children }) => {
  const styles = {
    upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    ended: "bg-slate-50 text-slate-700 border-slate-200",
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-red-50 text-red-700 border-red-200"
  };
  
  return (
    <span className={`inline-flex ml-3 items-center gap-3 px-3 py-1 rounded-lg text-sm font-medium border ${styles[status]}`}>
      {children}
    </span>
  );
};

export default function Labs() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.listLabs().then((data) => {
      setLabs(data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredLabs = labs.filter(lab => {
    const status = getLabStatus(lab.startTime, lab.endTime);
    if (filter === 'all') return true;
    return status === filter;
  });

  const filterOptions = [
    { value: 'all', label: 'All Labs', count: labs.length },
    { value: 'upcoming', label: 'Upcoming', count: labs.filter(l => getLabStatus(l.startTime, l.endTime) === 'upcoming').length },
    { value: 'active', label: 'Active', count: labs.filter(l => getLabStatus(l.startTime, l.endTime) === 'active').length },
    { value: 'ended', label: 'Ended', count: labs.filter(l => getLabStatus(l.startTime, l.endTime) === 'ended').length }
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Lab Sessions</h2>
            <p className="text-slate-600 mt-2">Manage and track all your laboratory sessions</p>
          </div>
          <Link to="/dashboard" className="text-slate-600 hover:text-slate-800 font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filter Tabs */}
          <div className="flex gap-1 bg-white shadow-md rounded-xl">
            
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs opacity-75">({option.count})</span>
              </button>
            ))}
          </div>

        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading labs...</p>
            </div>
          ) : filteredLabs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No labs found for the selected filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLabs.map((lab) => {
                const status = getLabStatus(lab.startTime, lab.endTime);
                const submissionStatus = getSubmissionStatus(lab.submissionDeadline);
                
                return (
                  <div key={lab.id} 
                  style={{
                    borderRadius:999,
                    borderTopRightRadius:300,
                  borderBottomRightRadius:300
                  }}
                  className="flex items-center bg-blue-50/50 justify-between p-6 border border-slate-200  hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="text-center bg-blue-500/20 rounded-full p-3 px-7 min-w-[60px]">
                        <div className="text-3xl font-bold text-slate-900">
                          {new Date(lab.startTime).getDate()}
                        </div>
                        <div className="text-sm text-slate-600 uppercase">
                          {new Date(lab.startTime).toLocaleDateString('en', { month: 'short' })}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-semibold text-slate-900">{lab.subject?.name || 'Unnamed Lab'}</h4>
                        <p className="text-slate-600 flex items-center mt-1 gap-2">
                          <BookOpen className="w-4 h-4" />
                          {lab.subject?.code || 'N/A'} • {lab.teacher?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-2 ">
                          <Clock className="w-4 h-4" />
                          {new Date(lab.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <StatusBadge status={status}>
                        {status === 'upcoming' && <Clock className="w-5 h-5" />}
                        {status === 'active' && <Timer className="w-5 h-5" />}
                        {status === 'ended' && <CheckCircle className="w-5 h-5" />}
                        <>Lab {status.charAt(0).toUpperCase() + status.slice(1)}</>
                      </StatusBadge>
                      {status === 'ended' && (
                        <StatusBadge status={submissionStatus}>
                          {submissionStatus === 'open' ? <Upload className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          Submissions {submissionStatus}
                        </StatusBadge>
                      )}
                      <Link 
                        to={`/labs/${lab.id}`} 
                        className=" bg-blue-600 w-fit flex justify-center flex-row gap-3 justify-self-end text-center hover:bg-blue-700 text-white px-16 py-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        Open Lab Session Details <SquareArrowOutUpRight className="w-5 h-5"/>
                      </Link>
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