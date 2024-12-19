import compression from "compression";
import cors from "cors";
import express, { Express, json, urlencoded } from "express";
import helmet from "helmet";

// Route imports
import authRoutes from "./routes/auth.routes";
import boardRoutes from "./routes/board.routes";
// import cardRoutes from "./routes/cards.routes";
// import categoryRoutes from "./routes/categories.routes";
// import userRoutes from "./routes/users.routes";
import { notFoundHandler } from "./middlewares/notFound.middleware";

// Middleware imports
import { validateAuthToken } from "./middlewares/auth.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { errorLogger, requestLogger } from "./middlewares/logger.middleware";

// Config imports
import { initializeDatabase } from "./config/database";
import { config } from "./config/env";

export const createApp = async (): Promise<Express> => {
  // Initialize Express app
  const app = express();

  // Connect to database
  await initializeDatabase();

  // Global middleware
  app.use(helmet()); // Security headers
  app.use(cors()); // Enable CORS for all routes
  app.use(compression()); // Compress responses
  app.use(json()); // Parse JSON bodies
  app.use(urlencoded({ extended: true })); // Parse URL-encoded bodies
  app.use(requestLogger); // Log all requests

  // API routes
  app.use("/api/v1/auth", authRoutes);
  // app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/boards", validateAuthToken, boardRoutes);
  // app.use("/api/v1/categories", validateAuthToken, categoryRoutes);
  // app.use("/api/v1/cards", validateAuthToken, cardRoutes);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(notFoundHandler);
  // Global error handler - should be last
  app.use(errorLogger);
  app.use(errorHandler);

  return app;
};

// Start the server if this file is run directly
if (require.main === module) {
  const startServer = async () => {
    const app = await createApp();
    const port = config.PORT || 3000;

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  };

  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
