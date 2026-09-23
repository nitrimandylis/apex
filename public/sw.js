// APEX service worker: shows push alerts. The server sends raw data and
// this file writes the words, so session times come out in the phone's
// current time zone, even abroad. No caching: the data is live.

const NAMES = { QUALI: "Qualifying", SPRINT: "Sprint", RACE: "Race" };

function localTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describe(data) {
  if (data.type === "hello") {
    return {
      title: "Alerts on",
      body: "APEX will ping you before quali, sprint and race, and with results.",
    };
  }
  if (data.type === "preview") {
    const lines = data.sessions.map((s) => `${NAMES[s.label]} ${localTime(s.start)}`);
    return { title: `${data.race} this weekend`, body: lines.join(" · ") };
  }
  if (data.type === "reminder") {
    return {
      title: `${data.race} ${NAMES[data.label]} in 15 min`,
      body: `Starts ${localTime(data.start)}`,
    };
  }
  if (data.type === "result") {
    let body = `1. ${data.top3[0]}  2. ${data.top3[1]}  3. ${data.top3[2]}`;
    if (data.you) {
      body += ` · ${data.you}`;
    }
    return { title: `${data.race} ${NAMES[data.label]} result`, body };
  }
  return { title: "APEX", body: "" };
}

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const { title, body } = describe(data);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      data: { url: data.url || "/overview" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
