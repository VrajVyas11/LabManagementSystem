// using LabManagementBackend.Models;
// using Microsoft.Extensions.Hosting;
// using Microsoft.Extensions.Logging;
// using System;
// using System.Threading;
// using System.Threading.Tasks;
// using System.Linq;
// using System.Collections.Generic;

// namespace LabManagementBackend.Services
// {
//     public class LabReminderBackgroundService : BackgroundService
//     {
//         private readonly LabService _labService;
//         private readonly UserService _userService;
//         private readonly NotificationService _notificationService;
//         private readonly ILogger<LabReminderBackgroundService> _logger;
//         private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(60);
//         private readonly TimeSpan _reminderBefore = TimeSpan.FromMinutes(15);

//         public LabReminderBackgroundService(LabService labService, UserService userService, NotificationService notificationService, ILogger<LabReminderBackgroundService> logger)
//         {
//             _labService = labService;
//             _userService = userService;
//             _notificationService = notificationService;
//             _logger = logger;
//         }

//         protected override async Task ExecuteAsync(CancellationToken stoppingToken)
//         {
//             _logger.LogInformation("LabReminderBackgroundService started.");
//             while (!stoppingToken.IsCancellationRequested)
//             {
//                 try
//                 {
//                     await CheckAndSendRemindersAsync(stoppingToken);
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "Error while running reminders check");
//                 }

//                 await Task.Delay(_pollInterval, stoppingToken);
//             }
//         }

//         private async Task CheckAndSendRemindersAsync(CancellationToken token)
//         {
//             var labs = await _labService.GetAllLabsAsync();
//             var now = DateTime.UtcNow;

//             foreach (var lab in labs)
//             {
//                 if (lab == null) continue;

//                 var startUtc = lab.StartTime.ToUniversalTime();
//                 var endUtc = lab.EndTime.ToUniversalTime();

//                 // 1) Starting soon reminder (e.g., 15 min before)
//                 var timeToStart = startUtc - now;
//                 if (timeToStart <= _reminderBefore && timeToStart > _reminderBefore - TimeSpan.FromMinutes(1))
//                 {
//                     // send starting soon reminders
//                     await SendPerStudentNotificationIfNotExists(lab, "Lab starting soon", $"Your lab starts at {lab.StartTime:u}.", "starting_soon");
//                 }

//                 // 2) Lab ended notification — when end time has just passed (within last poll interval)
//                 var timeSinceEnd = now - endUtc;
//                 if (timeSinceEnd >= TimeSpan.Zero && timeSinceEnd < _pollInterval)
//                 {
//                     await SendPerStudentNotificationIfNotExists(lab, "Lab ended", $"The lab scheduled at {lab.StartTime:u} has ended.", "ended");
//                 }
//             }
//         }

//         private async Task SendPerStudentNotificationIfNotExists(Lab lab, string title, string message, string uniqueTag)
//         {
//             try
//             {
//                 // find students for this subject
//                 var students = await _userService.GetUsersBySubjectIdAsync(lab.SubjectId);
//                 if (students != null && students.Count > 0)
//                 {
//                     foreach (var student in students)
//                     {
//                         // ensure we haven't already created the same notification for this lab+student+uniqueTag
//                         var exists = await _notificationService.ExistsAsync("lab", lab.Id, student.Id, uniqueTag);
//                         if (exists) continue;

//                         var n = new Notification
//                         {
//                             UserId = student.Id,
//                             EntityType = "lab",
//                             EntityId = lab.Id,
//                             Title = $"{title}",
//                             Message = message,
//                             Priority = NotificationPriority.Medium,
//                             CreatedAt = DateTime.UtcNow
//                         };
//                         await _notificationService.CreateAsync(n);
//                     }
//                 }
//                 else
//                 {
//                     // broadcast fallback: check for existing broadcast with same tag
//                     var exists = await _notificationService.ExistsAsync("lab", lab.Id, null, uniqueTag);
//                     if (!exists)
//                     {
//                         var n = new Notification
//                         {
//                             UserId = null,
//                             EntityType = "lab",
//                             EntityId = lab.Id,
//                             Title = $"{title}",
//                             Message = message,
//                             Priority = NotificationPriority.Medium,
//                             CreatedAt = DateTime.UtcNow
//                         };
//                         await _notificationService.CreateAsync(n);
//                     }
//                 }
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Failed to send per-student notification for lab {LabId}", lab.Id);
//             }
//         }
//     }
// }