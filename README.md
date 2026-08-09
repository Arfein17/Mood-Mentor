# Mode Mentor

Mode Mentor is an AI-powered Employment/Student Wellness platform. It helps users balance work, studies, and emotional well-being by tracking moods, providing actionable recommendations, and gamifying the wellness journey.

## Features
- **Daily Check-ins**: Log text, emoji, and optional selfies for multi-modal emotion analysis (fusion algorithm).
- **AI Wellness Buddy**: An interactive conversational agent for support.
- **Admin Analytics**: A dashboard showing wellness trends, aggregated alerts, and system issues.
- **Gamification**: Earn reward points for consistent check-ins and completing wellness challenges.

## Tech Stack
- **Frontend**: React + Vite + Lucide Icons + Recharts
- **Backend**: Node.js + Express
- **Database**: MySQL via Sequelize ORM
- **AI Models**: Local ONNX pipelines for text and facial expression classification, plus Gemini API integration.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MySQL (Running locally or via Docker)

### 2. Backend Setup
1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your MySQL database credentials and Gemini API key.
4. Set up the database by running migrations and seeds (if applicable), or simply run `npm run dev` to let Sequelize sync schemas (depending on config).
5. Start the backend: `npm run dev`

### 3. Frontend Setup
1. In the root directory, run `npm install`
2. Start the frontend: `npm run dev`
3. Open `http://localhost:5173` in your browser.
