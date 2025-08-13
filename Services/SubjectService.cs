// Services/SubjectService.cs
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class SubjectService
    {
        private readonly IMongoCollection<Subject> _subjects;

        public SubjectService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _subjects = db.GetCollection<Subject>("Subjects");
        }

        public async Task<List<Subject>> GetAllAsync()
        {
            return await _subjects.Find(_ => true).ToListAsync();
        }

        public async Task<Subject> GetByIdAsync(string id)
        {
            return await _subjects.Find(s => s.Id == id).FirstOrDefaultAsync();
        }
    }
}