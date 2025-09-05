// Helpers/FileHelper.cs (example)
using System.IO;
using Microsoft.AspNetCore.StaticFiles;
public static class FileHelper
{
    private static string StorageRoot => Path.Combine(Directory.GetCurrentDirectory(), "uploads");

    public static async Task<string> SaveFileAsync(IFormFile file)
    {
        if (!Directory.Exists(StorageRoot)) Directory.CreateDirectory(StorageRoot);
        var fileName = $"{Guid.NewGuid().ToString()}_{Path.GetFileName(file.FileName)}";
        var path = Path.Combine(StorageRoot, fileName);
        using (var stream = new FileStream(path, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        return $"/uploads/{fileName}"; // or return path depending on download implementation
    }

    public static void DeleteFile(string fileUrl)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(fileUrl)) return;
            // if fileUrl is like /uploads/filename
            var filePath = fileUrl.StartsWith("/uploads") ? Path.Combine(Directory.GetCurrentDirectory(), fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)) : fileUrl;
            if (File.Exists(filePath)) File.Delete(filePath);
        }
        catch { /* swallow */ }
    }

    public static Stream GetFileStream(string fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;
        var filePath = fileUrl.StartsWith("/uploads") ? Path.Combine(Directory.GetCurrentDirectory(), fileUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)) : fileUrl;
        if (!File.Exists(filePath)) return null;
        return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public static string GetFileNameFromUrl(string fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;
        return Path.GetFileName(fileUrl);
    }
        public static string? GetContentTypeFromFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return null;
        var provider = new FileExtensionContentTypeProvider();
        if (provider.TryGetContentType(fileName, out var contentType))
        {
            return contentType;
        }
        return "application/octet-stream";
    }
}