import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { normalizeCertificatePdfUrl } from "../js/certificate-view.js";

const validUrl = "https://guhycosuznmmmupsztqn.supabase.co/storage/v1/object/public/pdfs/certificado.pdf";

test("acepta solamente PDF del bucket publico esperado", () => {
  assert.equal(normalizeCertificatePdfUrl(validUrl), validUrl);
  assert.equal(normalizeCertificatePdfUrl("javascript:alert(1)"), "");
  assert.equal(normalizeCertificatePdfUrl("https://attacker.example/certificado.pdf"), "");
  assert.equal(normalizeCertificatePdfUrl(`${validUrl}?token=secret`), "");
});

test("las tablas no vuelven a insertar datos mediante innerHTML", async () => {
  const sources = await Promise.all([
    fs.readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../js/admin.js", import.meta.url), "utf8"),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /\.innerHTML\s*=/);
  }
});

test("la CSP conserva las fuentes usadas sin abrir otros origenes", async () => {
  const pages = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../admin.html", import.meta.url), "utf8"),
  ]);
  for (const html of pages) {
    assert.match(html, /style-src 'self' https:\/\/fonts\.googleapis\.com/);
    assert.match(html, /font-src 'self' https:\/\/fonts\.gstatic\.com/);
    assert.match(html, /object-src 'none'/);
  }
});
