// Services/NotificationService.cs (update)
using LabManagementBackend.Hubs;
using LabManagementBackend.Models;
using LabManagementBackend.Services;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using System.Threading.Tasks;

public class NotificationService
{
    private readonly IMongoCollection<Notification> _notifications;
    private readonly NotificationPreferenceService _preferenceService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(IConfiguration config, IHubContext<NotificationHub> hubContext)
    {
        var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
        var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
        _notifications = db.GetCollection<Notification>("Notifications");
        _hubContext = hubContext;
        _preferenceService = new NotificationPreferenceService(config);
    }

    public async Task<Notification> CreateAsync(Notification notification)
    {
        if (notification == null) throw new ArgumentNullException(nameof(notification));
        notification.CreatedAt = DateTime.UtcNow;
        await _notifications.InsertOneAsync(notification);

        // Send real-time notification to user group if userId is set
        if (!string.IsNullOrEmpty(notification.UserId))
        {
            await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);
        }
        else
        {
            // Broadcast to all connected clients (optional)
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        }

        return notification;
    }

    public async Task<long> CountAsync(FilterDefinition<Notification> filter)
    {
        return await _notifications.CountDocumentsAsync(filter);
    }

    public async Task<List<Notification>> GetPagedAsync(FilterDefinition<Notification> filter, int page, int pageSize)
    {
        var sort = Builders<Notification>.Sort.Descending(n => n.CreatedAt);
        return await _notifications.Find(filter)
            .Sort(sort)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }

    public async Task<List<Notification>> GetForUserAsync(string userId, int limit = 50)
    {
        var prefs = await _preferenceService.GetByUserIdAsync(userId);
        if (prefs == null)
        {
            prefs = new NotificationPreference { UserId = userId };
            await _preferenceService.UpsertAsync(prefs);
        }

        var builder = Builders<Notification>.Filter;
        var filterUser = builder.Eq(n => n.UserId, userId);
        var filterBroadcast = builder.Eq(n => n.UserId, null);

        var baseFilter = builder.Or(filterUser, filterBroadcast);

        // Build filters for enabled notification types
        var typeFilters = new List<FilterDefinition<Notification>>();
        if (prefs.LabStarting) typeFilters.Add(builder.Eq(n => n.EntityType, "lab"));
        if (prefs.SubmissionGraded) typeFilters.Add(builder.Eq(n => n.EntityType, "submission"));
        if (prefs.Generic) typeFilters.Add(builder.Eq(n => n.EntityType, "generic"));

        var typeFilter = typeFilters.Count > 0 ? builder.Or(typeFilters) : builder.Empty;

        var finalFilter = builder.And(baseFilter, typeFilter);

        var sort = Builders<Notification>.Sort.Descending(n => n.CreatedAt);
        return await _notifications.Find(finalFilter).Sort(sort).Limit(limit).ToListAsync();
    }
    public async Task MarkReadAsync(string id)
    {
        var filter = Builders<Notification>.Filter.Eq(n => n.Id, id);
        var update = Builders<Notification>.Update.Set(n => n.Read, true);
        await _notifications.UpdateOneAsync(filter, update);
    }

    public async Task MarkAllReadForUserAsync(string userId)
    {
        var filter = Builders<Notification>.Filter.Or(
            Builders<Notification>.Filter.Eq(n => n.UserId, userId),
            Builders<Notification>.Filter.Eq(n => n.UserId, null)
        );
        var update = Builders<Notification>.Update.Set(n => n.Read, true);
        await _notifications.UpdateManyAsync(filter, update);
    }

    public async Task DeleteAsync(string id)
    {
        var filter = Builders<Notification>.Filter.Eq(n => n.Id, id);
        await _notifications.DeleteOneAsync(filter);
    }

    /// <summary>
    /// Check existence of a notification matching entityType/entityId for given user (or broadcast if userId==null).
    /// Optional titleContains performs a case-insensitive substring regex match.
    /// </summary>
    public async Task<bool> ExistsAsync(string entityType, string entityId, string? userId = null, string? titleContains = null)
    {
        var builder = Builders<Notification>.Filter;
        var filters = new List<FilterDefinition<Notification>>
            {
                builder.Eq(n => n.EntityType, entityType),
                builder.Eq(n => n.EntityId, entityId)
            };

        if (userId == null)
        {
            filters.Add(builder.Eq(n => n.UserId, null));
        }
        else
        {
            filters.Add(builder.Eq(n => n.UserId, userId));
        }

        if (!string.IsNullOrEmpty(titleContains))
        {
            // case-insensitive substring match
            filters.Add(builder.Regex(n => n.Title, new MongoDB.Bson.BsonRegularExpression(titleContains, "i")));
        }

        var filter = builder.And(filters);
        var count = await _notifications.CountDocumentsAsync(filter);
        return count > 0;
    }
}
