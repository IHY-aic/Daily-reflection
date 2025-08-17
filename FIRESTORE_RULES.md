# Firestore Security Rules

It is **critical** to secure your Firestore database to prevent unauthorized access to user data. The rules below ensure that users can only access their own reflections.

You should update your Firestore security rules in the Firebase console with the following:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write to their own reflections
    match /users/{userId}/reflections/{reflectionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## How to Apply These Rules

1.  Go to your Firebase project console.
2.  In the left-hand menu, click on "Firestore Database".
3.  Click on the "Rules" tab.
4.  Copy and paste the rules above into the editor.
5.  Click "Publish".

## Explanation of the Rules

*   `service cloud.firestore`: This specifies that the rules are for Cloud Firestore.
*   `match /databases/{database}/documents`: This matches all documents in your database.
*   `match /users/{userId}/reflections/{reflectionId}`: This rule applies to any document within the `reflections` subcollection of a user's document.
*   `allow read, write: if request.auth != null && request.auth.uid == userId;`: This is the most important part. It states that a user can only read or write a document if:
    *   `request.auth != null`: The user is authenticated.
    *   `request.auth.uid == userId`: The authenticated user's ID matches the `userId` in the document path. This ensures that users can only access their own data.
