// src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import Card from "../components/Card";
import { Bell, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const getStatusColor = (read) =>
  read ? "text-gray-500 bg-gray-100" : "text-blue-700 bg-blue-50";

const getStatusIcon = (read) =>
  read ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
      const fetchNotifications = async (pageNum) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getNotificationsPaged(pageNum,pageSize);
      setNotifications(res.notifications);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };
    fetchNotifications(page);
  }, [page, pageSize]);

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <Card>
        <h2 className="text-xl font-semibold mb-4">All Notifications</h2>
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No notifications</div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-4 rounded-lg border-l-4 cursor-pointer ${
                  getStatusColor(n.read)
                }`}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  // Optionally navigate based on entityType/entityId
                }}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(n.read)}
                  <div>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        <div className="flex justify-between mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}