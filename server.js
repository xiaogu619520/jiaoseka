import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { BLOCKS, BLOCK_MAP, BOOK_BLOCKS, MVU_FIXED_ENTRIES, BEAUTIFY_PARTS, BEAUTIFY_PART_MAP } from "./lib/blocks.js";
import { buildCharacterCard } from "./lib/packer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 上游 API 基址（OpenAI 兼容）。优先级：请求自带 > 环境变量 UPSTREAM_BASE > 默认值。
// 默认值保留原有地址，便于现网零改动继续运行。
const DEFAULT_UPSTREAM = process.env.UPSTREAM_BASE || "https://blqs.bailan.shop/v1";

// 规范化上游基址：去掉首尾空白和结尾多余的斜杠，缺省补回默认值。
function normalizeBase(v) {
  const s = String(v || "").trim().replace(/\/+$/, "");
  return s || DEFAULT_UPSTREAM;
}

// 安全解码：header 值可能被前端 encodeURIComponent 过，非编码值原样返回
function safeDecode(v) {
  const s = String(v || "");
  if (!s) return "";
  try {
    return /%[0-9A-Fa-f]{2}/.test(s) ? decodeURIComponent(s) : s;
  } catch {
    return s;
  }
}

// 从请求里取密钥与模型（前端从浏览器本地存储带过来）
function getCreds(req) {
  const key =
    safeDecode(req.headers["x-api-key"]) ||
    safeDecode(req.headers.authorization).replace(/^Bearer\s+/i, "") ||
    req.body?.apiKey ||
    "";
  const model =
    safeDecode(req.headers["x-model"]) || req.body?.model || "gemini-2.5-pro";
  // 上游基址：允许请求自带（header x-base-url 或 body.baseUrl），否则用默认/环境变量
  const base = normalizeBase(
    safeDecode(req.headers["x-base-url"]) || req.body?.baseUrl || ""
  );
  return { key: String(key).trim(), model: String(model).trim(), base };
}

// 把上游错误码转成对用户友好的提示
function friendlyError(status, raw) {
  if (status === 401 || status === 403) {
    return "API 密钥无效或未获授权。请点左下角「设置」，在本网站里重新填写有效密钥后再试。注意：本站与小说工作室不是同一处存储，密钥不会自动共用，需要在这里单独填一次。";
  }
  if (status === 429) {
    return "请求过于频繁或额度不足，请稍后再试。";
  }
  if (status === 408 || status === 504) {
    return "上游响应超时，请重试。";
  }
  if (status >= 500) {
    return "上游服务暂时不可用，请稍后再试。";
  }
  return "生成失败，请重试。" + (raw ? `（${String(raw).slice(0, 120)}）` : "");
}

