import { a as hashPassword } from "./auth-BMMW7Zok.js";
import { n as query, r as queryOne } from "./db-DG7c0MHC.js";
import { createHash, randomBytes, randomUUID } from "crypto";
//#region src/lib/password-reset.ts
var TOKEN_TTL_MINUTES = 30;
var REQUEST_COOLDOWN_MINUTES = 10;
function hashResetToken(token) {
	return createHash("sha256").update(token).digest("hex");
}
async function createPasswordResetToken(userId) {
	if (await queryOne(`SELECT 1 FROM password_reset_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
       AND created_at > datetime('now', '-' || $2 || ' minutes')
     LIMIT 1`, [userId, REQUEST_COOLDOWN_MINUTES])) return null;
	await query("UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = $1 AND used_at IS NULL", [userId]);
	const id = randomUUID();
	const token = randomBytes(32).toString("base64url");
	await query(`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1,$2,$3,datetime('now', '+' || $4 || ' minutes'))`, [
		id,
		userId,
		hashResetToken(token),
		TOKEN_TTL_MINUTES
	]);
	return {
		token,
		id
	};
}
async function discardPasswordResetToken(id) {
	await query("DELETE FROM password_reset_tokens WHERE id = $1", [id]);
}
async function resetPasswordWithToken(token, newPassword) {
	const userId = (await query(`UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     RETURNING user_id`, [hashResetToken(token)]))[0]?.user_id;
	if (!userId) return false;
	await query(`UPDATE users
     SET password_hash = $1, session_version = session_version + 1
     WHERE id = $2`, [hashPassword(newPassword), userId]);
	await query("UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = $1", [userId]);
	return true;
}
//#endregion
export { createPasswordResetToken, discardPasswordResetToken, resetPasswordWithToken };
