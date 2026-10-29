import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { handleContact } from "../worker/index.js";

function setup({ turnstile = { success: true }, sendFails = false } = {}) {
  const sentEmails = [];
  const env = {
    CONTACT_TO: "office@example.org",
    CONTACT_FROM: "website@example.org",
    TURNSTILE_SECRET_KEY: "secret",
    EMAIL: {
      async send(email) {
        if (sendFails) throw Object.assign(new Error("not verified"), { code: "E_SENDER_NOT_VERIFIED" });
        sentEmails.push(email);
        return { messageId: "1" };
      },
    },
    ASSETS: { fetch: async () => new Response("static page") },
  };
  const verifications = [];
  const fetchImpl = async (url, init) => {
    verifications.push(Object.fromEntries(init.body));
    return Response.json(turnstile);
  };
  return { env, fetchImpl, sentEmails, verifications };
}

function post(fields) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return new Request("https://church.example/api/contact", {
    method: "POST",
    body,
    headers: { "cf-connecting-ip": "203.0.113.7" },
  });
}

const GOOD = {
  name: "Jean Smith",
  email: "jean@example.com",
  message: "Hello,\nCould I ask about baptism?\n\nThanks <3",
  "cf-turnstile-response": "token",
};

test("a valid message is emailed to the church, with Reply going to the sender", async () => {
  const { env, fetchImpl, sentEmails, verifications } = setup();
  const response = await handleContact(post(GOOD), env, fetchImpl);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://church.example/message-sent/");
  assert.equal(verifications[0].remoteip, "203.0.113.7");
  assert.equal(sentEmails.length, 1);
  const [email] = sentEmails;
  assert.equal(email.to, "office@example.org");
  assert.equal(email.replyTo, "jean@example.com");
  assert.equal(email.subject, "Website message from Jean Smith");
  assert.match(email.text, /Could I ask about baptism/);
  assert.match(email.html, /Thanks &lt;3/); // visitor text is escaped
});

test("spam bots that fill the hidden field get a fake success and no email", async () => {
  const { env, fetchImpl, sentEmails } = setup();
  const response = await handleContact(post({ ...GOOD, website: "http://spam.example" }), env, fetchImpl);
  assert.equal(response.headers.get("location"), "https://church.example/message-sent/");
  assert.equal(sentEmails.length, 0);
});

test("messages that fail the bot check, or are incomplete, aren't sent", async () => {
  for (const [label, fields, options] of [
    ["bot check failed", GOOD, { turnstile: { success: false, "error-codes": ["invalid-input-response"] } }],
    ["no bot check token", { ...GOOD, "cf-turnstile-response": "" }, {}],
    ["bad email", { ...GOOD, email: "not an email" }, {}],
    ["empty message", { ...GOOD, message: "  " }, {}],
    ["too long", { ...GOOD, message: "x".repeat(5001) }, {}],
  ]) {
    const { env, fetchImpl, sentEmails } = setup(options);
    const response = await handleContact(post(fields), env, fetchImpl);
    assert.equal(response.headers.get("location"), "https://church.example/message-not-sent/", label);
    assert.equal(sentEmails.length, 0, label);
  }
});

test("every message turned down logs why, without logging what the visitor wrote", async () => {
  const logged = [];
  const { warn, error } = console;
  console.warn = console.error = (...args) => logged.push(args.join(" "));
  try {
    for (const [label, fields, options, expected, tweak] of [
      ["no secret", GOOD, {}, /TURNSTILE_SECRET_KEY isn't set/, (env) => delete env.TURNSTILE_SECRET_KEY],
      ["no token", { ...GOOD, "cf-turnstile-response": "" }, {}, /no Turnstile token/],
      ["bot check failed", GOOD, { turnstile: { success: false, "error-codes": ["invalid-input-response"] } }, /Turnstile rejected/],
      ["bad email", { ...GOOD, email: "not an email" }, {}, /email address not valid/],
      ["too long", { ...GOOD, message: "x".repeat(5001) }, {}, /message too long/],
      ["send failed", GOOD, { sendFails: true }, /E_SENDER_NOT_VERIFIED/],
    ]) {
      logged.length = 0;
      const { env, fetchImpl } = setup(options);
      tweak?.(env);
      await handleContact(post(fields), env, fetchImpl);
      assert.match(logged.join("\n"), expected, label);
      assert.doesNotMatch(logged.join("\n"), /Jean|jean@example|baptism/, label);
    }
  } finally {
    Object.assign(console, { warn, error });
  }
});

test("if Cloudflare can't send the email, the visitor is told", async () => {
  const { env, fetchImpl } = setup({ sendFails: true });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await handleContact(post(GOOD), env, fetchImpl);
    assert.equal(response.headers.get("location"), "https://church.example/message-not-sent/");
  } finally {
    console.error = originalError;
  }
});

test("only POST is accepted, and other paths are served from the static site", async () => {
  const { env } = setup();
  const get = await worker.fetch(new Request("https://church.example/api/contact"), env);
  assert.equal(get.status, 405);
  const page = await worker.fetch(new Request("https://church.example/about/"), env);
  assert.equal(await page.text(), "static page");
});
