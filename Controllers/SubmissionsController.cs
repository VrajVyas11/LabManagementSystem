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
        /// Upload a lab submission file
        /// </summary>
        /// <param name="file">The file to upload (max 20MB)</param>
        /// <param name="labId">The ID of the lab</param>
        /// <returns>The uploaded submission details</returns>
        [HttpPost]
        [Authorize(Roles = "Student")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 20 * 1024 * 1024)]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UploadSubmission(
            [FromForm] IFormFile file,
            [FromForm] string labId)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "File is required." });

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            try
            {
                var submission = await _submissionService.UploadSubmissionAsync(studentId, labId, file);
                return Ok(submission);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}