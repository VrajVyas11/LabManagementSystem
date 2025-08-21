using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace LabManagementBackend.Models
{
// Models/Attendance.cs
public enum AttendanceStatus
{
    Present,
    Absent,
    Late,
    LateWithReason
}

public class Attendance
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string LabId { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string StudentId { get; set; }

    public DateTime? ClockInTime { get; set; }

    public DateTime? ClockOutTime { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;

    public bool AttendanceTick { get; set; } = false;

    public string LateReason { get; set; } = string.Empty; // New field
}

   
}