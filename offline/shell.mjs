// The downloadable offline desk: one HTML file = styles + the event's data + the bundled desk script.
// No fonts, images or anything else from the internet.

const CSS = `
*{box-sizing:border-box}body{margin:0;font:15px/1.45 "Prompt","Noto Sans Thai","Leelawadee UI","Tahoma",sans-serif;color:#10213f;background:#f3f6fb}
#app{max-width:1100px;margin:0 auto;padding:12px}
button,select{font:inherit;min-height:40px;border-radius:10px;border:1px solid #b9c6dc;background:#fff;padding:0 12px;cursor:pointer;color:inherit}
button.on{background:#0d58b6;border-color:#0d58b6;color:#fff;font-weight:600}button.big{width:100%;min-height:52px;margin:10px 0;background:#d4a63d;border-color:#b8892a;font-weight:700;font-size:17px}
button.warn{background:#fff3cd;border-color:#e2b44e;font-weight:700}button.bad{color:#b3261e;border-color:#e3a19c}button.sm{min-height:32px;font-size:13px}button.num{min-width:40px;padding:0}
.top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;background:#0b2a5b;color:#fff;border-radius:14px;padding:10px 14px}
.top small{opacity:.8}.btns{display:flex;gap:6px;flex-wrap:wrap}.top button{color:#10213f}
.note{font-size:13px;color:#4b5d7a;margin:8px 2px}.toast{background:#e8f6ec;border:1px solid #7cc596;border-radius:10px;padding:8px 12px;font-weight:600}
.divs,.tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.sp{flex:1}
.card{background:#fff;border:1px solid #d6dfec;border-radius:14px;padding:12px;margin:10px 0}.card.gold{border:2px solid #d4a63d}.warnbox{border:2px solid #e2b44e;background:#fff8df}
.row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:3px 0}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #e3e9f3;padding:6px;text-align:left;vertical-align:middle}th{font-size:13px;color:#4b5d7a}td.c{text-align:center;width:52px}
select.pending{background:#fff3cd;font-weight:600}tr.rematch{background:#fde8e6}
.slot{width:100%;text-align:left;min-height:48px;padding:4px 8px;border-color:transparent}.slot.picked{background:#fff3cd;outline:2px solid #d4a63d}
.muted{color:#6b7c96}.ok-t{color:#18794e;font-weight:600}.warn-t{color:#a15c00;font-weight:600}.bad-t{color:#b3261e}
details summary{cursor:pointer;font-weight:600;min-height:32px}
.print h1{font-size:20px;margin:0}.print h2{font-size:17px;margin:2px 0}.print h3{font-size:16px;margin:8px 0}
@media print{body{background:#fff}#app{padding:0}.print table{font-size:13px}th,td{border-bottom:1px solid #999}}
`;

/** @param {object} data  event snapshot @param {string} bundle  public/offline/desk.js */
export function offlineDeskHtml(data, bundle) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const title = String(data.title ?? "").replace(/[<>&"]/g, "");
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>โต๊ะจับคู่สำรอง · ${title}</title><style>${CSS}</style></head><body>
<div id="app"><p>กำลังเปิด… (ถ้าค้าง ให้เปิดไฟล์นี้ด้วย Chrome หรือ Edge)</p></div>
<input type="file" id="restore" hidden>
<script>window.GT_OFFLINE_DATA=${json};</script>
<script>${bundle.replace(/<\/script/gi, "<\\/script")}</script>
</body></html>`;
}
