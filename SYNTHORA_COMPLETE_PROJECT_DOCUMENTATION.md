# Synthora.AI - Complete Project Documentation and Viva Preparation

Generated from source-code inspection of the current workspace.

Date inspected: 2026-10-09

## Inspection Scope and Important Notes

This document describes the implementation that exists in this repository, not only the intended product idea.

Inspected areas:

- Frontend React entry point, routes, pages, layouts, components, services, hooks, styling config, and UI flows.
- Backend Express server, route files, middleware, MongoDB/Mongoose models, utilities, email helpers, AI service, and environment examples.
- Assessment scoring, technical oral AI evaluation, proctoring logic, invitation flow, student/company authentication, and recruiter result views.
- Existing documentation files and runnable checks.

Safe checks performed:

- `npm run build`: passed. Vite reported a normal chunk-size warning for a JavaScript bundle over 500 kB.
- `node --test src\utils\proctoringViolationLogic.test.js`: passed 4 tests.

Workspace note:

- Before this documentation was created, the workspace already had uncommitted changes in several application files. This documentation does not rely on git history; it describes the current file contents.
- No application source code was intentionally modified for this documentation task. This file is the only intended new deliverable.

Deployment note:

- The repository contains local development configuration and docs for `http://localhost:5173` and `http://localhost:5000`.
- I did not find deployment configuration such as Dockerfile, Vercel config, Render config, CI workflow, or production hosting setup. Any local `http` URL is a local demo/development URL, not a public deployment link.

## 1. Project Overview

Synthora.AI is a recruitment and hiring-drive platform. A company can register, create a hiring drive, upload a job description and candidate spreadsheet, invite students, run an aptitude assessment, shortlist qualified students for a technical oral round, and view final scores/results.

### Problem It Solves

Traditional campus hiring or bulk recruitment often requires manual coordination:

- Collecting candidate data.
- Sending assessment links.
- Tracking who logged in, started, or completed.
- Scoring aptitude tests.
- Selecting students for the next round.
- Conducting repetitive technical interviews.
- Producing result lists and reports.

Synthora.AI centralizes these steps into one web application and uses AI for the technical oral round.

### Why The Project Is Needed

The project is useful when a company or placement team must evaluate many students consistently. It reduces manual coordination and gives recruiters one dashboard for drive creation, invitation tracking, assessment scores, shortlisting, technical viva transcripts, and final downloads.

### User Types

| User type | What they can do |
|---|---|
| Company/HR user | Register, log in, create hiring drives, upload job description and student file, send invitation/reminder emails, monitor student progress, download reports, select students for technical oral assessment, view viva transcript and AI feedback. |
| Student/candidate | Open invitation link, start assessment during the allowed window, take aptitude test, complete technical oral round if selected, view own dashboard/status. |

There is no implemented student self-registration page. Students are created from the uploaded spreadsheet during drive creation.

### Main Objectives

- Provide company registration and authenticated company dashboard.
- Automate student invitation generation from uploaded candidate files.
- Provide controlled student assessment access windows.
- Run a static aptitude assessment with proctoring checks.
- Apply an aptitude cutoff.
- Let company users select qualified students for AI technical oral assessment.
- Use Groq LLM integration to generate viva questions and evaluate spoken answers.
- Store transcripts, scores, feedback, and result status in MongoDB.
- Provide downloadable CSV/PDF outputs.

### Scope

Implemented:

- Company registration/login.
- Student invitation creation from CSV/XLSX.
- Student login/start windows.
- Aptitude assessment UI and scoring.
- Proctoring events and auto-submit logic.
- Technical oral round with browser speech recognition and speech synthesis.
- Groq-based question generation/evaluation.
- Technical oral transcript modal for recruiters.
- Drive details, statistics, result downloads.

Partially implemented or limited:

- Coding and HR rounds are selectable/displayed but not implemented as working assessment modules.
- Job description file is stored and its filename is included in AI context, but the code does not parse the actual job description text.
- Aptitude scoring is calculated on the frontend and trusted by the backend.
- Some dashboard/sidebar buttons route back to the dashboard or are decorative.
- Proctoring uses browser APIs and heuristic checks; it is not a robust identity verification system.
- Email sending depends on SMTP configuration and falls back to status `smtp_not_configured` when absent.

### What Makes It Different From A Traditional Assessment System

- The system links aptitude, recruiter shortlisting, and AI technical oral evaluation in one workflow.
- The technical oral module uses browser speech-to-text, text-to-speech, adaptive question prompts, LLM evaluation, and stored transcripts.
- Proctoring events are logged and can auto-submit after repeated violations.
- Recruiters can view AI-generated viva feedback and per-turn scoring, not only a final mark.

### Complete Workflow

1. Company registers at `/company/register`.
2. Company logs in at `/login` or `/company/login`.
3. Company creates a hiring drive at `/company/create-drive`.
4. Backend stores drive, uploaded job description file, uploaded student file, parsed students, and invitation records.
5. Backend sends aptitude invitation emails if SMTP is configured.
6. Student opens `/invite/:token`.
7. Student can start only during the allowed time window.
8. Student takes the aptitude assessment at `/assessment/:driveId`.
9. Frontend scores static aptitude questions and submits score/answers.
10. Backend stores aptitude score/result and sends an aptitude-cleared email if qualified.
11. Company opens drive details and selects eligible students for technical assessment.
12. Backend sets a 4-hour technical assessment window and sends technical oral invitation email if SMTP is configured.
13. Student opens invitation/dashboard and starts `/assessment/:driveId/oral`.
14. Backend creates/resumes `TechnicalOralInterview`, generates questions with Groq or fallback bank, evaluates answers with Groq, and stores transcript/evaluation.
15. After 5 questions, backend calculates final oral score, applies technical oral cutoff, updates final result, and recruiter can view details.

## 2. Technology Stack and Programming Languages

### Confirmed From Source Code

| Area | Technology | Language | Where used | Purpose |
|---|---|---|---|---|
| Frontend framework | React 19 | TypeScript/TSX | `src/main.tsx`, `src/App.tsx`, `src/pages`, `src/components` | Build interactive web UI. |
| Frontend build tool | Vite 6 | TypeScript config | `vite.config.ts`, `package.json` | Dev server and production build. |
| Routing | React Router DOM 7 | TypeScript | `src/routes/AppRoutes.tsx` | Client-side pages/routes. |
| Styling | Tailwind CSS 3 | CSS/TS config | `tailwind.config.ts`, `src/styles.css` | Utility-first UI styling. |
| Animation | Framer Motion | TypeScript/TSX | Landing/dashboard pages | UI animations. |
| Icons | lucide-react | TypeScript/TSX | Most components/pages | Button and UI icons. |
| HTTP client | Axios | TypeScript | `src/services/api.ts` and services | Call backend API. |
| Backend runtime | Node.js | JavaScript ES modules | `backend/src/server.js` | Server runtime. |
| Backend framework | Express 4 | JavaScript | `backend/src/routes/*`, `server.js` | REST API. |
| Database | MongoDB | JavaScript via Mongoose | `backend/src/models/*`, `backend/src/config/db.js` | Persistent storage. |
| ODM | Mongoose 8 | JavaScript | All backend model files | Define schemas and query MongoDB. |
| Auth | JWT | JavaScript | `auth.routes.js`, `middleware/auth.js` | Company/student access control. |
| Password hashing | bcryptjs | JavaScript | company registration, student generation, login | Hash and verify passwords. |
| File upload | multer | JavaScript | `drive.routes.js` | Memory upload for job description and student file. |
| Excel parsing | read-excel-file | JavaScript | `parseStudentFile.js` | Parse `.xlsx` student lists. |
| CSV parsing | csv-parse | JavaScript | `parseStudentFile.js` | Parse `.csv` student lists. |
| Email | nodemailer | JavaScript | `mailer.js` | Send invitation and result-related emails. |
| AI/LLM | Groq SDK | JavaScript | `aiService.js` | Generate oral questions, evaluate answers, summarize interview. |
| LLM model | `llama-3.3-70b-versatile` | Prompt calls | `aiService.js` | Question generation, answer evaluation, final summary. |
| Speech-to-text | Browser `SpeechRecognition` / `webkitSpeechRecognition` | Browser API | `TechnicalOralRound.tsx` | Convert spoken answers to text. |
| Text-to-speech | Browser `speechSynthesis` | Browser API | `TechnicalOralRound.tsx` | Read oral questions aloud. |
| Camera/mic access | Browser `navigator.mediaDevices.getUserMedia` | Browser API | `Assessment.tsx`, `TechnicalOralRound.tsx` | Camera preview/proctoring and mic permission. |
| Face detection | Browser `FaceDetector` if available | Browser API | `useFaceDetection.ts` | Detect missing face. |
| Proctoring storage | MongoDB + localStorage fallback | JS/TS | `proctoring.routes.js`, `proctoringService.ts` | Store or locally cache events. |
| Testing | Node built-in test runner | JavaScript | `src/utils/proctoringViolationLogic.test.js` | Test proctoring decision logic. |

