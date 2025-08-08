using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

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

        // Create Lab (Teacher only)
        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> CreateLab(CreateLabDto dto)
        {
            var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new System.Exception("Teacher id not found");
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

        // Get aggregated lab by id (embedded subject and teacher)
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetLab(string id)
        {
            var lab = await _labService.GetAggregatedLabByIdAsync(id);
            if (lab == null) return NotFound();
            return Ok(lab);
        }

        // Get all aggregated labs
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var labs = await _labService.GetAllAggregatedLabsAsync();
            return Ok(labs);
        }
    }
}