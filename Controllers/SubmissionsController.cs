// Controllers/SubmissionsController.cs
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
using Microsoft.Net.Http.Headers;
using System.Linq;
using System.Collections.Generic;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/submissions")]
    [Produces("application/json")]
    public class SubmissionsController : ControllerBase
    {
        private readonly SubmissionService _submissionService;
        private readonly NotificationService _notificationService;
        private readonly UserService _userService;

        public SubmissionsController(
            SubmissionService submissionService,
            NotificationService notificationService,
            UserService userService)
        {
            _submissionService = submissionService;
            _notificationService = notificationService;
            _userService = userService;
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

                // Create download DTO and populate student info (best-effort)
                var dto = MapToDownloadDto(submission);

                try
                {
                    var user = await _userService.GetUserByIdAsync(studentId);
                    if (user != null)
                    {
                        dto.StudentName = user.Name;
                        dto.Email = user.Email;
                    }
                }
                catch
                {
                    // ignore user lookup errors
                }

                return Ok(dto);
            }
            catch (Exception ex)
            {
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
                if (list == null)
                {
                    return Ok(new List<SubmissionDownloadDtos>());
                }

                // Map submissions to Download DTOs
                var downloadDtos = list.Select(MapToDownloadDto).ToList();

                // Batch fetch user info for all studentIds present
                var studentIds = downloadDtos
                    .Where(d => !string.IsNullOrWhiteSpace(d.StudentId))
                    .Select(d => d.StudentId)
                    .Distinct()
                    .ToList();

                if (studentIds.Count > 0)
                {
                    try
                    {
                        var users = await _userService.GetUsersByIdsAsync(studentIds);
                        var userById = users
                            .Where(u => u != null && !string.IsNullOrWhiteSpace(u.Id))
                            .ToDictionary(u => u.Id, u => u);

                        foreach (var dto in downloadDtos)
                        {
                            if (!string.IsNullOrWhiteSpace(dto.StudentId) && userById.TryGetValue(dto.StudentId, out var user))
                            {
                                dto.StudentName = user.Name;
                                dto.Email = user.Email;
                            }
                        }
                    }
                    catch
                    {
                        // If user lookup fails, we still return DTOs without names/emails
                    }
                }

                return Ok(downloadDtos);
            }
            catch (Exception ex)
            {
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
                if (list == null) return Ok(new List<SubmissionDownloadDtos>());

                var downloadDtos = list.Select(MapToDownloadDto).ToList();

                // Attempt to fetch student once and fill all DTOs
                try
                {
                    var user = await _userService.GetUserByIdAsync(studentId);
                    if (user != null)
                    {
                        foreach (var dto in downloadDtos)
                        {
                            dto.StudentName = user.Name;
                            dto.Email = user.Email;
                        }
                    }
                }
                catch
                {
                    // ignore
                }

                return Ok(downloadDtos);
            }
            catch (Exception ex)
            {
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
                if (dto == null) return BadRequest(new { message = "payload required" });
                if (dto.maxMarks <= 0) return BadRequest(new { message = "maxMarks must be > 0" });

                var updated = await _submissionService.UpdateSubmissionFeedbackAsync(submissionId, dto.feedback ?? string.Empty, dto.marks);

                if (updated == null)
                {
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

                // Map to DTO and populate student info (best-effort)
                var resultDto = MapToDownloadDto(updated);

                try
                {
                    if (!string.IsNullOrWhiteSpace(updated.StudentId))
                    {
                        var user = await _userService.GetUserByIdAsync(updated.StudentId);
                        if (user != null)
                        {
                            resultDto.StudentName = user.Name;
                            resultDto.Email = user.Email;
                        }
                    }
                }
                catch
                {
                    // ignore
                }

                return Ok(resultDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to grade submission", detail = ex.Message });
            }
        }

        // GET /api/submissions/{id}/download
        [HttpGet("{id}/download")]
        [Authorize(Roles = "Student,Teacher")]
        public async Task<IActionResult> Download(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return BadRequest(new { message = "id required" });

            try
            {
                var submission = await _submissionService.GetSubmissionAsyncByIdAsync(id);
                if (submission == null) return NotFound(new { message = "Submission not found" });

                var stream = FileHelper.GetFileStream(submission.FileUrl);
                if (stream == null) return NotFound(new { message = "File not found on storage" });

                var contentType = FileHelper.GetContentTypeFromFileName(submission.FileName ?? submission.FileUrl) ?? "application/octet-stream";

                // Set inline disposition so browser can preview (iframe) but still allow download in frontend
                Response.Headers[HeaderNames.ContentDisposition] = $"inline; filename=\"{Path.GetFileName(submission.FileName ?? submission.FileUrl)}\"";

                return File(stream, contentType);
            }
            catch (Exception ex)
            {
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

            var dto = MapToDownloadDto(sub);

            try
            {
                var user = await _userService.GetUserByIdAsync(userId);
                if (user != null)
                {
                    dto.StudentName = user.Name;
                    dto.Email = user.Email;
                }
            }
            catch { /* ignore */ }

            return Ok(dto);
        }

        // Helper: map Submission model to SubmissionDownloadDtos
        private static SubmissionDownloadDtos MapToDownloadDto(Submission submission)
        {
            if (submission == null) return new SubmissionDownloadDtos();

            return new SubmissionDownloadDtos
            {
                Id = submission.Id,
                LabId = submission.LabId,
                StudentId = submission.StudentId,
                FileUrl = submission.FileUrl,
                SubmittedAt = submission.SubmittedAt,
                Feedback = submission.Feedback,
                Marks = submission.Marks,
                FileName = submission.FileName,
                FileSize = submission.FileSize
            };
        }
    }
}