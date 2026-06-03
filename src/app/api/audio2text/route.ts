import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// POST /api/audio2text - Transcribe audio using Volcengine 录音文件识别2.0
export async function POST(request: NextRequest) {
  // Auth check with user session
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { audio, filename } = body;

  if (!audio) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  const apiKey = process.env.VOLC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      text: "",
      error: "语音转写未配置。请在 .env.local 中配置 VOLC_API_KEY。",
      configured: false,
    });
  }

  // Service role client for storage operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Step 1: Upload audio to Supabase Storage
    const base64Data = audio.includes(",") ? audio.split(",")[1] : audio;
    const audioBuffer = Buffer.from(base64Data, "base64");
    const ext = filename?.split(".").pop() || "wav";
    const storagePath = `audio/${user.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await serviceClient.storage
      .from("ordknow-public")
      .upload(storagePath, audioBuffer, {
        contentType: getAudioMimeType(ext),
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from("ordknow-public")
      .getPublicUrl(storagePath);

    const audioUrl = urlData.publicUrl;

    // Step 2: Submit recognition task to Volcengine
    const taskId = randomUUID();

    const submitRes = await fetch(
      "https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          "X-Api-Resource-Id": "volc.seedasr.auc",
          "X-Api-Request-Id": taskId,
          "X-Api-Sequence": "-1",
        },
        body: JSON.stringify({
          user: { uid: user.id },
          audio: {
            url: audioUrl,
            format: ext === "mp3" ? "mp3" : ext === "ogg" ? "ogg" : "wav",
          },
          request: {
            model_name: "bigmodel",
            enable_itn: true,
            enable_punc: true,
            enable_ddc: true,
          },
        }),
      }
    );

    const statusCode = submitRes.headers.get("X-Api-Status-Code");
    const message = submitRes.headers.get("X-Api-Message");

    if (statusCode && statusCode !== "20000000") {
      throw new Error(`Submit failed: ${message || statusCode}`);
    }

    // Step 3: Poll for results (max 120 seconds)
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const queryRes = await fetch(
        "https://openspeech.bytedance.com/api/v3/auc/bigmodel/query",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
            "X-Api-Resource-Id": "volc.seedasr.auc",
            "X-Api-Request-Id": taskId,
          },
          body: "{}",
        }
      );

      const queryStatusCode = queryRes.headers.get("X-Api-Status-Code");
      const queryMessage = queryRes.headers.get("X-Api-Message");

      if (queryStatusCode === "20000001" || queryStatusCode === "20000002") {
        continue; // Still processing
      }

      if (queryStatusCode && queryStatusCode !== "20000000") {
        // "no valid speech" is not an error - just means silence audio
        if (queryMessage?.includes("no valid speech") || queryMessage?.includes("silence")) {
          await serviceClient.storage.from("ordknow-public").remove([storagePath]).catch(() => {});
          return NextResponse.json({ text: "", configured: true, message: "未检测到语音内容" });
        }
        throw new Error(`Query failed: ${queryMessage || queryStatusCode}`);
      }

      const queryData = await queryRes.json();

      if (queryData.result && queryData.result.text) {
        // Cleanup temp file from storage
        await serviceClient.storage.from("ordknow-public").remove([storagePath]).catch(() => {});

        return NextResponse.json({
          text: queryData.result.text,
          configured: true,
        });
      }
    }

    throw new Error("Transcription timeout (120s)");
  } catch (error) {
    console.error("Audio transcription failed:", error);
    return NextResponse.json(
      {
        text: "",
        error: error instanceof Error ? error.message : "Transcription failed",
        configured: true,
      },
      { status: 500 }
    );
  }
}

function getAudioMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    webm: "audio/webm",
  };
  return mimeMap[ext] || "audio/wav";
}
