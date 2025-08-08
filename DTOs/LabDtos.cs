using System;

namespace LabManagementBackend.DTOs
{
    // Used to create a lab (same as before)
    public class CreateLabDto
    {
        public required string SubjectId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime SubmissionDeadline { get; set; }
    }

    // Returned subject DTO (subset of Subject model)
    public class SubjectDto
    {
        public required string Id { get; set; }
        public required string Name { get; set; }
        public required string Code { get; set; }
    }

    // Returned teacher/user DTO (subset of User model)
    public class TeacherDto
    {
        public required string Id { get; set; }
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Role { get; set; }
        public required string Department { get; set; }
    }

    // Aggregated Lab DTO containing embedded teacher & subject
    public class LabAggregateDto
    {
        public  string Id { get; set; }
        public  SubjectDto Subject { get; set; }
        public  TeacherDto Teacher { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public DateTime SubmissionDeadline { get; set; }
        public bool NotificationSent { get; set; }
    }
}