using System;

namespace LabManagementBackend.DTOs
{
    public class CreateLabDto
    {
        public string SubjectId { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public DateTime SubmissionDeadline { get; set; }
    }

    public class LabDto
    {
        public string Id { get; set; }

        public string SubjectId { get; set; }

        public string TeacherId { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public DateTime SubmissionDeadline { get; set; }
    }
}