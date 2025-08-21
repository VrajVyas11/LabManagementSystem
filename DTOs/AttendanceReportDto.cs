using LabManagementBackend.Models;
using System;

namespace LabManagementBackend.DTOs
{
    public class AttendanceReportDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public AttendanceStatus Status { get; set; }
        public string LateReason { get; set; } = string.Empty;
        public DateTime? ClockInTime { get; set; }
        public DateTime? ClockOutTime { get; set; }
    }
}