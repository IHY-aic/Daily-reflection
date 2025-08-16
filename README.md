# Daily Reflection App

This simple web app lets you record daily reflections using Firebase Authentication and Firestore.

## Setup

1. Install dependencies or serve files using a static server. No build step is required.
2. Copy `firebaseConfig.example.js` to `firebaseConfig.js`:

   ```bash
   cp firebaseConfig.example.js firebaseConfig.js
   ```

3. Replace the placeholder values in `firebaseConfig.js` with your Firebase project's configuration (API key, auth domain, etc.).
4. Keep `firebaseConfig.js` out of version control – it is already listed in `.gitignore` so your credentials stay private.

If you want to use Gemini-powered AI feedback during development, also set `geminiApiKey` in `firebaseConfig.js` or provide a `GEMINI_API_KEY` environment secret at deploy time.

## Running

Open `index.html` in your browser via a local web server (e.g. `npx serve .`) and interact with the app.