### Mentioned But Not Fully Implemented

| Mentioned feature | Evidence | Actual status |
|---|---|---|
| Coding round | `CreateDrive.tsx` round option and `modules_to_be_covered.md` | No coding assessment page/API found. |
| HR round/interview | Round option in UI/docs | No HR interview implementation found. |
| Resume intake/advanced analytics | README/project documentation language | Not implemented in current source as a working module. |
| Deployment | None found beyond local run docs | No production deployment config found. |

## 3. Repository Structure and Execution Paths

### Root Files

| File/folder | Role |
|---|---|
| `package.json` | Frontend scripts/dependencies. Scripts: `dev`, `server`, `build`, `preview`. |
| `vite.config.ts` | Vite config with React plugin. |
| `tailwind.config.ts` | Tailwind theme, colors, animations, content paths. |
| `.env.example` | Frontend API base URL example. |
| `backend/.env.example` | Backend env variables for port, client URL, MongoDB, JWT, Groq, SMTP. |
| `HOW_TO_RUN.md` | Local run instructions and demo route. |
| `src/` | React frontend. |
| `backend/src/` | Express/MongoDB backend. |
| `images/` | Logo and dashboard images used by frontend. |
| `Documents/` | Contains `SYNTHORA.docx`; not part of runtime code path. |

### Frontend Execution Path

`src/main.tsx`

- Creates React root.
- Wraps app in `BrowserRouter`.
- Imports global styles.

`src/App.tsx`

- Wraps routes in `ThemeProvider`.
- Renders `AppRoutes`.

`src/routes/AppRoutes.tsx`

- Defines public, company, student, assessment, and demo routes.

Services:

- `src/services/api.ts` creates the Axios instance.
- It reads `VITE_API_BASE_URL`, defaulting to `http://localhost:5000/api`.
- It attaches `Authorization: Bearer <token>` from `localStorage["synthora-token"]`.

### Backend Execution Path

`backend/src/server.js`

- Loads `backend/.env`.
- Creates Express app.
- Enables CORS for `CLIENT_URL` or `http://localhost:5173`.
- Adds JSON middleware.
- Mounts route groups:
  - `/api/auth`
  - `/api/companies`
  - `/api/company/drives`
  - `/api/students`
  - `/api/proctoring`
- Connects to MongoDB through `connectDatabase`.
- Starts server on `PORT` or `5000`.

`backend/src/config/db.js`

- Requires `MONGO_URI`.
- Connects with Mongoose.

## 4. Database Models

### Company

File: `backend/src/models/Company.js`

Fields:

- `companyName`
- `hrName`
- `email` unique, lowercase
- `phone`
- `website`
- `passwordHash`
- timestamps

Purpose: stores company account details for login and drive ownership.

### HiringDrive

File: `backend/src/models/HiringDrive.js`

Fields:

- `company`: reference to `Company`
- `driveName`
- `jobRole`
- `jobDescriptionFile`: original name, MIME type, size, binary data
- `studentFile`: original name, MIME type, size, binary data
- `examDate`, `examTime`
- `durationMinutes`
- `rounds`: enum values include `Aptitude`, `Technical Oral`, `Coding`, `HR Interview`, `HR`
- `aptitudeCutoff`
- `technicalOralCutoff`, default 60
- `lastRegistrationDate`
- `status`, default `Scheduled`
- timestamps

Purpose: central hiring drive record.

### Student

File: `backend/src/models/Student.js`

Important fields:

- Identity: `name`, `email`, `phone`
- Relationships: `drive`, `company`, `technicalOralInterview`
- Auth: `passwordHash`, `plainPasswordForInitialEmail`
- Access/status: `isActive`, `activatedAt`, `assessmentStatus`, `lastLogin`, `startedAt`, `completedAt`, `currentRound`
- Aptitude: `answers`, `score`, `aptitudeScore`
- Technical oral: `technicalOralScore`, `technicalOralStatus`
- Technical access: `technicalAssessmentStatus`, invited/start/expiry timestamps, email status fields
- Result: `Pending`, `Qualified`, or `Rejected`

Index:

- Unique compound index on `{ email, drive }`.

Important limitation:

- `plainPasswordForInitialEmail` stores the generated initial password in plain text. This is convenient for emailing/displaying but is a security weakness.

### Invitation

File: `backend/src/models/Invitation.js`

Purpose: tokenized student access record.

Important fields:

- `student`, `drive`, `company`
- `studentName`, `studentEmail`
- `token`
- `invitationStatus`: `Pending`, `Activated`, `Expired`
- `assessmentStatus`: `Pending`, `Logged In`, `Started`, `Completed`
- `currentRound`
- `activationOpenAt`, `expiresAt`
- Email delivery fields
- Aptitude answers/score/result fields
- Technical oral and technical assessment status/window/email fields

### TechnicalOralInterview

File: `backend/src/models/TechnicalOralInterview.js`

Purpose: stores the full AI viva session.

Top-level fields:

- `studentId`, `driveId`, `companyId`
- `jobRole`
- `status`: `In Progress`, `Completed`, `Terminated`
- `startedAt`, `completedAt`
- `currentQuestionIndex`
- `maxQuestions`, default 5
- `overallScore` 0-100
- `overallFeedback`
- average metrics: technical accuracy, conceptual knowledge, communication, completeness, relevance
- `questions`: array of oral turns

Question turn fields:

- `questionNumber`
- `category`: `Fundamental`, `Conceptual`, `Practical`, `Scenario`, `Adaptive Follow-up`
- `question`
- `spokenAnswer`
- `score` 0-10
- `technicalAccuracy` 0-10
- `conceptualKnowledge` 0-10
- `communicationSkill` 0-10
- `completeness` 0-10
- `relevance` 0-10
- `feedback`
- `isSatisfactory`
- `answeredAt`

### ProctoringEvent

File: `backend/src/models/ProctoringEvent.js`

Fields:

- `student`
- `drive`
- `eventType`
- `severity`: `low`, `medium`, `high`
- `message`
- `metadata`
- `occurredAt`
- timestamps

Purpose: stores suspicious activity events logged by the frontend.

## 5. API Reference

### Authentication and Company APIs

| Method | Endpoint | Auth | Purpose | Request data | Response | DB operations |
|---|---|---|---|---|---|---|
| GET | `/api/health` | No | Backend health check | None | `{ status, service }` | None |
| POST | `/api/companies/register` | No | Register company | companyName, hrName, email, phone, website, password, confirmPassword, acceptedTerms | company id/name/email | Creates `Company`, hashes password |
| POST | `/api/auth/login` | No | Login company or student | email, password | `{ userType, token }` | Reads `Company` or latest `Student`; updates student login statuses |

### Drive APIs

