namespace LabManagementBackend.DTOs
{
    public class SubmissionResponseDto
    {
        public string Id { get; set; }

        public string LabId { get; set; }

        public string StudentId { get; set; }

        public string FileUrl { get; set; }

        public string Feedback { get; set; }

        public int? Marks { get; set; }
    }
}