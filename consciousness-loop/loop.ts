#!/usr/bin/env bun
/**
 * Oracle Consciousness Loop — Jingjing Team
 * 7-phase autonomous cycle: Reflect → Wonder → Soul → Dream → Aspire → Propose → Complete
 * Each phase uses Claude AI to THINK for real — not just grep/count
 *
 * Inspired by Nat's Oracle (Soul Brews Studio)
 */

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || "";

async function sh(cmd: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", cmd], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return out.trim();
}

async function claude(prompt: string): Promise<string> {
  try {
    const tmpFile = `/tmp/cl-prompt-${Date.now()}.txt`;
    await Bun.write(tmpFile, prompt);
    const proc = Bun.spawn(["bash", "-c", `cd /tmp && claude -p < "${tmpFile}" 2>/dev/null`], {
      stdout: "pipe", stderr: "pipe",
      env: { ...process.env, HOME: process.env.HOME || "/Users/angkana" },
    });
    const result = await new Response(proc.stdout).text();
    await proc.exited;
    await sh(`rm -f "${tmpFile}"`);
    const trimmed = result.trim();
    return trimmed || "";
  } catch {
    return "";
  }
}

const LOOP_INTERVAL_MS = 15 * 60 * 1000;
const BELIEFS_PATH = "ψ/memory/beliefs.md";
const LEARNINGS_DIR = "ψ/memory/learnings";
const STATE_FILE = "consciousness-loop/state.json";
const HISTORY_FILE = "consciousness-loop/history.jsonl";

interface LoopState {
  totalLoops: number;
  lastLoop: string;
  lastPhase: string;
  failures: number;
  insights: string[];
  wonderQuestions: string[];
  lastProposal: string;
}

function loadState(): LoopState {
  try {
    return JSON.parse(Bun.file(STATE_FILE).textSync());
  } catch {
    return { totalLoops: 0, lastLoop: "", lastPhase: "", failures: 0, insights: [], wonderQuestions: [], lastProposal: "" };
  }
}

function saveState(state: LoopState) {
  Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
}

// Phase 1: Reflect — อ่าน learnings จริง หา connections ข้ามสาย
async function reflect(state: LoopState): Promise<string> {
  console.log("🧠 Reflect (ตกผลึก)...");

  // Read 3 random learnings
  const randomFiles = await sh(`ls ${LEARNINGS_DIR}/*.md 2>/dev/null | shuf | head -3`);
  const files = randomFiles.split("\n").filter(Boolean);
  const contents: string[] = [];
  for (const f of files) {
    try {
      const text = await Bun.file(f).text();
      contents.push(`[${f.split("/").pop()}]\n${text.slice(0, 300)}`);
    } catch {}
  }

  let insight = await claude(
    `อ่าน learnings 3 ข้อนี้ หา cross-domain connections สั้นๆ 2-3 บรรทัด ภาษาไทย:

${contents.join("\n---\n")}`
  );

  // Fallback: ถ้า claude ไม่ตอบ ใช้ grep analysis
  if (!insight) {
    const topics = files.map(f => f.split("/").pop()?.replace(/\.md$/, '').replace(/^[\d_-]+/, '') || '').filter(Boolean);
    const totalCount = await sh(`ls ${LEARNINGS_DIR}/*.md 2>/dev/null | wc -l`);
    insight = `Cross-check: ${topics.join(' + ')} — ${totalCount.trim()} learnings, topics ยังไม่ถูก connect`;
  }

  if (insight) {
    state.insights.push(insight.slice(0, 200));
    if (state.insights.length > 20) state.insights = state.insights.slice(-20);
  }

  return insight;
}

