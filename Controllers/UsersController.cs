using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;

        public UsersController(UserService userService)
        {
            _userService = userService;
        }

        // Get current user profile
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null) return NotFound();
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                Role = user.Role.ToString(),
                user.Department,
                user.SubjectIds,
                user.ContactNumber,
                user.Bio
            });
        }

        // Update current user profile (PUT /api/users/me)
        public class UpdateProfileDto
        {
            [Required]
            [StringLength(100, MinimumLength = 2)]
            public string Name { get; set; }

            [StringLength(100)]
            public string Department { get; set; }

            [Phone]
            [StringLength(20)]
            public string ContactNumber { get; set; }

            [StringLength(1000)]
            public string Bio { get; set; }
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateProfileDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var existing = await _userService.GetUserByIdAsync(userId);
            if (existing == null) return NotFound();

            // Apply allowed updates only (do not allow role/email changes here)
            existing.Name = dto.Name?.Trim() ?? existing.Name;
            existing.Department = dto.Department?.Trim() ?? existing.Department;
            existing.ContactNumber = dto.ContactNumber?.Trim() ?? existing.ContactNumber;
            existing.Bio = dto.Bio?.Trim() ?? existing.Bio;

            var updated = await _userService.UpdateUserAsync(existing);

            // Return a normalized response (similar to GET /me)
            return Ok(new
            {
                updated.Id,
                updated.Name,
                updated.Email,
                Role = updated.Role.ToString(),
                updated.Department,
                updated.SubjectIds,
                updated.ContactNumber,
                updated.Bio
            });
        }

        // Get all users (Teacher only)
        [HttpGet]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }
    }
}