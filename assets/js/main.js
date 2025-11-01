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

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCountdown();
  setupFireworks();
  setupMap();
  setupWishBoard();
  setupGame();
  setupMusic();
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

  const update = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const targetMonth = 9; // October (0-indexed)
    const targetDate = 31;

    let target = new Date(currentYear, targetMonth, targetDate, 0, 0, 0);
    if (now > target) {
      target = new Date(currentYear + 1, targetMonth, targetDate, 0, 0, 0);
    }

    const diff = target.getTime() - now.getTime();
    const totalSeconds = Math.max(Math.floor(diff / 1000), 0);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    container.innerHTML = "";
    [
      { label: t('%E5%A4%A9'), value: days },
      { label: t('%E5%B0%8F%E6%97%B6'), value: hours },
      { label: t('%E5%88%86%E9%92%9F'), value: minutes },
      { label: t('%E7%A7%92'), value: seconds },
    ].forEach(({ label, value }) => {
      const cell = document.createElement("div");
      cell.className = "countdown__cell";
      cell.innerHTML = `
        <span class="countdown__value">${String(value).padStart(2, "0")}</span>
        <span class="countdown__label">${label}</span>
      `;
      container.appendChild(cell);
    });
  };

  update();
  setInterval(update, 1000);
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
    const message = (formData.get("wishMessage") || "").toString().trim();
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

