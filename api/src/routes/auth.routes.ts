import { Router } from "express";
import { createChangePasswordHandler } from "../handlers/auth/changePasswordHandler";
import { createCurrentUserHandler } from "../handlers/auth/currentUserHandler";
import { createLoginHandler } from "../handlers/auth/loginHandler";
import { createRegisterHandler } from "../handlers/auth/registerHandler";
import { validateAuthToken } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.service";

const router = Router();
const authService = new AuthService();

// Create handler instances
const registerHandler = createRegisterHandler(authService);
const loginHandler = createLoginHandler(authService);
const changePasswordHandler = createChangePasswordHandler(authService);
const currentUserHandler = createCurrentUserHandler(authService);

// Public routes
router.post("/register", registerHandler);
router.post("/login", loginHandler);

// Protected routes
router.post("/change-password", validateAuthToken, changePasswordHandler);
router.get("/current", validateAuthToken, currentUserHandler);

export default router;
