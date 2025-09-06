using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace LabManagementBackend.DTOs
{
    public class ClockInDto
    {
        [Required]
        [JsonPropertyName("labId")]
        public string LabId { get; set; }

        [JsonPropertyName("lateReason")]
        public string? LateReason { get; set; }
    }
    public class ClockOutDto
    {
        public string LabId { get; set; }
    }
}