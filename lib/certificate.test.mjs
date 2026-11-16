import test from "node:test";
import assert from "node:assert/strict";
import { awardOf, fileName, jpegToPdf } from "./certificate.mjs";

test("award wording", () => {
  assert.equal(awardOf({ open: false, kind: null }).ready, false);
  assert.equal(awardOf({ open: false, kind: null }).type, "รอออกใบประกาศ");
  assert.deepEqual(awardOf({ open: true, kind: "placement", pos: 1 }), { ready: true, award: "ชนะเลิศ", type: "รางวัลชนะเลิศ", line: "ได้รับรางวัล ชนะเลิศ", tone: "gold" });
  assert.equal(awardOf({ open: true, kind: "placement", pos: 3 }).award, "รองชนะเลิศอันดับ 2");
  assert.equal(awardOf({ open: true, kind: "medal", medal: "silver" }).type, "รางวัลเหรียญเงิน");
  assert.equal(awardOf({ open: true, kind: "participation" }).type, "เข้าร่วมการแข่งขัน");
  assert.equal(awardOf({ open: true, kind: "participation" }).line, "ได้เข้าร่วมการแข่งขัน");
});

test("file name", () => {
  assert.equal(fileName("ธนวัฒน์ ศรีสุข", "GO KYU CUP/2026"), "ใบประกาศ-ธนวัฒน์-ศรีสุข-GO-KYU-CUP2026");
});

test("pdf structure", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const pdf = jpegToPdf(jpeg, 100, 70);
  const text = new TextDecoder("latin1").decode(pdf);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/Width 100 \/Height 70/);
  assert.match(text, /\/Length 7 >>/);
  // xref offsets point at "N 0 obj"
  const start = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(start, start + 4), "xref");
  const offs = [...text.slice(start).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offs.forEach((o, i) => assert.equal(text.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
});
