// AttendanceService.cs
using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using MongoDB.Driver;

namespace LabManagementBackend.Services
{
    public class AttendanceService
    {
        private readonly IMongoCollection<Attendance> _attendance;
        private readonly IMongoCollection<Lab> _labs;
        private readonly UserService _userService;

        public AttendanceService(IConfiguration config, UserService userService)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _attendance = db.GetCollection<Attendance>("Attendance");
            _labs = db.GetCollection<Lab>("Labs");
            _userService = userService;
        }

        public async Task<(bool Success, string Message, Attendance? Attendance)> ClockInAsync(string studentId, ClockInDto dto)
        {
            try
            {
                // Debug logging
                Console.WriteLine($"AttendanceService.ClockInAsync called with StudentId: '{studentId}', LabId: '{dto?.LabId}'");

                if (string.IsNullOrWhiteSpace(studentId))
                    return (false, "Student ID is required.", null);

                if (dto == null || string.IsNullOrWhiteSpace(dto.LabId))
                    return (false, "Lab ID is required.", null);

                var lab = await _labs.Find(l => l.Id == dto.LabId).FirstOrDefaultAsync();
                Console.WriteLine($"Lab found: {lab != null}");

                if (lab == null)
                    return (false, "Lab not found.", null);

                var now = DateTime.UtcNow;
                Console.WriteLine($"Current time: {now}, Lab start: {lab.StartTime}, Lab end: {lab.EndTime}");

                // Convert lab times to UTC for comparison
                var labStartUtc = lab.StartTime.Kind == DateTimeKind.Utc ? lab.StartTime : lab.StartTime.ToUniversalTime();
                var labEndUtc = lab.EndTime.Kind == DateTimeKind.Utc ? lab.EndTime : lab.EndTime.ToUniversalTime();

                // Allow clock-in 15 minutes before lab starts and until lab ends
                var allowClockInFrom = labStartUtc.AddMinutes(-15);
                
                if (now < allowClockInFrom || now > labEndUtc)
                {
                    Console.WriteLine($"Clock-in time validation failed. Allow from: {allowClockInFrom}, Current: {now}, Lab end: {labEndUtc}");
                    return (false, $"Clock-in allowed from {allowClockInFrom.ToLocalTime():HH:mm} to {labEndUtc.ToLocalTime():HH:mm}.", null);
                }

                var existing = await _attendance
                    .Find(a => a.LabId == dto.LabId && a.StudentId == studentId)
                    .FirstOrDefaultAsync();

                Console.WriteLine($"Existing attendance found: {existing != null}");

                if (existing != null && existing.ClockInTime.HasValue)
                    return (false, "Already clocked in for this lab.", existing);

                var attendance = existing ?? new Attendance
                {
                    LabId = dto.LabId,
                    StudentId = studentId,
                };

                attendance.ClockInTime = now;

                // Determine if student is late (more than 10 minutes after start time)
                var isLate = now > labStartUtc.AddMinutes(10);

                if (!string.IsNullOrWhiteSpace(dto.LateReason))
                {
                    attendance.Status = AttendanceStatus.LateWithReason;
                    attendance.LateReason = dto.LateReason.Trim();
                }
                else if (isLate)
                {
                    attendance.Status = AttendanceStatus.Late;
                    attendance.LateReason = "No reason provided";
                }
                else
                {
                    attendance.Status = AttendanceStatus.Present;
                    attendance.LateReason = string.Empty;
                }

                // Set initial attendance tick
                attendance.AttendanceTick = !isLate;

                if (existing == null)
                {
                    await _attendance.InsertOneAsync(attendance);
                    Console.WriteLine("New attendance record created");
                }
                else
                {
                    await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);
                    Console.WriteLine("Existing attendance record updated");
                }

                return (true, "Clock-in successful.", attendance);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in ClockInAsync: {ex}");
                return (false, $"Clock-in failed: {ex.Message}", null);
            }
        }

        public async Task<(bool Success, string Message, Attendance? Attendance)> ClockOutAsync(string studentId, string labId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(studentId))
                    return (false, "Student ID is required.", null);

                if (string.IsNullOrWhiteSpace(labId))
                    return (false, "Lab ID is required.", null);

                var lab = await _labs.Find(l => l.Id == labId).FirstOrDefaultAsync();
                if (lab == null)
                    return (false, "Lab not found.", null);

                var now = DateTime.UtcNow;
                var labEndUtc = lab.EndTime.Kind == DateTimeKind.Utc ? lab.EndTime : lab.EndTime.ToUniversalTime();

                // Don't allow clock out after lab end time
                if (now > labEndUtc)
                    now = labEndUtc;

                var attendance = await _attendance
                    .Find(a => a.LabId == labId && a.StudentId == studentId)
                    .FirstOrDefaultAsync();

                if (attendance == null || !attendance.ClockInTime.HasValue)
                    return (false, "You must clock in first.", null);

                if (attendance.ClockOutTime.HasValue)
                    return (false, "Already clocked out.", attendance);

                attendance.ClockOutTime = now;

                // Calculate duration and determine final status
                var duration = (attendance.ClockOutTime.Value - attendance.ClockInTime.Value).TotalMinutes;
                var labDuration = (lab.EndTime - lab.StartTime).TotalMinutes;

                if (duration < 0.8 * labDuration) // Must attend at least 80% of lab
                {
                    attendance.Status = AttendanceStatus.Late;
                    attendance.AttendanceTick = false;
                }
                else if (attendance.Status == AttendanceStatus.Present)
                {
                    attendance.AttendanceTick = true;
                }

                await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);

                return (true, "Clock-out successful.", attendance);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in ClockOutAsync: {ex}");
                return (false, $"Clock-out failed: {ex.Message}", null);
            }
        }

        public async Task SetAttendanceTickIfSubmittedAsync(string labId, string studentId, bool submitted)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(labId) || string.IsNullOrWhiteSpace(studentId))
                    return;

                var attendance = await _attendance
                    .Find(a => a.LabId == labId && a.StudentId == studentId)
                    .FirstOrDefaultAsync();

                if (attendance == null)
                    return;

                if (submitted && (attendance.Status == AttendanceStatus.Present || attendance.Status == AttendanceStatus.LateWithReason))
                {
                    attendance.AttendanceTick = true;

                    await _attendance.ReplaceOneAsync(a => a.Id == attendance.Id, attendance);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in SetAttendanceTickIfSubmittedAsync: {ex}");
            }
        }

        public async Task<Attendance?> GetStudentAttendanceAsync(string studentId, string labId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(studentId) || string.IsNullOrWhiteSpace(labId))
                    return null;

                return await _attendance.Find(a => a.StudentId == studentId && a.LabId == labId).FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in GetStudentAttendanceAsync: {ex}");
                return null;
            }
        }

        public async Task<List<AttendanceReportDto>> GetAttendanceReportByLabAsync(string labId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(labId))
                    return new List<AttendanceReportDto>();

                var filter = Builders<Attendance>.Filter.Eq(a => a.LabId, labId);
                var attendanceList = await _attendance.Find(filter).ToListAsync();

                var studentIds = attendanceList
                    .Select(a => a.StudentId)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList();

                var users = new List<User>();
                if (studentIds.Count > 0)
                {
                    users = await _userService.GetUsersByIdsAsync(studentIds);
                }

                var report = attendanceList.Select(a =>
                {
                    var user = users.FirstOrDefault(u => u.Id == a.StudentId);
                    return new AttendanceReportDto
                    {
                        StudentId = a.StudentId,
                        StudentName = user?.Name ?? "Unknown",
                        Status = a.Status,
                        LateReason = a.LateReason ?? string.Empty,
                        ClockInTime = a.ClockInTime,
                        ClockOutTime = a.ClockOutTime
                    };
                }).OrderBy(r => r.StudentName).ToList();

                return report;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in GetAttendanceReportByLabAsync: {ex}");
                return new List<AttendanceReportDto>();
            }
        }
    }
}