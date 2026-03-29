import { seedMovieEmbeddings } from "@/lib/services/seed";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const result = await seedMovieEmbeddings(force);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in embeddings-seed API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
