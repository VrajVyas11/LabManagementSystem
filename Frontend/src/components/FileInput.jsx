import React from "react";

export default function FileInput({ onChange, accept }) {
  return (
    <label className="file-drop cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded bg-primary/10">
          <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 15a4 4 0 004 4h8a4 4 0 000-8h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div>
          <div className="font-medium">Attach file</div>
          <div className="text-sm muted">PDF, DOCX, PNG, JPG · Max 50MB</div>
        </div>
      </div>

      <input
        type="file"
        accept={accept || ".pdf,.doc,.docx,.png,.jpg,.jpeg"}
        onChange={(e) => onChange(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}