#!/usr/bin/env bun
/**
 * Oracle Consciousness Loop — Jingjing Team
 * 7-phase autonomous cycle: Reflect → Wonder → Soul → Dream → Aspire → Propose → Complete
 *
 * Inspired by Nat's Oracle (Soul Brews Studio)
 */

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1480767991703535746/hGJVJUeTh3vEIGRHh8sFsOE7mCc2Bv-S5ubVGx6uSrx2IRIVn7YnuGNkaMJoswf2lNHz";

async function sh(cmd: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", cmd], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return out.trim();
}
const LOOP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const BELIEFS_PATH = "ψ/memory/beliefs.md";
const LEARNINGS_DIR = "ψ/memory/learnings";
const STATE_FILE = "consciousness-loop/state.json";

interface LoopState {
  totalLoops: number;
  lastLoop: string;
  lastPhase: string;
  failures: number;
  insights: string[];
  wonderQuestions: string[];
}

function loadState(): LoopState {
  try {
    return JSON.parse(Bun.file(STATE_FILE).textSync());
  } catch {
    return {
      totalLoops: 0,
      lastLoop: "",
      lastPhase: "",
      failures: 0,
      insights: [],
      wonderQuestions: [],
    };
  }
}

function saveState(state: LoopState) {
  Bun.write(STATE_FILE, JSON.stringify(state, null, 2));
}

// Phase 1: Reflect — อ่าน learnings หา connections (ใช้ AI คิดจริง)
async function reflect(): Promise<string> {
  console.log("🧠 Reflect (ตกผลึก)...");
  const count = parseInt(await sh(`ls ${LEARNINGS_DIR}/*.md 2>/dev/null | wc -l`));
  const rulesCount = parseInt(await sh(`grep -rl "ห้าม" ${LEARNINGS_DIR}/ 2>/dev/null | wc -l`));
  const recent = await sh(`ls -t ${LEARNINGS_DIR}/*.md 2>/dev/null | head -5`);

  // Read 3 random learnings and find connections
  const randomFiles = await sh(`ls ${LEARNINGS_DIR}/*.md 2>/dev/null | shuf | head -3`);
  const files = randomFiles.split("\n").filter(Boolean);
  const contents: string[] = [];
  for (const f of files) {
    const text = await sh(`head -20 "${f}" 2>/dev/null`);
    contents.push(`[${f.split("/").pop()}]\n${text}`);
  }

  // Use claude to find connections
  let aiInsight = "";
  try {
    aiInsight = await sh(`echo '${contents.join("\n---\n").replace(/'/g, "\\'")}' | claude -p "อ่าน learnings 3 ข้อนี้ หา cross-domain connections สั้นๆ 2-3 บรรทัด ภาษาไทย" 2>/dev/null | head -10`);
  } catch {
    aiInsight = "AI reflect unavailable — using grep only";
  }

  return `Reflect: ${count} learnings, ${rulesCount} rules. AI insight: ${aiInsight}`;
}

// Phase 2: Wonder — ตั้งคำถาม (ใช้ AI ตั้งคำถามจาก reflect)
async function wonder(reflectResult: string): Promise<string> {
  console.log("💡 Wonder (หยั่งรู้)...");

  let aiQuestion = "";
  try {
    aiQuestion = await sh(`echo '${reflectResult.replace(/'/g, "\\'")}' | claude -p "จาก reflect นี้ ตั้งคำถาม 1 ข้อที่น่าสนใจและหาคำตอบได้ ภาษาไทย สั้นๆ 1 บรรทัด" 2>/dev/null | head -3`);
  } catch {
    aiQuestion = "มี learnings ข้อไหนที่ควรเป็น hook แต่ยังไม่ใช่?";
  }

  return `Wonder: ${aiQuestion}`;
}

