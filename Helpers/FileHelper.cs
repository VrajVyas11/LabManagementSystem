using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LabManagementBackend.Helpers
{
    public static class FileHelper
    {
        private static readonly string UploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        public static async Task<string> SaveFileAsync(IFormFile file)
        {
            if (!Directory.Exists(UploadFolder))
            {
                Directory.CreateDirectory(UploadFolder);
            }

            var extension = Path.GetExtension(file.FileName);
            var allowedExtensions = new[] { ".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg" };
            if (Array.IndexOf(allowedExtensions, extension.ToLower()) < 0)
            {
                throw new Exception("Unsupported file type.");
            }

            if (file.Length > 10 * 1024 * 1024) // 10 MB limit
            {
                throw new Exception("File size exceeds 10 MB.");
            }

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(UploadFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return $"/uploads/{fileName}";
        }
    }
}