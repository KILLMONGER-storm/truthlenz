# Install Supabase CLI and Deploy Edge Function

## Option 1: Install via npm (Recommended for Windows)

```powershell
npm install -g supabase
```

## Option 2: Install via Scoop (Windows Package Manager)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## After Installation

### 1. Login to Supabase
```bash
supabase login
```

### 2. Link Your Project
```bash
cd d:\truthlenz
supabase link --project-ref gfbdkbjmddfjlmcllkxx
```

### 3. Set the API Key Secret
```bash
supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 4. Deploy the Edge Function
```bash
supabase functions deploy verify-content
```

### 5. Test the Function
```bash
node test-edge-function.js
```

---

## Quick Deploy Command (After Setup)

Once CLI is set up, you can redeploy anytime with:

```bash
supabase functions deploy verify-content
```

---

## Notes

- The dashboard method is easier and doesn't require CLI installation
- CLI is useful if you plan to make frequent updates to Edge Functions
- Both methods achieve the same result
