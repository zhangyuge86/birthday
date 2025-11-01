const STATE_KEYS = {
  wishes: "wangcan_birthday_wishes_v1",
  stars: "wangcan_birthday_stars_v1",
};

const select = (selector, scope = document) => scope.querySelector(selector);
const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `wish_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const t = (encoded) => decodeURIComponent(encoded);

const CHINESE_DIGITS = {
  "\u96F6": 0,
  "\u4E00": 1,
  "\u4E8C": 2,
  "\u4E09": 3,
  "\u56DB": 4,
  "\u4E94": 5,
  "\u516D": 6,
  "\u4E03": 7,
  "\u516B": 8,
  "\u4E5D": 9,
};

const CHINESE_MONTH_ALIAS = {
  "\u6B63": 1,
  "\u51AC": 11,
  "\u814A": 12,
};

const lunarFormatter = (() => {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return null;
  }
  try {
    return new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.warn("lunar formatter unavailable", error);
    return null;
  }
})();

function chineseNumberToInt(source) {
  if (!source) return Number.NaN;
  let value = source.replace(/[\u65E5\u53F7]/g, "").replace(/\u521D/g, "");
  if (value === "\u5341") return 10;
  if (value.startsWith("\u5341")) {
    const unit = CHINESE_DIGITS[value[1]] ?? 0;
    return 10 + unit;
  }
  if (value.endsWith("\u5341")) {
    return (CHINESE_DIGITS[value[0]] ?? 0) * 10;
  }
  if (value.includes("\u5341")) {
    const parts = value.split("\u5341");
    return (CHINESE_DIGITS[parts[0]] ?? 0) * 10 + (CHINESE_DIGITS[parts[1]] ?? 0);
  }
  if (value.startsWith("\u5EFF")) {
    const unit = CHINESE_DIGITS[value[1]] ?? 0;
    return 20 + unit;
  }
  if (value.startsWith("\u5345")) {
    const unit = CHINESE_DIGITS[value[1]] ?? 0;
    return 30 + unit;
  }
  return CHINESE_DIGITS[value] ?? Number.NaN;
}

function parseLunarMonth(value) {
  if (!value) return Number.NaN;
  const cleaned = value.replace("\u6708", "");
  if (Object.prototype.hasOwnProperty.call(CHINESE_MONTH_ALIAS, cleaned)) {
    return CHINESE_MONTH_ALIAS[cleaned];
  }
  return chineseNumberToInt(cleaned);
}

function getLunarDateParts(date) {
  if (!lunarFormatter) return null;
  try {
    const parts = lunarFormatter.formatToParts(date);
    const monthPart = parts.find((item) => item.type === "month")?.value ?? "";
    const dayPart = parts.find((item) => item.type === "day")?.value ?? "";
    const isLeap = monthPart.includes("\u95F0");
    const month = parseLunarMonth(monthPart.replace("\u95F0", ""));
    const day = chineseNumberToInt(dayPart);
    if (Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    return { month, day, isLeap };
  } catch (error) {
    console.warn("unable to parse lunar date", error);
    return null;
  }
}

function createLunarFinder(targetMonth, targetDay) {
  return (baseDate = new Date()) => {
    if (!lunarFormatter) {
      const fallback = new Date(baseDate.getFullYear(), 9, 13);
      if (fallback < baseDate) {
        fallback.setFullYear(fallback.getFullYear() + 1);
      }
      return fallback;
    }

    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    for (let offset = 0; offset < 730; offset += 1) {
      const probe = new Date(start);
      probe.setDate(start.getDate() + offset);
      const lunar = getLunarDateParts(probe);
      if (!lunar) continue;
      if (!lunar.isLeap && lunar.month === targetMonth && lunar.day === targetDay) {
        return probe;
      }
    }

    const fallback = new Date(baseDate.getFullYear() + 1, 9, 13);
    return fallback;
  };
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCountdown();
  setupFireworks();
  setupMap();
  setupWishBoard();
  setupGame();
  setupMusic();
  setupLantern();
  setupWishCards();
});

function setupNavigation() {
  const toggle = select(".nav__toggle");
  const links = select(".nav__links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("is-visible");
    const expanded = links.classList.contains("is-visible");
    toggle.setAttribute("aria-expanded", expanded.toString());
  });

  selectAll(".nav__links a").forEach((link) =>
    link.addEventListener("click", () => links.classList.remove("is-visible"))
  );
}

function setupCountdown() {
  const container = select("#countdown");
  if (!container) return;

  const findNextTarget = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), 10, 2);
    if (target <= now) {
      target.setFullYear(target.getFullYear() + 1);
    }
    return target;
  };

  let target = findNextTarget();
  const noticeClass = "countdown__notice";

  const ensureNotice = () => {
    let notice = container.previousElementSibling;
    if (!notice || !notice.classList || !notice.classList.contains(noticeClass)) {
      notice = document.createElement("p");
      notice.className = noticeClass;
      container.parentElement?.insertBefore(notice, container);
    }
    return notice;
  };

  const labels = [
    { label: t('%E5%A4%A9'), key: "days" },
    { label: t('%E5%B0%8F%E6%97%B6'), key: "hours" },
    { label: t('%E5%88%86%E9%92%9F'), key: "minutes" },
    { label: t('%E7%A7%92'), key: "seconds" },
  ];

  const render = () => {
    const now = new Date();
    if (now > target) {
      target = findNextTarget();
    }

    const diff = Math.max(target.getTime() - now.getTime(), 0);
    const totalSeconds = Math.floor(diff / 1000);
    const chunks = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };

    const notice = ensureNotice();
    const month = String(target.getMonth() + 1).padStart(2, "0");
    const day = String(target.getDate()).padStart(2, "0");
    notice.textContent = `${t('%E4%B8%8B%E6%AC%A1%E7%94%9F%E6%97%A5')}\uFF1A${target.getFullYear()}-${month}-${day}`;

    container.innerHTML = "";
    labels.forEach(({ label, key }) => {
      const cell = document.createElement("div");
      cell.className = "countdown__cell";
      cell.innerHTML = `
        <span class="countdown__value">${String(chunks[key]).padStart(2, "0")}</span>
        <span class="countdown__label">${label}</span>
      `;
      container.appendChild(cell);
    });
  };

  render();
  setInterval(render, 1000);
}

function setupMap() {
  const bubble = select("#mapBubble");
  const title = select("#bubbleTitle");
  const message = select("#bubbleMessage");
  const closeBtn = select("#bubbleClose");

  if (!bubble || !title || !message || !closeBtn) return;

  const showBubble = (pin) => {
    title.textContent = pin.dataset.title ?? "";
    message.textContent = pin.dataset.message ?? "";
    bubble.hidden = false;
  };

  selectAll(".map__pin").forEach((pin) =>
    pin.addEventListener("click", () => showBubble(pin))
  );

  closeBtn.addEventListener("click", () => {
    bubble.hidden = true;
  });
}

function setupWishBoard() {
  const form = select("#wishForm");
  const list = select("#wishList");
  if (!form || !list) return;

  const stored = readState(STATE_KEYS.wishes, []);
  stored.forEach((wish) => renderWish(list, wish));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = (formData.get("wishName") || "").toString().trim();
    the message = (formData.get("wishMessage") || "").toString().trim();
    if (!name || !message) return;

    const wish = {
      id: createId(),
      name,
      message,
      timestamp: Date.now(),
    };

    const next = [wish, ...readState(STATE_KEYS.wishes, [])].slice(0, 30);
    writeState(STATE_KEYS.wishes, next);
    renderWish(list, wish, true);
    form.reset();
  });
}

function setupLantern() {
  const stage = select("#lanternStage");
  const sky = select("#lanternSky");
  const launchBtn = select("#lanternLaunch");
  const tags = selectAll(".lantern-tag");
  const log = select("#lanternLog");
  if (!stage || !sky || !launchBtn || !log) return;

  let currentWish = tags[0]?.dataset.wish || t('%E4%B8%AD%E5%8E%9F%E7%83%AD%E6%83%85');
  const logEntries = [];

  const updateTags = (activeTag) => {
    tags.forEach((tag) => {
      tag.classList.toggle("is-active", tag === activeTag);
    });
  };

  const setCurrentWish = (wish, button) => {
    currentWish = wish;
    updateTags(button);
    stage.setAttribute("data-selected", wish);
  };

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      setCurrentWish(tag.dataset.wish || currentWish, tag);
    });
  });

  if (tags.length > 0) {
    setCurrentWish(tags[0].dataset.wish || currentWish, tags[0]);
  }

  const addLogEntry = (message) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    logEntries.unshift(`${time} ${message}`);
    logEntries.splice(4);
    log.innerHTML = logEntries.map((entry) => `<span>${sanitizeHTML(entry)}</span>`).join("");
  };

  const launchLantern = () => {
    const wish = currentWish || t('%E4%B8%AD%E5%8E%9F%E7%83%AD%E6%83%85');
    const lantern = document.createElement("div");
    lantern.className = "lantern-item";
    lantern.innerHTML = `<span>${sanitizeHTML(wish)}</span>`;
    lantern.style.setProperty("--x", `${10 + Math.random() * 80}%`);
    sky.appendChild(lantern);

    requestAnimationFrame(() => lantern.classList.add("is-floating"));
    setTimeout(() => {
      lantern.classList.add("is-faded");
      lantern.addEventListener("transitionend", () => lantern.remove(), { once: true });
    }, 6000);
    addLogEntry(wish);
  };

  launchBtn.addEventListener("click", () => {
    launchLantern();
  });

  launchBtn.addEventListener("keypress", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      launchLantern();
    }
  });

  setTimeout(() => launchLantern(), 800);
}

function renderWish(container, wish, prepend = false) {
  const item = document.createElement("article");
  item.className = "wish-card-item";
  const formatted = formatTimestamp(wish.timestamp);
  item.innerHTML = `
    <strong>${sanitizeHTML(wish.name)} <small>&#x00B7; ${formatted}</small></strong>
    <p>${sanitizeHTML(wish.message)}</p>
  `;
  if (prepend && container.firstChild) {
    container.insertBefore(item, container.firstChild);
  } else if (prepend) {
    container.appendChild(item);
  } else {
    container.appendChild(item);
  }
}

function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    return ```
