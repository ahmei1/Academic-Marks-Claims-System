# Academic Marks & Claims System - Feature Overview

This document outlines the complete functionalities of the web application, broken down by user role.

## 1. Authentication & Security
*   **Role-Based Access**: The system supports two distinct roles: **Student** and **Lecturer**.
*   **Registration**:
    *   **Students**: Must provide Academic Year, Program, Intake, and Cohort Year during sign-up to ensure correct course matching.
    *   **Lecturers**: Secured registration. Requires a specific **Admin Access Code** (`ADMIN_1234`) to create a lecturer account, preventing unauthorized access.
*   **Session Management**: Secure login/logout with automatic session persistence (users stay logged in).

## 2. Student Portal
Designed for students to view their performance and manage grade disputes.

### Dashboard
*   **Profile Overview**: Displays student details including Registration Number, Current Year, Program, and Department.
*   **Course Discovery (Smart Filtering)**:
    *   Automatically shows **Available Courses** that match the student's specific profile (Target Year, Intake, and Cohort).
    *   Hides irrelevant courses to reduce clutter.
*   **Course Enrollment**:
    *   One-click **"Join"** button to enroll in available courses.
    *   **Joined Courses** section lists all active enrollments.

### Academic Performance
*   **Marks View**:
    *   Displays breakdown of marks for each course: **CAT** (Continuous Assessment), **FAT** (Final Assessment), and **Assignment**.
    *   Auto-calculates the **Total Score**.

### Claims & Disputes
*   **Submit Claim**:
    *   Students can contest a specific mark (e.g., "My CAT marks are 0 but I sat for the exam").
    *   Requires selecting the Assessment Type and providing a detailed **Explanation/Argument**.
*   **Claim Tracking**:
    *   View history of all submitted claims.
    *   Real-time status updates: **Pending** (Yellow), **Approved** (Green), **Rejected** (Red).
    *   View **Lecturer Comments** and feedback on the decision.

## 3. Lecturer Portal
Designed for faculty to manage courses, marks, and student issues.

### Course Management
*   **Create Course**: Add new courses with specific targeting rules (Course Code, Name, Target Year, Intake, Cohort).
*   **Edit Course**: Update course details if parameters change.
*   **View Courses**: List of all courses taught by the lecturer.

### Student & Marks Management
*   **Class List**: View all students enrolled in a specific course.
*   **Grading**:
    *   Enter or Update marks for each student (CAT, FAT, Assignment).
    *   System automatically updates the student's view instantly.

### Claims Management
*   **Review Claims**: Centralized inbox of student claims and disputes.
*   **Adjudication**:
    *   **Approve**: Validates the student's claim (implying marks will be fixed).
    *   **Reject**: Dismisses the claim.
    *   **Feedback**: Mandatory comment field to explain the decision to the student.

## 4. Technical Highlights
*   **Real-time Data**: Powered by Supabase for instant updates.
*   **Responsive Design**: Works on desktop and mobile.
*   **Dark Mode**: Native support for light and dark themes.
