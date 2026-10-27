import { test } from "node:test";
import assert from "node:assert/strict";
import { inWindow } from "../src/assets/js/watch-live.js";

const sundayMorning = { day: "Sunday", from: "10:50", until: "12:30", timeZone: "Europe/London" };

test("the Watch live banner shows during the Sunday service, in UK time", () => {
  // Winter (GMT): 25 Oct 2026 is the day the clocks go back.
  assert.equal(inWindow(new Date("2026-10-25T11:15:00Z"), sundayMorning), true);
  assert.equal(inWindow(new Date("2026-10-25T10:49:00Z"), sundayMorning), false);
  assert.equal(inWindow(new Date("2026-10-25T12:30:00Z"), sundayMorning), false);
  // Summer (BST): 11:15 in London is 10:15 UTC.
  assert.equal(inWindow(new Date("2026-07-05T10:15:00Z"), sundayMorning), true);
  assert.equal(inWindow(new Date("2026-07-05T11:45:00Z"), sundayMorning), false);
  // Not on other days.
  assert.equal(inWindow(new Date("2026-10-27T11:15:00Z"), sundayMorning), false);
});
