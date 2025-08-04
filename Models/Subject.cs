using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LabManagementBackend.Models
{
    public class Subject
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        public string Name { get; set; }

        public string Code { get; set; }
    }
}