// 角色卡打包模块：把各内容分块组装成 SillyTavern v3 (chara_card_v3) JSON
// 改编自 nova-creator-cli/build-card.js，区别是接收内容字符串而非文件路径

function createEntryTemplate() {
  return {
    keys: [],
    secondary_keys: [],
    constant: true,
    selective: true,
    use_regex: true,
    extensions: {
      exclude_recursion: false,
      probability: 100,
      useProbability: true,
      selectiveLogic: 0,
      group: "",
      group_override: false,
      group_weight: 100,
      prevent_recursion: false,
      delay_until_recursion: false,
      scan_depth: null,
      match_whole_words: null,
      use_group_scoring: false,
      case_sensitive: null,
      automation_id: "",
      vectorized: false,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      match_persona_description: false,
      match_character_description: false,
      match_character_personality: false,
      match_character_depth_prompt: false,
      match_scenario: false,
      match_creator_notes: false,
      triggers: [],
      ignore_budget: false,
    },
  };
}

const POSITION_MAP = {
  before_char: 0,
  after_char: 1,
  before_em: 5,
  after_em: 6,
  before_an: 2,
  after_an: 3,
  at_depth: 4,
};

function convertPosition(positionStr) {
  return POSITION_MAP[positionStr] ?? 0;
}

// config: { comment, content, enabled, position, insertion_order, depth, role }
function buildCharacterBookEntry(config, index) {
  const entry = createEntryTemplate();
  entry.id = index;
  entry.comment = config.comment || "";
  entry.content = config.content || "";
  entry.keys = Array.isArray(config.keys) ? config.keys : [];
  entry.enabled = config.enabled ?? true;
  entry.position = config.position ?? "after_char";
  entry.insertion_order = config.insertion_order ?? 100;
  entry.extensions.position = convertPosition(entry.position);
  entry.extensions.display_index = index;
  entry.extensions.depth = config.depth ?? 4;
  entry.extensions.role = config.role ?? 0;
  // 关键词为空时改为常驻注入（constant），否则按关键词触发
  if (entry.keys.length > 0) {
    entry.constant = false;
  }
  if ((config.comment || "").toLowerCase().includes("[initvar]")) {
    entry.constant = false;
  }
  return entry;
}

// 把 AI 生成的 /pattern/flags 正则字符串规整为 SillyTavern findRegex 形式
function normalizeRegexStr(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  // 去掉可能被包进的代码块反引号
  s = s.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
  // 已经是 /.../flags 形式就原样用
  if (/^\/[\s\S]+\/[a-z]*$/i.test(s)) return s;
  // 否则当成裸 pattern，补上斜杠并默认加 s 修饰符
  return `/${s}/s`;
}

function createRegexScripts(statusBarContent, beautify) {
  const scripts = [
    {
      id: "9698c545-91a1-42c1-a4d5-486057de5d7a",
      scriptName: "对AI隐藏状态栏",
      disabled: false,
      runOnEdit: true,
      findRegex: "<StatusPlaceHolderImpl/>",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      markdownOnly: false,
      promptOnly: true,
    },
    {
      id: "fc3d2d10-c7bc-41b8-8eb5-6d36151134c2",
      scriptName: "去除更新变量",
      disabled: false,
      runOnEdit: true,
      findRegex: "/<(UpdateVariable|Analysis|JSONPatch)>[\\s\\S]*?</\\1>/gm",
      replaceString: "",
      trimStrings: [],
      placement: [2],
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      markdownOnly: true,
      promptOnly: true,
    },
  ];
  if (statusBarContent && statusBarContent.trim()) {
    scripts.push({
      id: "0a826eea-6150-4ef8-b31b-0f10f6f12053",
      scriptName: "状态栏",
      findRegex: "<StatusPlaceHolderImpl/>",
      replaceString: "```\n" + statusBarContent + "\n```",
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: 2,
    });
  }
  // 美化模块：正则部分作为 findRegex，美化部分(HTML模板)作为 replaceString
  if (beautify && beautify.regex && beautify.regex.trim() && beautify.html && beautify.html.trim()) {
    scripts.push({
      id: "b7e9c3a1-2d4f-4a6b-9c8e-1f0a5d3b6c20",
      scriptName: "HTML美化模块",
      findRegex: normalizeRegexStr(beautify.regex),
      replaceString: beautify.html.trim(),
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
    });
  }
  return scripts;
}

