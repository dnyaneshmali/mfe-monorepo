import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatHandler = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = response.choices[0].message.content;

    res.json({ reply });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};