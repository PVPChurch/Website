// <watch-live day="Sunday" from="10:50" until="12:30" time-zone="Europe/London" hidden>
//
// Reveals its contents only during the service window, in the church's time zone
// (whatever the visitor's own clock is set to). It doesn't check whether YouTube is
// actually live yet; that's a planned improvement (docs/later.md).

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Whether `now` falls within the weekly window, e.g. Sunday 10:50 to 12:30 in Europe/London. */
export function inWindow(now, { day, from, until, timeZone }) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  if (parts.weekday !== day || !DAYS.includes(day)) return false;
  const minutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const current = minutes(`${parts.hour}:${parts.minute}`);
  return current >= minutes(from) && current < minutes(until);
}

if (globalThis.customElements && !customElements.get("watch-live")) {
  customElements.define("watch-live", class extends HTMLElement {
    connectedCallback() {
      this.update();
      this.timer = setInterval(() => this.update(), 30_000);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    update() {
      this.hidden = !inWindow(new Date(), {
        day: this.getAttribute("day"),
        from: this.getAttribute("from"),
        until: this.getAttribute("until"),
        timeZone: this.getAttribute("time-zone"),
      });
    }
  });
}
