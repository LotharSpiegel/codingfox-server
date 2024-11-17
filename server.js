import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";

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

app.use("/increment-view", (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
    console.log(origin)
  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    return res.status(403).send({ error: "Unauthorized access" });
  }

  next();
});

// Apply rate limiting
app.use("/increment-view", apiLimiter);

// Increment view endpoint
app.post("/increment-view", async (req, res) => {
  const { post_id } = req.body;

  if (!post_id) {
    return res.status(400).send({ error: "Post ID is required" });
  }

  try {
    // Simulate database operation
    console.log(`View incremented for post: ${post_id}`);
    res.status(200).send({ success: true, post_id });
  } catch (error) {
    console.error("Error incrementing view:", error);
    res.status(500).send({ error: "Failed to increment view" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});