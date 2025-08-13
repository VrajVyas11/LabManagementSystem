using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/labs")]
    public class LabsController : ControllerBase
    {
        private readonly LabService _labService;
        private readonly NotificationService _notificationService;
        private readonly UserService _userService;
        private readonly SubjectService _subjectService;

        public LabsController(
            LabService labService,
            NotificationService notificationService,
            UserService userService,
            SubjectService subjectService) // inject here
        {
            _labService = labService;
            _notificationService = notificationService;
            _userService = userService;
            _subjectService = subjectService; // assign to field
        }

        // Create Lab (Teacher only)
        [HttpPost]
        [Authorize(Roles = "Teacher")]
        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> CreateLab(CreateLabDto dto)
        {
            var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new Exception("Teacher id not found");
            try
            {
                var lab = await _labService.CreateLabAsync(dto, teacherId);

                // Resolve subject name once
                string subjectName = dto.SubjectId;
                try
                {
                    var subject = await _subjectService.GetByIdAsync(dto.SubjectId);
                    if (subject != null && !string.IsNullOrWhiteSpace(subject.Name))
                    {
                        subjectName = subject.Name;
                    }
                }
                catch
                {
                    // If subject lookup fails, fall back to id
                    subjectName = dto.SubjectId;
                }

                // Find students enrolled in the subject (User.SubjectIds contains SubjectId)
                var students = await _userService.GetUsersBySubjectIdAsync(dto.SubjectId);

                if (students != null && students.Count > 0)
                {
                    foreach (var student in students)
                    {
                        var n = new Notification
                        {
                            UserId = student.Id,
                            EntityType = "lab",
                            EntityId = lab.Id,
                            Title = $"New lab scheduled: {subjectName}",
                            Message = $"A new lab for subject {subjectName} is scheduled {lab.StartTime:u} - {lab.EndTime:u}.",
                            Priority = NotificationPriority.High,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _notificationService.CreateAsync(n);
                    }
                }
                else
                {
                    // fallback broadcast if no enrolled students found
                    var n = new Notification
                    {
                        UserId = null,
                        EntityType = "lab",
                        EntityId = lab.Id,
                        Title = $"New lab scheduled: {subjectName}",
                        Message = $"A new lab for subject {subjectName} is scheduled {lab.StartTime:u} - {lab.EndTime:u}.",
                        Priority = NotificationPriority.High,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _notificationService.CreateAsync(n);
                }

                lab.NotificationSent = true;
                await _labService.UpdateAsync(lab);

                return CreatedAtAction(nameof(GetLab), new { id = lab.Id }, lab);
            }
            catch (Exception ex)
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