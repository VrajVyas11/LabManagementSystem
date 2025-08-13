using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class NotificationService
    {
        private readonly IMongoCollection<Notification> _notifications;

        public NotificationService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _notifications = db.GetCollection<Notification>("Notifications");
        }

        public async Task<Notification> CreateAsync(Notification notification)
        {
            if (notification == null) throw new ArgumentNullException(nameof(notification));
            notification.CreatedAt = DateTime.UtcNow;
            await _notifications.InsertOneAsync(notification);
            return notification;
        }

        public async Task<List<Notification>> GetForUserAsync(string userId, int limit = 50)
        {
            var filter = Builders<Notification>.Filter.Or(
                Builders<Notification>.Filter.Eq(n => n.UserId, userId),
                Builders<Notification>.Filter.Eq(n => n.UserId, null) // broadcast
            );

            var sort = Builders<Notification>.Sort.Descending(n => n.CreatedAt);
            return await _notifications.Find(filter).Sort(sort).Limit(limit).ToListAsync();
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
        public async Task<bool> ExistsAsync(string entityType, string entityId, string userId = null, string titleContains = null)
        {
            var builder = Builders<Notification>.Filter;
            var filters = new List<FilterDefinition<Notification>>
            {
                builder.Eq(n => n.EntityType, entityType),
                builder.Eq(n => n.EntityId, entityId)
            };

            if (userId == null)
            {
                filters.Add(builder.Eq(n => n.UserId, (string)null));
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
}