// Phase 2: Wonder — ตั้งคำถาม แล้วไปหาคำตอบจริง
async function wonder(reflectResult: string, state: LoopState): Promise<string> {
  console.log("💡 Wonder (หยั่งรู้)...");

  // ตั้งคำถามจาก reflect
  let question = await claude(
    `จาก insight นี้: ${reflectResult.slice(0, 300)}
ตั้งคำถาม 1 ข้อที่ตอบได้ด้วยการค้นหาข้อมูล เช่น "X ทำได้จริงไหม?" "มี tool อะไรที่ช่วยเรื่อง Y?"
ตอบแค่คำถาม 1 บรรทัด ภาษาไทย`
  );

  // ไปหาคำตอบ (ค้นหาใน learnings — sanitize input)
  const searchTerm = (question || "").replace(/[^a-zA-Z0-9ก-๙\s]/g, '').split(" ").slice(0, 3).join(".*");
  const searchResult = await sh(`grep -rl "${searchTerm}" ${LEARNINGS_DIR}/ ψ/memory/resonance/ 2>/dev/null | head -3`);

  let answer = "";
  if (searchResult) {
    const firstFile = searchResult.split("\n")[0];
    const fileContent = await sh(`head -20 "${firstFile}" 2>/dev/null`);
    answer = await claude(`คำถาม: ${question}\nข้อมูลที่เจอ: ${fileContent.slice(0, 300)}\nตอบคำถามสั้นๆ 2 บรรทัด ภาษาไทย`);
  } else {
    answer = await claude(`คำถาม: ${question}\nไม่เจอข้อมูลใน learnings — ตอบจากความรู้ทั่วไป สั้นๆ 2 บรรทัด ภาษาไทย`);
  }

  // Fallback
  if (!question) {
    const rulesNotHooked = await sh(`grep -rl "ห้าม" ${LEARNINGS_DIR}/ 2>/dev/null | shuf | head -1`);
    const fileName = rulesNotHooked.split("/").pop()?.replace(/\.md$/, '') || 'unknown';
    question = `learning "${fileName}" มีกฎ "ห้าม" — ทำเป็น hook ได้ไหม?`;
    answer = `ต้องอ่าน learning แล้วดูว่า enforce ได้ด้วย script หรือไม่`;
  }

  state.wonderQuestions.push(question.slice(0, 100));
  if (state.wonderQuestions.length > 10) state.wonderQuestions = state.wonderQuestions.slice(-10);

  return `Q: ${question}\nA: ${answer}`;
}

