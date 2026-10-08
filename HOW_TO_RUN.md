# How To Run Synthora.AI

This project has two parts:

- Frontend: React + Vite
- Backend: Node.js + Express + MongoDB

Run the backend and frontend in two separate terminals.

## 1. Open Project Folder

```powershell
cd C:\Users\DELL\Desktop\Final_year_project\synthora_code\Synthora-One-Unified-Hiring-Platform
```

## 2. Backend Setup

Create this file:

```text
backend\.env
```

Add:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/synthora
JWT_SECRET=your_jwt_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
```

Then run:

```powershell
cd backend
npm install
npm start
```

Backend should start at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

## 3. Frontend Setup

Open a new terminal and run:

```powershell
cd C:\Users\DELL\Desktop\Final_year_project\synthora_code\Synthora-One-Unified-Hiring-Platform
npm install
npm run dev
```

Frontend should start at:
``  
```text
http://localhost:5173
```

If Vite uses another port, open the URL shown in the terminal.

## 4. Test Technical Oral Demo

This demo link does not need login, email, MongoDB, or Groq:

```text
http://localhost:5173/assessment/demo/oral
```

Use it to test:

- Technical Oral UI
- Question timer
- Speech-to-text
- Text-to-speech
- Camera/proctoring UI
- Demo answer submission flow

## 5. Normal Student Flow

1. Company registers/logs in.
2. Company creates a hiring drive.
3. Company uploads job description and student file.
4. Student receives invitation email.
5. Student opens invitation link.
6. Student activates/logs in.
7. Student starts aptitude assessment.
8. If aptitude cutoff is cleared and Technical Oral is enabled, student can start Technical Oral.

## 6. Important Date Format

Use this date format when creating drives:

```text
YYYY-MM-DD
```

Examples:

```text
2026-10-08 = 8 October 2026
2026-08-10 = 10 August 2026
```

If the invitation shows `Closed`, check that the exam date/time is not in the past.

## 7. Build Check

Frontend production build:

```powershell
npm run build
```

Backend start check:

```powershell
cd backend
npm start
```

## 8. Common Problems

### Backend says MongoDB error

Make sure MongoDB is running locally and `MONGO_URI` is correct:

```env
MONGO_URI=mongodb://127.0.0.1:27017/synthora
```

### Technical Oral AI evaluation fails

Make sure `GROQ_API_KEY` is present in:

```text
backend\.env
```

Do not put `GROQ_API_KEY` in frontend `.env`.

### Invitation shows Closed

The exam date/time has already passed. Create a new drive with today's date and a future time.
