import { Router } from "express";
import { chatHandler } from "../controllers/chat.controller";

const router = Router();

router.post("/chat", chatHandler);

export default router;