using LabManagementBackend.DTOs;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _attendanceService;

        public AttendanceController(AttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        [HttpPost("clockin")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ClockIn(ClockInDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var (success, message, attendance) = await _attendanceService.ClockInAsync(studentId, dto.LabId);
            if (!success) return BadRequest(new { message });
            return Ok(attendance);
        }

        [HttpPost("clockout")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ClockOut(ClockOutDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var (success, message, attendance) = await _attendanceService.ClockOutAsync(studentId, dto.LabId);
            if (!success) return BadRequest(new { message });
            return Ok(attendance);
        }
    }
}