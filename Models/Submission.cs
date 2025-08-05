using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace LabManagementBackend.Models
{
    public class Submission
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("labId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string LabId { get; set; } = string.Empty;

        [BsonElement("studentId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string StudentId { get; set; } = string.Empty;

        [BsonElement("fileUrl")]
        public string FileUrl { get; set; } = string.Empty;

        [BsonElement("fileName")]
        public string? FileName { get; set; }

        [BsonElement("fileSize")]
        public long? FileSize { get; set; }

        [BsonElement("submittedAt")]
        public DateTime SubmittedAt { get; set; }

        [BsonElement("feedback")]
        public string? Feedback { get; set; }

        [BsonElement("marks")]
        public int? Marks { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}