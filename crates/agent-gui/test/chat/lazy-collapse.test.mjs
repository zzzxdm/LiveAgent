import assert from "node:assert/strict";
import test from "node:test";
import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const loader = createTsModuleLoader();
const { resolveLazyCollapseTransition } = loader.loadModule(
  "src/pages/chat/components/assistant-bubble/LazyCollapse.tsx",
);

test("settled states produce no transition", () => {
  for (const open of [true, false]) {
    assert.equal(
      resolveLazyCollapseTransition({ open, renderedOpen: open, reducedMotion: false }),
      "none",
    );
  }
});

test("collapse always animates from the current state", () => {
  assert.equal(
    resolveLazyCollapseTransition({ open: false, renderedOpen: true, reducedMotion: false }),
    "collapse",
  );
});

test("expand defers one frame so the freshly mounted body can animate", () => {
  assert.equal(
    resolveLazyCollapseTransition({ open: true, renderedOpen: false, reducedMotion: false }),
    "expand-next-frame",
  );
});

test("reduced motion expands immediately", () => {
  assert.equal(
    resolveLazyCollapseTransition({ open: true, renderedOpen: false, reducedMotion: true }),
    "expand-now",
  );
});
