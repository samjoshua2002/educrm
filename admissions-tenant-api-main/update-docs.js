const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, 'API_DOCUMENTATION.md');
const currentDoc = fs.readFileSync(docPath, 'utf8');

const newDocs = `
---

## 7. Applications

### Create Application
*Create a new application for a student, optionally linked to a lead.*
- **Method & URL**: \`POST /api/applications\`
- **Headers**: \`Authorization: Bearer <token>\`, \`Content-Type: application/json\`
- **Parameters**: None
- **Request Example**:
\`\`\`json
{
  "leadId": "uuid-optional",
  "appliedFor": "B.Tech",
  "program": "Computer Science",
  "courseId": "course-uuid",
  "academicSession": "2026-2027",
  "applicant": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "9876543210"
  },
  "preferences": {
    "preference1": "branch-uuid-1",
    "preference2": "branch-uuid-2"
  }
}
\`\`\`
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationNo": "APP/2026/1001",
    "formStatus": "incomplete",
    "paymentStatus": "pending"
  },
  "message": "Application created successfully"
}
\`\`\`

### List Applications (Paginated)
*Retrieve a paginated list of applications.*
- **Method & URL**: \`GET /api/applications\`
- **Headers**: \`Authorization: Bearer <token>\`
- **Parameters**:
  - Query: \`page\` (number, optional, default: 1)
  - Query: \`limit\` (number, optional, default: 10)
  - Query: \`search\` (string, optional)
  - Query: \`status\` (string, optional)
- **Request Example**: None
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "applicationNo": "APP/2026/1001",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "formStatus": "Incomplete",
      "paymentStatus": "pending"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Applications fetched successfully"
}
\`\`\`

### Get Application Details
*Fetch detailed metadata for a single application including all child entities.*
- **Method & URL**: \`GET /api/applications/:id\`
- **Headers**: \`Authorization: Bearer <token>\`
- **Parameters**:
  - Path: \`id\` (uuid, required)
- **Request Example**: None
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationNo": "APP/2026/1001",
    "student": { "name": "Jane Doe" },
    "educationRecords": [],
    "entranceTests": []
  },
  "message": "Application details fetched successfully"
}
\`\`\`

### Update Application Section
*Update specific sections of an application. The following endpoints follow the same pattern.*
- **Endpoints**:
  - \`PATCH /api/applications/:applicationNo/personal\`
  - \`PATCH /api/applications/:applicationNo/preferences\`
  - \`PATCH /api/applications/:applicationNo/education\`
  - \`PATCH /api/applications/:applicationNo/entrance-tests\`
  - \`PATCH /api/applications/:applicationNo/parents\`
  - \`PATCH /api/applications/:applicationNo/addresses\`
  - \`PATCH /api/applications/:applicationNo/work-experience\`
  - \`PATCH /api/applications/:applicationNo/extra-curriculars\`
  - \`PATCH /api/applications/:applicationNo/other-qualifications\`
  - \`PATCH /api/applications/:applicationNo/additional-info\`
  - \`PATCH /api/applications/:applicationNo/declaration\`
  - \`PATCH /api/applications/:applicationNo/payment\`
- **Headers**: \`Authorization: Bearer <token>\`, \`Content-Type: application/json\`
- **Constraints**: Cannot update if application is submitted, accepted, or rejected (except for \`/payment\`).
- **Request Example** (for \`/education\`):
\`\`\`json
{
  "records": [
    {
      "level": "12th",
      "institution": "Delhi Public School",
      "boardUniversity": "CBSE",
      "yearOfPassing": "2025",
      "percentageCgpa": "95",
      "isCompleted": true
    }
  ]
}
\`\`\`
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": true,
  "message": "Application updated successfully"
}
\`\`\`

### Submit Application
*Locks the application from further edits and changes status to submitted.*
- **Method & URL**: \`PATCH /api/applications/:applicationNo/submit\`
- **Headers**: \`Authorization: Bearer <token>\`
- **Parameters**: None
- **Request Example**: None
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": {
    "applicationNo": "APP/2026/1001",
    "formStatus": "submitted"
  },
  "message": "Application submitted successfully"
}
\`\`\`

### Update Application Status
*Update the status of an application. Reserved for Managers/Admins.*
- **Method & URL**: \`PATCH /api/applications/:applicationNo/status\`
- **Headers**: \`Authorization: Bearer <token>\`, \`Content-Type: application/json\`
- **Parameters**:
  - Path: \`applicationNo\` (string, required)
- **Request Example**:
\`\`\`json
{
  "status": "under_review"
}
\`\`\`
- **Response Example**:
\`\`\`json
{
  "success": true,
  "data": {
    "applicationNo": "APP/2026/1001",
    "formStatus": "under_review"
  },
  "message": "Application status updated successfully"
}
\`\`\`
`;

fs.writeFileSync(docPath, currentDoc + newDocs);
console.log('API_DOCUMENTATION.md updated.');