function renderWish(container, wish, prepend = false) {
  const item = document.createElement("article");
  item.className = "wish-card-item";
  const formatted = formatTimestamp(wish.timestamp);
  item.innerHTML = `
    <strong>${sanitizeHTML(wish.name)} <small>? ${formatted}</small></strong>
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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  } catch (error) {
    return t('%E6%AD%A4%E5%88%BB');
  }
}

function sanitizeHTML(value) {
  const temp = document.createElement("div");
  temp.textContent = value;
  return temp.innerHTML;
}

function setupGame() {
  const container = select("#gameOptions");
  const counter = select("#starCounter");
  const resetBtn = select("#resetGame");
  if (!container || !counter || !resetBtn) return;

  const options = [
    { text: t('%E9%BB%98%E5%A5%91%E5%AE%B5%E5%A4%9C%E7%9B%B4%E6%92%AD'), correct: true },
    { text: t('%E5%87%8C%E6%99%A8%E9%9B%AA%E5%9C%B0%E5%90%88%E5%BD%B1'), correct: true },
    { text: t('%E7%99%BD%E4%BF%84%E5%9C%B0%E9%93%81%E8%BF%B7%E8%B7%AF'), correct: false },
    { text: t('%E4%B8%AD%E6%96%87%E8%AF%97%E6%9C%97%E8%AF%B5'), correct: true },
    { text: t('%E9%9A%8F%E6%9C%BA%E8%A1%97%E5%A4%B4%E8%AF%B4%E5%94%B1'), correct: false },
    { text: t('%E9%9A%94%E7%A9%BA%E5%90%8C%E6%AD%A5%E8%BF%BD%E5%89%A7'), correct: true },
    { text: t('%E5%AE%BF%E8%88%8D%E7%86%AC%E5%A4%9C%E5%8A%A0%E7%8F%AD'), correct: false },
    { text: t('%E6%98%9F%E7%A9%BA%E8%BF%9E%E7%BA%BF'), correct: true },
  ];

  let collected = new Set(readState(STATE_KEYS.stars, []));

  const renderStars = () => {
    const count = collected.size;
    const total = 3;
    const stars = Array.from({ length: total }, (_, index) =>
      index < Math.min(count, total) ? "\u2605" : "\u2606"
    ).join(" ");
    counter.textContent = `${t('%E5%B7%B2%E6%89%BE%E5%88%B0%EF%BC%9A')}${stars}`;
  };

  const reorderOptions = () => options.sort(() => Math.random() - 0.5);

  const renderOptions = () => {
    container.innerHTML = "";
    reorderOptions().forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-option";
      button.textContent = option.text;

      if (collected.has(option.text)) {
        button.classList.add("correct");
      }

      button.addEventListener("click", () => {
        if (option.correct) {
          collected.add(option.text);
          button.classList.add("correct");
          writeState(STATE_KEYS.stars, [...collected]);
        } else {
          button.classList.add("wrong");
          setTimeout(() => button.classList.remove("wrong"), 1200);
        }
        if (collected.size >= 3) {
          showCelebrationMessage();
        }
        renderStars();
      });

      container.appendChild(button);
    });
    renderStars();
  };

  resetBtn.addEventListener("click", () => {
    collected = new Set();
    writeState(STATE_KEYS.stars, []);
    renderOptions();
  });

  renderOptions();
}

function showCelebrationMessage() {
  const message = document.createElement("div");
  message.className = "celebration-toast";
  message.textContent = t('%E6%81%AD%E5%96%9C%EF%BC%8C%E7%81%BF%E7%83%82%E6%98%9F%E5%BE%BD%E5%B7%B2%E9%9B%86%E9%BD%90%EF%BC%81');
  document.body.appendChild(message);
  setTimeout(() => message.classList.add("is-visible"), 20);
  setTimeout(() => {
    message.classList.remove("is-visible");
    message.addEventListener("transitionend", () => message.remove(), { once: true });
  }, 2500);
  launchSparkles();
}

function setupMusic() {
  const toggle = select("#musicToggle");
  const audio = select("#bgMusic");
  if (!toggle || !audio) return;

  let isPlaying = false;

  toggle.addEventListener("click", async () => {
    if (!isPlaying) {
      try {
        await audio.play();
        isPlaying = true;
        toggle.setAttribute("aria-pressed", "true");
        toggle.querySelector(".playlist__label").textContent = t('%E6%9A%82%E5%81%9C%E7%94%9F%E6%97%A5%E7%B2%BE%E9%80%89');
      } catch (error) {
        console.warn(t('%E6%97%A0%E6%B3%95%E8%87%AA%E5%8A%A8%E6%92%AD%E6%94%BE%E9%9F%B3%E4%B9%90%EF%BC%9A'), error);
      }
    } else {
      audio.pause();
      isPlaying = false;
      toggle.setAttribute("aria-pressed", "false");
      toggle.querySelector(".playlist__label").textContent = t('%E6%92%AD%E6%94%BE%E7%94%9F%E6%97%A5%E7%B2%BE%E9%80%89');
    }
  });
}

function setupWishCards() {
  selectAll(".wish-card").forEach((card) => {
    card.addEventListener("click", () => card.classList.toggle("is-flipped"));
    card.addEventListener("keypress", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.classList.toggle("is-flipped");
      }
    });
    card.setAttribute("tabindex", "0");
  });
}

function readState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(t('%E8%AF%BB%E5%8F%96%E6%9C%AC%E5%9C%B0%E5%AD%98%E5%82%A8%E5%A4%B1%E8%B4%A5'), error);
    return fallback;
  }
}

function writeState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(t('%E5%86%99%E5%85%A5%E6%9C%AC%E5%9C%B0%E5%AD%98%E5%82%A8%E5%A4%B1%E8%B4%A5'), error);
  }
}

function setupFireworks() {
  const canvas = select("#fireworksCanvas");
  const trigger = select("#fireworksTrigger");
  if (!canvas || !trigger) return;

  const ctx = canvas.getContext("2d");
  let width;
  let height;
  let particles = [];
  let animationFrame;

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };

  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.radius = Math.random() * 2 + 1;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.dx = Math.cos(angle) * speed;
      this.dy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.decay = Math.random() * 0.015 + 0.008;
    }

    update() {
      this.x += this.dx;
      this.y += this.dy;
      this.dy += 0.02;
      this.alpha -= this.decay;
    }

    draw(context) {
      context.save();
      context.globalAlpha = this.alpha;
      context.beginPath();
      context.fillStyle = this.color;
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  const colors = ["#ffd369", "#ff9f68", "#8a7bff", "#ff6bc7"];

  const launch = (x = width / 2, y = height * 0.35) => {
    for (let i = 0; i < 80; i += 1) {
      particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
    }
    animate();
  };

  const animate = () => {
    if (particles.length === 0) {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, width, height);
      return;
    }

    animationFrame = requestAnimationFrame(animate);
    ctx.fillStyle = "rgba(5, 7, 20, 0.25)";
    ctx.fillRect(0, 0, width, height);

    particles = particles.filter((particle) => particle.alpha > 0);
    particles.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });
  };

  trigger.addEventListener("click", () => {
    launch();
  });

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    launch(event.clientX - rect.left, event.clientY - rect.top);
  });

  // ????
  setTimeout(() => launch(width * 0.65, height * 0.4), 1200);
}

function launchSparkles() {
  const trigger = select("#fireworksTrigger");
  if (trigger) {
    trigger.click();
  }
}
