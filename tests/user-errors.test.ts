import { describe, expect, it } from "vitest";
import {
  isDuplicateAccountEmailError,
  DUPLICATE_ACCOUNT_EMAIL_MESSAGE,
} from "../src/lib/user-errors";

describe("erros de contas de usuário", () => {
  it("reconhece os conflitos de e-mail retornados pelo Supabase Auth", () => {
    expect(isDuplicateAccountEmailError({ code: "email_exists", message: "conflict" })).toBe(true);
    expect(
      isDuplicateAccountEmailError({
        message: "A user with this email address has already been registered",
      }),
    ).toBe(true);
  });

  it("reconhece a mensagem normalizada pelo adapter e ignora falhas comuns", () => {
    expect(isDuplicateAccountEmailError(new Error(DUPLICATE_ACCOUNT_EMAIL_MESSAGE))).toBe(true);
    expect(isDuplicateAccountEmailError(new Error("timeout ao consultar o Supabase"))).toBe(false);
  });
});
