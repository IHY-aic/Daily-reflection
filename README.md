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

Serve the folder with a static server (e.g. `npx serve .`) and open `index.html` to enter a new reflection. Use `reflections.html` to browse past entries, paginate through older reflections, or download them in JSON, Markdown, HTML, CSV, or plain‑text formats.

## Firebase console configuration

To use authentication and Firestore in your own project:

1. In **Authentication → Sign-in method**, enable **Email/Password** and **Google** providers.
2. In **Authentication → Settings**, add your site's domain (or `localhost` for local testing) to the **Authorized domains** list. Google login fails with `auth/unauthorized-domain` if the current host is missing here.
3. In **Firestore Database**, create the database in production or test mode. Store reflections in a `users/{uid}/reflections` subcollection. Each reflection document contains `didWell`, `didPoorly`, `improveTomorrow`, `feedback`, and `createdAt` fields. A simple rule set is:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/reflections/{reflectionId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

   This structure scales well for many users because each user only listens to their own subcollection and rules naturally enforce per-user access. Using a different rule (for example, a top-level `reflections` collection) will cause Firestore to reject requests with "Missing or insufficient permissions" because the paths no longer match.

