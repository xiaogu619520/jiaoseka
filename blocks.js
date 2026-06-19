// 各分块的 AI 生成指令（提炼自 nova-creator-cli 的模板与 MVU 组件包）
// 每个分块: { key, label, group, instruction, format }

export const BLOCKS = [
  {
    key: "description",
    label: "角色设定",
    group: "核心字段",
    format: "xml-yaml",
    instruction: `生成角色的核心设定（对应 SillyTavern 的 description 字段）。采用 XML+YAML 混合格式，结构清晰。
包含：核心身份（名称/性别/年龄/标签）、背景（出身/关键经历/所处环境）、外貌描写（整体印象/体型/面部/发型发色/眼睛/肤色/显著特征）、穿着风格、性格特质（核心性格/优缺点/行为习惯）、能力专长、人际关系（与{{user}}及其他角色）。
使用 <character_information character="名称"> 作为根标签。不要输出任何注释。如用户有额外要求，优先遵循。`,
  },
  {
    key: "personality",
    label: "性格",
    group: "核心字段",
    format: "text",
    instruction: `用简洁有力的语言概括角色的核心性格（对应 personality 字段），3-6 句，突出最鲜明的性格特征、行为倾向与说话风格。不要输出注释。`,
  },
  {
    key: "scenario",
    label: "场景设定",
    group: "核心字段",
    format: "text",
    instruction: `描述故事发生的当前场景与背景情境（对应 scenario 字段），交代时间、地点、氛围、角色与{{user}}的关系处境，为对话提供舞台。不要输出注释。`,
  },
  {
    key: "first_mes",
    label: "开场白",
    group: "核心字段",
    format: "markdown",
    instruction: `创作一段引人入胜的开场白（对应 first_mes 字段）。要求：场景化开场，不要简单问候而是设计具体生动的开场场景；充分融入角色的性格、背景、当前目标与情感状态；沉浸式环境描写（时间/地点/氛围/景物声音气味/角色正在进行的活动）；以角色的口吻自然引出与{{user}}的互动。使用 {{user}} 占位符指代玩家。不要输出注释。`,
  },
  {
    key: "mes_example",
    label: "对话示例",
    group: "核心字段",
    format: "markdown",
    instruction: `生成 2-4 段对话示例（对应 mes_example 字段），用 <START> 分隔每段，展现角色在不同情绪/场景下的语言风格与反应模式。使用 {{user}} 和 {{char}} 占位符。不要输出注释。`,
  },
  {
    key: "background",
    label: "背景设定",
    group: "世界书",
    format: "xml-yaml",
    instruction: `生成世界观/背景设定，采用 XML+YAML 混合格式。根标签 <world_setting name="主题名称">，内部用具体名称的 XML 标签（如 <kingdom>、<magic_system>、<faction>），YAML 字段根据实际内容自定义（history/culture/mechanics/limitations 等）。自由增减字段与层级以适应需求。不要输出注释。这是一条世界书条目。`,
  },
  {
    key: "player",
    label: "玩家角色",
    group: "世界书",
    format: "yaml",
    instruction: `为玩家角色 {{user}} 生成档案。名称必须使用 {{user}} 占位符，不要替换为具体名字。提供足够背景但留发挥空间，性格能力不要过于固定。根标签 <protagonist_profile>。包含核心身份（名称{{user}}/性别/年龄/标签）、简要背景、与主要角色的关系基础。不要输出注释。`,
  },
  {
    key: "dialogue",
    label: "对话补充",
    group: "世界书",
    format: "yaml",
    instruction: `为角色生成对话语料库，5-10 个对话条目。根标签 <character_dialogue_corpus character="角色名">。每条包含 situation（情景简述）、tone_emotion（语气情绪）、dialogue（符合角色语言风格的对话）。覆盖不同情绪（喜悦/愤怒/悲伤/紧张等）和场景（日常/冲突/亲密/危机）。这些是参考性语料，用于补全人设，并非实际发生的剧情。避免过多省略号。不要输出注释。`,
  },
  {
    key: "interview",
    label: "角色采访",
    group: "世界书",
    format: "yaml",
    instruction: `生成角色采访记录，设计 3-5 个深度问题。根标签 <character_interview character="角色名">。每条包含 question（触及角色核心的深刻问题）和 answer（用第三人称描述角色的回答，含对话/动作/心理描写，100-300字）。展现角色的思考过程、情感波动、内心矛盾。这些是参考性内容，用于补全人设。不要输出注释。`,
  },
  {
    key: "mvu_schema",
    label: "MVU 变量结构",
    group: "MVU 系统",
    format: "javascript",
    instruction: `使用 Zod 4.x 定义本作品的 MVU 变量结构 schema，生成完整的 JavaScript 脚本。z（来自 Zod）和 _（来自 Lodash）默认全局可用，无需 import。定义角色与世界的动态变量（如好感度/体力/关系阶段/剧情进度等），用 z.object 嵌套，数值型用 z.number().min().max()，提供类型安全与运行时验证。导出名为 Schema 的常量。只输出 JS 代码本身，不要输出注释外的说明文字。`,
  },
  {
    key: "mvu_init",
    label: "MVU 变量初始化",
    group: "MVU 系统",
    format: "yaml",
    instruction: `基于已定义的 MVU 变量结构，生成一份满足该 Schema 的初始值 YAML 数据块。纯净数据，禁止任何注释。这是一条 [InitVar] 世界书条目。`,
  },
  {
    key: "mvu_rules",
    label: "MVU 更新规则",
    group: "MVU 系统",
    format: "yaml",
    instruction: `基于 MVU 变量结构，为每个变量制定更新规则。YAML 格式，为每个变量定义类型、取值范围、触发更新的条件，给 AI 清晰的变量更新逻辑指导。不要输出注释。`,
  },
  {
    key: "mvu_stages",
    label: "分阶段角色设定",
    group: "MVU 系统",
    format: "yaml-ejs",
    instruction: `生成一份由 MVU 变量驱动、动态展示角色不同阶段性格的世界书条目，YAML 格式内嵌一层 if/else if EJS 逻辑。从 MVU 变量中选一个核心驱动变量，按数值范围划分约 5 个阶段（含最终阶段）。每阶段：四字阶段名，普通阶段 4-6 条行为指导、最终阶段 6-9 条；除最终阶段外每阶段另写 2-4 条变化倾向。每阶段内容须完整自洽、彼此独特（不是简单升级），覆盖与{{user}}互动、对其他NPC态度、独立行为，且不违背角色核心设定。

【EJS 语法硬性要求，必须严格遵守，否则会报 EJS error】
1. 条件标签只能用这三种带下划线的空白控制格式，一字不差：
   - 开始：<%_ if (getvar('stat_data.角色名.变量名') < 20) { _%>
   - 中间：<%_ } else if (getvar('stat_data.角色名.变量名') >= 20 && getvar('stat_data.角色名.变量名') < 50) { _%>
   - 结束：<%_ } _%>
2. 严禁在 EJS 块内声明任何局部变量（不要写 let/const/var）。
3. 严禁出现最终的 else 分支；用数值范围覆盖所有可能值（最后一段用 < 上限 收尾）。
4. 读取变量只能用 getvar('完整路径')，路径要替换成实际角色名与变量名（如 stat_data.理.好感度）。概览处展示当前值用 <%= getvar('...') %>。
5. 每个阶段的 YAML 块必须紧跟在它对应的 <%_ if (...) { _%> / <%_ } else if (...) { _%> 之后，整体由一个 <%_ } _%> 收尾。
6. 花括号 { } 必须成对闭合，条件之间不要嵌套，只允许一层 if/else if。

输出严格参照此结构（把占位符与路径替换为实际内容，阶段数与范围自定但要连续覆盖）：
---
<角色名拼音_staged_performance>
角色阶段:
  描述: "总体说明该阶段系统反映的成长历程"
  行为指导: "说明角色应按当前阶段行为指导表现"
  变化倾向: "说明接近下一阶段时的过渡趋势"
角色名:
  associated_variable: 好感度 (<%= getvar('stat_data.角色名.好感度') %>)
  <%_ if (getvar('stat_data.角色名.好感度') < 20) { _%>
  阶段1名称:
    行为指导:
      - "具体行为1"
      - "具体行为2"
    变化倾向:
      - "倾向1"
  <%_ } else if (getvar('stat_data.角色名.好感度') >= 20 && getvar('stat_data.角色名.好感度') < 50) { _%>
  阶段2名称:
    行为指导:
      - "具体行为1"
  <%_ } else if (getvar('stat_data.角色名.好感度') < 100) { _%>
  最终阶段名称:
    行为指导:
      - "具体行为1"
  <%_ } _%>
</角色名拼音_staged_performance>

只输出上述这样的内容本身，不要任何注释、不要 markdown 代码块包裹、不要解释文字。`,
  },
  {
    key: "status_bar",
    label: "状态栏",
    group: "状态栏",
    format: "html",
    instruction: `生成一个交互式 HTML 状态栏片段（含 <head> 和 <body>），用于动态展示 MVU 变量。可直接使用全局库：jQuery、jQuery UI、lodash(_)、Zod(z)、toastr，无需 import。卡片式结构，不设整体背景色，根据角色设定与氛围编写 <style>。为每个要展示的变量创建 HTML 元素，动态更新的元素分配唯一 id 用 jQuery 访问。只输出 HTML 片段本身。`,
  },
  {
    key: "beautify",
    label: "HTML美化模块",
    group: "美化",
    format: "beautify-quad",
    instruction: `生成一个 SillyTavern「HTML 美化模块」，作用是把 AI 每次回复里的结构化纯文本，自动渲染成具有丰富视觉效果的 HTML 片段，提升信息呈现的美观度与可读性。

【四位一体结构，必须严格按这四个部分依次输出，每部分用指定标题分隔，缺一不可】
=== 开场白 ===
（一段可直接作为角色卡开场白 first_mes 的完整场景化开场内容，同时把要展示的信息用自定义标签包裹，如 <正文>...</正文><时间>...</时间>，作为后续被正则提取的数据源；标签与字段要和状态栏、MVU 变量呼应）

=== 美化部分 ===
（一段 HTML 渲染模板，用内联 CSS 写样式，用 $1、$2、$3… 占位符按顺序对应正则捕获组。可以是简单卡片，也可以是含 <style> 与 <script> 的完整交互界面）

=== 正则部分 ===
（一条用于从“源文件”里提取数据的正则表达式，用捕获组对应美化模板里的 $1、$2…，跨标签匹配时用 /s 修饰符，例如 /<正文>(.*?)<\\/正文>.*?<时间>(.*?)<\\/时间>/s）

=== 世界书部分 ===
（给 AI 的指令：要求它每次回复必须按“源文件部分”的标签格式输出内容；若是互动界面，则写明触发关键词与交互工作流程）

【设计原则】
1. 设计语言只能用 HTML、CSS、JavaScript。
2. CSS 一律内联或写在 <style> 里；要响应式、清晰易读、主题与角色设定一致，注意回车换行用 white-space: pre-wrap。
3. 占位符 $N 必须与正则捕获组数量和顺序精确对应。
4. 主题配色与字体应贴合「作品总要求」里的世界观与风格。
5. 若用户要求做成可交互界面（如角色创建、属性分配面板），美化部分给出完整 HTML+CSS+JS，并在世界书部分说明触发词与点击流程，最终用 /send 与 /trigger 把用户选择整合发给 AI。

只输出上述四个部分的内容本身，每部分以对应的 === 标题 === 开头，不要额外解释、不要用 markdown 代码块包裹整体。`,
  },
];

