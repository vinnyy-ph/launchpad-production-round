import { openai, OPENAI_MODEL } from "../../../../core/openai.service";
import { buildSystemPrompt, buildUserContent, parseInsight } from "./insights.prompt";
import type { InsightGeneratorPort, RawInsight } from "./insights.types";

const MAX_ANSWERS_PER_QUESTION = 500;

export class OpenAiInsightGenerator implements InsightGeneratorPort {
  readonly model = OPENAI_MODEL;

  async generate(input: {
    questions: { questionText: string; answers: string[] }[];
    allowQuotes: boolean;
  }): Promise<RawInsight> {
    const questions = input.questions.map((q) => ({
      questionText: q.questionText,
      answers: q.answers.slice(0, MAX_ANSWERS_PER_QUESTION),
    }));

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input.allowQuotes) },
        { role: "user", content: buildUserContent(questions) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return parseInsight(text, input.allowQuotes);
  }
}
