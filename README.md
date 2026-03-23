# MeetMind — AI Meeting Assistant

An AI-powered meeting assistant that records Google Meet sessions and generates transcripts, summaries, action items, and key decisions automatically.

## Architecture

```
VORTEX/
├── extension/   # Chrome Extension (Manifest V3)
└── web/         # Next.js app — dashboard + API backend
```

---

## Quick Start

### 1. Google Cloud Setup (Speech-to-Text)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Cloud Speech-to-Text API**
4. Create a **Service Account**: IAM & Admin → Service Accounts → Create
5. Grant role: **Cloud Speech Client**
6. Create a JSON key: Actions → Manage keys → Add key → JSON
7. Download the JSON file — you'll need it in step 3

### 2. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Copy it — you'll need it in step 3

### 3. MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Create a database user with read/write access
4. Allow your IP (or `0.0.0.0/0` for dev)
5. Get connection string: Connect → Connect your application → Copy URI

### 4. Run the Web App

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local with your actual keys
npm install
npm run dev
```

The dashboard will be at http://localhost:3000

### 5. Load the Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The MeetMind icon appears in your toolbar

---

## Usage

1. Join a Google Meet
2. Click the MeetMind extension icon
3. Click **Start Recording**
4. After the meeting, click **Stop Recording**
5. Open http://localhost:3000 to view the meeting
6. Processing takes 1-3 minutes depending on meeting length

---

## Environment Variables

See `web/.env.local.example` for all required variables.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service account JSON key |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## Tech Stack

- **Chrome Extension**: Manifest V3, tabCapture API, MediaRecorder
- **Backend**: Next.js 16 App Router API routes
- **Transcription**: Google Cloud Speech-to-Text (with speaker diarization)
- **AI Summaries**: Google Gemini 1.5 Flash
- **Database**: MongoDB Atlas via Mongoose
- **Frontend**: Next.js + Tailwind CSS

---

## Project Structure

```
web/
├── app/
│   ├── page.tsx                      # Dashboard — meeting list
│   ├── meetings/[id]/page.tsx        # Meeting detail page
│   └── api/
│       └── meetings/
│           ├── route.ts              # GET /api/meetings
│           ├── upload/route.ts       # POST /api/meetings/upload
│           └── [id]/
│               ├── route.ts          # GET, DELETE /api/meetings/:id
│               └── retry/route.ts    # POST /api/meetings/:id/retry
├── lib/
│   ├── mongodb.ts                    # Singleton DB connection
│   ├── transcription.ts             # Google Speech-to-Text
│   ├── summarize.ts                 # Gemini summarization
│   └── pipeline.ts                  # Transcribe → summarize → save
├── models/
│   └── Meeting.ts                   # Mongoose schema
└── components/
    ├── Sidebar.tsx
    ├── MeetingCard.tsx
    └── LoadingSkeleton.tsx

extension/
├── manifest.json
├── background.js    # Service worker — tabCapture + MediaRecorder + upload
├── content.js       # Extracts meeting title + participants from Meet DOM
├── popup.html       # Extension popup UI
├── popup.js         # Popup logic — recording state, timer
└── icons/           # Extension icons
```