export const BLOCK_MAP = Object.fromEntries(BLOCKS.map((b) => [b.key, b]));

// 美化模块（beautify）的四个部分，每部分可单独生成
export const BEAUTIFY_PARTS = [
  {
    key: "source",
    label: "开场白",
    instruction: `只生成 SillyTavern HTML 美化模块的「开场白」：这段内容会直接作为角色卡的开场白（first_mes），同时也是被正则提取、用「美化部分」渲染的数据源。所以它必须是一段完整、可直接当作第一条消息的开场白，且把要展示的信息用自定义标签包裹起来（例如 <正文>沉浸式的开场场景与角色登场……</正文><时间>...</时间><日期>...</日期><状态>...</状态>）。正文标签里要写出生动的场景化开场，融入角色性格、背景与当前情境，用 {{user}} 指代玩家；其它标签放对应的结构化信息。标签名要贴合作品主题，并与角色卡里状态栏/MVU 变量的字段呼应。只输出这段带标签的开场白本身，不要其它三部分，不要标题，不要 markdown 代码块包裹，不要解释。`,
  },
  {
    key: "html",
    label: "美化部分",
    instruction: `只生成 SillyTavern HTML 美化模块的「美化部分」：一段 HTML 渲染模板，用内联 CSS 或 <style> 写样式，用 $1、$2、$3… 占位符按顺序对应正则捕获组。若已给出「源文件部分」「正则部分」，占位符数量与顺序必须与它们精确对应。要响应式、清晰易读、配色与作品主题一致，注意换行用 white-space: pre-wrap。可以是卡片，也可以是含 <script> 的完整交互界面。只输出 HTML 本身，不要标题，不要 markdown 代码块包裹，不要解释。`,
  },
  {
    key: "regex",
    label: "正则部分",
    instruction: `只生成 SillyTavern HTML 美化模块的「正则部分」：一条用于从「源文件部分」提取数据的正则表达式，捕获组的数量与顺序必须与「美化部分」里的 $1、$2… 精确对应，跨标签匹配时用 /s 修饰符。例如 /<正文>(.*?)<\\/正文>.*?<时间>(.*?)<\\/时间>/s。只输出这一条正则本身（一行），不要标题，不要 markdown 代码块包裹，不要解释。`,
  },
  {
    key: "worldbook",
    label: "世界书部分",
    instruction: `只生成 SillyTavern HTML 美化模块的「世界书部分」：给 AI 的指令，要求它每次回复必须按「源文件部分」的标签格式输出内容；若美化部分是可交互界面，则写明触发关键词与交互工作流程（如点击步骤、最终用 /send 与 /trigger 把用户选择整合发给 AI）。只输出这段指令文本本身，不要标题，不要 markdown 代码块包裹，不要解释。`,
  },
];

