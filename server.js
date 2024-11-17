import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import dotenv from 'dotenv';
import cors from 'cors';
import firebaseAdmin from 'firebase-admin';

dotenv.config();

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = firebaseAdmin.firestore();

const app = express();
app.use(bodyParser.json());

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// Referrer whitelist middleware
const allowedOrigins = [
    "https://fox-blog-pnjtg.ondigitalocean.app/",
    "http://localhost"];

// Enable CORS for all routes (you can configure it to be more specific if needed)
app.use(cors({
  origin: ['http://localhost:1313', 'https://fox-blog-pnjtg.ondigitalocean.app/'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use("/increment-view", (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
    console.log(origin)
  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    return res.status(403).send({ error: "Unauthorized access" });
  }

  next();
});

// Apply rate limiting
app.use("/api/views/:postSlug", apiLimiter);

// Increment view endpoint
app.get("/api/views/:postSlug", async (req, res) => {
  const postSlug = req.params.postSlug;

  if (!postSlug) {
    return res.status(400).send({ error: "postSlug is required" });
  }

  try {
      const postRef = db.collection('postViews').doc(postSlug); // Reference to the post document

      // Use Firestore transactions to safely increment the counter
      await db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) {
          throw new Error('Post not found');
        }
        const currentViews = postDoc.data()?.views || 0;
        const updatedViewCounter = currentViews + 1;
        transaction.update(postRef, { views: updatedViewCounter });
        res.status(200).json({ views: updatedViewCounter });
      });

    } catch (error) {
      console.error('Error incrementing counter:', error);
      res.status(500).send('Failed to increment counter');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});