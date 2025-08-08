using LabManagementBackend.DTOs;
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
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
            var startUtc = DateTime.SpecifyKind(dto.StartTime, DateTimeKind.Utc).ToUniversalTime();
            var endUtc = DateTime.SpecifyKind(dto.EndTime, DateTimeKind.Utc).ToUniversalTime();
            var deadlineUtc = DateTime.SpecifyKind(dto.SubmissionDeadline, DateTimeKind.Utc).ToUniversalTime();

            if (endUtc <= startUtc)
                throw new Exception("End time must be after start time.");

            if (deadlineUtc < endUtc)
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

        public async Task<List<Lab>> GetAllLabsAsync()
        {
            return await _labs.Find(_ => true).ToListAsync();
        }

        // Helpers for safe conversion
        private static string BsonToString(BsonValue v)
        {
            if (v == null || v.IsBsonNull) return string.Empty;
            if (v.IsObjectId) return v.AsObjectId.ToString();
            if (v.IsString) return v.AsString;
#pragma warning disable CS8603 // Possible null reference return.
            return v.ToString();
#pragma warning restore CS8603 // Possible null reference return.
        }

        private static DateTime BsonToDateTimeUtc(BsonValue v)
        {
            if (v == null || v.IsBsonNull) return DateTime.MinValue;
            if (v.IsValidDateTime) return v.ToUniversalTime();
            if (v.IsBsonDateTime) return v.AsBsonDateTime.ToUniversalTime();
            if (DateTime.TryParse(v.ToString(), out var dt)) return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            return DateTime.MinValue;
        }

        public async Task<LabAggregateDto> GetAggregatedLabByIdAsync(string id)
        {
            // Build pipeline stages
            var stages = new List<BsonDocument>();

            // Match by ObjectId if possible, otherwise match by nothing (we'll filter later)
            if (ObjectId.TryParse(id, out var oid))
            {
                stages.Add(new BsonDocument("$match", new BsonDocument("_id", oid)));
            }
            else
            {
                // No reliable match; but still perform lookups and then filter client-side
            }

            stages.Add(BsonDocument.Parse(@"{
                $lookup: {
                  from: 'Subjects',
                  localField: 'SubjectId',
                  foreignField: '_id',
                  as: 'subjectDoc'
                }
            }"));
            stages.Add(BsonDocument.Parse(@"{ $unwind: { path: '$subjectDoc', preserveNullAndEmptyArrays: true } }"));

            stages.Add(BsonDocument.Parse(@"{
                $lookup: {
                  from: 'Users',
                  localField: 'TeacherId',
                  foreignField: '_id',
                  as: 'teacherDoc'
                }
            }"));
            stages.Add(BsonDocument.Parse(@"{ $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } }"));

            stages.Add(BsonDocument.Parse(@"{
                $project: {
                  _id: 1,
                  StartTime: 1,
                  EndTime: 1,
                  SubmissionDeadline: 1,
                  NotificationSent: 1,
                  subjectDoc: 1,
                  teacherDoc: 1
                }
            }"));

            // Create pipeline definition explicitly so the driver can infer types
            var pipelineDef = PipelineDefinition<Lab, BsonDocument>.Create(stages);

            var aggOptions = new AggregateOptions { AllowDiskUse = false };

            var cursor = await _labs.AggregateAsync(pipelineDef, aggOptions, default);
            var doc = await cursor.FirstOrDefaultAsync();

            if (doc == null)
            {
                // If not found by ObjectId earlier, attempt a fallback by scanning all and matching string id
                if (!ObjectId.TryParse(id, out _))
                {
                    var all = await GetAllAggregatedLabsAsync();
#pragma warning disable CS8603 // Possible null reference return.
                    return all.Find(x => x.Id == id);
#pragma warning restore CS8603 // Possible null reference return.
                }

#pragma warning disable CS8603 // Possible null reference return.
                return null;
#pragma warning restore CS8603 // Possible null reference return.
            }

            return MapBsonDocToDto(doc);
        }

        public async Task<List<LabAggregateDto>> GetAllAggregatedLabsAsync()
        {
            var stages = new List<BsonDocument>();

            stages.Add(BsonDocument.Parse(@"{
                $lookup: {
                  from: 'Subjects',
                  localField: 'SubjectId',
                  foreignField: '_id',
                  as: 'subjectDoc'
                }
            }"));
            stages.Add(BsonDocument.Parse(@"{ $unwind: { path: '$subjectDoc', preserveNullAndEmptyArrays: true } }"));

            stages.Add(BsonDocument.Parse(@"{
                $lookup: {
                  from: 'Users',
                  localField: 'TeacherId',
                  foreignField: '_id',
                  as: 'teacherDoc'
                }
            }"));
            stages.Add(BsonDocument.Parse(@"{ $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } }"));

            stages.Add(BsonDocument.Parse(@"{
                $project: {
                  _id: 1,
                  StartTime: 1,
                  EndTime: 1,
                  SubmissionDeadline: 1,
                  NotificationSent: 1,
                  subjectDoc: 1,
                  teacherDoc: 1
                }
            }"));

            var pipelineDef = PipelineDefinition<Lab, BsonDocument>.Create(stages);
            var aggOptions = new AggregateOptions { AllowDiskUse = false };

            var cursor = await _labs.AggregateAsync(pipelineDef, aggOptions, default);
            var docs = await cursor.ToListAsync();

            var result = new List<LabAggregateDto>(docs.Count);
            foreach (var d in docs)
            {
                result.Add(MapBsonDocToDto(d));
            }

            return result;
        }

        private LabAggregateDto MapBsonDocToDto(BsonDocument doc)
        {
            var dto = new LabAggregateDto
            {
                Id = BsonToString(doc.GetValue("_id", BsonNull.Value)),
                StartTime = BsonToDateTimeUtc(doc.GetValue("StartTime", BsonNull.Value)),
                EndTime = BsonToDateTimeUtc(doc.GetValue("EndTime", BsonNull.Value)),
                SubmissionDeadline = BsonToDateTimeUtc(doc.GetValue("SubmissionDeadline", BsonNull.Value)),
                NotificationSent = doc.GetValue("NotificationSent", false).ToBoolean()
            };

            // Map subjectDoc if present
            if (doc.TryGetValue("subjectDoc", out var sVal) && sVal.IsBsonDocument)
            {
                var s = sVal.AsBsonDocument;
                dto.Subject = new SubjectDto
                {
                    Id = BsonToString(s.GetValue("_id", BsonNull.Value)),
                    Name = BsonToString(s.GetValue("Name", BsonNull.Value)),
                    Code = BsonToString(s.GetValue("Code", BsonNull.Value))
                };
            }
            else
            {
                // Provide empty/default object to satisfy required properties
                dto.Subject = new SubjectDto
                {
                    Id = string.Empty,
                    Name = string.Empty,
                    Code = string.Empty
                };
            }

            // Map teacherDoc if present
            if (doc.TryGetValue("teacherDoc", out var tVal) && tVal.IsBsonDocument)
            {
                var t = tVal.AsBsonDocument;
                dto.Teacher = new TeacherDto
                {
                    Id = BsonToString(t.GetValue("_id", BsonNull.Value)),
                    Name = BsonToString(t.GetValue("Name", BsonNull.Value)),
                    Email = BsonToString(t.GetValue("Email", BsonNull.Value)),
                    Role = BsonToString(t.GetValue("Role", BsonNull.Value)),
                    Department = BsonToString(t.GetValue("Department", BsonNull.Value))
                };
            }
            else
            {
                dto.Teacher = new TeacherDto
                {
                    Id = string.Empty,
                    Name = string.Empty,
                    Email = string.Empty,
                    Role = string.Empty,
                    Department = string.Empty
                };
            }

            return dto;
        }
    }
}