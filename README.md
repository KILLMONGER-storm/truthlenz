# TruthLenz - AI-Powered Misinformation Detection Platform

TruthLenz is a comprehensive fact-checking and content verification platform that uses advanced AI to detect misinformation, deepfakes, and manipulated media across text, URLs, images, and videos.

## Architecture

TruthLenz is built on a modern, serverless architecture:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Engine**: Google Gemini API for multimodal forensic analysis
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Google OAuth

All AI verification logic runs entirely on Supabase Edge Functions, ensuring security and scalability.

## Features

- **Text Verification**: Fact-checking with claim extraction and credibility scoring
- **URL Analysis**: Web content verification and source credibility assessment
- **Image Forensics**: AI-generated image detection, manipulation analysis, pixel-level inspection
- **Video Analysis**: Deepfake detection, temporal consistency checks, frame analysis
- **User Feedback Loop**: Continuous learning from user corrections
- **Authentication**: Secure Google Sign-In integration

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- Google Gemini API key

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

### Supabase Edge Function Secrets

Set the Gemini API key in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The application will be available at `http://localhost:8080`

## Development

### Project Structure

```
truthlenz/
├── src/
│   ├── components/        # React components
│   ├── integrations/      # Supabase client
│   ├── lib/              # Utility functions and API clients
│   └── types/            # TypeScript type definitions
├── supabase/
│   └── functions/
│       └── verify-content/  # Edge Function for AI verification
└── public/               # Static assets
```

### Running Locally

The frontend communicates directly with Supabase Edge Functions:

```
Frontend (React) → Supabase Edge Function → Gemini API → Response
```

### Supabase Edge Function

The `verify-content` Edge Function handles all AI verification:

```bash
# Deploy Edge Function
supabase functions deploy verify-content --no-verify-jwt

# Test locally
supabase functions serve
```

## Deployment

### Frontend Deployment

The frontend can be deployed to any static hosting service:

```bash
npm run build
# Deploy the 'dist' folder to Vercel, Netlify, etc.
```

### Supabase Configuration

1. Create a Supabase project
2. Set up Google OAuth in Authentication settings
3. Deploy the Edge Function
4. Configure secrets (GEMINI_API_KEY)
5. Update frontend environment variables

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| UI Components | Radix UI + Tailwind CSS |
| Backend Runtime | Supabase Edge Functions (Deno) |
| AI Model | Google Gemini 1.5/2.0 |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| State Management | TanStack Query |

## API Reference

### Verification Endpoint

```
POST https://{project_id}.supabase.co/functions/v1/verify-content
```

**Request Body:**
```json
{
  "content": "Text to verify or media description",
  "type": "text" | "url" | "image" | "video",
  "mediaBase64": "base64_encoded_media (for image/video)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": 0-100,
  "explanation": "Detailed analysis",
  "textAnalysis": { ... },
  "claimExtraction": { ... },
  "mediaVerification": { ... },
  "timestamp": "ISO 8601 timestamp",
  "engine": "supabase"
}
```

## Contributing

This is a private project. For issues or feature requests, please contact the development team.

## License

Proprietary - All rights reserved
