# Project Management App Backend

This project is the backend API for a comprehensive project management application, built using TypeScript, Node.js, Express.js, TypeORM, and PostgreSQL. It provides a robust and scalable solution for managing complex projects, resources, and user permissions.

## Features

- **Resource Management:**
  - Projects: Organize and track projects.
  - Project Phases: Divide projects into manageable phases.
  - Tasks: Create and manage tasks with flexible configurations (recursive, subtasks, etc.).
  - Subtasks: Break down tasks into smaller, actionable items.
  - Files: Hierarchical file system supporting folders and files with deep nesting.
- **Flexible Task System:**
  - Simple tasks.
  - Recursive tasks.
  - Tasks with or without subtasks.
  - Task submissions can be file uploads or simple text/data submissions.
- **Hierarchical File System:**
  - Files and folders can be nested to any depth.
- **Comprehensive Permission System:**
  - Role-based access control (RBAC).
  - User-specific permissions.
  - Project role-based permissions.
  - Position-based permissions.
  - Permission inheritance (project-level permissions cascade to child resources).
  - Ability to assign permissions and roles to other users, based on the assigners permissions.
- **Templates:**
  - Create project templates for consistent project setups.
  - Transform templates into actual projects.
- **Authentication and Authorization:**
  - Authentication middleware (authMiddleware) for user authentication.
  - Permission middleware (permissionMiddleware) for granular access control.
- **Email Notifications:**
  - NodeMailer integration for email notifications.
- **Database:**
  - PostgreSQL for reliable data storage.
- **ORM:**
  - TypeORM for efficient database interactions.

## Technologies

- TypeScript
- Node.js
- Express.js
- TypeORM
- PostgreSQL
- NodeMailer

## Future Improvements

- Add more advanced reporting and analytics.
- Add more detailed API documentation.
- Implement automated testing.
