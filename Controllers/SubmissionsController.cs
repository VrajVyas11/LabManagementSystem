using LabManagementBackend.DTOs;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/submissions")]
    [Produces("application/json")]
    public class SubmissionsController : ControllerBase
    {
        private readonly SubmissionService _submissionService;

        public SubmissionsController(SubmissionService submissionService)
        {
            _submissionService = submissionService;
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
            {
                return BadRequest(new { message = "File is required." });
            }

            if (string.IsNullOrWhiteSpace(request.LabId))
            {
                return BadRequest(new { message = "Lab ID is required." });
            }

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(studentId))
            {
                return Unauthorized(new { message = "Student ID not found in user claims." });
            }

            try
            {
                var submission = await _submissionService.UploadSubmissionAsync(studentId, request.LabId, request.File);
                return Ok(submission);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}