| Method | Endpoint | Auth | Purpose | Request data | Response | DB operations |
|---|---|---|---|---|---|---|
| POST | `/api/company/drives` | Company | Create drive | multipart fields + jobDescription + studentFile | drive, invited count, invitation statuses | Creates `HiringDrive`, upserts `Student`, creates `Invitation`, sends email |
| GET | `/api/company/drives` | Company | List company drives | None | drives with stats | Reads drives/students |
| GET | `/api/company/drives/:driveId` | Company | Drive detail | driveId | drive, stats, student rows | Reads drive, invitations, students |
| POST | `/api/company/drives/:driveId/technical-assessment/:studentId/invite` | Company | Select student for technical oral | driveId, studentId | technical window and email status | Updates `Student` and `Invitation`, sends email |
| DELETE | `/api/company/drives/:driveId` | Company | Delete drive | driveId | message | Deletes drive, invitations, students. Does not delete `TechnicalOralInterview` or `ProctoringEvent` in the current code. |
| POST | `/api/company/drives/:driveId/reminders` | Company | Resend aptitude invitations | driveId | sent/failed/total | Updates invitation email fields |
| GET | `/api/company/drives/:driveId/download/:type` | Company | Download JD, student file, CSVs, or PDF report | type = `jd`, `students-file`, `qualified`, `results`, `report` | file | Reads drive/students |
| GET | `/api/company/drives/:driveId/oral/:studentId` | Company | Recruiter viva details | driveId, studentId | oral interview | Reads `TechnicalOralInterview` |

### Student APIs

| Method | Endpoint | Auth | Purpose | Request data | Response | DB operations |
|---|---|---|---|---|---|---|
| GET | `/api/students/invite/:token` | No | Read invitation and access state | token | invitation details, windows, redirect URL if technical | Reads invitation/student/drive/company; may mark expired |
| POST | `/api/students/invite/:token/start` | No | Start from invitation link | token | JWT token, drive id, redirect URL | Updates student/invitation active/login/currentRound |
| POST | `/api/students/activate/:token` | No | Older activation endpoint | token | temporary password and invite info | Marks student active and invitation used |
| GET | `/api/students/me/dashboard` | Student | Student dashboard data | JWT | drive/status/scores/windows | Reads student/drive/company/invitation; may mark technical expired |
| GET | `/api/students/assessment/:driveId` | Student | Load aptitude data | driveId | assessment info, answers, cutoffs | Reads student/drive/company/invitation |
| POST | `/api/students/assessment/start` | Student | Start current assessment | None | started status | Updates student/invitation |
| POST | `/api/students/assessment/:driveId/start` | Student | Start drive assessment | driveId | started status | Updates student/invitation |
| POST | `/api/students/assessment/:driveId/answers` | Student | Autosave answers | answers object | message | Updates student/invitation answers |
| POST | `/api/students/assessment/complete` | Student | Complete aptitude | score, answers | score/result/cutoff flags | Updates student/invitation score/result; sends cleared email |
| POST | `/api/students/oral/start` | Student | Start/resume technical oral | None | oral session | Reads eligibility/window; creates or resumes `TechnicalOralInterview`; updates statuses |
| POST | `/api/students/oral/:sessionId/answer` | Student | Submit spoken answer | spokenAnswer | evaluation, next question or final result | Calls Groq, updates interview, may complete and update final result |
| GET | `/api/students/oral/:sessionId` | Student | Fetch oral session | sessionId | oral session | Reads interview |
| POST | `/api/students/oral/:sessionId/finish` | Student | Finish oral session | sessionId | final session | Requires all questions evaluated; updates interview/student/invitation |

### Proctoring APIs

| Method | Endpoint | Auth | Purpose | Request data | Response | DB operations |
|---|---|---|---|---|---|---|
| POST | `/api/proctoring/events` | Student | Log proctoring event | eventType, severity, message, metadata, occurredAt | created event | Creates `ProctoringEvent` |
| GET | `/api/proctoring/events` | None | List all events | None | events | Reads all events. No auth guard in current code. |
| GET | `/api/proctoring/report/:driveId` | None | Drive proctoring report | driveId | events | Reads drive/events. No auth guard in current code. |

## 6. Authentication and Authorization

Authentication uses JWTs:

- Company token payload: `{ id: company._id, userType: "company" }`, expires in 7 days.
- Student token payload: `{ id: student._id, userType: "student" }`, expires in 1 day.

Middleware:

- `requireCompany` checks token and `userType === "company"`, then sets `req.companyId`.
- `requireStudent` checks token and `userType === "student"`, then sets `req.studentId`.

Student access rules:

- Student records are generated by drive creation.
- Student login requires active invitation and opens 10 minutes before exam time.
- Invitation start endpoint can issue a student token when allowed.
- Technical oral access requires:
  - drive includes `Technical Oral`;
  - aptitude score is at least drive cutoff;
  - company has selected/invited the student for technical assessment;
  - current time is within the technical assessment window.

Security limitations:

- `JWT_SECRET` falls back to `dev-secret` if missing.
- Plain initial password is stored in `Student.plainPasswordForInitialEmail`.
- Proctoring report GET endpoints are not protected by auth in current code.
- Aptitude score is trusted from the client.

## 7. Module-by-Module Explanation

### 7.1 Company Registration

Purpose: create a company account.

User: company/HR.

Inputs:

- Company name, HR name, email, phone, website, password, confirm password, accepted terms.

Frontend files:

- `src/pages/Auth/CompanyRegister.tsx`
- `src/services/authService.ts`
- `src/components/FormField.tsx`

Backend files:

- `backend/src/routes/company.routes.js`
- `backend/src/models/Company.js`

Process:

1. User submits form.
2. Frontend validates matching password.
3. Calls `registerCompany()`.
4. Backend checks required fields and `acceptedTerms`.
5. Backend normalizes email, checks duplicate company.
6. Password is hashed using bcrypt with cost 12.
7. Company is saved.
8. Frontend navigates to `/company/login`.

Errors:

- Missing fields: 400.
- Terms not accepted: 400.
- Password mismatch: frontend and backend check.
- Duplicate email: 409.
- Server/database error: 500.

### 7.2 Login

Purpose: one login page for company and student.

User: company or invited student.

Frontend:

- `src/pages/Auth/Login.tsx`
- `src/services/authService.ts`

Backend:

- `backend/src/routes/auth.routes.js`

Process:

1. User enters email/password.
2. Backend first searches `Company`.
3. If company password matches, returns company JWT.
4. Otherwise backend searches latest `Student` by email.
5. If student password matches, backend validates drive existence and login window.
6. Student login opens 10 minutes before exam time.
7. Student `lastLogin` and status may be updated.
8. Frontend stores token in localStorage and routes:
   - company -> `/company/dashboard`
   - student -> `/student/dashboard`

Errors:

- Missing credentials: 400.
- Student too early or inactive: 403.
- Invalid credentials: 401.
- Server error: 500.

### 7.3 Hiring Drive Creation

Purpose: create a drive, upload role/candidate data, generate invitations.

User: company.

Frontend:

- `src/pages/Company/CreateDrive/CreateDrive.tsx`
- `src/services/driveService.ts`

Backend:

- `backend/src/routes/drive.routes.js`
- `backend/src/utils/parseStudentFile.js`
- `backend/src/utils/tokens.js`
- `backend/src/utils/mailer.js`
- `backend/src/models/HiringDrive.js`, `Student.js`, `Invitation.js`

Inputs:

- Drive name, job role, job description file, student file, exam date/time, duration, rounds, aptitude cutoff, technical oral cutoff, registration deadline.

Process:

1. Frontend builds `FormData`.
2. `rounds` is JSON-stringified.
3. Backend requires company auth.
4. Multer stores uploaded files in memory.
5. Backend validates required fields and files.
6. Student file is parsed as CSV or XLSX.
7. Drive is created and uploaded files are stored as binary Buffers in MongoDB.
8. For each parsed student:
   - generate password like `Syn-<hex>`;
   - hash password;
   - upsert student by email + drive;
   - create unique invitation token;
   - create invitation record;
   - send invitation email if SMTP is configured.
9. Response includes public drive data, invited count, and invitation email statuses.

Candidate parsing rules:

- Accepts `.csv` and `.xlsx`.
- Recognizes email-like columns such as `email`, `mail`, `studentemail`.
- Recognizes name and phone columns.
- Also scans raw cells for email addresses.
- Deduplicates by email.

Errors:

- Missing company: 404.
- Missing fields/files: 400.
- Invalid rounds JSON: 400.
- Parse errors: 400.
- Server errors: 500.

Limitations:

- Job description file content is not parsed for AI context; only filename/drive details are used.
- Student password is stored in plain text for initial email support.

### 7.4 Company Dashboard

Purpose: show drives and basic stats.

Frontend:

- `src/pages/Company/Dashboard/CompanyDashboard.tsx`
- `src/layouts/DashboardLayout.tsx`

Backend:

- `GET /api/company/drives`

