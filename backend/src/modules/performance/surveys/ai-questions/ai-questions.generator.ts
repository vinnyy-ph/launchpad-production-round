import { openai, OPENAI_MODEL } from "../../../../core/openai.service";
import { buildSystemPrompt, buildUserContent, parseQuestions } from "./ai-questions.prompt";
import type { AiQuestionsGeneratorPort, GenerateQuestionsInput } from "./ai-questions.types";

export class OpenAiAiQuestionsGenerator implements AiQuestionsGeneratorPort {
  readonly model = OPENAI_MODEL;

  async generate(input: GenerateQuestionsInput, correction?: string): Promise<unknown[]> {
    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserContent(input.goal, input.count) },
    ];
    if (correction) {
      messages.push({ role: "user", content: correction });
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages,
    });

    return parseQuestions(completion.choices[0]?.message?.content ?? "{}");
  }
}
