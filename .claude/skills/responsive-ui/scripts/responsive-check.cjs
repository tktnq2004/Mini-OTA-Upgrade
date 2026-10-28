// Chụp trang ở các khổ mobile/tablet/desktop và báo phần tử tràn ngang.
//
// Cần gói `ws` (không có trong dự án). Cài vào thư mục tạm rồi chạy:
//   npm i --prefix <tmp> ws@8.18.0
//   NODE_PATH=<tmp>/node_modules node .claude/skills/responsive-ui/scripts/responsive-check.cjs \
//     --base http://localhost:3000 --out <tmp>/shots --paths /,/hotels,/partner/rooms \
//     [--login admin|partner:email:password]
// Git Bash: thêm MSYS_NO_PATHCONV=1 trước lệnh, kẻo "/hotels" bị đổi thành đường dẫn Windows.
//
// --login: lấy cookie phiên quản lý qua /api/admin/auth/login (dùng cho /admin, /partner).
// Không dùng tài khoản thật của người dùng; cần tài khoản test thì hỏi người dùng trước.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const WebSocket = require("ws");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: true },
  { name: "desktop", width: 1280, height: 800, mobile: false },
];
const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

// Chạy trong trang: liệt kê phần tử thò ra ngoài bề ngang viewport (nguyên nhân thanh cuộn ngang).
const OVERFLOW_PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const page = document.documentElement.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    // Bỏ qua phần tử nằm trong vùng cuộn ngang có chủ đích (bảng bọc overflow-x: auto...).
    let p = el.parentElement, scrollable = false;
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") { scrollable = true; break; }
      p = p.parentElement;
    }
    if (scrollable) continue;
    const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
    offenders.push(el.tagName.toLowerCase() + (cls ? "." + cls : "") + " right=" + Math.round(r.right));
    if (offenders.length >= 8) break;
  }
  return { viewport: vw, pageWidth: page, overflow: page > vw + 1, offenders };
})()`;

async function main() {
  const base = arg("base", "http://localhost:3000");
  const out = arg("out", path.join(os.tmpdir(), "responsive-shots"));
  const paths = arg("paths", "/").split(",");
  const login = arg("login");
  fs.mkdirSync(out, { recursive: true });

  // Server chưa chạy thì dừng ngay — tránh chụp trang lỗi của trình duyệt rồi báo "ok".
  try {
    await fetch(base, { method: "HEAD", redirect: "manual" });
  } catch {
    throw new Error(`Không kết nối được ${base} — dev server chưa chạy?`);
  }

  let cookies = [];
  if (login) {
    const [, email, password] = login.split(":");
    const res = await fetch(`${base}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    cookies = res.headers.getSetCookie().map((c) => {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      return { name: pair.slice(0, i), value: pair.slice(i + 1) };
    });
    console.log(`login ${res.status} (${cookies.length} cookie)`);
  }

  const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!chromePath) throw new Error("Không tìm thấy Chrome/Edge");
  const chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(out, ".profile")}`, "about:blank",
  ], { stdio: "ignore" });

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(300);
    try {
      target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error("Không kết nối được Chrome headless");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.on("message", (m) => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });

  await send("Network.enable");
  await send("Runtime.enable");
  for (const c of cookies) await send("Network.setCookie", { name: c.name, value: c.value, url: base, path: "/" });

  let problems = 0;
  for (const p of paths) {
    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
      const nav = await send("Page.navigate", { url: base + p });
      if (nav.result?.errorText) {
        problems++;
        console.log(`${p} [${vp.name}] KHÔNG TẢI ĐƯỢC TRANG: ${nav.result.errorText}`);
        continue;
      }
      await sleep(6000);
      const probe = (await send("Runtime.evaluate", { expression: OVERFLOW_PROBE, returnByValue: true })).result.result.value;
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      const file = path.join(out, `${p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}-${vp.name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
      const status = probe.overflow ? `TRÀN NGANG (trang ${probe.pageWidth}px > ${probe.viewport}px)` : "ok";
      if (probe.overflow) problems++;
      console.log(`${p} [${vp.name} ${vp.width}px] ${status} -> ${file}`);
      for (const o of probe.offenders) console.log(`    thò ra: ${o}`);
    }
  }
  if (errors.length) console.log("Lỗi JS trong trang:\n  " + errors.slice(0, 5).join("\n  "));
  console.log(problems ? `${problems} khổ có vấn đề (tràn ngang hoặc không tải được)` : "Không khổ nào bị tràn ngang");
  process.exitCode = problems ? 1 : 0;

  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