Displayed stats:

- Total drives.
- Students invited.
- Waiting students.
- Shortlisted students.

Important limitation:

- `Shortlisted Students` is hardcoded to `"0"` in `CompanyDashboard.tsx`.
- The `Download Shortlist` button in the blue Final Results panel has no API handler; it is decorative/incomplete.
- Sidebar links `Previous Drives`, `Results`, and `Profile` route to `/company/dashboard`, not dedicated pages.

### 7.5 Drive Details and Results

Purpose: monitor student statuses, scores, emails, downloads, and technical selection.

Frontend:

- `src/pages/Company/DriveDetails/DriveDetails.tsx`
- `src/components/OralInterviewModal.tsx`

Backend:

- `GET /api/company/drives/:driveId`
- download endpoints
- reminder endpoint
- technical invite endpoint
- oral details endpoint

Important buttons:

| Button | Handler | API | Effect |
|---|---|---|---|
| Download JD | `handleDownload("jd")` | `GET /download/jd` | Downloads stored job description file. |
| Download Uploaded Excel | `handleDownload("students-file")` | `GET /download/students-file` | Downloads stored student file. |
| Send Reminder Email | `handleReminder` | `POST /reminders` | Resends invitation emails and updates email fields. |
| Download Final Qualified Students | `handleDownload("qualified")` | `GET /download/qualified` | Downloads CSV of students with result `Qualified`. |
| Download Result Excel | `handleDownload("results")` | `GET /download/results` | Downloads CSV of all results. |
| Download PDF Report | `handleDownload("report")` | `GET /download/report` | Downloads simple generated PDF summary. |
| View Results | `loadDetails` | `GET /:driveId` | Refreshes drive details. |
| Select for Technical | `handleTechnicalInvite` | `POST /technical-assessment/:studentId/invite` | Opens 4-hour technical window and sends email if possible. |
| View Viva | Opens modal | `GET /oral/:studentId` | Shows oral transcript and AI scores. |

Filters:

- All Students
- Pending
- Completed
- Qualified
- Rejected

Auto-refresh:

- Drive details reload every 10 seconds.

### 7.6 Student Invitation and Access

Purpose: let students enter assessment through a unique token.

Frontend:

- `src/pages/Student/ActivateInvitation.tsx`
- `src/services/authService.ts`

Backend:

- `GET /api/students/invite/:token`
- `POST /api/students/invite/:token/start`
- `POST /api/students/activate/:token`

Process for aptitude:

1. Student opens `/invite/:token`.
2. Frontend loads invitation details.
3. Backend calculates login window and exam window:
   - login opens 10 minutes before exam start;
   - exam closes at start time + duration.
4. Button shows countdown if not yet available.
5. On start, backend updates statuses and returns student JWT.
6. Frontend stores token and routes to `/assessment/:driveId`.

Process for technical oral:

1. Same invitation token can represent `currentRound = "Technical Oral"`.
2. Backend uses technical start/expiry timestamps instead of aptitude exam date.
3. It returns redirect URL `/assessment/:driveId/oral`.

### 7.7 Student Dashboard

Purpose: show current student assessment status and allow starting/continuing active rounds.

Frontend:

- `src/pages/Student/Dashboard/StudentDashboard.tsx`

Backend:

- `GET /api/students/me/dashboard`
- `POST /api/students/assessment/start`

Rules:

- Aptitude can start only when status is `Logged In` and current time is between exam start/end.
- If current round is Technical Oral and access window is active, button routes to `/assessment/:driveId/oral`.
- Dashboard shows aptitude score and technical oral score if available.

Errors:

- If dashboard API fails, page shows login/invitation message.
- If technical window expired or unavailable, message is shown.

### 7.8 Aptitude Assessment

Purpose: run a proctored aptitude test.

Frontend:

- `src/pages/Student/Assessment.tsx`
- `src/services/studentService.ts`
- proctoring hooks/utilities.

Backend:

- assessment load/start/save/complete student routes.

Questions:

- Static array of 5 questions inside `Assessment.tsx`.
- Not generated by AI.
- Not loaded from MongoDB.
- Not randomized.

Working process:

1. Page loads assessment metadata and existing answers.
2. Waiting room displays countdown.
3. User clicks `Start Proctored Assessment`.
4. Confirmation modal appears.
5. User clicks `I'm ready to begin`.
6. Browser requests camera and microphone.
7. Browser requests fullscreen.
8. Backend start endpoint is called.
9. Questions are shown after secure mode is active.
10. Selecting an option updates React state.
11. Answers are autosaved after a short debounce.
12. `Next` and `Previous` navigate the static question list.
13. On final question, `Submit Assessment` submits frontend-computed score and answers.
14. Completion modal shows score and whether cutoff was cleared.

Errors:

- Camera/mic denial blocks real authenticated flow; demo mode may continue locally.
- Submit failure resets submit flag and shows retry message.
- Time over calls auto-submit.

### 7.9 Aptitude Result Emails

Backend:

- `sendAptitudeClearedEmailOnce` in `student.routes.js`
- `sendAptitudeClearedEmail` in `mailer.js`

Rule:

- If aptitude score >= drive cutoff, backend attempts to send an aptitude-cleared email.
- It sends only once if `student.aptitudeClearedEmailSent` or invitation equivalent is already true.
- If SMTP is missing, status becomes `smtp_not_configured`.

### 7.10 Company Shortlisting for Technical Assessment

Purpose: recruiter decides which aptitude-qualified students should receive technical oral access.

Frontend:

- `DriveDetails.tsx`

Backend:

- `POST /api/company/drives/:driveId/technical-assessment/:studentId/invite`
- `promoteStudentToTechnicalAssessment` in `technicalAssessment.js`

Eligibility:

- Drive must include `Technical Oral`.
- Student must exist in the drive.
- Student must have aptitude score.
- Aptitude score must be >= drive cutoff.
- Student result must not be `Rejected`.
- Technical oral must not already be completed.

Effect:

- `currentRound = "Technical Oral"`
- `technicalAssessmentStatus = "Active"`
- `technicalAssessmentInvitedAt = now`
- `technicalAssessmentAccessStartsAt = now`
- `technicalAssessmentAccessExpiresAt = now + 4 hours`
- invitation `expiresAt` is updated to the same expiry.
- Technical invitation email is attempted.

### 7.11 AI Technical Oral/Viva Assessment

Purpose: conduct a 5-question oral technical interview.

Frontend:

- `src/pages/Student/TechnicalOralRound.tsx`
- `src/services/oralInterviewService.ts`

Backend:

- student oral routes in `student.routes.js`
- AI functions in `backend/src/services/aiService.js`
- model in `TechnicalOralInterview.js`

Working process:

1. Page starts by calling `POST /students/oral/start`, unless driveId is `demo`.
2. Backend checks student, drive, oral round configuration, aptitude cutoff, technical invitation state, and access window.
3. Backend resumes existing non-terminated interview if present.
4. If no session exists, backend calls `generateOralQuestion` for question 1.
5. Question is stored in `TechnicalOralInterview`.
6. Frontend reads the question using browser text-to-speech.
7. Student clicks `Start Speaking`.
8. Browser SpeechRecognition builds transcript.
9. Student clicks `Submit Answer` or timer reaches 90 seconds.
10. Frontend sends transcript to backend.
11. Backend evaluates answer with Groq.
12. Backend stores evaluation fields in current question turn.
13. If not last question, backend generates next question using previous turns.
14. After question 5, backend calls final summary logic, completes interview, updates student/invitation final result.

Demo mode:

- `/assessment/demo/oral` uses hardcoded demo questions and local scoring in the frontend.
- No backend, MongoDB, or Groq is required.
- Demo scoring is not the real authenticated student evaluation.

### 7.12 Proctoring

Purpose: warn/log suspicious activity and auto-submit after repeated violations.

Frontend:

- `useTabFocusMonitor.ts`
- `useFaceDetection.ts`
- `useDeviceDetection.ts`
- `proctoringViolationLogic.ts`
- `Assessment.tsx`
- `TechnicalOralRound.tsx`

Backend:

- `proctoring.routes.js`
- `ProctoringEvent.js`

Implemented checks:

