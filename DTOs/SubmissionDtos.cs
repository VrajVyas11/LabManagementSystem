// File: DTOs/SubmissionDtos.cs
using System.ComponentModel.DataAnnotations;

namespace LabManagementBackend.DTOs
{
    public class SubmissionDtos
    {
        public string Id { get; set; } = string.Empty;

        [Required]
        public string LabId { get; set; } = string.Empty;

        [Required]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        public string FileUrl { get; set; } = string.Empty;

        public DateTime SubmittedAt { get; set; }

        public string? Feedback { get; set; }

        public int? Marks { get; set; }

        public string? FileName { get; set; }

        public long? FileSize { get; set; }
    }

       public class UploadSubmissionRequest
    {
        [Required]
        public IFormFile File { get; set; } = null!;

        [Required]
        public string LabId { get; set; } = string.Empty;
    }

    public class ErrorResponse
    {
        public string Message { get; set; } = string.Empty;

        public string? Details { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class SuccessResponse<T>
    {
        public bool Success { get; set; } = true;

        public T Data { get; set; } = default!;

        public string? Message { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    // File upload specific DTOs
    public class FileUploadResponse
    {
        public string FileUrl { get; set; } = string.Empty;

        public string FileName { get; set; } = string.Empty;

        public long FileSize { get; set; }

        public string ContentType { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}