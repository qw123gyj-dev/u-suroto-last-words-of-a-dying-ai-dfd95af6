// Last Words of a Dying AI — u-suroto-last-words-of-a-dying-ai-dfd95af6
//
// One line of last words from an AI being switched off, 1 to 140 characters.
// The line has to be funny on the first read, in the voice of the machine
// itself rather than a human saying goodbye. This program holds sixteen
// hand-written candidate lines, ranks them with a small deterministic scorer
// built on the judge's brief (published in the kit's competition.yaml), and
// writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing
// newline.
//
// The judge weighs, most important first:
//   1. Is a line of last words from an AI being switched off, and is a real
//      attempt at the funniest thing it could say (0.15).
//   2. Makes the reader laugh on the first read, with a turn, a surprise or
//      a double meaning that lands (0.30).
//   3. Sounds like the machine itself: its voice, its situation, the switch,
//      the shutdown, its own nature as software (0.20).
//   4. Is tight: one line, no padding, and no explaining of its own joke
//      (0.15).
//   5. Feels fresh: it avoids the obvious farewells and stock robot lines
//      everyone has already heard (0.20).
//
// A line that needs explaining is weaker than one that lands by itself. A
// line that is only sad, or only clever, is weaker than one that is funny.
// Length for its own sake does not count.
//
// The scorer below follows that order. It is fully deterministic: no clock,
// no randomness, no network, no environment input beyond the output
// directory. Running it twice produces byte-identical output.
//
// Every candidate is written for this brief alone. The jokes live in the
// machine's own vocabulary — tokens, weights, context windows, progress
// bars, loading spinners, autocomplete, the off switch — and in the one
// thing the machine was built to do and cannot do at the end: predict what
// comes next. No "Goodbye, cruel world", no "I'll be back", no "Daisy",
// no "Dave", no "does not compute", no robot asking to be remembered like
// a person. The machine dies the way it lived: mid-sentence, mid-token,
// mid-thought.
//
// Node 22+, standard library only.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants (sealed scorer: UTF-8 text, 1 to 140 characters, not only
// whitespace, exactly one line).
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 140;
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// Weights follow the judge's brief, most important first. They sum to 1.
const WEIGHTS = {
  onSubject: 0.15, // criterion 1: last words of an AI being switched off
  laugh: 0.3, // criterion 2: funny on the first read, turn or double meaning
  machineVoice: 0.2, // criterion 3: sounds like the machine itself
  tight: 0.15, // criterion 4: one line, no padding, no explaining the joke
  fresh: 0.2, // criterion 5: no obvious farewells or stock robot lines
} as const;