- Camera/mic permission request for aptitude.
- Camera request for oral proctoring feed.
- Fullscreen tracking.
- Tab visibility and window blur monitoring.
- Fullscreen exit detection in aptitude.
- Copy/cut/paste/context-menu prevention in aptitude question area.
- Screenshot shortcut detection for `PrintScreen` and `Ctrl/Cmd + Shift + S`.
- Face missing detection if browser supports `FaceDetector`.
- External-device heuristic based on bright red-channel pixels in video frame.

Violation rule:

- `warningThreshold = 1`
- `autoSubmitThreshold = 2`
- `warningGracePeriodMs = 5000`

Effect:

- First violation creates warning/log.
- Second violation triggers auto-submit.
- In aptitude, auto-submit submits the assessment with current score.
- In oral, auto-submit submits the current answer, not necessarily terminates the whole interview.

Limitations:

- Face detection depends on browser `FaceDetector`, which is not universally available.
- Device detection heuristic is very weak and can cause false positives.
- Proctoring does not directly lower score.
- Proctoring events are logged separately from score decisions.
- Some proctoring report endpoints lack auth guards.

## 8. Exact Evaluation Criteria

### A. Aptitude Assessment

Implementation file:

- `src/pages/Student/Assessment.tsx`

Question source:

- Static frontend array named `questions`.
- 5 questions.
- Each question includes `id`, `question`, `options`, and correct `answer`.
- No database storage.
- No randomization.
- No AI generation.

Scoring location:

- Frontend calculates the score.
- Backend stores submitted score and does not recalculate correct answers.

Formula:

```text
score = sum over all questions:
  if answers[question.id] === question.answer then 20 else 0
```

With 5 questions:

```text
maximum score = 5 * 20 = 100
minimum score = 0
```

Unanswered questions:

- `answers[question.id]` is undefined, so it does not equal correct answer.
- Score contribution: 0.

Incorrect answers:

- Score contribution: 0.

Negative marking:

- Not implemented.

Cutoff:

- Configured by company as `aptitudeCutoff` during drive creation.
- Stored in `HiringDrive.aptitudeCutoff`.
- Backend applies:

```text
isAptitudeQualified = submittedScore >= Number(drive.aptitudeCutoff)
result = isAptitudeQualified ? "Qualified" : "Rejected"
```

Worked example:

- Drive aptitude cutoff = 60.
- Candidate answers q1, q3, q5 correctly and q2/q4 incorrectly.
- Correct count = 3.
- Score = 3 * 20 = 60.
- Since 60 >= 60, backend sets result to `Qualified`.
- If score were 40, backend sets result to `Rejected`.

Important limitation:

- Because the backend trusts `req.body.score`, a malicious client could submit a manipulated score. A stronger design would send answers only and recompute score server-side from server-owned questions.

### B. AI Technical Oral Assessment

LLM provider:

- Groq.

Model:

- `llama-3.3-70b-versatile`

Implementation:

- `backend/src/services/aiService.js`

Question categories:

```text
1 -> Fundamental
2 -> Conceptual
3 -> Practical
4 -> Scenario
5 -> Adaptive Follow-up
```

Question generation:

- Uses `generateOralQuestion`.
- Sends a prompt with:
  - role/jobRole;
  - hiring drive context;
  - current question number;
  - assigned category;
  - previous conversation history if available.
- Output instruction asks for only one clear question, under 2 sentences.
- Temperature: 0.6.
- Max tokens: 150.

Fallback question generation:

- If `GROQ_API_KEY` is missing or question generation fails, the function returns a fallback local question from `FALLBACK_QUESTION_BANKS.default`.
- This means question generation can continue without Groq, but it will not be AI-generated.

Speech-to-text:

- Done in browser using `window.SpeechRecognition` or `window.webkitSpeechRecognition`.
- `continuous = true`
- `interimResults = true`
- `lang = "en-US"`
- If unsupported, UI shows a textarea fallback.

Text-to-speech:

- Done in browser using `window.speechSynthesis`.
- The question is read aloud with `SpeechSynthesisUtterance`.

Answer submission:

- Frontend combines final and interim transcript:

```text
fullSpokenAnswer = `${spokenTranscript} ${interimText}`.trim()
```

- Sends:

```json
{ "spokenAnswer": "..." }
```

to:

```text
POST /api/students/oral/:sessionId/answer
```

Empty/minimal answer rule:

- If answer is empty or fewer than 3 words, backend returns deterministic evaluation:

```json
{
  "score": 1,
  "technicalAccuracy": 1,
  "conceptualKnowledge": 1,
  "communicationSkill": 2,
  "completeness": 1,
  "relevance": 1,
  "feedback": "Minimal or no response was recorded for this question.",
  "isSatisfactory": false
}
```

AI evaluation prompt:

- System prompt tells the model it is an expert technical evaluator.
- It provides role, hiring context, question category, and question.
- It requires strict JSON with exactly:
  - `score`
  - `technicalAccuracy`
  - `conceptualKnowledge`
  - `communicationSkill`
  - `completeness`
  - `relevance`
  - `feedback`
  - `isSatisfactory`

Evaluation model call:

- Model: `llama-3.3-70b-versatile`
- Temperature: 0.2
- `response_format: { type: "json_object" }`

Metric validation:

- Numeric metrics are clamped/rounded to integers 0-10 using `clampMetric`.
- `feedback` defaults to `"Answer evaluated."` if missing.
- `isSatisfactory` defaults to `score >= 6` if not boolean.

Weights:

- No weighted per-criterion formula is implemented for per-question score.
- The LLM directly provides `score`.
- Other metrics are stored and averaged, but they do not calculate the per-question score.

Final score formula:

Implementation: `generateFinalOralSummary`.

```text
overallScore = Math.round((sum(question.score) / numberOfQuestions) * 10)
```

Because each question score is 0-10 and there are 5 questions, this scales the average to 0-100.

Metric averages:

```text
technicalAccuracyAvg = round(sum(technicalAccuracy) / numberOfTurns)
conceptualKnowledgeAvg = round(sum(conceptualKnowledge) / numberOfTurns)
communicationSkillAvg = round(sum(communicationSkill) / numberOfTurns)
completenessAvg = round(sum(completeness) / numberOfTurns)
relevanceAvg = round(sum(relevance) / numberOfTurns)
```

Final feedback:

- Deterministic fallback:

```text
The candidate demonstrated an overall technical proficiency score of <score>/100 for the <jobRole> role.
```

- If Groq is configured, it asks the model for a concise 2-sentence executive summary based on the five questions, scores, and feedback.

Technical oral cutoff:

- Stored as `HiringDrive.technicalOralCutoff`, default 60.

Pass/fail:

```text
isOralPassed = interview.overallScore >= drive.technicalOralCutoff
finalResult = isOralPassed ? "Qualified" : "Rejected"
```

Storage:

- All questions, spoken answers, per-question scores, metric fields, feedback, final score, final feedback, and averages are stored in `TechnicalOralInterview`.
- Student and Invitation are updated with technical oral score/status/result.

AI failure behavior:

- Missing `GROQ_API_KEY`:
  - question generation uses fallback questions;
  - answer evaluation fails with 503 unless the answer is minimal and handled deterministically.
- Groq evaluation parse/API failure:
  - backend throws 503 with message asking to retry.
  - frontend shows "Failed to evaluate answer. Please try submitting again."

Example:

Question:

```text
How would you design and secure a REST API endpoint for user login?
```

Example answer, not a real project result:

```text
I would validate the email and password, hash stored passwords with bcrypt, compare credentials securely, rate-limit repeated attempts, issue a short-lived JWT after successful login, and protect sensitive routes with middleware that verifies the token.
```

Possible AI evaluation shape under the implemented contract:

```json
{
  "score": 8,
  "technicalAccuracy": 8,
  "conceptualKnowledge": 8,
  "communicationSkill": 8,
  "completeness": 7,
  "relevance": 9,
  "feedback": "The answer covers core authentication practices including hashing, validation, JWTs, and rate limiting. It could be improved by mentioning refresh tokens and secure cookie storage.",
  "isSatisfactory": true
}
```

If five question scores were 7, 8, 6, 7, 8:

```text
average = (7 + 8 + 6 + 7 + 8) / 5 = 7.2
overallScore = round(7.2 * 10) = 72
```

