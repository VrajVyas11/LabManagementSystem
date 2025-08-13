using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace LabManagementBackend.Models
{
    public enum NotificationPriority
    {
        Low,
        Medium,
        High
    }

    public class Notification
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        // Receiver user id (for user-targeted notifications). Null for broadcast (all).
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        // Optional: if this notification relates to an entity (lab, submission, etc.)
        public string EntityType { get; set; }   // e.g. "lab", "submission"
        public string EntityId { get; set; }     // e.g. labId or submissionId

        public string Title { get; set; }
        public string Message { get; set; }

        public NotificationPriority Priority { get; set; } = NotificationPriority.Low;

        public bool Read { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Optional - TTL/expiry or delivery flags can be added later.
    }
}