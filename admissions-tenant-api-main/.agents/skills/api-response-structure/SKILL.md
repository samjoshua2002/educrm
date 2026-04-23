---
name: Standard API Response Structure
description: Ensure all API endpoints return a standardized JSON structure with success flags, message, and pagination for list endpoints.
---

# Standard API Response Structure

When creating or modifying API endpoints in this project, you MUST strictly adhere to the following response structures. Do not return raw data objects or arrays directly from controllers. Instead, wrap them in these structures.

## 1. GET APIs (List / Pagination structure)

For any API that returns a list of records (e.g., `findAll`), use the following structure:

```json
{
    "success": true,
    "data": [
      { /* item 1 */ },
      { /* item 2 */ }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "totalPages": 5
    },
    "message": "Records fetched successfully"
}
```

## 2. Other APIs (POST, PATCH, DELETE, and Single GET)

For creating, updating, deleting, or fetching a single entity, use the following structure:

```json
{
    "success": true, // or false if returning an error gracefully
    "data": {
      /* single updated/created/fetched object or null */
    },
    "message": "Document uploaded successfully" // Provide a descriptive message
}
```

## Implementation Guidelines for NestJS
1. **Response interceptor**: It is highly recommended to implement a global `TransformInterceptor` in NestJS that automatically intercepts controller responses and formats them into this standardized structure.
2. **Success Flag**: Always default to `"success": true` for 2xx HTTP responses. For exception filters, format the error response similarly but with `"success": false` and the error context in `message`.
3. **Pagination**: Allow endpoints to accept `page` and `limit` query parameters, and calculate `total` and `totalPages` based on the database count (e.g., using `findAndCount` in TypeORM) to satisfy the required pagination object format.