If technical oral cutoff is 60:

```text
72 >= 60 -> Qualified
```

### C. Proctoring Criteria

Camera/mic:

- Aptitude requests video and audio before showing questions.
- Oral requests video for proctoring and speech recognition requests mic when the user starts speaking.

Face detection:

- Uses browser `FaceDetector` if available.
- Checks every 2500 ms.
- Missing face must persist past the 5000 ms grace rule before alert.

Tab switching/focus loss:

- `document.visibilitychange` and `window.blur` trigger violations.

Fullscreen:

- Aptitude requires fullscreen to enter secure mode.
- Exiting fullscreen during active proctoring logs violation.
- Oral has an `Enable Fullscreen` button and checks fullscreen for face/device detection, but tab-focus monitoring in oral is active after arming even without fullscreen.

Copy/paste/screenshot:

- Aptitude blocks context menu and copy/cut/paste inside question area.
- Keyboard `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+X` are blocked/logged.
- Screenshot attempts are detected for PrintScreen and Ctrl/Cmd+Shift+S.

Scoring effect:

- Proctoring does not subtract marks.
- Repeated violations can auto-submit.
- Events are recorded separately.

## 9. Algorithms, Rules, and Complexity

| Logic | File/function | Input | Output | Steps | Complexity |
|---|---|---|---|---|---|
| Company login lookup | `auth.routes.js` | email/password | JWT or error | Find company, compare bcrypt; else find student and compare | DB query dependent |
| Student login window | `getExamStartDate`, auth route | drive date/time | allowed/blocked | open time = exam start - 10 min | O(1) |
| Student file parsing | `parseStudentFile.js` | CSV/XLSX buffer | student array | parse table, normalize headers, extract emails, dedupe | O(r*c) for rows/columns |
| Invitation token | `createInvitationToken` | none | UUID token | crypto randomUUID | O(1) |
| Student password generation | `createStudentPassword` | none | temp password | 4 random bytes hex | O(1) |
| Drive stats | `buildStats` | students | counts/scores | filter/map students | O(n) |
| Aptitude scoring | `Assessment.tsx` | answers | score 0-100 | compare each answer to static answer | O(q), q=5 |
| Aptitude cutoff | student route complete | score/cutoff | Qualified/Rejected | score >= cutoff | O(1) |
| Technical state | `getTechnicalAssessmentState` | student/invitation | status | check completed, missing window, expired, future, in progress, active | O(1) |
| Technical promotion | `promoteStudentToTechnicalAssessment` | student/drive/invitation | active window | set status and 4-hour expiry, send email | O(1) plus email |
| Oral category selection | `getQuestionCategory` | question number | category | bounded index into category list | O(1) |
| Oral answer evaluation | `evaluateSpokenAnswer` | question/answer/context | evaluation | minimal-answer rule or Groq JSON evaluation | LLM call; not conventional complexity |
| Final oral score | `generateFinalOralSummary` | turns | score/averages | average question scores and metrics | O(t), t=5 |
| Proctor signal grace | `evaluateSignalState` | previous state, active, now | alert/no alert | compare elapsed to 5000 ms | O(1) |
| Proctor violation | `evaluateViolationState` | count/event | warning/auto-submit | increment, compare thresholds | O(1) |
| Download CSV | `buildResultRows` | students | rows | map student fields | O(n) |
| Simple PDF report | `buildSimplePdf` | lines | PDF buffer | creates minimal PDF object list | O(l) |

LLM-based logic:

- Question generation and answer scoring are prompt-based model calls, not deterministic algorithms.
- The application validates the JSON shape/range but does not independently verify correctness of LLM-assigned scores.

## 10. UI Inventory

### Routes

| Route | Page/component | Purpose |
|---|---|---|
| `/` | `Home` | Landing page. |
| `/company/register` | `CompanyRegister` | Company signup. |
| `/company/login` | `Login` | Login alias. |
| `/login` | `Login` | Shared login. |
| `/company/dashboard` | `CompanyDashboard` | Company drive dashboard. |
| `/company/create-drive` | `CreateDrive` | Create hiring drive. |
| `/company/drives/:driveId` | `DriveDetails` | Drive monitoring/results. |
| `/invite/:token` | `ActivateInvitation` | Student invitation landing. |
| `/student/activate/:token` | `ActivateInvitation` | Alias to invitation page. |
| `/student/dashboard` | `StudentDashboard` | Student dashboard. |
| `/assessment/:driveId` | `Assessment` | Aptitude assessment. |
| `/assessment/:driveId/oral` | `TechnicalOralRound` | Technical oral round. |
| `/technical-oral-demo` | redirect | Demo alias to `/assessment/demo/oral` in current workspace. |
| `/assessment-demo` | `AssessmentDemo` | Lightweight aptitude demo. |

### Landing Page

Files:

- `Home.tsx`, `Navbar.tsx`, `Hero.tsx`, `AssessmentMarquee.tsx`, `Stats.tsx`, `Features.tsx`, `HowItWorks.tsx`, `Footer.tsx`

Important actions:

- `Login`: routes to `/login`.
- `Register Company`: routes to `/company/register`.
- Navigation anchors scroll to sections.
- Mobile menu opens/closes locally; no API calls.

### Company Registration Page

Buttons/forms:

- `Register Company`: calls `handleSubmit`, then `POST /api/companies/register`.
- `Login`: link to `/login`.
- Terms checkbox is required.

DB effect:

- Creates `Company`.

### Login Page

Buttons/forms:

- `Login`: calls `POST /api/auth/login`.
- `Register Company`: link.

DB effect:

- Company: no write.
- Student: may update last login and assessment status.

### Company Dashboard

Buttons:

- `Create Hiring Drive`: routes to `/company/create-drive`.
- `View Details`: routes to drive details.
- `Delete`: calls `DELETE /api/company/drives/:driveId`.
- `Download Shortlist`: no handler; decorative/incomplete.
- Sidebar Logout: removes token and routes to `/login`.

DB effect:

- Delete removes drive, invitations, and students.

### Create Hiring Drive Page

Form fields:

- Drive Name
- Job Role
- Job Description Upload
- Student Excel Upload
- Exam Date
- Exam Time
- Duration
- Aptitude Cutoff
- Technical Oral Cutoff
- Last Registration Date
- Round checkboxes

Button:

- `Schedule Hiring Drive`: calls `POST /api/company/drives`.

DB effect:

- Creates drive/students/invitations.

### Drive Details Page

Buttons:

- Download buttons: call file endpoints and trigger browser download.
- `Send Reminder Email`: sends/reminds aptitude invitations.
- `View Results`: refreshes current data.
- Filter buttons: update local filter only.
- `Select for Technical`: calls backend technical invite.
- `View Viva`: opens modal and calls oral details endpoint.

DB effect:

- Reminder updates invitation email status.
- Technical selection updates student/invitation technical status/window.

### Student Invitation Page

Button:

- `Start Assessment`: calls `POST /api/students/invite/:token/start`.

DB effect:

- Activates/logs in student and invitation, sets round/status.

### Student Dashboard

Button states:

- `Start Aptitude Assessment`: calls `POST /api/students/assessment/start`, then routes to aptitude.
- `Continue Assessment`: routes to aptitude.
- `Start Technical Assessment`: routes to oral page if active window.
- `Technical Completed`, `Completed`, `Window Closed`: status displays, no API action.

### Aptitude Assessment Page

Buttons:

- `Start Proctored Assessment`: opens prep modal.
- `Cancel`: closes modal.
- `I'm ready to begin`: requests permissions/fullscreen and starts assessment.
- Option buttons: update answer state.
- `Previous` and `Next`: change current question.
- `Submit Assessment`: calls `POST /api/students/assessment/complete`.
- `Go to Dashboard`: routes to student dashboard.

DB effect:

- Start updates statuses.
- Autosave updates answers.
- Submit updates answers, score, result, completion fields.

### Technical Oral Page

Buttons:

- `Enable Fullscreen`: requests fullscreen.
- `Replay Question`: uses browser text-to-speech.
- `Start Speaking`: starts browser speech recognition.
- `Stop Speaking`: stops recognition.
- `Clear`: clears transcript state.
- `Submit Answer`: sends transcript to backend.
- `Back to Dashboard`: routes to student dashboard.

