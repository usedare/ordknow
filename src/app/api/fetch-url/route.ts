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
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
  }

  try {
    // 通过 Jina Reader 抓取正文，避免服务端直接解析复杂网页。
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "text",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Jina Reader returned ${res.status}`);
    }

    // 限制返回文本长度，避免一次抓取把超大网页塞进前端和后续 AI 上下文。
    const text = (await res.text()).slice(0, 100_000);

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
