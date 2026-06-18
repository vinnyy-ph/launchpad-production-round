import OpenAI from "openai";

// Configured OpenAI client singleton. Import where AI features are built.
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY.");
}

export const openai = new OpenAI({ apiKey });
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
