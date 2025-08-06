# Lab Management System - MSU FoTE MCA Department

A full-stack web application backend built with .NET Core and MongoDB to manage lab attendance, submissions, and assessments for the MCA department at MSU Faculty of Technology. The backend serves a React frontend as static files, providing a seamless single URL experience.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [File Uploads](#file-uploads)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Roles:** Teacher and Student with role-based access control.
- **Lab Management:** Teachers can create labs with start/end times and submission deadlines.
- **Attendance Tracking:** Students clock in/out; attendance is validated based on time spent.
- **Submission Handling:** Students upload lab work in various formats (PDF, DOCX, images).
- **Assessment:** Teachers can view submissions, provide feedback, and assign marks.
- **Notifications:** (Planned) Notifications for lab start and submission deadlines.
- **Single URL Deployment:** React frontend served as static files from the backend.
- **Swagger API Documentation:** Interactive API docs with JWT authentication support.

---

## Tech Stack

- **Backend:** .NET 7 Web API
- **Database:** MongoDB (NoSQL)
- **Authentication:** JWT (JSON Web Tokens)
- **API Documentation:** Swagger (Swashbuckle)
- **File Uploads:** Multipart/form-data support
- **Frontend:** React (served statically from backend)

---

## Getting Started

### Prerequisites

- [.NET 7 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/7.0)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas cluster)
- Node.js & npm (for building React frontend)
- Optional: Postman or similar API client for testing

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/lab-management-backend.git
   cd lab-management-backend
   ```

2. **Restore NuGet packages**

   ```bash
   dotnet restore
   ```

3. **Install required .NET packages**

   (If not already installed)

   ```bash
   dotnet add package Microsoft.AspNetCore.Mvc.NewtonsoftJson
   dotnet add package Swashbuckle.AspNetCore.Filters
   ```

4. **Build the project**

   ```bash
   dotnet build
   ```

---

## Configuration

### appsettings.json

Create or update `appsettings.json` with your MongoDB connection and JWT settings:

```json
{
  "MongoDbSettings": {
    "ConnectionString": "your_mongodb_connection_string_here",
    "DatabaseName": "LabManagementDb"
  },
  "JwtSettings": {
    "SecretKey": "your_very_strong_secret_key_here",
    "Issuer": "LabManagementAPI",
    "Audience": "LabManagementClient",
    "ExpiryMinutes": 60
  },
  "AllowedHosts": "*"
}
```

**Important:**  
- Do **NOT** commit your real secrets to public repos. Use environment variables or user secrets for local development.
- For production, configure environment variables to override these settings.

---

## Running the Application

1. **Build React frontend**

   Navigate to your React app directory and run:

   ```bash
   npm run build
   ```

2. **Copy React build files**

   Copy the contents of the React `build` folder into the backend's `wwwroot` folder:

   ```
   LabManagementBackend/wwwroot/
   ```

3. **Run the backend**

   ```bash
   dotnet run
   ```

4. **Access the app**

   - React frontend: `https://localhost:<port>/`
   - Swagger UI: `https://localhost:<port>/swagger`

---

## API Endpoints

| Method | Endpoint                  | Description                          | Auth Required | Role      |
|--------|---------------------------|------------------------------------|---------------|-----------|
| POST   | `/api/auth/register`      | Register new user                   | No            | -         |
| POST   | `/api/auth/login`         | Login and get JWT token             | No            | -         |
| GET    | `/api/users/me`           | Get current user profile            | Yes           | Student/Teacher |
| GET    | `/api/users`              | Get all users                      | Yes           | Teacher   |
| POST   | `/api/labs`               | Create a new lab                   | Yes           | Teacher   |
| GET    | `/api/labs/{id}`          | Get lab details by ID              | Yes           | Student/Teacher |
| POST   | `/api/attendance/clockin`| Student clock in for a lab         | Yes           | Student   |
| POST   | `/api/attendance/clockout`| Student clock out for a lab        | Yes           | Student   |
| POST   | `/api/submissions`        | Upload lab submission (multipart) | Yes           | Student   |

---

## Authentication & Authorization

- Uses JWT tokens.
- Include token in `Authorization` header as:  
  `Authorization: Bearer <token>`
- Role-based access control enforced on endpoints.

---

## File Uploads

- Supported formats: PDF, DOCX, DOC, PNG, JPG, JPEG.
- Max file size: 50 MB (configurable).
- Upload via multipart/form-data to `/api/submissions`.

---

## Deployment

- Build and publish backend:

  ```bash
  dotnet publish -c Release
  ```

- Deploy to any cloud provider supporting .NET (Azure, AWS, DigitalOcean, etc.).
- Configure environment variables for secrets in your cloud environment.
- Serve React build files from `wwwroot` folder.
- Use HTTPS in production.

---

## Security Considerations

- Never commit secrets to source control.
- Use HTTPS in production.
- Validate and sanitize all inputs.
- Limit file upload size and allowed types.
- Use strong JWT secret keys.
- Regularly update dependencies.

---

## Contributing

Contributions are welcome! Please:

- Fork the repo
- Create feature branches
- Submit pull requests with clear descriptions
- Report issues or suggest features

---

## License

This project is licensed under the MIT License.

---


*Thank you for using the Lab Management System!*
