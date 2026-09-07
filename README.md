# SmartHR

A modern, lightweight Human Resource Management System built for managing employees, attendance, leave requests, payroll, and HR operations through separate employee and HR portals.

## Live Project

**Website:** https://smarthr-web.vercel.app/

---

## Overview

SmartHR is a web-based HR management platform designed to simplify everyday HR tasks.

The system provides two role-based portals:

- **Employee Portal** — employees can view their information, attendance, leave balance, salary details, and submit leave requests.
- **HR / Admin Portal** — HR personnel can manage employees, attendance, leave requests, payroll, and employee accounts.

The application uses Firebase for authentication and data storage, server-side Firebase Admin SDK for privileged operations, and Vercel Serverless Functions for backend API endpoints.

---

## Features

### Employee Portal

- Secure employee login
- Remember-me authentication
- Employee dashboard
- Attendance check-in and check-out
- Attendance history
- Leave balance tracking
- Leave request submission
- Leave request history
- Payroll and salary information
- Personal profile information
- Responsive interface for desktop and mobile devices

### HR / Admin Portal

- Secure HR/Admin login
- Role-based access control
- Employee management
- Add new employees
- Update employee information
- Delete employee accounts
- Reset employee passwords
- View employee attendance
- Monitor attendance statistics
- View and manage leave requests
- Approve or reject leave requests
- Payroll management


### Authentication & Security

- Firebase Authentication
- Role-based access using Firebase Custom Claims
- Protected HR/Admin routes
- Protected backend API endpoints
- Firebase Admin SDK for privileged server-side operations
- Bearer-token authentication for API requests
- Environment variables for sensitive credentials
- Server-side authorization for HR-only operations

### UI & UX

- Responsive design
- Mobile navigation menu
- Password visibility toggle
- Clean dark-themed interface
- Dashboard-based navigation
- Simple and accessible login experience

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript (ES Modules)
- Vite

### Backend

- Vercel Serverless Functions
- Node.js
- Firebase Admin SDK

### Database & Authentication

- Firebase Authentication
- Cloud Firestore

### Deployment

- Vercel
- GitHub

---

## Project Structure

```text
SmartHR-Web/
└── smarthr-landing/
    ├── api/
    │   ├── attendance.js
    │   ├── create-employee.js
    │   ├── create-leave-request.js
    │   ├── delete-employee.js
    │   ├── employees.js
    │   ├── create-leave-request.js
    │   ├── hr-leave.js
    │   ├── leave-approval.js
    │   ├── leave.js
    │   ├── payroll.js
    │   ├── reset-employee-password.js
    │   ├── update-employee.js
    │   └── update-my-profile.js
    │
    ├── lib/
    │   └── firebaseAdmin.js
    │
    ├── public/
    │   └── ...
    │
    ├── src/
    │   ├── dashboard.js
    │   ├── main.js
    │   ├── firebase/
    │   │   └── config.js
    │   ├── pages/
    │   │   ├── employee-login.html
    │   │   ├── hr-login.html
    │   │   └── dashboard/
    │   │       ├── employee-dashboard.html
    │   │       ├── hr-dashboard.html
    │   │       └── hr-dashboard.js
    │   └── styles/
    │       └── ...
    │
    ├── index.html
    ├── package.json
    ├── package-lock.json
    └── vite.config.js
```
## Author

### Shamik Das

Developer and creator of **SmartHR**.

- **GitHub:** https://github.com/ShamikDas-Dev
- **LinkedIn:** https://www.linkedin.com/in/shamik-das-379347359

SmartHR was designed and developed by **Shamik Das** as a practical HR management system demonstrating modern web development, authentication, role-based access control, cloud database integration, serverless APIs, and production deployment.
