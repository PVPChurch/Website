// The site's only server-side code. Every request except the contact form is
// answered straight from the built static site (see wrangler.jsonc: only
// /api/* reaches this Worker).
//
// Contact Messages are checked, emailed to the church, and not stored anywhere.

const LIMITS = { name: 100, email: 200, message: 5000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return handleContact(request, env);
    return env.ASSETS.fetch(request);
  },
};

const redirect = (request, path) => Response.redirect(new URL(path, request.url).toString(), 303);
const sent = (request) => redirect(request, "/message-sent/");
const notSent = (request) => redirect(request, "/message-not-sent/");

export async function handleContact(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });

  let form;
  try {
    form = await request.formData();
  } catch {
    return notSent(request);
  }
  const field = (name) => String(form.get(name) ?? "").trim();

  // A hidden field that people never see but spam bots fill in. Pretend it worked.
  if (field("website")) return sent(request);

  const message = { name: field("name"), email: field("email"), message: field("message") };
  const invalid =
    !message.name || !message.message || !EMAIL.test(message.email) ||
    Object.entries(LIMITS).some(([key, max]) => message[key].length > max);
  if (invalid) return notSent(request);

  if (!(await isHuman(field("cf-turnstile-response"), request, env, fetchImpl))) return notSent(request);

  try {
    await env.EMAIL.send({
      to: env.CONTACT_TO,
      from: { email: env.CONTACT_FROM, name: "Church website" },
      replyTo: message.email,
      subject: `Website message from ${message.name}`,
      text: emailText(message),
      html: emailHtml(message),
    });
  } catch (error) {
    console.error("Contact message not sent:", error.code ?? "", error.message);
    return notSent(request);
  }
  return sent(request);
}

async function isHuman(token, request, env, fetchImpl) {
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.append("remoteip", ip);
  try {
    const response = await fetchImpl(SITEVERIFY, { method: "POST", body });
    const result = await response.json();
    if (!result.success) console.warn("Turnstile rejected a contact message:", result["error-codes"]);
    return result.success === true;
  } catch (error) {
    console.error("Turnstile check failed:", error.message);
    return false;
  }
}

function emailText({ name, email, message }) {
  return `${message}\n\n—\nFrom: ${name} <${email}>\nSent from the contact form on the church website. Reply to this email to answer them.`;
}

const escape = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function emailHtml({ name, email, message }) {
  const paragraphs = escape(message).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
  return `${paragraphs}
<hr>
<p>From: ${escape(name)} &lt;${escape(email)}&gt;<br>
Sent from the contact form on the church website. Reply to this email to answer them.</p>`;
}
