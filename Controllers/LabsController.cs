using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/labs")]
    public class LabsController : ControllerBase
    {
        private readonly LabService _labService;

        public LabsController(LabService labService)
        {
            _labService = labService;
        }

        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> CreateLab(CreateLabDto dto)
        {
            var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            try
            {
                var lab = await _labService.CreateLabAsync(dto, teacherId);
                return CreatedAtAction(nameof(GetLab), new { id = lab.Id }, lab);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetLab(string id)
        {
            var lab = await _labService.GetLabByIdAsync(id);
            if (lab == null) return NotFound();
            return Ok(lab);
        }
    }
}