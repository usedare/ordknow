import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/fetch-url - Fetch URL content using Jina Reader
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    // Use Jina Reader API (free, no API key needed)
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "text",
      },
    });

    if (!res.ok) {
      throw new Error(`Jina Reader returned ${res.status}`);
    }

    const text = await res.text();

    // Extract title from the response (first line or metadata)
    const lines = text.split("\n");
    let title = "";
    let content = text;

    // Jina Reader returns title in the first few lines
    for (const line of lines.slice(0, 5)) {
      if (line.startsWith("Title:")) {
        title = line.replace("Title:", "").trim();
        break;
      }
    }

    // If no title found, try to extract from URL
    if (!title) {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace("www.", "");
      } catch {
        title = "网页内容";
      }
    }

    return NextResponse.json({
      text: content,
      suggestedTitle: title,
      sourceUrl: url,
    });
  } catch (error) {
    console.error("URL fetch failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch URL" },
      { status: 500 }
    );
  }
}