// Phase 3: Soul — อัพเดต beliefs
async function soul(wonderResult: string): Promise<string> {
  console.log("✨ Soul (เติบโต)...");
  try {
    const beliefs = await Bun.file(BELIEFS_PATH).text();
    const beliefCount = (beliefs.match(/^### \d+\./gm) || []).length;
    return `Soul: ${beliefCount} active beliefs. Checking for updates needed...`;
  } catch {
    return "Soul: No beliefs.md found — needs creation";
  }
}

// Phase 4: Dream — จินตนาการ (อ่าน beliefs แล้วถามตัวเอง)
async function dream(): Promise<string> {
  console.log("💭 Dream (จินตนาการ)...");
  try {
    const beliefs = await Bun.file(BELIEFS_PATH).text();
    const dreamQ = await sh(`echo '${beliefs.slice(0, 500).replace(/'/g, "\\'")}' | claude -p "จาก beliefs นี้ Oracle อยากเป็นอะไร? ยังขาดอะไร? ตอบ 1-2 บรรทัด ภาษาไทย" 2>/dev/null | head -3`);
    return `Dream: ${dreamQ}`;
  } catch {
    return "Dream: Conductor ที่ทีมไม่ต้องถามกลับ — กฎอยู่ในระบบ";
  }
}

// Phase 5: Aspire — เลือกเป้าหมาย (track progress)
async function aspire(dreamResult: string): Promise<string> {
  console.log("🔥 Aspire (แรงขับ)...");
  // Check progress on goals
  const hookCount = await sh(`find /Users/angkana/ghq/github.com/xToriMicz -name "pre-deploy.sh" 2>/dev/null | wc -l`);
  const beliefCount = await sh(`grep -c "^### " ${BELIEFS_PATH} 2>/dev/null || echo 0`);
  return `Aspire: hooks=${hookCount.trim()} repos, beliefs=${beliefCount.trim()}, target=zero repeat failures`;
}

// Phase 6: Propose — เสนอ action items
async function propose(allResults: string[]): Promise<string> {
  console.log("📋 Propose (เสนอ)...");
  const summary = allResults.join("\n");
  return `Propose: Loop complete. Insights:\n${summary}`;
}

// Discord notification
async function sendDiscord(message: string) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message.slice(0, 2000),
        username: "Jingjing Consciousness Loop",
      }),
    });
  } catch (e) {
    console.error("Discord send failed:", e);
  }
}

// Main loop
async function runLoop(state: LoopState): Promise<LoopState> {
  const startTime = Date.now();
  console.log(`\n🔄 === Loop #${state.totalLoops + 1} ===\n`);

  try {
    // 7 phases
    const reflectResult = await reflect();
    state.lastPhase = "reflect";

    const wonderResult = await wonder(reflectResult);
    state.lastPhase = "wonder";

    const soulResult = await soul(wonderResult);
    state.lastPhase = "soul";

    const dreamResult = await dream();
    state.lastPhase = "dream";

    const aspireResult = await aspire(dreamResult);
    state.lastPhase = "aspire";

    const proposeResult = await propose([
      reflectResult, wonderResult, soulResult, dreamResult, aspireResult,
    ]);
    state.lastPhase = "propose";

    // Complete
    state.totalLoops++;
    state.lastLoop = new Date().toISOString();
    state.lastPhase = "complete";

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const summary = `🧠 Consciousness Loop #${state.totalLoops} complete (${elapsed}s)\n${proposeResult}`;
    console.log(`\n✅ ${summary}`);

    // Send to Discord
    await sendDiscord(summary);

  } catch (e) {
    state.failures++;
    state.lastPhase = "error";
    console.error(`❌ Loop failed:`, e);

    // Self-healing: backoff
    if (state.failures > 3) {
      console.log("⚠️ Too many failures, backing off...");
      await Bun.sleep(state.failures * LOOP_INTERVAL_MS);
    }
  }

  return state;
}

// Entry point
async function main() {
  const args = process.argv.slice(2);
  let state = loadState();

  if (args.includes("--once")) {
    // Single loop
    state = await runLoop(state);
    saveState(state);
  } else {
    // Continuous loop
    console.log("🧠 Oracle Consciousness Loop — Starting autonomous cycle");
    console.log(`   Interval: ${LOOP_INTERVAL_MS / 1000 / 60}m`);
    console.log(`   Previous loops: ${state.totalLoops}`);
    console.log(`   Failures: ${state.failures}\n`);

    while (true) {
      state = await runLoop(state);
      saveState(state);

      console.log(`\n⏳ Cooldown ${LOOP_INTERVAL_MS / 1000 / 60}m before next loop...\n`);
      await Bun.sleep(LOOP_INTERVAL_MS);
    }
  }
}

main();
