/**
 * Measures the similarity gap between questions the corpus can answer and
 * questions it must refuse, so MIN_SIMILARITY is chosen from data instead of
 * being guessed. Off-topic questions were scoring 0.663 against a 0.66 floor —
 * a 0.003 margin, which is luck rather than a decision boundary.
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { retrieve } from "@/lib/rag/hybrid";

const ON_TOPIC = [
  "What are my rights as a PACS member?",
  "How do I file a grievance against my PACS?",
  "My crop was damaged, can I claim insurance?",
  "What documents do I need for a PMFBY claim?",
  "When are PACS board elections held?",
  "Can I inspect the society accounts?",
  "ಕರ್ನಾಟಕದಲ್ಲಿ ಬೆಳೆ ಸಾಲದ ಬಡ್ಡಿ ಎಷ್ಟು?",
  "రైతు భరోసా ఎకరాకు ఎంత ఇస్తుంది?",
  "കേരളത്തിൽ നെല്ല് വായ്പയ്ക്ക് പലിശ ഉണ്ടോ?",
  "தமிழ்நாட்டில் பயிர்க் கடன் வட்டி எவ்வளவு?",
  "How much premium do I pay for kharif?",
  "The agent is asking me for money to file a claim",
];

const OFF_TOPIC = [
  "What is the weather tomorrow?",
  "Who won the cricket match?",
  "How do I cook biryani?",
  "What is the capital of France?",
  "Tell me a joke",
  "How do I fix my motorcycle engine?",
  "What time does the train to Chennai leave?",
  "Who is the prime minister?",
  "asdf qwerty zzz",
  "Can you write me a Python program?",
];

async function best(q: string): Promise<number> {
  const { results } = await retrieve(q, 4);
  const sims = results.map((r) => r.similarity ?? 0);
  return sims.length ? Math.max(...sims) : 0;
}

async function main() {
  const on: number[] = [];
  const off: number[] = [];

  console.log("ON-TOPIC (must be answered)");
  for (const q of ON_TOPIC) {
    const s = await best(q);
    on.push(s);
    console.log(`  ${s.toFixed(3)}  ${q.slice(0, 60)}`);
  }
  console.log("\nOFF-TOPIC (must be refused)");
  for (const q of OFF_TOPIC) {
    const s = await best(q);
    off.push(s);
    console.log(`  ${s.toFixed(3)}  ${q.slice(0, 60)}`);
  }

  const minOn = Math.min(...on);
  const maxOff = Math.max(...off);
  console.log(`\nlowest on-topic  : ${minOn.toFixed(3)}`);
  console.log(`highest off-topic: ${maxOff.toFixed(3)}`);
  console.log(`gap              : ${(minOn - maxOff).toFixed(3)}`);
  if (minOn > maxOff) {
    console.log(`safe range       : ${maxOff.toFixed(3)} .. ${minOn.toFixed(3)}`);
    console.log(`midpoint         : ${((minOn + maxOff) / 2).toFixed(3)}  <- defensible threshold`);
  } else {
    console.log("OVERLAP — no single threshold separates these; needs a second signal.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