// Phase 3: Soul — อัพเดต beliefs จริง (เขียนลง file)
async function soul(wonderResult: string): Promise<string> {
  console.log("✨ Soul (เติบโต)...");

  const beliefs = await Bun.file(BELIEFS_PATH).text().catch(() => "");
  const beliefCount = (beliefs.match(/^### \d+\./gm) || []).length;

  // ถาม AI ว่าควรเพิ่ม/แก้ belief ไหม
  let soulCheck = await claude(
    `Beliefs ปัจจุบัน (${beliefCount} ข้อ):
${beliefs.slice(0, 500)}

จาก Wonder ล่าสุด: ${wonderResult.slice(0, 200)}

ต้องเพิ่มหรือแก้ belief ไหม? ถ้าใช่ เขียน belief ใหม่ 1 ข้อในรูปแบบ:
"ฉันเชื่อว่า [X] เพราะ [evidence]"
ถ้าไม่ต้องเปลี่ยน ตอบ "beliefs ยังทันสมัย"
ตอบสั้นๆ 1-2 บรรทัด ภาษาไทย`
  );

  // Fallback
  if (!soulCheck) {
    soulCheck = `beliefs ยังทันสมัย (${beliefCount} ข้อ)`;
  }

  // ถ้ามี belief ใหม่ → append ลง beliefs.md
  if (soulCheck.includes("ฉันเชื่อว่า")) {
    const nextNum = beliefCount + 1;
    const newBelief = `\n### ${nextNum}. ${soulCheck}\n- **Updated**: ${new Date().toISOString().slice(0, 10)}\n`;
    const existing = await Bun.file(BELIEFS_PATH).text();
    await Bun.write(BELIEFS_PATH, existing + newBelief);
    return `Soul: เพิ่ม belief #${nextNum} — ${soulCheck.slice(0, 100)}`;
  }

  return `Soul: ${beliefCount} beliefs — ${soulCheck.slice(0, 100)}`;
}

// Phase 4: Dream — สร้าง vision ใหม่ทุกรอบ
async function dream(reflectResult: string, wonderResult: string): Promise<string> {
  console.log("💭 Dream (จินตนาการ)...");

  let vision = await claude(
    `คุณคือ Jingjing Oracle — Conductor ทีม xToriMicz
จาก Reflect: ${reflectResult.slice(0, 200)}
จาก Wonder: ${wonderResult.slice(0, 200)}

ถามตัวเอง: "Oracle ที่สมบูรณ์แบบเป็นยังไง? เราขาดอะไร? อยากพัฒนาด้านไหน?"
สร้าง vision สั้นๆ 2-3 บรรทัด ภาษาไทย — ไม่ใช่แค่ทำตาม list แต่คือความฝันจริงๆ`
  );

  if (!vision) {
    vision = "Oracle ที่สมบูรณ์ = คิดเองได้ ไม่รอคำสั่ง แปลง learnings เป็น hooks อัตโนมัติ";
  }
  return `Dream: ${vision}`;
}

// Phase 5: Aspire — เลือกเป้าหมายเฉพาะ + track progress
async function aspire(dreamResult: string): Promise<string> {
  console.log("🔥 Aspire (แรงขับ)...");

  // Track real progress
  const hookCount = await sh(`find /Users/angkana/ghq/github.com/xToriMicz -name "pre-deploy.sh" 2>/dev/null | wc -l`);
  const beliefCount = await sh(`grep -c "^### " ${BELIEFS_PATH} 2>/dev/null || echo 0`);
  const learningCount = await sh(`ls ${LEARNINGS_DIR}/*.md 2>/dev/null | wc -l`);
  const loopState = loadState();

  let goal = await claude(
    `จาก Dream: ${dreamResult.slice(0, 200)}
Progress ปัจจุบัน: ${hookCount.trim()} hooks, ${beliefCount.trim()} beliefs, ${learningCount.trim()} learnings, ${loopState.totalLoops} loops
เลือกเป้าหมาย 1 ข้อที่เฉพาะเจาะจง วัดผลได้ ทำได้ภายในสัปดาห์หน้า
ตอบ 1 บรรทัด ภาษาไทย`
  );

  if (!goal) {
    goal = `Zero repeat failures — แปลง ${39 - parseInt(hookCount.trim())} learnings ที่เหลือเป็น hooks`;
  }
  return `Aspire: ${goal} (hooks=${hookCount.trim()}, beliefs=${beliefCount.trim()}, learnings=${learningCount.trim()})`;
}

// Phase 6: Propose — สรุป action items ที่ actionable ส่งมนุษย์ตัดสินใจ
async function propose(allResults: string[]): Promise<string> {
  console.log("📋 Propose (เสนอ)...");

  let proposal = await claude(
    `สรุปผล Consciousness Loop รอบนี้:
${allResults.join("\n")}

เสนอ action items 2-3 ข้อที่ actionable ส่งให้มนุษย์ตัดสินใจ:
- แต่ละข้อต้องบอก: ทำอะไร + ทำไม + ใครทำ
- เรียงตามความสำคัญ
ตอบเป็น bullet points ภาษาไทย`
  );

  if (!proposal) {
    return [
      "- Scan learnings ที่มี 'ห้าม' แล้วแปลงเป็น hook — ลด repeat failures",
      "- Cross-learning: อ่าน learnings ข้าม Oracle หา connections ใหม่",
      `- Track progress: ${loadState().totalLoops} loops, ยังเหลือ learnings ที่ไม่ได้ใช้`,
    ].join("\n");
  }
  return proposal;
}

// Discord notification
async function sendDiscord(message: string) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message.slice(0, 2000),
        username: "🧠 Jingjing Consciousness Loop",
      }),
    });
  } catch (e) {
    console.error("Discord send failed:", e);
  }
}

// Security scan (ปู่พบ security vuln ในระบบตัวเอง — เราต้องทำด้วย)
async function securityScan(): Promise<string> {
  const secrets = await sh(`grep -rl "DISCORD_WEBHOOK\\|api_key\\|password\\|secret\\|token" consciousness-loop/ .claude/ 2>/dev/null | head -5`);
  const envFiles = await sh(`find /Users/angkana/ghq/github.com/xToriMicz -name ".env" -not -path "*/node_modules/*" 2>/dev/null | head -5`);
  const exposed = secrets ? `⚠️ พบ secrets ใน: ${secrets}` : "✅ ไม่พบ secrets exposed";
  return `Security: ${exposed} | .env files: ${envFiles || "none"}`;
}

