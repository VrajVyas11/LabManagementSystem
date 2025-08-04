using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LabManagementBackend.Models
{
    public enum UserRole
    {
        Student,
        Teacher
    }

    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        public string Name { get; set; }

        public string Email { get; set; }

        public UserRole Role { get; set; }

        public string Department { get; set; } = "MCA";

        public List<string> SubjectIds { get; set; } = new List<string>();

        public string PasswordHash { get; set; }
    }
}