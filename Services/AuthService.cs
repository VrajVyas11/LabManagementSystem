using LabManagementBackend.DTOs;
using LabManagementBackend.Helpers;
using LabManagementBackend.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace LabManagementBackend.Services
{
    public class AuthService
    {
        private readonly IMongoCollection<User> _users;
        private readonly JwtHelper _jwtHelper;

        public AuthService(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDbSettings:ConnectionString"]);
            var db = client.GetDatabase(config["MongoDbSettings:DatabaseName"]);
            _users = db.GetCollection<User>("Users");
            _jwtHelper = new JwtHelper(config);
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            var existingUser = await _users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                throw new System.Exception("Email already registered.");
            }

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                Role = dto.Role.ToLower() == "teacher" ? UserRole.Teacher : UserRole.Student,
                PasswordHash = HashPassword(dto.Password)
            };

            await _users.InsertOneAsync(user);

            var token = _jwtHelper.GenerateToken(user.Id, user.Role.ToString(), user.Email);

            return new AuthResponseDto
            {
                Token = token,
                UserId = user.Id,
                Role = user.Role.ToString()
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _users.Find(u => u.Email == dto.Email).FirstOrDefaultAsync();
            if (user == null || !VerifyPassword(dto.Password, user.PasswordHash))
            {
                throw new System.Exception("Invalid email or password.");
            }

            var token = _jwtHelper.GenerateToken(user.Id, user.Role.ToString(), user.Email);

            return new AuthResponseDto
            {
                Token = token,
                UserId = user.Id,
                Role = user.Role.ToString()
            };
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(password);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        private bool VerifyPassword(string password, string storedHash)
        {
            var hashOfInput = HashPassword(password);
            return hashOfInput == storedHash;
        }
    }
}