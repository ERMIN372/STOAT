import "server-only";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/** Escape user text for Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Send a message to the shop owner's Telegram. No-op (logs to console) when not
 * configured, so order flow never breaks if notifications aren't set up.
 *
 * To enable: create a bot via @BotFather, then set TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID (your chat/channel id) in env.
 */
export async function sendTelegram(text: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) {
    console.info("[notify] Telegram not configured. Message:\n" + text);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[notify] Telegram send failed:", err);
  }
}
