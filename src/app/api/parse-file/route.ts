import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mammoth from "mammoth";

// Dynamic import for pdf-parse to avoid ESM issues
async function parsePdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return { text: result.text };
}

// POST /api/parse-file - Parse PDF/Word documents
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";

    if (ext === "pdf") {
      const data = await parsePdf(buffer);
      text = data.text;
    } else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Generate suggested title from filename
    const suggestedTitle = file.name.replace(/\.\w+$/, "");

    return NextResponse.json({
      text,
      suggestedTitle,
      pageCount: ext === "pdf" ? undefined : undefined,
    });
  } catch (error) {
    console.error("File parsing failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File parsing failed" },
      { status: 500 }
    );
  }
}
