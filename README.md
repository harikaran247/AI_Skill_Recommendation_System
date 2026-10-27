# AI-Based Skill Recommendation System with User Authentication & Admin Dashboard

An intelligent, ML-powered career roadmap and skill gap recommendation web application with **secure user authentication**, **personalized learner dashboards**, and a dedicated **Administrator Console**.

Users register or sign in to track their personalized skill acquisition roadmaps, project completions, and receive ML predictions. A separate Administrator Dashboard provides platform-wide analytics, registration trends, and user access management.

---

## 🚀 Key Features

### 1. User Authentication & Security
- **Modern Sign Up Page (`/signup`)**:
  - Full name, valid email address, password, confirm password, and show/hide password toggle.
  - Interactive **Password Strength Indicator** with real-time score, color progress bar, and criteria checklist (min length, uppercase, numbers/symbols).
  - Strict input validation, regex email verification, password match enforcement.
  - Secure password hashing using **Werkzeug scrypt** hashing (`generate_password_hash`). Plain-text passwords are never stored.
  - Duplicate email registrations are strictly prevented (HTTP 409 Conflict).
  - Public registration **always assigns role `user`**; admin privileges can never be obtained through public sign-up.

- **User Sign In Page (`/login`)**:
  - Secure credential verification against stored password hashes.
  - Stateless **JWT-based authentication** (`PyJWT`) with configurable expiration and secret keys.
  - Redirects users directly to their personalized **User Dashboard** (`/dashboard`).
  - Protected client routes (`<ProtectedRoute>`) and backend authorization middleware (`@require_auth`).

### 2. Personalized Learner Dashboard (`/dashboard`)
- Target career goal overview and readiness tracker.
- Live curriculum completion percentage bar based on individual progress.
- Breakdown of completed, in-progress, and not-started skills.
- Interactive **Skills & Portfolio Projects Checklist**:
  - Toggle skill status (*Not Started* &rarr; *In Progress* &rarr; *Completed*).
  - Checkbox to record built hands-on projects.
- Acquired skills inventory tags.
- Direct links to launch fresh AI skill gap analyses.

### 3. Dedicated Administrator Console (`/admin/dashboard`)
- **Separate Admin Sign In (`/admin/login`)**:
  - Restricted entry portal strictly checking admin role authorization.
  - Normal user accounts attempting to log in are denied access.
- **Admin Sidebar & Summary Metrics**:
  - **Total Registered Users**: Count of all accounts in the system.
  - **Active Users**: Count of accounts in active status.
  - **New Registrations**: Registrations within the last 7 days.
  - **Skill Recommendations**: Total AI recommendations generated across the platform.
- **Interactive Visual Activity Charts**:
  - Daily registration & assessment volume timeline (last 7 days).
  - Top popular learner career tracks breakdown.
- **User Management Table**:
  - Columns: *User ID, Full Name, Email, Role, Target Goal, Progress, Registration Date, Last Login, Status, Actions*.
  - Live search filtering by name or email.
  - Multi-column sorting (User ID, Name, Email, Registration Date, Last Login) and pagination.
  - One-click account activation / deactivation status toggle.
  - **User Profile Inspection Modal**:
    - Inspect user career goal, full acquired skills list, learning progress tasks, project completion status, and past recommendation assessments.
  - Strict data privacy: **Passwords, hashes, or tokens are never exposed**.
  - Backend authorization enforcement (`@require_admin`) on every admin endpoint.

### 4. Intelligent Career & Skill Gap ML Engine
- 11 pre-trained career tracks (*Full Stack Developer, AI Engineer, Data Scientist, Data Analyst, Cloud Engineer, DevOps Engineer, Mobile App Developer, UI/UX Designer, Java Developer, Cybersecurity Analyst, Product Manager*).
- Preprocessed and trained on **1,640 verified career profiles** using TF-IDF and Logistic Regression (**95.73% test accuracy**).
- Prerequisite-aware ranked learning roadmap with curated learning documentation, difficulty levels, estimated hours, and suggested portfolio projects.
- PDF Resume Parser extracting skills and aliases automatically.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, React Router v7, Vite, Lucide Icons, Vanilla Modern CSS (Light theme, responsive).
- **Backend:** Python 3, Flask 3.1, Flask-CORS, PyJWT, Werkzeug Security.
- **Machine Learning:** Scikit-learn, Pandas, NumPy, Joblib.
- **Database:** SQLite3 (`skill_recommendation.db`) with Foreign Keys enabled.
- **PDF Extraction:** PyPDF.

---

## 📂 Project Structure

