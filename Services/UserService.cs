using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class UserService
    {
        private readonly IMongoCollection<User> _users;

        public UserService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _users = db.GetCollection<User>("Users");
        }

        public async Task<User> GetUserByIdAsync(string id)
        {
            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            return await _users.Find(_ => true).ToListAsync();
        }

        /// <summary>
        /// Replace the existing user document with the provided user object.
        /// Returns the updated user (as stored in DB) after replacement.
        /// </summary>
        public async Task<User> UpdateUserAsync(User existing)
        {
            if (existing == null) throw new ArgumentNullException(nameof(existing));
            var filter = Builders<User>.Filter.Eq(u => u.Id, existing.Id);
            // Replace the entire document (preserving the Id value)
            var result = await _users.ReplaceOneAsync(filter, existing, new ReplaceOptions { IsUpsert = false });

            if (result.IsAcknowledged && result.ModifiedCount > 0)
            {
                return await GetUserByIdAsync(existing.Id);
            }

            // If nothing was modified, still attempt to read and return the document
            return await GetUserByIdAsync(existing.Id);
        }

        /// <summary>
        /// Partial update helper: updates only provided fields on the user document.
        /// Returns the updated user.
        /// </summary>
        public async Task<User> UpdateUserPartialAsync(string id, UpdateDefinition<User> update)
        {
            if (string.IsNullOrWhiteSpace(id)) throw new ArgumentNullException(nameof(id));
            if (update == null) throw new ArgumentNullException(nameof(update));

            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var options = new FindOneAndUpdateOptions<User>
            {
                ReturnDocument = ReturnDocument.After
            };

            var updated = await _users.FindOneAndUpdateAsync(filter, update, options);
            return updated;
        }

        // inside UserService class
        public async Task<List<User>> GetUsersBySubjectIdAsync(string subjectId)
        {
            if (string.IsNullOrWhiteSpace(subjectId)) return new List<User>();
            var filter = Builders<User>.Filter.AnyEq(u => u.SubjectIds, subjectId);
            return await _users.Find(filter).ToListAsync();
        }
    }
}