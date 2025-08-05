using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LabManagementBackend.Helpers
{
    public static class FileHelper
    {
        private static readonly string[] AllowedExtensions = { ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".gif", ".txt" };
        private const long MaxFileSize = 20 * 1024 * 1024; // 20 MB

        /// <summary>
        /// Saves an uploaded file to the server and returns the file URL
        /// </summary>
        /// <param name="file">The uploaded file</param>
        /// <returns>The relative URL path to the saved file</returns>
        public static async Task<string> SaveFileAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("File is null or empty");
            }

            // Validate file size
            if (file.Length > MaxFileSize)
            {
                throw new ArgumentException($"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB");
            }

            // Validate file extension
            var fileExtension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(fileExtension) || !Array.Exists(AllowedExtensions, ext => ext == fileExtension))
            {
                throw new ArgumentException($"Invalid file type. Allowed types: {string.Join(", ", AllowedExtensions)}");
            }

            // Create uploads directory if it doesn't exist
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URL
            return $"/uploads/{fileName}";
        }

        /// <summary>
        /// Deletes a file from the server
        /// </summary>
        /// <param name="fileUrl">The relative URL of the file to delete</param>
        public static void DeleteFile(string fileUrl)
        {
            if (string.IsNullOrEmpty(fileUrl))
                return;

            try
            {
                // Convert URL to physical path
                var fileName = Path.GetFileName(fileUrl);
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch (Exception)
            {
                // Log error if needed, but don't throw as this is cleanup
            }
        }

        /// <summary>
        /// Gets file information from a file URL
        /// </summary>
        /// <param name="fileUrl">The relative URL of the file</param>
        /// <returns>FileInfo object or null if file doesn't exist</returns>
        public static FileInfo? GetFileInfo(string fileUrl)
        {
            if (string.IsNullOrEmpty(fileUrl))
                return null;

            try
            {
                var fileName = Path.GetFileName(fileUrl);
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);

                if (File.Exists(filePath))
                {
                    return new FileInfo(filePath);
                }
            }
            catch (Exception)
            {
                // Return null if any error occurs
            }

            return null;
        }

        /// <summary>
        /// Validates if a file type is allowed
        /// </summary>
        /// <param name="fileName">The name of the file</param>
        /// <returns>True if file type is allowed, false otherwise</returns>
        public static bool IsValidFileType(string fileName)
        {
            if (string.IsNullOrEmpty(fileName))
                return false;

            var extension = Path.GetExtension(fileName)?.ToLowerInvariant();
            return !string.IsNullOrEmpty(extension) && Array.Exists(AllowedExtensions, ext => ext == extension);
        }

        /// <summary>
        /// Formats file size in human readable format
        /// </summary>
        /// <param name="bytes">File size in bytes</param>
        /// <returns>Formatted file size string</returns>
        public static string FormatFileSize(long bytes)
        {
            const int scale = 1024;
            string[] orders = { "GB", "MB", "KB", "Bytes" };
            long max = (long)Math.Pow(scale, orders.Length - 1);

            foreach (string order in orders)
            {
                if (bytes > max)
                    return $"{decimal.Divide(bytes, max):##.##} {order}";

                max /= scale;
            }
            return "0 Bytes";
        }
    }
}