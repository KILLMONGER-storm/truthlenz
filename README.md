# TruthLenz - AI-Powered Content Verification Platform
A forensic-grade verification engine for detecting misinformation, deepfakes, and manipulated media. TruthLenz leverages advanced AI to provide real-time credibility assessments across text, images, and video.

🛡️ Core Capabilities
TruthLenz provides a suite of high-fidelity verification tools designed for journalists, researchers, and public safety:
- **Multimodal Forensic Analysis**: Simultaneous processing of text, metadata, and pixel-level media data.
- **Deepfake & Manipulation Detection**: Advanced neural networks trained to identify AI-generated or altered visual content.
- **Evidence-Based Verdicts**: Clear, transparent justifications for every credibility score.
- **Enterprise-Ready Infrastructure**: Secure, serverless architecture built on Supabase and OpenAI with fallback to Google Gemini.

🔍 Verification Modules
The platform is organized into specialized modules for comprehensive analysis:

📊 Text & Claim Analysis
- **Fact-Checking**: Cross-references claims against global data sources.
- **Claim Extraction**: Automatically identifies verifiable statements within large documents.
- **Credibility Scoring**: Quantitative assessment of textual reliability based on source and consistency.

👁️ Media Forensics
- **Image Inspection**: Detects pixel manipulation and metadata inconsistencies.
- **Deepfake Analysis**: Analyzes temporal and spatial patterns for video authenticity.
- **AI-Generation Check**: Specifically identifies content created by GANs or Diffusion models.
- **Media Verification**: Leverages OpenAI with fallback to Google Gemini for deep visual reasoning.

🌐 Web & Source Intelligence
- **URL Credibility**: Evaluates the reputation and historical accuracy of domains.
- **Source Cross-Referencing**: Validates information across multiple independent platforms.
- **Contextual Awareness**: Maintains history and relationship between verified entities.

⚙️ Setup & Deployment
Prerequisites
- Node.js 20+ (or Bun)
- Supabase CLI & Account
- OpenAI API Key
- Google AI (Gemini) API Key
Installation
1. **Clone the Repository**
   ```bash
   git clone <YOUR_REPO_URL>
   cd TruthLenz
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Configure Local Environment**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. **Configure Cloud Secrets**
   Set the OPENAI_API_KEY and GEMINI_API_KEY in your Supabase project:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key GEMINI_API_KEY=your_gemini_api_key
   ```

📝 Operational Guidelines
Standard Operation
```bash
npm run dev
```
- Accessed via `http://localhost:8080`.
- Provides an interactive dashboard for submitting and reviewing verification requests.

Production Deployment
```bash
# Deploy verification engine (Edge Function)
supabase functions deploy verify-content --no-verify-jwt

# Build frontend assets
npm run build
```

🏗️ System Architecture
- **src/components/**: Logic for analysis visualization and user interaction.
- **src/lib/**: API clients and core verification utilities.
- **supabase/functions/**: Serverless verification engine (Deno/TypeScript).
- **src/pages/**: High-level application views and layouts.
