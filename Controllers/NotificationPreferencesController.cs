// Controllers/NotificationPreferencesController.cs
using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/notification-preferences")]
    [Authorize]
    public class NotificationPreferencesController : ControllerBase
    {
        private readonly NotificationPreferenceService _preferenceService;
        private readonly NotificationService _notificationService;

        public NotificationPreferencesController(NotificationPreferenceService preferenceService, NotificationService notificationService)
        {
            _preferenceService = preferenceService;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPreferences()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var prefs = await _preferenceService.GetByUserIdAsync(userId);
            if (prefs == null)
            {
                prefs = new NotificationPreference { UserId = userId };
                await _preferenceService.UpsertAsync(prefs);
            }
            return Ok(prefs);
        }

        [HttpPut]
        public async Task<IActionResult> UpdatePreferences([FromBody] NotificationPreferenceUpdateDto dto)
        {
            if (dto == null)
                return BadRequest("Invalid payload");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var existing = await _preferenceService.GetByUserIdAsync(userId);
            if (existing == null)
            {
                existing = new NotificationPreference { UserId = userId };
            }

            existing.LabStarting = dto.LabStarting;
            existing.SubmissionGraded = dto.SubmissionGraded;
            existing.Generic = dto.Generic;

            var updated = await _preferenceService.UpsertAsync(existing);
            return Ok(updated);
        }
    }
}