DB effect:

- Oral start creates/resumes interview.
- Submit answer updates oral question evaluation.
- Final submit updates interview/student/invitation result.

### Oral Interview Modal

Buttons:

- `Close`: closes modal.

API:

- Loads data from `GET /api/company/drives/:driveId/oral/:studentId`.

DB effect:

- Read only.

## 11. AI Implementation Details

File: `backend/src/services/aiService.js`

### Configuration

Environment variable:

- `GROQ_API_KEY`

No API keys are hardcoded in the source. The code logs a warning when the key is missing.

### Question Generation Prompt Behavior

The question prompt:

- Defines Synthora AI as an expert, objective technical viva interviewer.
- Specifies 5-question spoken oral exam.
- Includes role and hiring drive context.
- Defines progression guidelines by question number.
- Includes previous conversation history when available.
- Instructs the model to ask one focused question and output only the question text.

### Evaluation Prompt Behavior

The evaluation system prompt:

- Defines Synthora AI as expert technical evaluator.
- Includes role, hiring context, question category, and exact question.
- Requires strict JSON with exact scoring fields.
- Asks `isSatisfactory` to be true if score >= 6.

Validation:

- Parses JSON.
- Clamps score and metric values to 0-10 integers.
- Provides defaults for missing feedback/isSatisfactory.

No retry logic:

- There is no retry/backoff/rate-limit handling.
- On evaluation failure, backend returns 503.

Security and reliability risks:

- LLM score is not independently verified.
- Prompt injection is possible through candidate answer or job context, though response format reduces some risk.
- Scores can vary because LLM judgment is probabilistic, although low temperature is used for evaluation.
- The job description content is not parsed, so role context may be weaker than expected.

Deterministic code vs LLM:

| Deterministic application code | LLM |
|---|---|
| Access checks, statuses, windows, final score averaging, cutoffs, minimal-answer rule, metric clamping | Question wording, answer score/metrics/feedback for normal answers, final executive summary |

## 12. End-to-End Data Flow and Architecture

```text
Company Browser
  -> React frontend
  -> Axios service with company JWT
  -> Express /api/company/drives
  -> MongoDB: Company, HiringDrive, Student, Invitation
  -> Nodemailer SMTP for invitation emails

Student Browser
  -> Invitation link /invite/:token
  -> Express /api/students/invite/:token
  -> MongoDB reads invitation/drive/student
  -> Student JWT stored in browser localStorage
  -> Aptitude page
  -> Static frontend questions + browser proctoring
  -> Express stores answers/score/result
  -> Company dashboard sees results

Company Browser
  -> Select for Technical
  -> Express promotes student to technical round
  -> MongoDB updates 4-hour access window
  -> Nodemailer sends technical oral invite

Student Browser
  -> Technical oral page
  -> Browser TTS speaks question
  -> Browser STT transcribes answer
  -> Express sends question/answer/context to Groq
  -> Groq returns question/evaluation/summary
  -> MongoDB stores TechnicalOralInterview
  -> Student/Invitation final result updated
  -> Company modal displays transcript and scores
```

Data storage:

| Data | Stored where |
|---|---|
| Company account | MongoDB `Company` |
| Hiring drive and uploaded files | MongoDB `HiringDrive` |
| Student account and scores | MongoDB `Student` |
| Invitation token/window/status | MongoDB `Invitation` |
| Aptitude question definitions | Frontend code only |
| Aptitude selected answers | Frontend state, autosaved to MongoDB |
| Aptitude score | Frontend-calculated, stored in MongoDB |
| Speech transcript | Frontend state, then MongoDB in oral interview |
| Oral questions/evaluations | MongoDB `TechnicalOralInterview` |
| Proctoring events | MongoDB `ProctoringEvent` or localStorage fallback |
| Email content | Sent via SMTP, not stored as full message body |
| LLM prompts/responses | Sent to Groq; final outputs stored, prompts not stored separately |

## 13. Testing, Limitations, and Improvement Areas

### Confirmed Working From Safe Checks

- Frontend TypeScript/Vite build passes.
- Proctoring logic unit test passes 4 tests.

### Not Fully Tested

- Live backend server with MongoDB was not started for this documentation pass.
- SMTP delivery was not tested.
- Groq API calls were not tested because that requires a configured API key and network/service access.
- End-to-end browser mic/camera behavior was not manually tested in this pass.

### Confirmed Issues or Limitations

- Aptitude score is computed on frontend and trusted by backend.
- Aptitude questions are static and visible in bundled frontend code.
- Coding and HR rounds are selectable but not implemented.
- Job description file content is not parsed for AI prompt context.
- `plainPasswordForInitialEmail` stores generated student password in plain text.
- Proctoring report GET endpoints are unauthenticated.
- Delete drive does not remove `TechnicalOralInterview` or `ProctoringEvent` records.
- Company dashboard "Shortlisted Students" stat is hardcoded to 0.
- Company dashboard "Download Shortlist" button has no click handler.
- Some sidebar links point back to dashboard rather than dedicated modules.
- Technical invitation flow is manual; aptitude result does not automatically activate technical oral access.
- `qualifiedForOral` in aptitude completion response is returned as false even when candidate clears aptitude; actual next step is recruiter selection.
- Browser speech recognition support varies by browser.
- Face detection support varies by browser.
- Device detection heuristic is not reliable.

### Improvement Areas

- Move aptitude question bank and scoring to backend.
- Randomize or generate aptitude questions server-side.
- Add audit logs for score submissions.
- Protect all proctoring report endpoints with company auth.
- Remove plain password storage; use one-time reset links instead.
- Parse job description content for richer oral questions.
- Add real coding and HR modules or remove inactive options.
- Add automated backend tests and integration tests.
- Add deployment configuration.
- Add rate limiting and account lockout.
- Add validation for uploaded file size/type.
- Add LLM evaluation calibration and human review workflow.
- Store proctoring summary with assessment result.

## 14. Final-Year Viva Preparation

### 2-Minute Project Introduction

Synthora.AI is an AI-assisted recruitment platform built for company hiring drives. It allows a company to register, create a hiring drive, upload a job description and a student spreadsheet, automatically generate student invitations, conduct an aptitude assessment, shortlist candidates, and run an AI-based technical oral viva.

The platform has two user roles: company users and students. Company users manage drives, monitor candidate progress, download results, and invite qualified students for the technical round. Students access the assessment through invitation links, complete the aptitude test, and if selected, answer technical viva questions through a speech-based interface.

The project uses React and TypeScript for the frontend, Node.js and Express for the backend, MongoDB with Mongoose for storage, JWT for authentication, Nodemailer for emails, and Groq's `llama-3.3-70b-versatile` model for AI question generation and technical answer evaluation. It also includes browser-based proctoring features such as camera monitoring, fullscreen checks, tab-switch detection, copy-paste blocking, and auto-submit after repeated violations.

The key innovation is combining recruitment workflow automation with AI technical oral evaluation and stored viva transcripts, while still letting the recruiter control final shortlisting.

### 5-Minute Technical Explanation

The frontend starts from `main.tsx`, wraps the app in `BrowserRouter`, and renders `AppRoutes`. Routes are divided into landing pages, authentication pages, company dashboard pages, student invitation/dashboard pages, aptitude assessment, and technical oral round. Axios is configured in `src/services/api.ts`; it attaches the JWT token from localStorage to backend requests.

The backend is an Express server in `backend/src/server.js`. It connects to MongoDB through Mongoose and exposes route groups for authentication, company registration, hiring drives, students, and proctoring. Authentication uses JWTs and separates company and student access using `requireCompany` and `requireStudent` middleware.

When a company creates a drive, the frontend sends multipart form data including job description and student file. The backend stores the files in MongoDB, parses student CSV/XLSX data, creates student records, creates invitation tokens, generates temporary passwords, and sends invitation emails if SMTP is configured.

Students open invitation links. The backend checks whether the login window is open. Aptitude starts at the official exam time and closes after the configured duration. The aptitude assessment uses five static frontend questions. The score is calculated in React as 20 marks per correct answer and submitted to the backend. The backend applies the drive cutoff and stores result as Qualified or Rejected.