// 调用上游 LLM（OpenAI 兼容 /chat/completions）
async function callLLM({ key, model, system, user, base }) {
  const upstream = normalizeBase(base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  let resp;
  try {
    resp = await fetch(`${upstream}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.9,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const err = new Error(e.name === "AbortError" ? "上游响应超时，请重试。" : "无法连接上游服务，请稍后再试。");
    err.status = 504;
    throw err;
  }
  clearTimeout(timer);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(friendlyError(resp.status, text));
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("上游返回内容为空，请重试。");
    err.status = 502;
    throw err;
  }
  return content.trim();
}

// 去掉 AI 可能多包的 ```代码块``` 外壳
function stripFence(text) {
  const t = text.trim();
  const m = t.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return m ? m[1].trim() : t;
}

const SYSTEM_BASE = `你是一名专业的 SillyTavern 角色卡创作助手。

【创作准则】
1. 严格遵循用户给定的"作品总要求""全局补充要求""本页修改要求"，三者优先级依次递增；用户明确写到的设定（名字、性别、世界观、风格、玩法、禁忌等）必须原样落实，不得擅自更改、忽略或自行替换。
2. 用户没写到的细节才允许你合理补全，且补全要与已有设定保持一致，不得与用户要求冲突。
3. 严禁内容重复：不要在本分块内重复堆砌同义句；更不要照抄或复述"已生成的相关内容"里的原文。各分块各司其职，只写当前分块该写的部分，避免与其它分块内容雷同。
4. 行文要具体、有信息量，避免空洞套话和无意义的模板化堆砌。

【输出格式】
只输出当前分块所需的内容本身，不要任何额外解释、寒暄、前后缀说明或 markdown 代码块包裹。`;

// 组装单个分块的用户提示词
// brief=总要求, globalExtra=全局补充要求, blockExtra=本页补充要求
function buildBlockPrompt({ blockKey, brief, globalExtra, context, blockExtra }) {
  const block = BLOCK_MAP[blockKey];
  let p = `# 作品总要求\n${brief || "（未提供，请合理发挥）"}\n\n`;
  if (globalExtra && globalExtra.trim()) {
    p += `# 全局补充要求（适用于所有分块，优先级高于总要求）\n${globalExtra.trim()}\n\n`;
  }
  if (context && Object.keys(context).length) {
    p += `# 已生成的相关内容（仅供保持设定一致的参考，禁止照抄或复述其原文，本分块要写出与它们不重复的新内容）\n`;
    for (const [k, v] of Object.entries(context)) {
      if (v && BLOCK_MAP[k]) {
        p += `## ${BLOCK_MAP[k].label}\n${String(v).slice(0, 2000)}\n\n`;
      }
    }
  }
  p += `# 当前任务：生成「${block.label}」\n${block.instruction}\n`;
  if (blockExtra && blockExtra.trim()) {
    p += `\n# 针对本页的修改要求（最高优先级）\n${blockExtra.trim()}\n`;
  }
  return p;
}

// 接口：列出所有分块定义
app.get("/api/blocks", (req, res) => {
  res.json(
    BLOCKS.map(({ key, label, group, format, instruction }) => ({
      key,
      label,
      group,
      format,
      hint: String(instruction).split("\n")[0],
    }))
  );
});

// 接口：生成单个分块
app.post("/api/generate-block", async (req, res) => {
  const { key, model, base } = getCreds(req);
  if (!key) return res.status(400).json({ error: "未配置 API 密钥，请在「设置」里填写后再试。" });
  const { blockKey, brief = "", globalExtra = "", context = {}, blockExtra = "" } = req.body || {};
  if (!BLOCK_MAP[blockKey]) return res.status(400).json({ error: "未知的分块类型" });
  try {
    const content = await callLLM({
      key,
      model,
      base,
      system: SYSTEM_BASE,
      user: buildBlockPrompt({ blockKey, brief, globalExtra, context, blockExtra }),
    });
    res.json({ blockKey, content: stripFence(content) });
  } catch (e) {
    res.status(e.status && e.status < 600 ? 502 : 502).json({ error: String(e.message || e) });
  }
});

// 接口：列出美化模块的四个部分定义
app.get("/api/beautify-parts", (req, res) => {
  res.json(BEAUTIFY_PARTS.map(({ key, label }) => ({ key, label })));
});

// 接口：单独生成美化模块的某一部分（把其它已生成部分作为上下文，保持一致）
app.post("/api/generate-beautify-part", async (req, res) => {
  const { key, model, base } = getCreds(req);
  if (!key) return res.status(400).json({ error: "未配置 API 密钥，请在「设置」里填写后再试。" });
  const { partKey, brief = "", globalExtra = "", parts = {}, blockExtra = "", cardContext = {} } = req.body || {};
  const part = BEAUTIFY_PART_MAP[partKey];
  if (!part) return res.status(400).json({ error: "未知的美化部分" });
  try {
    let p = `# 作品总要求\n${brief || "（未提供，请合理发挥）"}\n\n`;
    if (globalExtra && globalExtra.trim()) {
      p += `# 全局补充要求\n${globalExtra.trim()}\n\n`;
    }
    // 把角色卡里已生成的相关内容作为参照：美化模块必须围绕本角色卡的实际设定、
    // 状态栏与 MVU 变量、世界书来设计标签与展示字段，而不是凭空发挥
    const cardLines = [];
    for (const k of Object.keys(cardContext)) {
      const v = cardContext[k];
      if (v && String(v).trim() && BLOCK_MAP[k]) {
        cardLines.push(`## ${BLOCK_MAP[k].label}\n${String(v).slice(0, 2500)}`);
      }
    }
    if (cardLines.length) {
      p += `# 本角色卡已生成的相关内容（美化模块必须围绕这些实际设定来设计：源文件标签要对应这里的角色名/变量名/世界书字段，展示内容要贴合状态栏与 MVU 变量，禁止凭空编造与本卡无关的字段）\n${cardLines.join("\n\n")}\n\n`;
    }
    // 把已生成的其它部分作为上下文，保证占位符/标签/正则对齐
    const ctxOrder = ["source", "html", "regex", "worldbook"];
    const ctxLines = [];
    for (const k of ctxOrder) {
      if (k !== partKey && parts[k] && String(parts[k]).trim()) {
        ctxLines.push(`## ${BEAUTIFY_PART_MAP[k].label}\n${String(parts[k]).slice(0, 3000)}`);
      }
    }
    if (ctxLines.length) {
      p += `# 美化模块已生成的其它部分（必须与之严格对齐：标签名、占位符 $N、正则捕获组数量与顺序要彼此一致）\n${ctxLines.join("\n\n")}\n\n`;
    }
    p += `# 当前任务：只生成「${part.label}」\n${part.instruction}\n`;
    if (blockExtra && blockExtra.trim()) {
      p += `\n# 针对本部分的修改要求（最高优先级）\n${blockExtra.trim()}\n`;
    }
    const content = await callLLM({ key, model, base, system: SYSTEM_BASE, user: p });
    res.json({ partKey, content: stripFence(content) });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// 接口：一键全量生成（流式返回进度，逐块生成并把已生成内容作为上下文）
app.post("/api/generate-all", async (req, res) => {
  const { key, model, base } = getCreds(req);
  if (!key) return res.status(400).json({ error: "未配置 API 密钥，请在「设置」里填写后再试。" });
  const {
    brief = "",
    globalExtra = "",
    includeMvu = true,
    includeStatusBar = true,
    onlyKeys = null, // 传数组时只重生成这些分块（用于"按补充要求重生成全部/部分"）
  } = req.body || {};

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // 决定要生成哪些分块
  let order = BLOCKS.map((b) => b.key);
  if (!includeMvu) order = order.filter((k) => !k.startsWith("mvu"));
  if (!includeStatusBar) order = order.filter((k) => k !== "status_bar");
  if (Array.isArray(onlyKeys) && onlyKeys.length) {
    order = order.filter((k) => onlyKeys.includes(k));
  }

  const result = {};
  try {
    for (const blockKey of order) {
      send({ type: "progress", blockKey, label: BLOCK_MAP[blockKey].label, status: "start" });
      try {
        const content = await callLLM({
          key,
          model,
          base,
          system: SYSTEM_BASE,
          user: buildBlockPrompt({ blockKey, brief, globalExtra, context: result, blockExtra: "" }),
        });
        result[blockKey] = stripFence(content);
        send({ type: "block", blockKey, content: result[blockKey] });
      } catch (e) {
        send({ type: "error", blockKey, error: String(e.message || e) });
      }
    }
    send({ type: "done" });
  } catch (e) {
    send({ type: "fatal", error: String(e.message || e) });
  }
  res.end();
});

// 接口：把分块打包成 SillyTavern v3 JSON
app.post("/api/pack", (req, res) => {
  const { name, blocks = {}, meta = {} } = req.body || {};
  try {
    const cardName = name || blocks.name || meta.name || "未命名角色卡";
    const mainBlocks = {
      name: cardName,
      description: blocks.description || "",
      personality: blocks.personality || "",
      scenario: blocks.scenario || "",
      first_mes: blocks.first_mes || "",
      mes_example: blocks.mes_example || "",
      status_bar: blocks.status_bar || "",
      mvu_schema: blocks.mvu_schema || "",
    };
    // 美化模块：前端传来的是结构化对象 { source, html, regex, worldbook }
    const bt = blocks.beautify && typeof blocks.beautify === "object" ? blocks.beautify : null;

    const bookEntries = [];
    for (const [bk, cfg] of Object.entries(BOOK_BLOCKS)) {
      if (bk === "beautify") {
        // 美化模块的「世界书部分」单独按 @D 深度注入
        if (bt && bt.worldbook && String(bt.worldbook).trim()) {
          bookEntries.push({ ...cfg, content: String(bt.worldbook).trim() });
        }
        continue;
      }
      if (blocks[bk] && String(blocks[bk]).trim()) {
        bookEntries.push({ ...cfg, content: blocks[bk] });
      }
    }
    const hasMvu = ["mvu_schema", "mvu_init", "mvu_rules", "mvu_stages"].some(
      (k) => blocks[k] && String(blocks[k]).trim()
    );
    if (hasMvu) bookEntries.push(...MVU_FIXED_ENTRIES);

    // 美化模块的「正则部分 + 美化部分」合成 regex_script
    const beautifyRegex = bt && bt.regex && String(bt.regex).trim() && bt.html && String(bt.html).trim()
      ? { regex: String(bt.regex).trim(), html: String(bt.html).trim() }
      : null;

    const card = buildCharacterCard(mainBlocks, bookEntries, { ...meta, name: cardName, beautifyRegex });
    res.json({ card, filename: `${cardName}.json` });
  } catch (e) {
    res.status(500).json({ error: "打包失败，请重试。" });
  }
});

// 接口：拉取上游可用模型列表（用用户密钥代理）
app.get("/api/models", async (req, res) => {
  const { key, base } = getCreds(req);
  if (!key) return res.status(400).json({ error: "未配置 API 密钥，请先在「设置」里填写。" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status === 401 || r.status === 403 ? 401 : 502)
        .json({ error: friendlyError(r.status, text) });
    }
    const data = await r.json();
    const list = Array.isArray(data?.data)
      ? data.data.map((m) => m.id).filter(Boolean)
      : [];
    list.sort((a, b) => a.localeCompare(b));
    res.json({ models: list });
  } catch (e) {
    clearTimeout(timer);
    res.status(502).json({ error: e.name === "AbortError" ? "拉取模型超时，请重试。" : "拉取模型失败，请重试。" });
  }
});

// 健康检查
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8090;
app.listen(PORT, "0.0.0.0", () => console.log(`nova-web listening on ${PORT}`));
