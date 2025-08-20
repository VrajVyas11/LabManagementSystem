using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
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


                [HttpGet("all")]
        public async Task<IActionResult> GetAllNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var filter = Builders<Notification>.Filter.Or(
                Builders<Notification>.Filter.Eq(n => n.UserId, userId),
                Builders<Notification>.Filter.Eq(n => n.UserId, null)
            );

            var totalCount = await _notificationService.CountAsync(filter);
            var notifications = await _notificationService.GetPagedAsync(filter, page, pageSize);

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                totalPages = (int)System.Math.Ceiling((double)totalCount / pageSize),
                notifications
            });
        }

    }
}