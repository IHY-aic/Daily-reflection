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
3. In **Firestore Database**, create the database in production or test mode. The application uses a nested data structure where each user has their own `reflections` subcollection. You do not need to create the collections manually; the app will do this.
4. Replace your Firestore security rules with the following to protect user data:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow users to read and write only their own reflections.
       match /users/{userId}/reflections/{reflectionId} {
         allow read, write: if request.auth.uid == userId;
       }
     }
   }
   ```
   This rule ensures that a user can only access the `reflections` subcollection that is under their own user document.

4. In **Firestore Database → Indexes**, create a new composite index for the `reflections` collection. The application's queries require an index on the `userId` field (ascending) and the `createdAt` field (descending). The console will often provide a direct link to create this index when the error first appears.
5. The application queries reflections sorted by date. If you see an error in the browser console asking for an index, follow the link provided in the error message to create the required index on the `reflections` collection. This will typically be a single-field index on `createdAt` (descending).
