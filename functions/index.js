const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");
const cors = require("cors")({origin: true});

admin.initializeApp();

// Get Gemini API key from environment variables
const geminiApiKey = functions.config().gemini?.key;
let genAI;
if (geminiApiKey) {
  genAI = new GoogleGenAI({ apiKey: geminiApiKey });
} else {
  console.error("Gemini API key not found. Please set the gemini.key environment variable.");
}

exports.getFeedback = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (!genAI) {
      res.status(500).send("Gemini API client not initialized. Check function logs for details.");
      return;
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
      res.status(403).send("Unauthorized");
      return;
    }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(403).send("Unauthorized");
    return;
  }

  const { didWell, didPoorly, improveTomorrow } = req.body;

  if (!didWell || !didPoorly || !improveTomorrow) {
    res.status(400).send("Missing required fields");
    return;
  }

  const prompt = `You are an encouraging and concise reflection coach. Based on the user's answers:
- Did well: ${didWell}
- Did poorly: ${didPoorly}
- Improve tomorrow: ${improveTomorrow}
Respond with constructive feedback.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.status(200).send({ feedback: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).send("Failed to get feedback from Gemini API.");
  }
  });
});