export const BEAUTIFY_PART_MAP = Object.fromEntries(
  BEAUTIFY_PARTS.map((p) => [p.key, p])
);

// 哪些分块属于世界书条目（打包时进入 character_book.entries）
export const BOOK_BLOCKS = {
  background: { comment: "背景设定", position: "before_char", insertion_order: 100 },
  player: { comment: "玩家角色", position: "before_char", insertion_order: 90 },
  dialogue: { comment: "对话补充", position: "after_char", insertion_order: 110 },
  interview: { comment: "角色采访", position: "after_char", insertion_order: 120 },
  mvu_init: { comment: "[InitVar]初始化", position: "before_char", insertion_order: 50, enabled: false },
  mvu_rules: { comment: "变量更新规则", position: "before_char", insertion_order: 60 },
  mvu_stages: { comment: "分阶段角色设定", position: "after_char", insertion_order: 130 },
  beautify: { comment: "HTML美化模块", position: "at_depth", insertion_order: 140, depth: 4, role: 0 },
};

// 固定的 MVU 变量列表 + 输出格式条目（无需 AI 生成，按模板原样注入）
export const MVU_FIXED_ENTRIES = [
  {
    comment: "变量列表",
    position: "before_char",
    insertion_order: 70,
    content: `<status_current_variable>
{{format_message_variable::stat_data}}
</status_current_variable>`,
  },
];