function createTavernHelperScripts(mvuSchemaContent) {
  const scripts = [
    {
      type: "script",
      value: {
        id: "1f84fa2d-cd60-4015-be1b-cc801a8092be",
        name: "MVU Zod 脚本",
        content:
          "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js'",
        info: "",
        buttons: [
          { name: "重新处理变量", visible: false },
          { name: "重新读取初始变量", visible: false },
          { name: "清除旧楼层变量", visible: false },
        ],
        data: {
          是否显示变量更新错误: "是",
          构建信息: new Date().toISOString() + " (generated)",
        },
        enabled: true,
      },
    },
  ];
  if (mvuSchemaContent && mvuSchemaContent.trim()) {
    scripts.push({
      type: "script",
      value: {
        id: "user-script-mvu-schema",
        name: "变量结构",
        content: mvuSchemaContent,
        info: "",
        buttons: [],
        data: {},
        enabled: true,
      },
    });
  }
  return scripts;
}

// blocks: 一个对象，键为分块类型，值为内容字符串
//   name, description, personality, scenario, first_mes, mes_example,
//   creator_notes, system_prompt, post_history_instructions,
//   status_bar (状态栏HTML), mvu_schema (变量结构JS)
// bookEntries: 世界书条目数组 [{comment, content, keys, position, ...}]
// meta: { creator, character_version, world, alternate_greetings:[], talkativeness, fav, tags:[] }
function buildCharacterCard(blocks = {}, bookEntries = [], meta = {}) {
  const name = blocks.name || meta.name || "未命名角色卡";
  const entries = bookEntries.map((e, i) => buildCharacterBookEntry(e, i));

  const now = new Date();
  const createDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} @${now.getHours()}h ${now.getMinutes()}m ${now.getSeconds()}s ${now.getMilliseconds()}ms`;

  const hasMvu = !!(blocks.mvu_schema && blocks.mvu_schema.trim());

  const card = {
    name,
    description: blocks.description || "",
    personality: blocks.personality || "",
    scenario: blocks.scenario || "",
    first_mes: blocks.first_mes || "",
    mes_example: blocks.mes_example || "",
    creatorcomment: "",
    avatar: "none",
    talkativeness: meta.talkativeness || "0.5",
    fav: meta.fav || false,
    tags: meta.tags || [],
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name,
      description: blocks.description || "",
      personality: blocks.personality || "",
      scenario: blocks.scenario || "",
      first_mes: blocks.first_mes || "",
      mes_example: blocks.mes_example || "",
      creator_notes: blocks.creator_notes || "",
      system_prompt: blocks.system_prompt || "",
      post_history_instructions: blocks.post_history_instructions || "",
      tags: meta.tags || [],
      creator: meta.creator || "",
      character_version: meta.character_version || "",
      alternate_greetings: meta.alternate_greetings || [],
      extensions: {
        talkativeness: meta.talkativeness || "0.5",
        fav: meta.fav || false,
        world: meta.world || name,
        depth_prompt: { prompt: "", depth: 4, role: "system" },
        regex_scripts: createRegexScripts(blocks.status_bar, meta.beautifyRegex),
      },
      group_only_greetings: [],
      character_book: {
        entries,
        name: meta.world || name,
      },
    },
    create_date: createDate,
  };

  if (hasMvu) {
    card.data.extensions.TavernHelper_scripts = createTavernHelperScripts(
      blocks.mvu_schema
    );
  }

  return card;
}

export { buildCharacterCard, buildCharacterBookEntry, createRegexScripts };
