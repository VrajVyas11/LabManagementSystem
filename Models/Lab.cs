using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace LabManagementBackend.Models
{
    public class Lab
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string SubjectId { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string TeacherId { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public DateTime SubmissionDeadline { get; set; }

        public bool NotificationSent { get; set; } = false;
    }
}