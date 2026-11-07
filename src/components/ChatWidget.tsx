"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! 👋 I can help with books, deals, coupons, delivery, payment and your orders.",
};
const QUICK = ["Today's deals", "Active coupons", "Bestsellers", "Track my order", "Payment & delivery"];

// Renders [label](url) links and **bold** without dangerouslySetInnerHTML
function renderText(text: string) {
  return text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g).map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = link[2];
      if (!/^(\/(?!\/)|https?:\/\/)/.test(href)) return p;
      return (
        <a key={i} href={href} className="font-medium text-[#8f0a0a] underline"
           target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {link[1]}
        </a>
      );
    }
    const bold = p.match(/^\*\*([^*]+)\*\*$/);
    return bold ? <strong key={i}>{bold[1]}</strong> : p;
  });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading, open]);

  const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`;

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next); setInput(""); setLoading(true);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => null);
      const reply = data?.reply ?? `Server error (${r.status}). Please try again.`;
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: e?.name === "AbortError"
            ? "The server took too long to respond. Please try again."
            : "Connection problem. Please try again.",
        },
      ]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-[#8f0a0a] p-4 text-white shadow-lg hover:bg-[#6f0707]"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[500px] w-[350px] max-w-[calc(100vw-2.5rem)] flex-col rounded-2xl border bg-white shadow-2xl">
          <div className="rounded-t-2xl bg-[#8f0a0a] px-4 py-3 text-white">
            <div className="font-semibold">OdhayBD Support</div>
            <div className="text-xs opacity-80">AI assistant · please don't share passwords or card numbers</div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <span className={`inline-block max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${
                  m.role === "user" ? "bg-[#8f0a0a] text-white" : "bg-gray-100 text-gray-900"}`}>
                  {m.role === "assistant" ? renderText(m.content) : m.content}
                </span>
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="rounded-full border border-[#8f0a0a]/30 px-3 py-1 text-xs text-[#8f0a0a] hover:bg-[#8f0a0a]/5">
                    {q}
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="text-gray-400">Typing…</div>}
            <div ref={endRef} />
          </div>

          <div className="flex gap-2 border-t p-2">
            <input
              value={input} maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Type your question…"
              className="flex-1 rounded-full border px-3 py-2 text-sm outline-none focus:border-[#8f0a0a]"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send"
              className="rounded-full bg-[#8f0a0a] p-2.5 text-white disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}