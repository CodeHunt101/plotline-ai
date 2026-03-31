import { streamMovieRecommendations } from "@/lib/services/movie-recommendations";
import { emptyMovieRecommendations } from "@/lib/utils/recommendations";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const movieData = await request.json();
    const result = await streamMovieRecommendations(movieData);
    if (!result) {
      return NextResponse.json(emptyMovieRecommendations());
    }
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
