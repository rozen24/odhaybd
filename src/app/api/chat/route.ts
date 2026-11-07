import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, type Content } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/chatbot/prompt";
import { functionDeclarations, runTool } from "@/lib/chatbot/tools";
import { getSessionUser } from "@/lib/auth"; // adapt to your auth helper

export const runtime = "nodejs";
export const maxDuration = 30;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: 20_000 }, // fail instead of hanging forever
});
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
const DEBUG = process.env.CHAT_DEBUG === "1"; // shows real errors in the chat

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(t));
}

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 12;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const log = (m: string) => console.log(`[chat] ${m} (+${Date.now() - t0}ms)`);

  const ip = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
  if (limited(ip)) {
    return NextResponse.json({ reply: "You're sending messages too fast. Please wait a moment." }, { status: 429 });
  }

  if (!process.env.GEMINI_API_KEY) {
    log("GEMINI_API_KEY is missing");
    return NextResponse.json({
      reply: DEBUG ? "DEBUG: GEMINI_API_KEY is not set on the server." : "Chat is temporarily unavailable.",
    });
  }

  const body = await req.json().catch(() => null);
  const raw: any[] = Array.isArray(body?.messages) ? body.messages : [];
  const history = raw
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 500) }));

  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ reply: "Please type your question." }, { status: 400 });
  }
  log(`received ${history.length} messages`);

  let userId: string | undefined;
  try {
    const session = await withTimeout(Promise.resolve(getSessionUser()), 3000, "auth()");
    userId = (session?.id as { id?: string } | undefined)?.id;
    log(`auth ok, logged in: ${!!userId}`);
  } catch (e: any) {
    log(`auth skipped: ${e?.message}`); // continue as guest
  }

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    for (let round = 0; round < 4; round++) {
      log(`gemini round ${round} -> ${MODEL}`);
      const res = await withTimeout(
        ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations }],
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
        22_000,
        "Gemini"
      );
      log(`gemini round ${round} done`);

      const calls = res.functionCalls;
      if (!calls?.length) {
        return NextResponse.json({
          reply: res.text?.trim() || "Sorry, I couldn't find an answer. Please contact our support team.",
        });
      }

      const modelTurn = res.candidates?.[0]?.content;
      if (modelTurn) contents.push(modelTurn);

      const parts = await Promise.all(
        calls.map(async (c) => {
          const s = Date.now();
          const result = await withTimeout(
            runTool(c.name!, (c.args ?? {}) as Record<string, any>, { userId }),
            10_000,
            `tool ${c.name}`
          ).catch((e) => ({ error: e.message }));
          log(`tool ${c.name} ${Date.now() - s}ms`);
          return { functionResponse: { name: c.name!, response: { result } } };
        })
      );
      contents.push({ role: "user", parts });
    }
    return NextResponse.json({ reply: "Sorry, that took too long. Please try again or contact support." });
  } catch (err: any) {
    console.error("[chat] ERROR", err?.status, err?.message);
    const friendly =
      err?.status === 429
        ? "I'm getting a lot of questions right now. Please try again in a minute, or contact our support team."
        : "Sorry, I couldn't process that. Please try again or contact support.";
    return NextResponse.json({
      reply: DEBUG ? `DEBUG: ${err?.status ?? ""} ${err?.message ?? err}` : friendly,
    });
  }
}