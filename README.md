# Daily Reflection App

This simple web app lets you record daily reflections using Firebase Authentication and Firestore.

## Setup

1. Install dependencies or serve files using a static server. No build step is required.
2. Copy `firebaseConfig.example.js` to `firebaseConfig.js`:

   ```bash
   cp firebaseConfig.example.js firebaseConfig.js
   ```

3. Replace the placeholder values in `firebaseConfig.js` with your Firebase project's configuration (API key, auth domain, etc.).
4. Keep `firebaseConfig.js` out of version control – it is already listed in `.gitignore` so your credentials stay private. If you accidentally commit a secret, **delete it from the repo and rotate the key**.

If you want to use Gemini-powered AI feedback during development, also set `geminiApiKey` in `firebaseConfig.js` or provide a `GEMINI_API_KEY` environment secret at deploy time. Never commit the actual Gemini API key to Git.

## Running

Open `index.html` in your browser via a local web server (e.g. `npx serve .`) and interact with the app.

## Firebase console configuration

To use authentication and Firestore in your own project:

1. In **Authentication → Sign-in method**, enable **Email/Password** and **Google** providers.
2. In **Authentication → Settings**, add your site's domain (or `localhost` for local testing) to the **Authorized domains** list. Google login fails with `auth/unauthorized-domain` if the current host is missing here.
3. In **Firestore Database**, create the database in production or test mode. Reflections are stored under `users/{uid}/reflections`, so ensure your security rules allow each user to read and write only their own documents.

