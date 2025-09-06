using LabManagementBackend.DTOs;
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
        private readonly CloudinaryService _cloudinaryService;

        public SubmissionService(IConfiguration config, AttendanceService attendanceService, CloudinaryService cloudinaryService)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _submissions = db.GetCollection<Submission>("Submissions");
            _attendanceService = attendanceService;
            _cloudinaryService = cloudinaryService;
        }

        public async Task<Submission> UploadSubmissionAsync(string studentId, string labId, IFormFile file)
        {
            // Check if submission already exists for this lab and student
            var existingSubmission = await _submissions
                .Find(s => s.StudentId == studentId && s.LabId == labId)
                .FirstOrDefaultAsync();

            if (existingSubmission != null)
            {
                // Delete old file from Cloudinary if it exists
                if (!string.IsNullOrWhiteSpace(existingSubmission.FileUrl))
                {
                    await _cloudinaryService.DeleteFileAsync(existingSubmission.FileUrl);
                }

                // Upload new file to Cloudinary
                var fileUrl = await _cloudinaryService.UploadFileAsync(file);

                existingSubmission.FileUrl = fileUrl;
                existingSubmission.SubmittedAt = DateTime.UtcNow;
                existingSubmission.FileName = file.FileName;
                existingSubmission.FileSize = file.Length;
                existingSubmission.UpdatedAt = DateTime.UtcNow;

                await _submissions.ReplaceOneAsync(
                    s => s.Id == existingSubmission.Id,
                    existingSubmission
                );

                // Update attendance tick if attendance present
                await _attendanceService.SetAttendanceTickIfSubmittedAsync(labId, studentId, true);

                return existingSubmission;
            }
            else
            {
                // Upload file to Cloudinary
                var fileUrl = await _cloudinaryService.UploadFileAsync(file);

                // Create new submission
                var submission = new Submission
                {
                    LabId = labId,
                    StudentId = studentId,
                    FileUrl = fileUrl,
                    SubmittedAt = DateTime.UtcNow,
                    FileName = file.FileName,
                    FileSize = file.Length,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _submissions.InsertOneAsync(submission);

                // Update attendance tick if attendance present
                await _attendanceService.SetAttendanceTickIfSubmittedAsync(labId, studentId, true);

                return submission;
            }
        }

        public async Task<Submission?> GetSubmissionAsync(string studentId, string labId)
        {
            return await _submissions
                .Find(s => s.StudentId == studentId && s.LabId == labId)
                .FirstOrDefaultAsync();
        }

        public async Task<List<Submission>> GetSubmissionsByLabAsync(string labId)
        {
            return await _submissions
                .Find(s => s.LabId == labId)
                .ToListAsync();
        }

        public async Task<List<Submission>> GetSubmissionsByStudentAsync(string studentId)
        {
            return await _submissions
                .Find(s => s.StudentId == studentId)
                .ToListAsync();
        }

        public async Task<bool> DeleteSubmissionAsync(string submissionId, string studentId)
        {
            var submission = await _submissions
                .Find(s => s.Id == submissionId && s.StudentId == studentId)
                .FirstOrDefaultAsync();

            if (submission == null)
                return false;

            // Delete the file from Cloudinary
            if (!string.IsNullOrWhiteSpace(submission.FileUrl))
            {
                await _cloudinaryService.DeleteFileAsync(submission.FileUrl);
            }

            // Delete from database
            var result = await _submissions.DeleteOneAsync(s => s.Id == submissionId);

            if (result.DeletedCount > 0)
            {
                // Update attendance tick
                await _attendanceService.SetAttendanceTickIfSubmittedAsync(submission.LabId, studentId, false);
                return true;
            }

            return false;
        }

        public async Task<Submission?> UpdateSubmissionFeedbackAsync(string submissionId, string feedback, int? marks)
        {
            var filter = Builders<Submission>.Filter.Eq(s => s.Id, submissionId);
            var update = Builders<Submission>.Update
                .Set(s => s.Feedback, feedback)
                .Set(s => s.Marks, marks)
                .Set(s => s.UpdatedAt, DateTime.UtcNow);

            var result = await _submissions.UpdateOneAsync(filter, update);

            if (result.ModifiedCount > 0)
            {
                return await _submissions.Find(s => s.Id == submissionId).FirstOrDefaultAsync();
            }

            return null;
        }
        
        public async Task<Submission> GetSubmissionByIdAsync(string submissionId)
        {
            return await _submissions.Find(s => s.Id == submissionId).FirstOrDefaultAsync();
        }

        // convenience name used in controller
        public async Task<Submission> GetSubmissionAsyncByIdAsync(string submissionId) => await GetSubmissionByIdAsync(submissionId);

        public string GetFileNameFromUrl(string fileUrl)
        {
            return _cloudinaryService.GetFileNameFromUrl(fileUrl);
        }

        public string GetContentTypeFromFileName(string fileName)
        {
            return _cloudinaryService.GetContentTypeFromFileName(fileName);
        }
    }
}