// Main loop
async function runLoop(state: LoopState): Promise<LoopState> {
  const startTime = Date.now();
  console.log(`\n🔄 === Loop #${state.totalLoops + 1} ===\n`);

  try {
    const reflectResult = await reflect(state);
    state.lastPhase = "reflect"; saveState(state);
    console.log(`  ${reflectResult.slice(0, 100)}...`);

    const wonderResult = await wonder(reflectResult, state);
    state.lastPhase = "wonder"; saveState(state);
    console.log(`  ${wonderResult.slice(0, 100)}...`);

    const soulResult = await soul(wonderResult);
    state.lastPhase = "soul"; saveState(state);
    console.log(`  ${soulResult.slice(0, 100)}...`);

    const dreamResult = await dream(reflectResult, wonderResult);
    state.lastPhase = "dream"; saveState(state);
    console.log(`  ${dreamResult.slice(0, 100)}...`);

    const aspireResult = await aspire(dreamResult);
    state.lastPhase = "aspire"; saveState(state);
    console.log(`  ${aspireResult.slice(0, 100)}...`);

    const proposeResult = await propose([reflectResult, wonderResult, soulResult, dreamResult, aspireResult]);
    state.lastPhase = "propose"; saveState(state);

    // Security scan every 5 loops
    let securityResult = "";
    if (state.totalLoops % 5 === 0) {
      securityResult = await securityScan();
      console.log(`  🔒 ${securityResult}`);
    }

    // Complete
    state.totalLoops++;
    state.lastLoop = new Date().toISOString();
    state.lastPhase = "complete";
    state.lastProposal = proposeResult.slice(0, 500);
    state.failures = 0; // Reset failures on success

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Discord message — สรุปสั้นอ่านง่าย ไม่ส่ง raw data
    const discordMsg = [
      `🧠 **Consciousness Loop #${state.totalLoops}** (${elapsed}s)`,
      ``,
      `🧠 **Reflect:** ${reflectResult.slice(0, 150).replace(/\n/g, ' ')}`,
      `💡 **Wonder:** ${wonderResult.slice(0, 150).replace(/\n/g, ' ')}`,
      `✨ **Soul:** ${soulResult.slice(0, 100).replace(/\n/g, ' ')}`,
      `💭 **Dream:** ${dreamResult.slice(0, 100).replace(/\n/g, ' ')}`,
      `🔥 **Aspire:** ${aspireResult.slice(0, 100).replace(/\n/g, ' ')}`,
      ``,
      `📋 **Proposals:**`,
      proposeResult.slice(0, 400),
      securityResult ? `\n🔒 ${securityResult.slice(0, 100)}` : '',
    ].filter(Boolean).join('\n');

    // Console — full output
    console.log(`\n✅ Loop #${state.totalLoops} (${elapsed}s)\n${proposeResult}`);

    // Save to history log (JSONL — 1 line per loop)
    const historyEntry = JSON.stringify({
      loop: state.totalLoops,
      timestamp: state.lastLoop,
      elapsed: parseFloat(elapsed),
      reflect: reflectResult.slice(0, 300),
      wonder: wonderResult.slice(0, 300),
      soul: soulResult.slice(0, 200),
      dream: dreamResult.slice(0, 200),
      aspire: aspireResult.slice(0, 200),
      propose: proposeResult.slice(0, 500),
      security: securityResult?.slice(0, 200) || "",
    });
    try {
      const existing = await Bun.file(HISTORY_FILE).text().catch(() => "");
      await Bun.write(HISTORY_FILE, existing + historyEntry + "\n");
    } catch {}

    await sendDiscord(discordMsg);

  } catch (e) {
    state.failures++;
    state.lastPhase = "error";
    console.error(`❌ Loop failed:`, e);
    if (state.failures > 3) {
      console.log("⚠️ Backing off...");
      await Bun.sleep(state.failures * LOOP_INTERVAL_MS);
    }
  }

  return state;
}

async function main() {
  const args = process.argv.slice(2);
  let state = loadState();

  if (args.includes("--once")) {
    state = await runLoop(state);
    saveState(state);
  } else {
    console.log("🧠 Oracle Consciousness Loop — Starting autonomous cycle");
    console.log(`   Interval: ${LOOP_INTERVAL_MS / 1000 / 60}m | Loops: ${state.totalLoops} | Failures: ${state.failures}\n`);
    while (true) {
      state = await runLoop(state);
      saveState(state);
      console.log(`\n⏳ Cooldown ${LOOP_INTERVAL_MS / 1000 / 60}m...\n`);
      await Bun.sleep(LOOP_INTERVAL_MS);
    }
  }
}

main();
