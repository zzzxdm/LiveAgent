import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const invokeCalls = [];
const loader = createTsModuleLoader({
  mocks: {
    "@tauri-apps/api/core": {
      async invoke(command, args) {
        invokeCalls.push({ command, args });
        if (command === "automation_claim_prompt_runs") return [];
        if (command === "automation_complete_prompt_run") {
          return { status: "completed" };
        }
      },
    },
    "@tauri-apps/api/event": {
      async listen() {
        return () => {};
      },
    },
  },
});

const { backend } = loader.loadModule("src/lib/automation/backend.ts");
const { createCompletePromptRunInput, PROMPT_RUN_RECONCILE_INTERVAL_MS } = loader.loadModule(
  "src/components/cron/promptRunProtocol.ts",
);
const runnerSource = readFileSync(
  new URL("../../src/components/cron/CronPromptRunner.tsx", import.meta.url),
  "utf8",
);

test.beforeEach(() => {
  invokeCalls.length = 0;
});

test("Auto Prompt completion uses the Rust camelCase wire contract", async () => {
  const input = createCompletePromptRunInput("execution-1", true, 1200, "conclusion");

  assert.deepEqual(input, {
    executionId: "execution-1",
    success: true,
    durationMs: 1200,
    output: "conclusion",
  });

  await backend.completePromptRun(input);
  assert.deepEqual(invokeCalls, [
    {
      command: "automation_complete_prompt_run",
      args: { input },
    },
  ]);
});

test("Auto Prompt transport keeps command arguments snake_case", async () => {
  await backend.claimPromptRuns();
  await backend.releasePromptRun("execution-1");

  assert.deepEqual(invokeCalls, [
    { command: "automation_claim_prompt_runs", args: undefined },
    {
      command: "automation_release_prompt_run",
      args: { execution_id: "execution-1" },
    },
  ]);
});

test("Auto Prompt reconciles pending runs without relying only on events", () => {
  assert.equal(PROMPT_RUN_RECONCILE_INTERVAL_MS, 15_000);
  assert.match(
    runnerSource,
    /window\.setInterval\(requestClaim, PROMPT_RUN_RECONCILE_INTERVAL_MS\)/,
  );
  assert.match(runnerSource, /window\.clearInterval\(reconcileTimer\)/);
});
