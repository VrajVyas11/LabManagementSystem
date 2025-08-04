namespace LabManagementBackend.DTOs
{
   public class RegisterDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Role { get; set; }
}

    public class LoginDto
    {
        public string Email { get; set; }

        public string Password { get; set; }
    }

    public class AuthResponseDto
    {
        public string Token { get; set; }

        public string UserId { get; set; }

        public string Role { get; set; }
    }
}