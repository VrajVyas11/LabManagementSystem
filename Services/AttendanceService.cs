using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class AttendanceService
    {
        private readonly IMongoCollection<Attendance> _attendance;
        private readonly IMongoCollection<Lab> _labs;

        public AttendanceService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _attendance = db.GetCollection<Attendance>("Attendance");
            _labs = db.GetCollection<Lab>("Labs");
        }

        public async Task<(bool Success, string Message, Attendance Attendance)> ClockInAsync(string studentId, string labId)
        {
            var lab = await _labs.Find(l => l.Id == labId).FirstOrDefaultAsync();
            if (lab == null)
                return (false, "Lab not found.", null);

            var now = DateTime.UtcNow;
            if (now < lab.StartTime.ToUniversalTime() || now > lab.EndTime.ToUniversalTime())
                return (false, "Clock-in allowed only during lab time.", null);

            var existing = await _attendance.Find(a => a.LabId == labId && a.StudentId == studentId).FirstOrDefaultAsync();
            if (existing != null && existing.ClockInTime != null)
                return (false, "Already clocked in for this lab.", existing);

            var attendance = existing ?? new Attendance
            {
                LabId = labId,
                StudentId = studentId
            };

            attendance.ClockInTime = now;
            attendance.Status = AttendanceStatus.Present;

            if (existing == null)
                await _attendance.InsertOneAsync(attendance);
            else
                await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);

            return (true, "Clock-in successful.", attendance);
        }

        public async Task<(bool Success, string Message, Attendance Attendance)> ClockOutAsync(string studentId, string labId)
        {
            var lab = await _labs.Find(l => l.Id == labId).FirstOrDefaultAsync();
            if (lab == null)
                return (false, "Lab not found.", null);

            var now = DateTime.UtcNow;
            if (now > lab.EndTime.ToUniversalTime())
                now = lab.EndTime.ToUniversalTime(); // Auto clock out at lab end time

            var attendance = await _attendance.Find(a => a.LabId == labId && a.StudentId == studentId).FirstOrDefaultAsync();
            if (attendance == null || attendance.ClockInTime == null)
                return (false, "You must clock in first.", null);

            if (attendance.ClockOutTime != null)
                return (false, "Already clocked out.", attendance);

            attendance.ClockOutTime = now;

            // Calculate attendance duration
            var duration = (attendance.ClockOutTime.Value - attendance.ClockInTime.Value).TotalMinutes;
            var labDuration = (lab.EndTime - lab.StartTime).TotalMinutes;

            if (duration < 0.9 * labDuration)
            {
                attendance.Status = AttendanceStatus.Late;
                attendance.AttendanceTick = false;
            }
            else
            {
                attendance.Status = AttendanceStatus.Present;
                // AttendanceTick will be set true only after submission
            }

            await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);

            return (true, "Clock-out successful.", attendance);
        }

        public async Task SetAttendanceTickIfSubmittedAsync(string labId, string studentId, bool submitted)
        {
            var attendance = await _attendance.Find(a => a.LabId == labId && a.StudentId == studentId).FirstOrDefaultAsync();
            if (attendance == null) return;

            if (submitted && attendance.Status == AttendanceStatus.Present)
            {
                attendance.AttendanceTick = true;
                await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);
            }
        }
    }
}