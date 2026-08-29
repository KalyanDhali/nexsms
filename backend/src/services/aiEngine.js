import { query } from '../models/db.js';

/**
 * Config-driven "smart" messaging engine. No external LLM dependency:
 * admin/users define keyword->reply rules, and the engine categorizes
 * inbound messages, auto-replies, and suggests quick replies.
 */

const SPAM_HINTS = ['free', 'win', 'winner', 'lottery', 'casino', 'viagra', 'crypto bonus', 'click here', 'urgent', 'prize', 'earn money', '投资', '中奖', '免费', '彩票'];
const OTP_HINTS = ['otp', 'code', 'verification', '验证码', '验证', '一次性'];
const SALES_HINTS = ['sale', 'discount', 'offer', 'promo', 'deal', '促销', '优惠', '打折'];

export function categorizeMessage(body = '') {
  const text = body.toLowerCase();
  const hits = (hints) => hints.some((h) => text.includes(h));
  if (hits(SPAM_HINTS)) return 'spam';
  if (hits(OTP_HINTS)) return 'otp';
  if (hits(SALES_HINTS)) return 'sales';
  return 'general';
}

/** First enabled rule whose keyword appears in the body.
 *  When numberId is given, rules scoped to that number OR global rules
 *  (number_id IS NULL) match. Otherwise only global rules apply. */
export async function findAutoReply(userId, body = '', numberId = null) {
  const { rows: toggles } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'ai_features'`);
  if (!toggles.length || !toggles[0].enabled) return null;

  const params = [userId];
  let sql = `SELECT trigger_keyword, reply FROM auto_reply_rules
             WHERE user_id = $1 AND enabled = TRUE`;
  if (numberId) {
    params.push(numberId);
    sql += ` AND (number_id = $2 OR number_id IS NULL)`;
  } else {
    sql += ` AND number_id IS NULL`;
  }

  const { rows: rules } = await query(sql, params);
  const text = body.toLowerCase();
  const hit = rules.find((r) => text.includes(r.trigger_keyword.toLowerCase()));
  return hit ? hit.reply : null;
}

/** Quick-reply suggestions from rules + matching templates. */
export async function suggestReplies(userId, body = '') {
  const { rows: toggles } = await query(`SELECT enabled FROM feature_toggles WHERE key = 'ai_features'`);
  if (!toggles.length || !toggles[0].enabled) return [];

  const text = body.toLowerCase();
  const out = [];

  const { rows: rules } = await query(
    `SELECT trigger_keyword, reply FROM auto_reply_rules WHERE user_id = $1 AND enabled = TRUE`,
    [userId]
  );
  for (const r of rules) {
    if (text.includes(r.trigger_keyword.toLowerCase())) out.push(r.reply);
  }

  const { rows: tmpl } = await query(
    `SELECT body FROM templates WHERE (user_id IS NULL OR user_id = $1) AND category IN ('otp','notification','welcome')`,
    [userId]
  );
  for (const t of tmpl) if (!out.includes(t.body)) out.push(t.body);

  return out.slice(0, 3);
}
