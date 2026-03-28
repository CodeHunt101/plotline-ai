import { embed } from "ai";
import { NextResponse } from "next/server";
import { getEmbeddingModel, getEmbeddingProviderOptions } from "@/config/ai";

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    const model = getEmbeddingModel();
    const providerOptions = getEmbeddingProviderOptions();

    const { embedding } = await embed({
      model,
      value: input,
      ...(providerOptions ? { providerOptions } : {}),
    });

    return NextResponse.json({ embedding });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