```
skill_recommendation/
├── AI_Skill_Recommendation_Dataset.csv    # Full 1,640-row dataset
├── requirements.txt                       # Python dependencies
├── sample_resume.pdf                      # Sample PDF resume for testing
├── README.md                              # Project documentation
│
├── backend/
│   ├── app.py                             # Flask REST API server with Auth & Admin endpoints
│   ├── auth.py                            # JWT generation, password hashing, @require_auth & @require_admin
│   ├── create_admin.py                    # Secure CLI admin creation & promotion script
│   ├── database.py                        # SQLite schema, user management, progress & admin queries
│   ├── recommender.py                     # ML recommendation & prerequisite engine
│   ├── resume_parser.py                   # PDF text & skill parser
│   ├── train_model.py                     # ML pipeline training
│   ├── test_auth_admin.py                 # Automated test suite for Auth & Admin security
│   ├── test_api.py                        # Automated tests for ML recommendation endpoints
│   └── models/
│       ├── pipeline.joblib                # Trained ML pipeline artifact
│       └── metrics.json                   # Verified metrics & career metadata
│
└── frontend/
    ├── package.json                       # Node dependencies
    ├── vite.config.js                     # Vite proxy configuration
    ├── index.html                         # Entry HTML
    └── src/
        ├── App.jsx                        # Main router with protected routes
        ├── index.css                      # Modern light-theme design system
        ├── context/
        │   └── AuthContext.jsx            # User session & JWT state provider
        ├── components/
        │   ├── Navbar.jsx                 # Dynamic auth navigation & user pill
        │   ├── ProtectedRoute.jsx         # User route guard
        │   ├── AdminRoute.jsx             # Admin route guard
        │   ├── UserDetailModal.jsx        # Admin user inspection modal
        │   ├── CareerSelector.jsx         # Career track selector
        │   ├── SkillInput.jsx             # Tag-based skill input
        │   ├── MatchStats.jsx             # Match statistics display
        │   ├── RecommendationsView.jsx    # Roadmap & project viewer
        │   ├── ResumeUploader.jsx         # PDF resume uploader
        │   └── ProgressTracker.jsx        # Legacy progress tracker
        └── pages/
            ├── HomePage.jsx               # AI Skill Recommender page
            ├── SignUpPage.jsx             # User Sign Up page
            ├── SignInPage.jsx             # User Sign In page
            ├── UserDashboardPage.jsx      # User Dashboard page
            ├── AdminLoginPage.jsx         # Dedicated Admin Login page
            └── AdminDashboardPage.jsx     # Admin Console page
```

---

## 🗄️ Database Schema (`skill_recommendation.db`)

The SQLite database uses clean relational tables with foreign keys:

1. **`users`**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `full_name`: TEXT NOT NULL
   - `email`: TEXT UNIQUE NOT NULL
   - `password_hash`: TEXT NOT NULL
   - `role`: TEXT DEFAULT 'user' (*'user'* or *'admin'*)
   - `career_goal`: TEXT
   - `status`: TEXT DEFAULT 'active' (*'active'* or *'inactive'*)
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   - `last_login`: TIMESTAMP

2. **`user_skills`**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `user_id`: INTEGER NOT NULL (FK &rarr; `users.id` ON DELETE CASCADE)
   - `skill_name`: TEXT NOT NULL
   - `proficiency_level`: TEXT DEFAULT 'Intermediate'
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

3. **`learning_progress`**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `user_id`: INTEGER NOT NULL (FK &rarr; `users.id` ON DELETE CASCADE)
   - `skill_name`: TEXT NOT NULL
   - `career_goal`: TEXT
   - `status`: TEXT DEFAULT 'not_started' (*'not_started', 'in_progress', 'completed'*)
   - `progress_percentage`: REAL DEFAULT 0.0
   - `suggested_project`: TEXT
   - `project_completed`: INTEGER DEFAULT 0
   - `priority`: TEXT DEFAULT 'High'
   - `notes`: TEXT DEFAULT ''
   - `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

4. **`assessment_history`**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `user_id`: INTEGER (FK &rarr; `users.id` ON DELETE SET NULL)
   - `profile_id`: INTEGER (FK &rarr; `user_profiles.id` ON DELETE SET NULL)
   - `career_goal`: TEXT NOT NULL
   - `existing_skills`: TEXT
   - `match_percentage`: REAL
   - `recommended_next_skill`: TEXT
   - `roadmap_json`: TEXT
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

5. **`user_profiles` & `user_skill_progress`**: Legacy tables preserved for backwards compatibility.

---

## ⚙️ Installation & Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
1. Open a terminal in the root project folder:
   ```bash
   pip install -r requirements.txt
   ```
2. (Optional) Set environment variables for production:
   ```bash
   export JWT_SECRET_KEY="your-custom-production-jwt-secret"
   ```

### 3. Create the Administrator Account
Admin privileges cannot be obtained via the public Sign Up page. Create or promote an administrator securely via the CLI:

```bash
# Non-interactive CLI command:
python backend/create_admin.py --email admin@skills.ai --name "Platform Administrator" --password "Admin@2025!"

# Or interactive CLI prompt:
python backend/create_admin.py
```

*Note: If an account with that email already exists, this command safely promotes it to the `admin` role and updates the password.*

### 4. Run the Backend API
Start the Flask development server on port 5000:
```bash
python backend/app.py
```
The API will be available at `http://127.0.0.1:5000`.

### 5. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The application will launch on `http://localhost:5173`.

---

## 🧪 Testing & Verification

Automated test suites verify authentication, authorization barriers, and recommendation endpoints:

### Run Authentication & Admin Security Tests:
```bash
python -m unittest backend/test_auth_admin.py
```
Tests:
- Input validation (missing fields, invalid email format, mismatched passwords).
- Regular user signup enforces `role='user'` and blocks duplicate emails.
- Normal users receive **HTTP 403 Forbidden** when attempting to access `/api/admin/stats` or `/api/admin/users`.
- Admin accounts receive **HTTP 200 OK** on admin endpoints.
- Integration flow: AI recommendations automatically log to user's dashboard.

### Run ML Recommendation Tests:
```bash
python -m unittest backend/test_api.py
```

### Build Production Bundle:
```bash
cd frontend
npm run build
```

---

## 🌐 Routes Overview

| Route | Access | Description |
| :--- | :--- | :--- |
| `/` | Public | AI-Based Skill Recommendation System & Roadmap Explorer |
| `/signup` | Public | Learner registration with password strength meter |
| `/login` | Public | Learner sign in (redirects to `/dashboard`) |
| `/dashboard` | Protected (User) | Personalized learner progress and skill checklist |
| `/admin/login` | Public | Dedicated Administrator sign-in portal |
| `/admin/dashboard` | Protected (Admin) | Administrator dashboard, statistics, charts & user management |
