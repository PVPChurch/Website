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

  // Every reason for turning a message down is logged (never what the visitor wrote),
  // so the Worker's Logs tab always says why someone saw "message not sent".
  let form;
  try {
    form = await request.formData();
  } catch {
    console.warn("Contact message not sent: the form data couldn't be read.");
    return notSent(request);
  }
  const field = (name) => String(form.get(name) ?? "").trim();

  // A hidden field that people never see but spam bots fill in. Pretend it worked.
  if (field("website")) return sent(request);

  const message = { name: field("name"), email: field("email"), message: field("message") };
  const problems = [
    !message.name && "no name",
    !message.message && "no message",
    !EMAIL.test(message.email) && "email address not valid",
    ...Object.entries(LIMITS).filter(([key, max]) => message[key].length > max).map(([key]) => `${key} too long`),
  ].filter(Boolean);
  if (problems.length) {
    console.warn("Contact message not sent:", problems.join(", "));
    return notSent(request);
  }

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
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("Contact message not sent: TURNSTILE_SECRET_KEY isn't set on this Worker. Add it under Settings → Variables and Secrets, as type Secret.");
    return false;
  }
  if (!token) {
    console.warn("Contact message not sent: no Turnstile token (the 'verify you are human' check didn't finish).");
    return false;
  }
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
