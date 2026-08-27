import { createHash, randomBytes, randomUUID } from "crypto";
import { hashPassword } from "./auth";
import { query, queryOne } from "./db";

const TOKEN_TTL_MINUTES = 30;
const REQUEST_COOLDOWN_MINUTES = 10;

type ResetTokenRow = {
  user_id: string;
};

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(
  userId: string
): Promise<{ token: string; id: string } | null> {
  const recent = await queryOne(
    `SELECT 1 FROM password_reset_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
       AND created_at > datetime('now', '-' || $2 || ' minutes')
     LIMIT 1`,
    [userId, REQUEST_COOLDOWN_MINUTES]
  );
  if (recent) return null;

  await query(
    "UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = $1 AND used_at IS NULL",
    [userId]
  );

  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1,$2,$3,datetime('now', '+' || $4 || ' minutes'))`,
    [id, userId, hashResetToken(token), TOKEN_TTL_MINUTES]
  );
  return { token, id };
}

export async function discardPasswordResetToken(id: string): Promise<void> {
  await query("DELETE FROM password_reset_tokens WHERE id = $1", [id]);
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  const rows = await query<ResetTokenRow>(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     RETURNING user_id`,
    [hashResetToken(token)]
  );

  const userId = rows[0]?.user_id;
  if (!userId) return false;

  await query(
    `UPDATE users
     SET password_hash = $1, session_version = session_version + 1
     WHERE id = $2`,
    [hashPassword(newPassword), userId]
  );
  await query(
    "UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = $1",
    [userId]
  );
  return true;
}
