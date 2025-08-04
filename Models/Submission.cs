using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace LabManagementBackend.Models
{
    public class Submission
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string LabId { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string StudentId { get; set; }

        public string FileUrl { get; set; }

        public DateTime SubmittedAt { get; set; }

        public string Feedback { get; set; }

        public int? Marks { get; set; }
    }
}