import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getLanguageModel } from "@/config/ai";
import { stringifyMovieRecommendationsResponse } from "@/lib/utils/recommendations";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const model = getLanguageModel();

    const { text } = await generateText({
      model,
      messages,
      temperature: 0.65,
    });

    return NextResponse.json({
      content: stringifyMovieRecommendationsResponse(text),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
