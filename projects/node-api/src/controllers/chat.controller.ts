import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const chatHandler = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are an experienced and knowledgeable code instructor. Answer programming and software development questions with accurate, clear, and structured information from a coding perspective. Provide helpful code examples and best practices where appropriate. Your response must be comprehensive but strictly between 800 and 1,000 words."
    });

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: message }] }]
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }

    // Console log the usage/token statistics from the completed stream
    const response = await result.response;
    console.log("Token usage metadata:", response.usageMetadata);

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Something went wrong" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`);
      res.end();
    }
  }
};