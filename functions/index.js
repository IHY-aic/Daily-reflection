const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Get Gemini API key from environment variables
const geminiApiKey = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(geminiApiKey);

exports.getFeedback = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { didWell, didPoorly, improveTomorrow } = data;

  if (!didWell || !didPoorly || !improveTomorrow) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with didWell, didPoorly, and improveTomorrow arguments."
    );
  }

  const prompt = `You are an encouraging and concise reflection coach. Based on the user's answers:
- Did well: ${didWell}
- Did poorly: ${didPoorly}
- Improve tomorrow: ${improveTomorrow}
Respond with constructive feedback.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return { feedback: text };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get feedback from Gemini API."
    );
  }
});
