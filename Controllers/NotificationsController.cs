using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly NotificationService _notificationService;

        public NotificationsController(NotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var list = await _notificationService.GetForUserAsync(userId);
            return Ok(list);
        }

        // POST /api/notifications/{id}/read
        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkRead(string id)
        {
            await _notificationService.MarkReadAsync(id);
            return NoContent();
        }

        // POST /api/notifications/read-all
        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _notificationService.MarkAllReadForUserAsync(userId);
            return NoContent();
        }

        // DELETE /api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(string id)
        {
            await _notificationService.DeleteAsync(id);
            return NoContent();
        }
    }
}