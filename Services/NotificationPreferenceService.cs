// Services/NotificationPreferenceService.cs
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class NotificationPreferenceService
    {
        private readonly IMongoCollection<NotificationPreference> _preferences;


        public NotificationPreferenceService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _preferences = db.GetCollection<NotificationPreference>("NotificationPreferences");
        }

        public async Task<NotificationPreference> GetByUserIdAsync(string userId)
        {
            return await _preferences.Find(p => p.UserId == userId).FirstOrDefaultAsync();
        }

        public async Task<NotificationPreference> UpsertAsync(NotificationPreference pref)
        {
            var filter = Builders<NotificationPreference>.Filter.Eq(p => p.UserId, pref.UserId);
            var options = new ReplaceOptions { IsUpsert = true };
            await _preferences.ReplaceOneAsync(filter, pref, options);
            return pref;
        }
    }
}