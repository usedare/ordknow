import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/transcribe - Transcribe audio using Volcengine Speech Recognition
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { audio, filename, language = "zh-CN" } = body;

  if (!audio) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  // Check if Volcengine credentials are configured
  const appId = process.env.VOLCENGINE_APP_ID;
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN;

  if (!appId || !accessToken) {
    // Fallback: return a message indicating transcription requires configuration
    return NextResponse.json({
      text: "",
      error: "语音转写需要配置火山引擎 API。请在设置页面配置 VOLCENGINE_APP_ID 和 VOLCENGINE_ACCESS_TOKEN。",
      configured: false,
    });
  }

  try {
    // Volcengine Speech Recognition API
    // Using the async file recognition API
    const base64Audio = audio.split(",")[1] || audio;

    // Submit recognition task
    const submitRes = await fetch(
      "https://openspeech.bytedance.com/api/v1/auc/submit",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer;${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app: {
            appid: appId,
            token: "access_token",
            cluster: "volc_auc_common",
          },
          user: {
            uid: user.id,
          },
          audio: {
            format: getAudioFormat(filename || "audio.wav"),
            sample_rate: 16000,
            channel: 1,
            language: language,
          },
          request: {
            model_name: "bigmodel",
            result_type: "full",
          },
          additions: {
            with_speaker_info: false,
          },
        }),
      }
    );

    if (!submitRes.ok) {
      throw new Error(`Submit failed: ${submitRes.status}`);
    }

    const submitData = await submitRes.json();
    if (submitData.code !== 3000) {
      throw new Error(submitData.message || "Submit failed");
    }

    const taskId = submitData.id;

    // Poll for results (max 60 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const queryRes = await fetch(
        `https://openspeech.bytedance.com/api/v1/auc/query?id=${taskId}`,
        {
          headers: {
            "Authorization": `Bearer;${accessToken}`,
          },
        }
      );

      if (!queryRes.ok) continue;

      const queryData = await queryRes.json();
      if (queryData.code === 3000 && queryData.result) {
        // Extract text from result
        const text = queryData.result
          .map((item: { text?: string }) => item.text || "")
          .join("")
          .trim();

        return NextResponse.json({
          text,
          configured: true,
        });
      }

      if (queryData.code !== 3000 && queryData.message) {
        throw new Error(queryData.message);
      }
    }

    throw new Error("Transcription timeout");
  } catch (error) {
    console.error("Transcription failed:", error);
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

function getAudioFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    wav: "wav",
    mp3: "mp3",
    m4a: "m4a",
    ogg: "ogg",
    flac: "flac",
    webm: "webm",
  };
  return formatMap[ext || ""] || "wav";
}
