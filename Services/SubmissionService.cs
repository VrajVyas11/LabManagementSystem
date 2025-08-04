using LabManagementBackend.DTOs;
using LabManagementBackend.Helpers;
using LabManagementBackend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class SubmissionService
    {
        private readonly IMongoCollection<Submission> _submissions;
        private readonly AttendanceService _attendanceService;

        public SubmissionService(IConfiguration config, AttendanceService attendanceService)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _submissions = db.GetCollection<Submission>("Submissions");
            _attendanceService = attendanceService;
        }

        public async Task<Submission> UploadSubmissionAsync(string studentId, string labId, IFormFile file)
        {
            var fileUrl = await FileHelper.SaveFileAsync(file);

            var submission = new Submission
            {
                LabId = labId,
                StudentId = studentId,
                FileUrl = fileUrl,
                SubmittedAt = DateTime.UtcNow
            };

            await _submissions.InsertOneAsync(submission);

            // Update attendance tick if attendance present
            await _attendanceService.SetAttendanceTickIfSubmittedAsync(labId, studentId, true);

            return submission;
        }

        public async Task<Submission> GetSubmissionAsync(string studentId, string labId)
        {
            return await _submissions.Find(s => s.StudentId == studentId && s.LabId == labId).FirstOrDefaultAsync();
        }
    }
}