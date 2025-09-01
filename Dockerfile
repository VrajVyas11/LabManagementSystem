# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY LabManagementBackend.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Copy backend build output
COPY --from=build /out ./

# Copy frontend dist explicitly (bypassing csproj/publish)
COPY Frontend/dist ./Frontend/dist

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "LabManagementBackend.dll"]
