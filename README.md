# Academic Marks & Claims System

A comprehensive web application for managing academic marks, course enrollments, and grade disputes (claims). Built with **React**, **Vite**, **TailwindCSS**, and **Supabase**.

## 🌟 Features

### 🎓 Student Portal
*   **Smart Dashboard**: Personalized view based on Academic Year, Intake, and Cohort.
*   **Course Enrollment**: Browse available courses and join them with a single click.
*   **Marks view**: Real-time access to CAT, FAT, and Assignment scores.
*   **Claims System**: Dispute specific marks with detailed explanations and track claim status (Approved/Rejected) with lecturer feedback.

### 👨‍🏫 Lecturer Portal
*   **Secure Access**: Registration protected by an Admin Access Code.
*   **Course Management**: Create and manage courses targeted to specific student groups.
*   **Grading**: efficient interface to enter and update student marks.
*   **Dispute Resolution**: Review and adjudicate student claims.

## 🚀 Technologies
*   **Frontend**: React (Vite)
*   **Styling**: TailwindCSS, Lucide React (Icons)
*   **Backend**: Supabase (PostgreSQL, Auth, Realtime)
*   **Router**: React Router DOM

## 🛠️ Setup & Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd ClaimSystem
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Database Setup**
    Run the SQL scripts provided in the root directory in your Supabase SQL Editor:
    1.  `supabase_schema.sql` (Base schema)
    2.  `add_course_columns.sql` (Course filtering)
    3.  `add_user_columns.sql` (User profile extension)

5.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📝 Usage Notes
*   **Lecturer Registration Code**: `ADMIN_1234`
*   **Demo Accounts**:
    *   Student: `STU001` / `password`
    *   Lecturer: `LEC001` / `password`
