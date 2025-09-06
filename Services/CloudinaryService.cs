using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using LabManagementBackend.Models;
using Microsoft.Extensions.Options;

namespace LabManagementBackend.Services
{
    public class CloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IOptions<CloudinarySettings> config)
        {
            var cloudinarySettings = config.Value;
            var account = new Account(
                cloudinarySettings.CloudName,
                cloudinarySettings.ApiKey,
                cloudinarySettings.ApiSecret
            );
            _cloudinary = new Cloudinary(account);
        }

        public async Task<string> UploadFileAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is required.");

            var uploadParams = new RawUploadParams()
            {
                File = new FileDescription(file.FileName, file.OpenReadStream()),
                Folder = "lab-submissions",
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Upload failed: {uploadResult.Error.Message}");
            }

            return uploadResult.SecureUrl.ToString();
        }

        public async Task<bool> DeleteFileAsync(string fileUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(fileUrl))
                    return false;

                // Extract public ID from Cloudinary URL
                var publicId = GetPublicIdFromUrl(fileUrl);
                if (string.IsNullOrWhiteSpace(publicId))
                    return false;

                var deleteParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Raw
                };

                var result = await _cloudinary.DestroyAsync(deleteParams);
                return result.Result == "ok";
            }
            catch
            {
                return false;
            }
        }

        private string GetPublicIdFromUrl(string url)
        {
            try
            {
                // Cloudinary URL format: https://res.cloudinary.com/cloud_name/resource_type/upload/folder/filename.extension
                var uri = new Uri(url);
                var pathSegments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

                // Find the upload segment and get everything after it
                int uploadIndex = Array.IndexOf(pathSegments, "upload");
                if (uploadIndex == -1 || uploadIndex >= pathSegments.Length - 1)
                    return string.Empty;

                // Get all segments after "upload"
                var publicIdParts = pathSegments.Skip(uploadIndex + 1).ToArray();
                var publicId = string.Join("/", publicIdParts);

                // Remove file extension for raw files
                var lastDotIndex = publicId.LastIndexOf('.');
                if (lastDotIndex > 0)
                {
                    publicId = publicId.Substring(0, lastDotIndex);
                }

                return publicId;
            }
            catch
            {
                return string.Empty;
            }
        }

        public string GetFileNameFromUrl(string fileUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl))
                return string.Empty;

            try
            {
                var uri = new Uri(fileUrl);
                return Path.GetFileName(uri.AbsolutePath);
            }
            catch
            {
                return string.Empty;
            }
        }

        public string GetContentTypeFromFileName(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return "application/octet-stream";

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt" => "text/plain",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".zip" => "application/zip",
                ".rar" => "application/x-rar-compressed",
                _ => "application/octet-stream"
            };
        }
    }
}