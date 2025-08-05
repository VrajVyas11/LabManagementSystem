using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;

namespace LabManagementBackend.Filters
{
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            // Check if this operation involves file upload
            var hasFileParameter = context.MethodInfo.GetParameters()
                .Any(p => p.ParameterType == typeof(IFormFile) || p.ParameterType == typeof(IFormFile[]));

            if (!hasFileParameter) return;

            // Clear existing parameters for file upload operations
            operation.Parameters?.Clear();

            // Set up multipart/form-data request body
            operation.RequestBody = new OpenApiRequestBody
            {
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["multipart/form-data"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = "object",
                            Properties = new Dictionary<string, OpenApiSchema>(),
                            Required = new HashSet<string>()
                        }
                    }
                }
            };

            var formDataSchema = operation.RequestBody.Content["multipart/form-data"].Schema;

            // Add file parameter
            formDataSchema.Properties["file"] = new OpenApiSchema
            {
                Type = "string",
                Format = "binary",
                Description = "The file to upload (pdf, docx, images, max 20MB)"
            };
            formDataSchema.Required.Add("file");

            // Add other form parameters (like labId)
            var parameters = context.MethodInfo.GetParameters();
            foreach (var param in parameters)
            {
                if (param.ParameterType != typeof(IFormFile) && param.ParameterType != typeof(IFormFile[]))
                {
                    var paramName = param.Name?.ToLowerInvariant();
                    if (!string.IsNullOrEmpty(paramName) && paramName != "file")
                    {
                        formDataSchema.Properties[paramName] = new OpenApiSchema
                        {
                            Type = "string",
                            Description = GetParameterDescription(paramName)
                        };

                        // Mark as required if parameter is not nullable
                        if (!IsNullable(param.ParameterType))
                        {
                            formDataSchema.Required.Add(paramName);
                        }
                    }
                }
            }

            // Ensure proper response types
            if (!operation.Responses.ContainsKey("200"))
            {
                operation.Responses.Add("200", new OpenApiResponse
                {
                    Description = "File uploaded successfully",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.Schema,
                                    Id = "SubmissionDto"
                                }
                            }
                        }
                    }
                });
            }

            if (!operation.Responses.ContainsKey("400"))
            {
                operation.Responses.Add("400", new OpenApiResponse
                {
                    Description = "Bad request or invalid file",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.Schema,
                                    Id = "ErrorResponse"
                                }
                            }
                        }
                    }
                });
            }
        }

        private static string GetParameterDescription(string paramName)
        {
            return paramName switch
            {
                "labid" => "ID of the lab for the submission",
                _ => $"The {paramName} parameter"
            };
        }

        private static bool IsNullable(Type type)
        {
            return Nullable.GetUnderlyingType(type) != null ||
                   !type.IsValueType ||
                   type == typeof(string);
        }
    }
}