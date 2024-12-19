import { Logger } from "pino";

// Extend the Express Request type
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: "app_user" | "app_admin";
    };
    log?: Logger;
  }
}
