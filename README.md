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

Serve the folder with a static server (e.g. `npx serve .`) and open `index.html` to enter a new reflection. Use `reflections.html` to pick a day via the browser's date picker or show all entries with pagination, and download them in JSON, Markdown, HTML, CSV, plain‑text, or PNG image formats.

Login supports Google or email/password. Users can reset a forgotten password from the login screen and change their password from the app header after signing in.

## Firebase console configuration

To use authentication and Firestore in your own project:

1. In **Authentication → Sign-in method**, enable **Email/Password** and **Google** providers.
2. In **Authentication → Settings**, add your site's domain (or `localhost` for local testing) to the **Authorized domains** list. Google login fails with `auth/unauthorized-domain` if the current host is missing here.
3. In **Firestore Database**, create the database in production or test mode. Store reflections in a top-level `reflections` collection. Each document should include the signed-in user's ID in a `userId` field along with `didWell`, `didPoorly`, `improveTomorrow`, `feedback`, and a `createdAt` timestamp. A simple rule set is:


   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /reflections/{reflectionId} {
         // Users can only read, update, or delete their own reflections
         allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
         // Users can only create reflections for themselves
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```

   This rule grants each user access only to their own reflections. It uses `resource.data` to check the existing document on reads, updates, and deletes, and `request.resource.data` to validate the incoming document on creation. This ensures security while allowing users to save new reflections.
4. In **Firestore Database → Indexes**, create a new composite index for the `reflections` collection. The application's queries require an index on the `userId` field (ascending) and the `createdAt` field (descending). The console will often provide a direct link to create this index when the error first appears.