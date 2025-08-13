using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using System.IO;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/submissions")]
    [Produces("application/json")]
    public class SubmissionsController : ControllerBase
    {
        private readonly SubmissionService _submissionService;
        private readonly NotificationService _notificationService;

        public SubmissionsController(SubmissionService submissionService, NotificationService notificationService)
        {
            _submissionService = submissionService;
            _notificationService = notificationService;
        }

        /// <summary>
        /// Upload a lab submission file.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Student")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 20 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadSubmission([FromForm] UploadSubmissionRequest request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest(new { message = "File is required." });

            if (string.IsNullOrWhiteSpace(request.LabId))
                return BadRequest(new { message = "Lab ID is required." });

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(studentId))
                return Unauthorized(new { message = "Student ID not found in user claims." });

            try
            {
                var submission = await _submissionService.UploadSubmissionAsync(studentId, request.LabId, request.File);
                return Ok(submission);
            }
            catch (Exception ex)
            {
                // Consider logging the exception
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET /api/submissions/lab/{labId}
        [HttpGet("lab/{labId}")]
        [Authorize(Roles = "Teacher,Student")]
        public async Task<IActionResult> GetByLab(string labId)
        {
            if (string.IsNullOrWhiteSpace(labId)) return BadRequest(new { message = "labId required" });
            try
            {
                var list = await _submissionService.GetSubmissionsByLabAsync(labId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                // log
                return StatusCode(500, new { message = "Failed to fetch submissions", detail = ex.Message });
            }
        }

        // GET /api/submissions/student/{studentId}
        [HttpGet("student/{studentId}")]
        [Authorize(Roles = "Teacher,Student")]
        public async Task<IActionResult> GetByStudent(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId)) return BadRequest(new { message = "studentId required" });
            try
            {
                var list = await _submissionService.GetSubmissionsByStudentAsync(studentId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                // log
                return StatusCode(500, new { message = "Failed to fetch submissions", detail = ex.Message });
            }
        }

        // POST /api/submissions/{submissionId}/grade
        [HttpPost("{submissionId}/grade")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> GradeSubmission(string submissionId, [FromBody] GradeDto dto)
        {
            if (string.IsNullOrWhiteSpace(submissionId)) return BadRequest(new { message = "submissionId required" });

            try
            {
                // Validate input
                if (dto == null) return BadRequest(new { message = "payload required" });
                if (dto.maxMarks <= 0) return BadRequest(new { message = "maxMarks must be > 0" });

                var updated = await _submissionService.UpdateSubmissionFeedbackAsync(submissionId, dto.feedback ?? string.Empty, dto.marks);

                if (updated == null)
                {
                    // If UpdateSubmissionFeedbackAsync didn't return, attempt to update marks via a separate method if you have it.
                    // For now, return not found if not modified.
                    return NotFound(new { message = "Submission not found or not updated" });
                }

                // Notify student
                if (!string.IsNullOrWhiteSpace(updated.StudentId))
                {
                    var notif = new Notification
                    {
                        UserId = updated.StudentId,
                        Title = "Submission Graded",
                        Message = $"Your submission for lab {updated.LabId} has been graded. Check feedback.",
                        Priority = NotificationPriority.Medium,
                        EntityType = "submission",
                        EntityId = updated.Id
                    };

                    await _notificationService.CreateAsync(notif);
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                // log
                return StatusCode(500, new { message = "Failed to grade submission", detail = ex.Message });
            }
        }

        // GET /api/submissions/{id}/download
        [HttpGet("{id}/download")]
        [Authorize]
        public async Task<IActionResult> Download(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return BadRequest(new { message = "id required" });

            try
            {
                var submission = await _submissionService.GetSubmissionAsyncByIdAsync(id);
                if (submission == null) return NotFound(new { message = "Submission not found" });

                // submission.FileUrl is expected to be a URL or a server-local path.
                // Use FileHelper (you already use in SubmissionService) to stream file.
                var stream = FileHelper.GetFileStream(submission.FileUrl);
                if (stream == null) return NotFound(new { message = "File not found on storage" });

                var fileName = FileHelper.GetFileNameFromUrl(submission.FileUrl) ?? (submission.FileName ?? "submission");
                return File(stream, "application/octet-stream", fileName);
            }
            catch (Exception ex)
            {
                // log
                return StatusCode(500, new { message = "Failed to download file", detail = ex.Message });
            }
        }
        [HttpGet("my")]
        [Authorize(Roles = "Student,Teacher")]
        public async Task<IActionResult> GetMySubmission([FromQuery] string labId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (string.IsNullOrWhiteSpace(labId)) return BadRequest(new { message = "labId required" });

            var sub = await _submissionService.GetSubmissionAsync(userId, labId);
            if (sub == null) return NotFound();
            return Ok(sub);
        }

    }
}