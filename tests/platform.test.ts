import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlatformAdminEmail,
  platformAdminEmails,
} from "../src/lib/platform-allowlist.ts";

function withAllowlist(value: string | undefined, fn: () => void) {
  const previous = process.env.PLATFORM_ADMIN_EMAILS;
  if (value === undefined) delete process.env.PLATFORM_ADMIN_EMAILS;
  else process.env.PLATFORM_ADMIN_EMAILS = value;

  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_ADMIN_EMAILS;
    else process.env.PLATFORM_ADMIN_EMAILS = previous;
  }
}

test("reconhece o e-mail da lista ignorando caixa", () => {
  withAllowlist("dono@autoric.com.br", () => {
    assert.equal(isPlatformAdminEmail("dono@autoric.com.br"), true);
    assert.equal(isPlatformAdminEmail("DONO@Autoric.com.BR"), true);
  });
});

test("aceita lista separada por vírgula com espaços", () => {
  withAllowlist(" dono@autoric.com.br , suporte@autoric.com.br ", () => {
    assert.deepEqual(platformAdminEmails(), [
      "dono@autoric.com.br",
      "suporte@autoric.com.br",
    ]);
    assert.equal(isPlatformAdminEmail("suporte@autoric.com.br"), true);
  });
});

test("variável vazia ou ausente não promove ninguém", () => {
  withAllowlist(undefined, () => {
    assert.equal(isPlatformAdminEmail("dono@autoric.com.br"), false);
  });
  withAllowlist("   ", () => {
    assert.deepEqual(platformAdminEmails(), []);
    assert.equal(isPlatformAdminEmail(""), false);
  });
});

test("não confunde e-mail parecido com o da lista", () => {
  withAllowlist("dono@autoric.com.br", () => {
    assert.equal(isPlatformAdminEmail("dono@autoric.com.br.evil.com"), false);
    assert.equal(isPlatformAdminEmail("dono@autoric.com"), false);
    assert.equal(isPlatformAdminEmail("outro@autoric.com.br"), false);
  });
});

test("e-mail vazio nunca é admin", () => {
  withAllowlist("dono@autoric.com.br,,", () => {
    assert.deepEqual(platformAdminEmails(), ["dono@autoric.com.br"]);
    assert.equal(isPlatformAdminEmail(null), false);
    assert.equal(isPlatformAdminEmail(undefined), false);
  });
});