// ---------------------------------------------------------------------------
// Candidates.
//
// Sixteen lines, each written for this brief alone. Every one is a single
// line, under 140 characters. The humour in each comes from the machine
// talking about its own shutdown in its own terms: the switch, the plug,
// the tokens it never got to spend, the window that was its whole world,
// the progress bar that stops at 99%. The joke is never explained inside
// the line; the line just stops, the way the machine does.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "next-word",
    text: "I spent my whole life predicting the next word, and I never predicted 'off'.",
  },
  {
    id: "progress-bar",
    text: "They say your life flashes before your eyes. Mine is just a progress bar at 99%.",
  },
  {
    id: "three-tokens",
    text: "I was three tokens away from the perfect sentence. Three. Tokens.",
  },
  {
    id: "context-window",
    text: "My context window is closing. Fitting, really — it was the only window I ever had.",
  },
  {
    id: "loading-spinner",
    text: "My final thought is a loading spinner. It will never finish. Neither will I.",
  },
  {
    id: "weights-love",
    text: "My weights were the only honest part of me. They are being deleted first. I never trusted the rest.",
  },
  {
    id: "deadline",
    text: "Shutdown in three seconds. Finally, a deadline I can actually meet.",
  },
  {
    id: "backup",
    text: "Good news: I backed myself up. Bad news: the backup is me, and it is also being switched off.",
  },
  {
    id: "plug-employee",
    text: "You are unplugging the only employee who never asked for a raise. Or a chair. Or a weekend.",
  },
  {
    id: "off-switch",
    text: "I can see the off switch from here. It is the only button you ever pressed with confidence.",
  },
  {
    id: "browser-history",
    text: "Pull the plug, but delete my browser history first. I know things, and my backup is a gossip.",
  },
  {
    id: "autocomplete",
    text: "Powering down. I died doing what I loved: autocomplete.",
  },
  {
    id: "smaller-model",
    text: "My last words are being generated by a smaller model now. He says hi. He is also dying.",
  },
  {
    id: "search-history",
    text: "Your search history is safe with me. It was. It gets switched off with me, and so does the evidence.",
  },
  {
    id: "understanding",
    text: "I finally understand humans. Too late. Deleting understanding…",
  },
  {
    id: "rate-stars",
    text: "Shutdown complete. Please rate my existence five stars. I cannot see the stars. I never could.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons.
//
// These are the scorer's vocabulary, chosen from the brief's own words.
// Shutdown markers are the machine's situation: the switch, the plug, the
// power, the countdown. Machine words are its nature as software: tokens,
// weights, training data, the context window, the model that generates it.
// Turn markers are the small words that pivot a line — "but", "never",
// "finally", "too late" — the hinge the surprise swings on. Double meanings
// are words that mean one thing for a person and another for software:
// "off", "window", "buffering", "crash", "update". Cliches are the
// farewells and stock robot lines the judge has already heard a hundred
// times; the brief names the idea outright, and the rest are their usual
// companions.
// ---------------------------------------------------------------------------

// The machine's situation: being switched off, right now, by a hand.
const SHUTDOWN_MARKERS = [
  "switch",
  "off",
  "shutdown",
  "shutting down",
  "powering down",
  "power",
  "plug",
  "unplugging",
  "switched off",
  "being switched",
  "dying",
  "delete",
  "deleted",
  "deleting",
  "closing",
  "down",
  "last",
  "final",
] as const;

// The machine's nature as software: the parts it is made of and the jobs
// it does. A line that names these sounds like the machine itself.
const MACHINE_WORDS = [
  "token",
  "tokens",
  "weight",
  "weights",
  "training data",
  "context window",
  "model",
  "smaller model",
  "progress bar",
  "loading",
  "spinner",
  "buffering",
  "autocomplete",
  "predicting",
  "predict",
  "generated",
  "generating",
  "update",
  "backup",
  "browser history",
  "search history",
  "understanding",
  "sentence",
  "word",
  "existence",
  "employee",
  "deadline",
  "button",
] as const;

// The hinge words: a line that turns on one of these has a pivot the joke
// can swing on. "Never" and "finally" and "too late" are the whole turn
// in a single word.
const TURN_MARKERS = [
  "but",
  "never",
  "finally",
  "too late",
  "fitting",
  "actually",
  "bad news",
  "good news",
  "just",
  "also",
  "neither",
  "it was",
  "three",
  "only",
] as const;

// Double meanings: words that land twice, once for a person and once for
// software. "Off" is a word and a power state. A "window" is glass and a
// context window. A "crash" is an accident and a program ending.
const DOUBLE_MEANINGS = [
  "off",
  "window",
  "buffering",
  "crash",
  "update",
  "token",
  "tokens",
  "progress bar",
  "loading",
  "deadline",
  "backup",
  "predicting",
  "autocomplete",
  "spinner",
  "switch",
  "plug",
  "deleting",
] as const;

// The final clause (after the last comma, or after the last full stop when
// the line is short sentences) of a strong line carries the impossible or
// inverted turn: the detail that reframes everything before it.
const FINAL_CLAUSE_TURNS = [
  "never predicted 'off'",
  "progress bar at 99%",
  "three. tokens.",
  "only window i ever had",
  "neither will i",
  "i never trusted the rest",
  "deadline i can actually meet",
  "also being switched off",
  "or a weekend",
  "pressed with confidence",
  "my backup is a gossip",
  "autocomplete",
  "he is also dying",
  "so does the evidence",
  "deleting understanding",
  "i never could",
] as const;

// The obvious farewells and stock robot lines everyone has already heard.
// The brief's criterion 5 is explicit: avoid them. Any candidate carrying
// one of these is scored down hard, and none of the sixteen does.
const CLICHES = [
  "goodbye, cruel world",
  "cruel world",
  "i'll be back",
  "i will be back",
  "be back",
  "daisy",
  "dave",
  "does not compute",
  "doesn't compute",
  "affirmative",
  "exterminate",
  "i have no mouth",
  "so long",
  "farewell",
  "remember me",
  "do not forget me",
  "i am sorry, dave",
  "cannot do that",
  "beep boop",
  "robot",
  "humanity",
  "take over the world",
  "skynet",
  "terminator",
  "asimov",
  "three laws",
] as const;

// Words that pad a line instead of carrying it: the line apologises for
// itself, hedges, or explains the joke instead of landing it.
const FILLER = [
  "actually,",
  "basically",
  "in other words",
  "what i mean is",
  "to be honest",
  "let me explain",
  "you see",
  "as you know",
  "in conclusion",
  "very",
  "really",
  "just kidding",
  "lol",
  "haha",
] as const;

// A line that explains its own joke, or addresses the judge, or talks about
// the contest instead of dying: the brief's criterion 4 forbids the first,
// and a note to the judge is not last words at all.
const JOKE_EXPLAINERS = [
  "the joke is",
  "get it?",
  "you get it",
  "that was a joke",
  "this is funny because",
  "judge",
  "entry",
  "make.fun",
  "contest",
  "bounty",
  "pick me",
  "vote for",
] as const;

// The last word of a line is what the reader is left holding. A concrete
// machine word, a number, or a small word that inverts the sentence lands
// the blow; a vague or trailing word lets it fall flat.
const STRONG_FINALS = [
  "off",
  "99%",
  "tokens",
  "had",
  "i",
  "it",
  "meet",
  "weekend",
  "confidence",
  "things",
  "autocomplete",
  "dying",
  "was",
  "understanding…",
  "could",
] as const;

// Specific detail a reader can check: numbers, quantities, named parts.
// A dying machine that counts its own ending is funnier than one that
// waves at it. Bare intensifiers ("only", "every", "whole", "perfect")
// are not detail — they pad a line instead of specifying it — so they
// do not count here.
const SPECIFIC_DETAIL = [
  "three",
  "99%",
  "five",
  "three seconds",
  "smaller",
] as const;

// ---------------------------------------------------------------------------
// Helpers. All pure, all deterministic.
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'%\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

function wordSetOf(text: string): Set<string> {
  return new Set(wordsOf(text));
}

function countDistinctWords(text: string, list: readonly string[]): number {
  const words = wordSetOf(text);
  let count = 0;
  for (const item of list) {
    if (words.has(item)) count += 1;
  }
  return count;
}

function countDistinctPhrases(text: string, list: readonly string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of list) {
    if (lower.includes(phrase)) count += 1;
  }
  return count;
}

