// DTOs/NotificationPreferenceUpdateDto.cs
namespace LabManagementBackend.DTOs
{
    public class NotificationPreferenceUpdateDto
    {
        public bool LabStarting { get; set; } = true;
        public bool SubmissionGraded { get; set; } = true;
        public bool Generic { get; set; } = true;
    }
}