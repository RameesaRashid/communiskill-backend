import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";

// Route Imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// MIDDLEWARE
app.use(express.json()); 
const allowedOrigins = [
  "https://communi-skill-rameesa-rashids-projects.vercel.app",
  "https://communi-skill.vercel.app", //
  "http://localhost:5173", // Standard local port
  "http://localhost:3000"  // In case you use a different local port
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if the request comes from Vercel or your local machine
    const isVercel = origin.endsWith(".vercel.app");
    const isLocal = origin.includes("localhost");

    if (isVercel || isLocal) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Block the request
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

// HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.send("🚀 CommuniSkill API is live and healthy!");
});

// API ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/discovery', discoveryRoutes);

// DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ CommuniSkill Database Connected"))
  .catch((err) => console.log("❌ Connection Error:", err));

// SERVER STARTUP
// Bind to 0.0.0.0 for Railway compatibility
const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});