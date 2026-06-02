const SUPABASE_URL = "https://roqnmyhjjvpwwywhnoal.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcW5teWhqanZwd3d5d2hub2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODAxNDUsImV4cCI6MjA5NTQ1NjE0NX0.1xrAYouqJ8FfOJimlb_BlQxxogfB5UMsBOXu6VaEkQg";
const ANALYTICS_STORAGE_KEY = "warden_visitor_id";

const form = document.getElementById("waitlist-form");
const emailInput = document.getElementById("email");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const caption = document.getElementById("form-caption");
const heroSection = document.querySelector(".hero-section");
const scrollHint = document.querySelector(".scroll-hint");

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function applyTimeOfDay() {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  heroSection.classList.toggle("is-night", isNight);
}
applyTimeOfDay();
setInterval(applyTimeOfDay, 5 * 60 * 1000);

emailInput.addEventListener("focus", () => heroSection.classList.add("is-active"));
emailInput.addEventListener("blur", () => {
  if (!emailInput.value) heroSection.classList.remove("is-active");
});

scrollHint.addEventListener("click", () => {
  document.getElementById("why").scrollIntoView({ behavior: "smooth" });
});

/* ---- Privacy section: scroll-scrubbed envelope reveal + entrance fades ---- */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

(function setupRevealAnimations() {
  // Stagger index for grouped reveals
  document.querySelectorAll(".reveal-group").forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty("--i", i);
    });
  });

  if (prefersReducedMotion) return;

  // Entrance fade-ups
  const revealEls = document.querySelectorAll(".reveal, .reveal-group");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }
})();

const DEFAULT_CAPTION = caption.textContent;

function setCaption(message, kind) {
  caption.textContent = message;
  caption.classList.remove("success", "error");
  if (kind) caption.classList.add(kind);
}

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "throwawaymail.com",
  "maildrop.cc",
  "getairmail.com",
  "dispostable.com",
  "trashmail.com",
  "trash-mail.com",
  "mintemail.com",
  "emailondeck.com",
  "fakemailgenerator.com",
  "mohmal.com",
  "mailnesia.com",
  "spamgourmet.com",
  "nada.email",
  "mytemp.email",
  "fakeinbox.com",
  "tempmailo.com",
  "tempr.email",
]);

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isDisposableEmail(value) {
  const domain = value.trim().toLowerCase().split("@")[1];
  return DISPOSABLE_DOMAINS.has(domain);
}

function isSupabaseConfigured() {
  return !SUPABASE_URL.includes("YOUR_PROJECT") && SUPABASE_ANON_KEY !== "YOUR_ANON_PUBLIC_KEY";
}

function getVisitorId() {
  try {
    const existingId = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (existingId) return existingId;

    const visitorId = crypto.randomUUID();
    localStorage.setItem(ANALYTICS_STORAGE_KEY, visitorId);
    return visitorId;
  } catch (err) {
    return null;
  }
}

function trackPageView() {
  if (!isSupabaseConfigured()) return;

  const visitorId = getVisitorId();
  if (!visitorId) return;

  const payload = JSON.stringify({
    visitor_id: visitorId,
    path: window.location.pathname || "/",
    referrer: document.referrer || null,
  });

  fetch(`${SUPABASE_URL}/rest/v1/site_visits`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
  });
}

trackPageView();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();

  if (!isValidEmail(email)) {
    setCaption("Please enter a valid email address.", "error");
    emailInput.focus();
    return;
  }

  if (isDisposableEmail(email)) {
    setCaption("Please use a permanent email address.", "error");
    emailInput.focus();
    return;
  }

  if (!isSupabaseConfigured()) {
    setCaption("Waitlist isn't connected yet. Add your Supabase URL and anon key in script.js.", "error");
    return;
  }

  submitBtn.disabled = true;
  btnLabel.textContent = "Joining…";

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email }),
    });

    const isDuplicate = response.status === 409;
    if (!response.ok && !isDuplicate) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    setCaption("Joined. We'll be in touch soon.", "success");
    emailInput.value = "";
    emailInput.blur();
    heroSection.classList.remove("is-active");
    btnLabel.textContent = "Joined";
  } catch (err) {
    setCaption("Something went wrong. Please try again.", "error");
    btnLabel.textContent = "Join Waitlist";
    submitBtn.disabled = false;
    return;
  }

  setTimeout(() => {
    btnLabel.textContent = "Join Waitlist";
    submitBtn.disabled = false;
    setCaption(DEFAULT_CAPTION);
  }, 4500);
});