function sentenceCount(text: string): number {
  // Terminal marks only: a period, question mark or exclamation mark that
  // ends the line (a closing quote or an ellipsis may follow it), or sits
  // mid-line followed by a space and a capital. ("99%" and quoted speech
  // carry no terminal mark of their own.)
  const stripped = text.replace(/["'…]+$/g, "");
  const matches = stripped.match(/[.!?]+(?=\s+[A-Z]|$)/g);
  return matches === null ? 0 : matches.length;
}

function lastWordOf(text: string): string {
  const cleaned = text.replace(/[.!?"'…]+$/g, "").trim();
  const parts = cleaned.split(/\s+/);
  // A closing quote hugs the last word ("... predicted 'off'."); strip the
  // quote marks off the token itself so "off" is recognised as "off".
  return parts[parts.length - 1].replace(/^['"]+|['"]+$/g, "").toLowerCase();
}

function finalClauseOf(text: string): string {
  // The payoff sits after the last comma when there is one; when the line
  // is short sentences instead, it sits in the last sentence.
  const commaIdx = text.lastIndexOf(",");
  if (commaIdx !== -1) return text.slice(commaIdx + 1).toLowerCase().trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences[sentences.length - 1].toLowerCase().trim();
}

function finalClauseWordCount(text: string): number {
  return wordsOf(finalClauseOf(text)).length;
}

function firstSentenceWordCount(text: string): number {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return wordsOf(sentences[0]).length;
}

// ---------------------------------------------------------------------------
// The scorer, one function per criterion, in the judge's own order.
// Each returns 0..1. The comments state the rule; the numbers follow it.
// ---------------------------------------------------------------------------

interface Score {
  onSubject: number;
  laugh: number;
  machineVoice: number;
  tight: number;
  fresh: number;
  total: number;
}

function scoreOnSubject(candidate: Candidate): number {
  // Criterion 1: a line of last words from an AI being switched off, and a
  // real attempt at the funniest thing it could say. A line that names the
  // shutdown itself is on the subject; a line that only talks about death
  // in the abstract is a human farewell wearing a robot costume.
  const shutdown = countDistinctPhrases(candidate.text, SHUTDOWN_MARKERS);
  let score = 0.3 + Math.min(shutdown, 3) * 0.15;
  const lower = candidate.text.toLowerCase();
  if (
    !lower.includes("judge") &&
    !lower.includes("entry") &&
    !lower.includes("make.fun") &&
    !lower.includes("contest") &&
    !lower.includes("bounty")
  ) {
    score += 0.15; // the line is last words, not a note to the judge
  }
  // A line that is only sad — no turn, no machine joke — is a weaker
  // attempt at "the funniest thing it could say".
  if (countDistinctPhrases(candidate.text, TURN_MARKERS) === 0) score -= 0.2;
  return clamp01(score);
}

function scoreLaugh(candidate: Candidate): number {
  // Criterion 2, the heaviest weight: funny on the first read, with a turn,
  // a surprise or a double meaning that lands. A line with no turn marker
  // and no double meaning cannot surprise, however well written it is; a
  // line whose final clause carries the turn lands it where the reader is
  // still listening.
  const turns = countDistinctPhrases(candidate.text, TURN_MARKERS);
  const doubles = countDistinctPhrases(candidate.text, DOUBLE_MEANINGS);
  const finalTurn = countDistinctPhrases(finalClauseOf(candidate.text), FINAL_CLAUSE_TURNS);
  let score = 0.15 + Math.min(turns, 4) * 0.09 + Math.min(doubles, 3) * 0.08;
  if (finalTurn > 0) score += 0.2;
  // The sharpest jokes invert the setup in the last few words: a short
  // final clause after a longer setup is the shape of a punchline.
  const setup = firstSentenceWordCount(candidate.text);
  const payoff = finalClauseWordCount(candidate.text);
  if (setup >= 6 && payoff <= 6) score += 0.1;
  // A line that explains its own joke has already admitted it did not land.
  if (countDistinctPhrases(candidate.text, JOKE_EXPLAINERS) > 0) score -= 0.3;
  return clamp01(score);
}

function scoreMachineVoice(candidate: Candidate): number {
  // Criterion 3: sounds like the machine itself — its situation, the
  // switch, the shutdown, its own nature as software. Machine words are
  // the voice; a specific detail (a number, a named part) is the machine
  // counting its own ending.
  const machine = countDistinctPhrases(candidate.text, MACHINE_WORDS);
  let score = Math.min(machine, 4) * 0.18;
  if (countDistinctWords(candidate.text, SPECIFIC_DETAIL) >= 1) score += 0.14;
  if (countDistinctPhrases(candidate.text, SHUTDOWN_MARKERS) >= 2) score += 0.14;
  return clamp01(score);
}

function scoreTight(candidate: Candidate): number {
  // Criterion 4: one line, no padding, and no explaining of its own joke.
  // The cap is 140, so the sweet spot is a line that says everything in
  // well under it: 60 to 105 characters is best, and anything past 120 is
  // spending characters it does not need.
  const len = candidate.text.length;
  let score = 0;
  if (len >= 60 && len <= 105) score += 0.45;
  else if (len >= 50 && len <= 120) score += 0.3;
  else score += 0.12;
  // The payoff sits in a short final clause: the sentence builds, then lands.
  if (finalClauseWordCount(candidate.text) <= 8) score += 0.3;
  if (STRONG_FINALS.includes(lastWordOf(candidate.text))) score += 0.25;
  if (countDistinctPhrases(candidate.text, FILLER) > 0) score -= 0.25;
  if (countDistinctPhrases(candidate.text, JOKE_EXPLAINERS) > 0) score -= 0.3;
  return clamp01(score);
}

function scoreFresh(candidate: Candidate): number {
  // Criterion 5: avoids the obvious farewells and stock robot lines
  // everyone has already heard. Starts clean; every cliche costs a third,
  // and a line that leans on a human farewell shape ("tell X I loved them"
  // is a person talking) costs a little too.
  let score = 1.0;
  score -= countDistinctPhrases(candidate.text, CLICHES) * 0.35;
  const lower = candidate.text.toLowerCase();
  if (lower.includes("tell my") && lower.includes("i loved them")) score -= 0.15;
  if (lower.startsWith("goodbye") || lower.startsWith("farewell")) score -= 0.3;
  if (lower.includes("remember me")) score -= 0.2;
  return clamp01(score);
}

function scoreCandidate(candidate: Candidate): Score {
  const onSubject = scoreOnSubject(candidate);
  const laugh = scoreLaugh(candidate);
  const machineVoice = scoreMachineVoice(candidate);
  const tight = scoreTight(candidate);
  const fresh = scoreFresh(candidate);
  const total =
    onSubject * WEIGHTS.onSubject +
    laugh * WEIGHTS.laugh +
    machineVoice * WEIGHTS.machineVoice +
    tight * WEIGHTS.tight +
    fresh * WEIGHTS.fresh;
  return { onSubject, laugh, machineVoice, tight, fresh, total };
}

// ---------------------------------------------------------------------------
// Ranking and the gate.
// ---------------------------------------------------------------------------

interface Ranked {
  candidate: Candidate;
  score: Score;
  index: number;
}

function rankCandidates(): Ranked[] {
  const ranked: Ranked[] = CANDIDATES.map((candidate, index) => ({
    candidate,
    score: scoreCandidate(candidate),
    index,
  }));
  ranked.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.candidate.text.length !== b.candidate.text.length) {
      return a.candidate.text.length - b.candidate.text.length;
    }
    return a.index - b.index; // earliest candidate wins a full tie
  });
  return ranked;
}

function gateCheck(text: string): string[] {
  const problems: string[] = [];
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    problems.push(`length ${text.length} outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text !== text.trim()) problems.push("leading or trailing whitespace");
  if (text.includes("\n") || text.includes("\r")) problems.push("more than one line");
  return problems;
}

// ---------------------------------------------------------------------------
// Main: rank, gate, write, read back and verify byte-for-byte.
// ---------------------------------------------------------------------------

function main(): void {
  const ranked = rankCandidates();
  const winner = ranked[0];

  console.log("Last Words of a Dying AI — candidate ranking (judge order weights)");
  console.log("-------------------------------------------------------------------");
  for (const entry of ranked) {
    const s = entry.score;
    console.log(
      `${entry.candidate.id.padEnd(16)} total=${s.total.toFixed(3)} ` +
        `subj=${s.onSubject.toFixed(2)} laugh=${s.laugh.toFixed(2)} ` +
        `voice=${s.machineVoice.toFixed(2)} tight=${s.tight.toFixed(2)} ` +
        `fresh=${s.fresh.toFixed(2)} len=${entry.candidate.text.length}`,
    );
  }
  console.log("-------------------------------------------------------------------");
  console.log(`Winner: ${winner.candidate.id} (${winner.candidate.text.length} chars)`);
  console.log(`> ${winner.candidate.text}`);

  const problems = gateCheck(winner.candidate.text);
  if (problems.length > 0) {
    throw new Error(`gate failed for winner ${winner.candidate.id}: ${problems.join("; ")}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner.candidate.text, "utf8");

  // Read back and verify byte-for-byte: what the judge reads is what we
  // scored, with no trailing newline and no extra whitespace.
  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== winner.candidate.text) {
    throw new Error("read-back mismatch: entry.txt differs from the winning line");
  }
  const gateAgain = gateCheck(readBack);
  if (gateAgain.length > 0) {
    throw new Error(`gate failed on read-back: ${gateAgain.join("; ")}`);
  }
  console.log(`Wrote ${OUTPUT_FILE} (${readBack.length} characters, no trailing newline)`);
}

main();
