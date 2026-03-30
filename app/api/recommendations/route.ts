import { buildMovieRecommendations } from "@/lib/services/movie-recommendations";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const movieData = await request.json();
    const recommendations = await buildMovieRecommendations(movieData);
    return NextResponse.json(recommendations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
