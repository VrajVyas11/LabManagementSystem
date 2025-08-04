using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class LabService
    {
        private readonly IMongoCollection<Lab> _labs;

        public LabService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _labs = db.GetCollection<Lab>("Labs");
        }

        public async Task<Lab> CreateLabAsync(CreateLabDto dto, string teacherId)
        {
            if (dto.EndTime <= dto.StartTime)
                throw new Exception("End time must be after start time.");

            if (dto.SubmissionDeadline < dto.EndTime)
                throw new Exception("Submission deadline must be after lab end time.");

            var lab = new Lab
            {
                SubjectId = dto.SubjectId,
                TeacherId = teacherId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                SubmissionDeadline = dto.SubmissionDeadline,
                NotificationSent = false
            };

            await _labs.InsertOneAsync(lab);
            return lab;
        }

        public async Task<Lab> GetLabByIdAsync(string id)
        {
            return await _labs.Find(l => l.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<Lab>> GetLabsByTeacherAsync(string teacherId)
        {
            return await _labs.Find(l => l.TeacherId == teacherId).ToListAsync();
        }

        public async Task<List<Lab>> GetLabsBySubjectAsync(string subjectId)
        {
            return await _labs.Find(l => l.SubjectId == subjectId).ToListAsync();
        }

        public async Task<List<Lab>> GetAllLabsAsync()
        {
            return await _labs.Find(_ => true).ToListAsync();
        }
    }
}