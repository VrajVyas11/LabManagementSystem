// src/pages/NotificationPreferences.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";
import Card from "../components/Card";

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState({
    labStarting: true,
    submissionGraded: true,
    generic: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    api.getNotificationPreferences()
      .then((data) => {
        if (!mounted) return;
        setPrefs({
          labStarting: data.labStarting ?? true,
          submissionGraded: data.submissionGraded ?? true,
          generic: data.generic ?? true,
        });
      })
      .catch(() => {
        // fallback defaults
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.updateNotificationPreferences(prefs);
      setMessage("Preferences saved successfully.");
    } catch {
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-xl mx-auto mt-8">
      <Card>
        <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="labStarting"
              checked={prefs.labStarting}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span>Notify me about new lab sessions</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="submissionGraded"
              checked={prefs.submissionGraded}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span>Notify me when submissions are graded</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="generic"
              checked={prefs.generic}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span>Receive other notifications</span>
          </label>
        </div>
        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </Card>
    </div>
  );
}