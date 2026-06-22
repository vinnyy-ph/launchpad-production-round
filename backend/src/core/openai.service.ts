import OpenAI from "openai";

// Configured OpenAI client singleton. Import where AI features are built.
// The client is created lazily so importing this module does not throw
// at test-bundle time when OPENAI_API_KEY is absent from the environment.
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY.");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as any)[prop];
  },
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
