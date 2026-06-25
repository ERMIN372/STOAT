import "server-only";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Order notifications go to the STOAT channel by default. Override with
// TELEGRAM_CHAT_ID (numeric id or @channelusername). The bot must be an admin
// of the target channel with the "Post messages" permission.
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "@stoat_shop";

/** Escape user text for Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Send an order notification to the shop's Telegram channel (@stoat_shop by
 * default, or TELEGRAM_CHAT_ID). No-op (logs to console) when the bot token
 * isn't set, so the order flow never breaks. Enable by creating a bot via
 * @BotFather, adding it as an admin of the channel, and setting
 * TELEGRAM_BOT_TOKEN.
 */
export async function sendTelegram(text: string): Promise<void> {
  if (!TOKEN) {
    console.info(
      "[notify] TELEGRAM_BOT_TOKEN not set — skipping. Message:\n" + text
    );
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
