import cors from "cors";

const allowedOrigins = [
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject the CORS request without throwing an internal error
    return callback(null, false);
  },

  methods: ["GET", "POST", "PATCH", "DELETE"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true,
};

export default cors(corsOptions);