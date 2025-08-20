// Models/NotificationPreference.cs
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LabManagementBackend.Models
{
    public class NotificationPreference
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        // Example preferences: enable/disable lab_starting, submission_graded, etc.
        public bool LabStarting { get; set; } = true;
        public bool SubmissionGraded { get; set; } = true;
        public bool Generic { get; set; } = true;
    }
}