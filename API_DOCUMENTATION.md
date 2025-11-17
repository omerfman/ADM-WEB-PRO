# ADM İnşaat - API Documentation

Backend API endpoints for ADM Construction Project Management System.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require Firebase Authentication token in `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### Health & Status

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T12:34:56.789Z",
  "environment": "development"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

### Authentication

#### POST /api/auth/create-user
Create a new user in Firebase Authentication (requires admin token).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "User Name"
}
```

**Response:**
```json
{
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "displayName": "User Name",
  "createdAt": "2025-11-17T12:34:56.789Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@adm.com",
    "password": "Test@2025",
    "displayName": "Project Operator"
  }'
```

#### POST /api/auth/set-custom-claims
Set custom claims (role, permissions) for a user.

**Request Body:**
```json
{
  "uid": "firebase-uid-123",
  "claims": {
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  }
}
```

**Response:**
```json
{
  "uid": "firebase-uid-123",
  "claims": {
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  },
  "updatedAt": "2025-11-17T12:34:56.789Z"
}
```

---

### Projects

#### GET /api/projects
Get all projects for a company.

**Query Parameters:**
- `companyId` (optional): Company ID. Defaults to "default-company"

**Response:**
```json
{
  "count": 2,
  "projects": [
    {
      "id": "proj-001",
      "name": "Project Name",
      "location": "City, Country",
      "status": "ongoing",
      "progress": 45,
      "budget": 500000,
      "createdAt": "2025-11-17T12:34:56.789Z"
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:3000/api/projects?companyId=default-company"
```

#### GET /api/projects/:id
Get single project details.

**Response:**
```json
{
  "id": "proj-001",
  "name": "Yazlık Villa",
  "description": "...",
  "location": "Bodrum",
  "status": "ongoing",
  "progress": 45,
  "budget": 500000,
  "companyId": "default-company",
  "createdAt": "2025-11-17T12:34:56.789Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/projects/proj-001
```

#### POST /api/projects
Create new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "location": "City, Country",
  "companyId": "default-company",
  "status": "planning",
  "budget": 1000000
}
```

**Response:**
```json
{
  "id": "proj-new",
  "message": "Project created successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Complex",
    "description": "Modern office building",
    "location": "Istanbul, Turkey",
    "budget": 2000000
  }'
```

#### PUT /api/projects/:id
Update project.

**Request Body:**
```json
{
  "status": "ongoing",
  "progress": 60,
  "budget": 520000
}
```

**Response:**
```json
{
  "id": "proj-001",
  "message": "Project updated successfully"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/projects/proj-001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ongoing",
    "progress": 60
  }'
```

#### DELETE /api/projects/:id
Delete project.

**Response:**
```json
{
  "id": "proj-001",
  "message": "Project deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/projects/proj-001
```

---

### Uploads / Cloudinary

#### POST /api/uploads/sign
Get signed upload parameters for Cloudinary direct upload.

**Response:**
```json
{
  "cloudName": "your-cloud-name",
  "apiKey": "your-api-key",
  "timestamp": 1700219696,
  "signature": "signature-hash",
  "folder": "adm-construction/projects"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/uploads/sign
```

#### POST /api/uploads/complete
Save upload metadata to Firestore after Cloudinary upload.

**Request Body:**
```json
{
  "projectId": "proj-001",
  "fileName": "photo-01.jpg",
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "size": 2048576
}
```

**Response:**
```json
{
  "message": "Upload completed",
  "metadata": {
    "fileName": "photo-01.jpg",
    "cloudinaryUrl": "https://res.cloudinary.com/...",
    "size": 2048576,
    "uploadedAt": "2025-11-17T12:34:56.789Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/uploads/complete \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj-001",
    "fileName": "construction-photo.jpg",
    "cloudinaryUrl": "https://res.cloudinary.com/demo/image/upload/...",
    "size": 1048576
  }'
```

---

### Health Checks

#### GET /api/health/firestore
Check Firestore connection status.

**Response:**
```json
{
  "status": "connected",
  "timestamp": "2025-11-17T12:34:56.789Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/health/firestore
```

---

## Error Handling

All errors return JSON with error message:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Server Error

---

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes.

---

## Development Notes

- Firestore operations use Firebase Admin SDK
- Authentication is handled through Firebase Auth
- All timestamps are UTC in ISO format
- File uploads use Cloudinary for storage (signed upload method)
