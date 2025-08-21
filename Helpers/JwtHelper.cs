using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LabManagementBackend.Helpers
{
    public class JwtHelper
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expiryMinutes;

        public JwtHelper(IConfiguration config)
        {
            _secretKey = config["JwtSettings:SecretKey"];
            _issuer = config["JwtSettings:Issuer"];
            _audience = config["JwtSettings:Audience"];
            _expiryMinutes = int.Parse(config["JwtSettings:ExpiryMinutes"]);
        }

        public string GenerateToken(string userId, string role, string email)
        {
            // Normalize role casing to "Teacher" or "Student"
            var roleNormalized = role?.ToLower() == "teacher" ? "Teacher" : "Student";

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, roleNormalized), // Critical for role-based auth
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                _issuer,
                _audience,
                claims,
                expires: DateTime.UtcNow.AddMinutes(_expiryMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}