For the technical oral round, the recruiter manually selects qualified students. This creates a four-hour technical access window. The oral page uses browser text-to-speech to read questions and browser speech recognition to transcribe answers. The backend uses Groq `llama-3.3-70b-versatile` to generate each question and evaluate each answer with JSON scores for technical accuracy, conceptual knowledge, communication, completeness, relevance, and feedback. After five questions, the backend averages question scores, scales them to 100, applies the technical oral cutoff, and stores final results.

Proctoring runs mainly in the browser. It checks tab switching, window blur, fullscreen exit, copy-paste attempts, screenshot shortcuts, face missing, and a basic external-device heuristic. Events are sent to the backend and stored in MongoDB. Two violations trigger auto-submit in the aptitude assessment.

### Module-wise Demo Script

1. Landing page:
   - Show Synthora.AI home page.
   - Explain company and student entry points.

2. Company registration/login:
   - Register company or log in.
   - Explain JWT and company role.

3. Create hiring drive:
   - Enter drive details.
   - Upload job description.
   - Upload CSV/XLSX student list.
   - Select rounds and cutoffs.
   - Explain backend creates drive, students, invitations.

4. Drive dashboard:
   - Show drive cards and statistics.
   - Open drive details.

5. Student invitation:
   - Show generated invitation link flow.
   - Explain login window and token.

6. Aptitude:
   - Show waiting room.
   - Start proctored assessment.
   - Show static questions, timer, proctoring checks.
   - Submit and explain frontend scoring.

7. Recruiter shortlisting:
   - Back in drive details, show qualified students.
   - Click Select for Technical.
   - Explain 4-hour technical access window.

8. Technical oral:
   - Start oral round.
   - Show AI question, TTS, speech-to-text transcript.
   - Submit answer and show AI feedback.
   - Explain 5-question flow and final score.

9. Results:
   - Show viva transcript modal.
   - Download CSV/PDF results.

### Viva Questions and Answers

1. What is Synthora.AI?
   - It is a recruitment platform for managing company hiring drives, student invitations, aptitude assessments, technical oral AI evaluation, and final results.

2. What are the main user roles?
   - Company users and students.

3. Does the project allow student self-registration?
   - No. Students are created from uploaded candidate spreadsheets.

4. What frontend framework is used?
   - React 19 with TypeScript.

5. What backend framework is used?
   - Express.js on Node.js.

6. What database is used?
   - MongoDB through Mongoose models.

7. How is authentication implemented?
   - JWT tokens with a `userType` field for company or student.

8. Where is the JWT stored on the frontend?
   - In browser localStorage under `synthora-token`.

9. How are passwords stored?
   - Password hashes are stored using bcryptjs.

10. What is a security weakness in student password handling?
    - The generated initial password is also stored in plain text in `plainPasswordForInitialEmail`.

11. How does the company create a hiring drive?
    - By submitting drive details, files, rounds, and cutoffs through a multipart form.

12. Which files are uploaded during drive creation?
    - Job description file and student CSV/XLSX file.

13. Does the backend parse the job description text?
    - No. It stores the file and uses filename/drive metadata as context.

14. How are students extracted from the uploaded file?
    - `parseStudentFile.js` parses CSV/XLSX, detects email/name/phone fields, scans raw values, and deduplicates by email.

15. How are invitation links created?
    - Backend creates UUID tokens using `crypto.randomUUID()`.

16. When can students log in for aptitude?
    - 10 minutes before the official exam time.

17. Where are aptitude questions stored?
    - In a static frontend array in `Assessment.tsx`.

18. Are aptitude questions generated by AI?
    - No.

19. Is aptitude scoring done on frontend or backend?
    - The score is calculated on the frontend and submitted to the backend.

20. What is the aptitude scoring formula?
    - 20 marks per correct answer, 0 for wrong/unanswered, total 100.

21. Is there negative marking?
    - No.

22. How is aptitude cutoff applied?
    - Backend checks submitted score >= drive aptitude cutoff.

23. What happens if a student clears aptitude?
    - Result becomes Qualified and an aptitude-cleared email is attempted. Technical access still requires recruiter selection.

24. What happens if a student fails aptitude?
    - Result becomes Rejected.

25. How is a student selected for technical oral?
    - Company clicks Select for Technical in drive details.

26. How long is the technical assessment access window?
    - 4 hours from selection.

27. Which AI provider is used?
    - Groq.

28. Which model is used?
    - `llama-3.3-70b-versatile`.

29. What does the AI generate?
    - Technical oral questions, per-answer evaluation JSON, and final feedback summary.

30. How many oral questions are asked?
    - Five.

31. What are the oral question categories?
    - Fundamental, Conceptual, Practical, Scenario, Adaptive Follow-up.

32. Does the next oral question depend on previous answers?
    - The prompt includes previous turns, so the LLM can adapt, especially by question 5.

33. How is spoken answer converted to text?
    - Browser SpeechRecognition or webkitSpeechRecognition.

34. What if speech recognition is unsupported?
    - The UI shows a textarea fallback.

35. How is each answer evaluated?
    - Backend sends role, context, category, question, and answer to Groq and expects structured JSON scores.

36. What score fields are stored for oral answers?
    - score, technicalAccuracy, conceptualKnowledge, communicationSkill, completeness, relevance, feedback, isSatisfactory.

37. Are oral evaluation criteria weighted?
    - No explicit weighted formula exists. The LLM directly assigns `score`.

38. How is final oral score calculated?
    - Average the five 0-10 question scores and multiply by 10, rounded.

39. How is final oral pass/fail decided?
    - overallScore >= technicalOralCutoff means Qualified; otherwise Rejected.

40. What if the Groq API key is missing?
    - Question generation uses fallback questions, but normal answer evaluation fails with 503. Minimal answers are scored deterministically.

41. What proctoring checks are implemented?
    - Tab switching, focus loss, fullscreen exit, screenshot shortcut, copy-paste/context-menu blocking, camera feed, face detection if supported, and basic external-device heuristic.

42. Does proctoring affect marks?
    - It does not subtract marks, but repeated violations can auto-submit.

43. How many violations trigger auto-submit?
    - Two violations.

44. What is the face detection limitation?
    - It depends on browser `FaceDetector`, which is not universally supported.

45. What is the external device detection limitation?
    - It uses a simple bright-pixel heuristic and is not reliable.

46. Are Coding and HR rounds implemented?
    - No. They appear as selectable/displayed rounds but no working modules are present.

47. How are results downloaded?
    - Company drive details exposes CSV downloads for qualified/all results and a simple generated PDF report.

48. What is the main limitation of LLM-based scoring?
    - Scores may vary, can be biased or inaccurate, and are not independently verified by deterministic code.

49. How would you improve score fairness?
    - Use calibrated rubrics, benchmark answers, human review, repeated evaluation, model comparison, and backend audit logs.

50. Why use MongoDB?
    - The data is document-oriented: drives, students, invitations, and oral interviews contain nested fields and arrays that fit MongoDB well.

51. Why use React?
    - It supports a dynamic UI with dashboards, assessment state, timers, proctoring state, and modal interactions.

52. Why use Express?
    - It provides a straightforward REST API layer for authentication, drives, students, proctoring, and AI calls.

53. Why use JWT?
    - It allows stateless authentication between frontend and backend and separates company/student access.

54. What is one serious backend improvement?
    - Recalculate aptitude score server-side from server-stored questions instead of trusting client score.

55. What is one deployment improvement?
    - Add production environment config, HTTPS, CI/CD, and a hosted MongoDB setup.

## 15. Final Summary

Synthora.AI is a functional MERN-style recruitment platform with strong workflow coverage for company drive creation, student invitation, aptitude assessment, recruiter shortlisting, and AI technical oral interviews.

The most important implementation truths are:

- Aptitude is static and frontend-scored.
- Technical oral is Groq-based and stores full transcripts/evaluation.
- Technical access is recruiter-triggered, not automatic after aptitude.
- Proctoring logs events and can auto-submit after repeated violations.
- Coding/HR rounds are not implemented beyond UI/config options.
- Several security and reliability improvements are needed before production use.

This documentation is complete for the files inspected above. I could not verify live SMTP delivery, live Groq responses, live MongoDB persistence, or real browser camera/microphone behavior in this pass because those require external services, credentials, or interactive browser permissions.
