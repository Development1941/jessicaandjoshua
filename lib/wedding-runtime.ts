import { toast, type Id } from "react-toastify";
import { isAdminPhone } from "@/lib/admin";

type Guest = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  addressee?: string;
  phone: string | null;
  email?: string | null;
  tier: "both" | "brunch" | "night";
};

type RsvpRecord = {
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_names?: string | null;
  brunch_attending?: string | null;
  brunch_kids?: string | null;
  bar_attending?: string | null;
  dietary?: string | null;
  jukebox_track?: string | null;
  jukebox_artist?: string | null;
  spotify_url?: string | null;
};

type ItunesTrack = {
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
};

declare global {
  interface Window {
    showPage: (pageName: string) => void;
    setGuestTier: (tier: Guest["tier"], guest?: Guest | string) => void;
    performGuestLookup: () => Promise<void>;
    selectSong: (
      trackName: string,
      artistName: string,
      artworkUrl: string,
      previewUrl: string
    ) => void;
    playPreview: (url: string) => void;
    clearSelectedSong: () => void;
  }
}

function normalizePhone(str: string) {
  return str ? str.replace(/\D/g, "") : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim().toLowerCase());
}

function guestLabel(guest: {
  addressee?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}) {
  const addressee = (guest.addressee || "").trim();
  if (addressee) return addressee;
  const full = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
  if (full) return full;
  return (guest.name || "").trim() || "Guest";
}

function fillGuestNameFields(guest: Guest) {
  const firstInput = document.getElementById(
    "rsvpFirstNameInput"
  ) as HTMLInputElement | null;
  const lastInput = document.getElementById(
    "rsvpLastNameInput"
  ) as HTMLInputElement | null;
  const addresseeWrap = document.getElementById("rsvpAddresseeWrap");
  const addresseeDisplay = document.getElementById("rsvpAddresseeDisplay");

  if (firstInput) firstInput.value = guest.first_name || "";
  if (lastInput) lastInput.value = guest.last_name || "";

  const addressee = (guest.addressee || "").trim();
  if (addressee && addresseeDisplay && addresseeWrap) {
    addresseeDisplay.textContent = addressee;
    addresseeWrap.classList.remove("hidden");
  } else {
    addresseeWrap?.classList.add("hidden");
  }
}

function setRadioValue(name: string, value: string | null | undefined) {
  if (!value) return;
  const input = document.querySelector(
    `input[name="${name}"][value="${value}"]`
  ) as HTMLInputElement | null;
  if (input) input.checked = true;
}

function setDietaryValues(dietary: string | null | undefined) {
  const boxes = document.querySelectorAll(
    '#rsvp input[type="checkbox"]'
  ) as NodeListOf<HTMLInputElement>;
  boxes.forEach((box) => {
    box.checked = false;
  });
  if (!dietary || dietary === "None") return;
  const selected = dietary.split(",").map((part) => part.trim().toLowerCase());
  boxes.forEach((box) => {
    const label = (box.value || box.parentElement?.innerText || "")
      .trim()
      .toLowerCase();
    if (selected.includes(label)) box.checked = true;
  });
}

function showToast(
  type: "success" | "error" | "warning" | "info",
  message: string,
  id?: Id | null
) {
  if (id != null) {
    toast.update(id, {
      render: message,
      type,
      isLoading: false,
      autoClose: 4000,
      closeOnClick: true,
      position: "top-right",
    });
    return;
  }
  toast[type](message, {
    autoClose: 4000,
    closeOnClick: true,
    position: "top-right",
  });
}

export function initWeddingSite() {
  const targetDate = new Date("January 30, 2027 11:00:00").getTime();
  let currentTier: Guest["tier"] = "both";
  let pendingLogin = "";
  let pendingPhone = "";
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  let activeAudioPreview: HTMLAudioElement | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function setAdminView(isAdmin: boolean) {
    document.body.classList.toggle("admin-view", isAdmin);
    document.getElementById("adminDashboard")?.classList.toggle("hidden", !isAdmin);
    if (!isAdmin) document.getElementById("mobileMenu")?.classList.add("hidden");
  }

  function showPage(pageName: string) {
    const landing = document.getElementById("pageLanding");
    const invitation = document.getElementById("pageInvitation");
    if (!landing || !invitation) return;

    if (pageName === "invitation") {
      landing.classList.add("hidden");
      invitation.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      invitation.classList.add("hidden");
      landing.classList.remove("hidden");
      setAdminView(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void fetch("/api/auth/login", { method: "DELETE" });
      document
        .getElementById("rsvpAlreadyFilledBanner")
        ?.classList.add("hidden");
      const submitBtn = document.querySelector(
        '#rsvpForm button[type="submit"]'
      ) as HTMLButtonElement | null;
      if (submitBtn) submitBtn.textContent = "Submit RSVP Response";
      showToast("info", "Signed out.");
    }
  }

  function updateCountdown() {
    const now = new Date().getTime();
    const difference = targetDate - now;
    if (difference <= 0) return;

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    const set = (id: string, value: number) => {
      const el = document.getElementById(id);
      if (el) el.innerText = String(value).padStart(2, "0");
    };
    set("days", days);
    set("hours", hours);
    set("minutes", minutes);
    set("seconds", seconds);
  }

  function setGuestTier(tier: Guest["tier"], guest?: Guest | string) {
    currentTier = tier;
    const guestObj =
      typeof guest === "string" || !guest
        ? ({ name: typeof guest === "string" ? guest : "Guest" } as Guest)
        : guest;
    const guestName = guestLabel(guestObj);

    const eventsGrid = document.getElementById("eventsGrid");
    const eventCardBrunch = document.getElementById("eventCardBrunch");
    const eventCardNight = document.getElementById("eventCardNight");
    const rsvpBrunchBlock = document.getElementById("rsvpBrunchBlock");
    const rsvpNightBlock = document.getElementById("rsvpNightBlock");
    const dresscodeGrid = document.getElementById("dresscodeGrid");
    const dresscodeCardBrunch = document.getElementById("dresscodeCardBrunch");
    const dresscodeCardNight = document.getElementById("dresscodeCardNight");
    const greetingName = document.getElementById("greetingName");
    const greetingDetail = document.getElementById("greetingDetail");
    const scheduleDesc = document.getElementById("scheduleDescription");
    const dresscodeSubtitle = document.getElementById("dresscodeSubtitle");

    ["Both", "Brunch", "Night", "Locked"].forEach((id) => {
      const btn = document.getElementById("tierBtn" + id);
      if (btn) {
        btn.className =
          "px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition bg-stone-900 border-stone-800 text-stone-300 hover:text-white";
      }
    });

    const activeBtn = document.getElementById(
      "tierBtn" +
        (tier === "both" ? "Both" : tier.charAt(0).toUpperCase() + tier.slice(1))
    );
    if (activeBtn) {
      activeBtn.className =
        "px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition bg-brand-plum border-brand-plum text-white shadow-sm";
    }

    if (guestObj.id || guestObj.first_name || guestObj.addressee || guestObj.name) {
      fillGuestNameFields(guestObj);
    }

    if (tier === "brunch") {
      eventCardBrunch?.classList.remove("hidden");
      eventCardNight?.classList.add("hidden");
      if (eventsGrid) eventsGrid.className = "grid grid-cols-1 max-w-xl mx-auto";
      rsvpBrunchBlock?.classList.remove("hidden");
      rsvpNightBlock?.classList.add("hidden");
      dresscodeCardBrunch?.classList.remove("hidden");
      dresscodeCardNight?.classList.add("hidden");
      if (dresscodeGrid)
        dresscodeGrid.className = "grid grid-cols-1 max-w-xl mx-auto";
      if (dresscodeSubtitle)
        dresscodeSubtitle.innerText =
          "Below are attire guidelines for the morning celebration.";
      if (greetingName)
        greetingName.innerText = `Welcome, ${guestName || "Guest"}! 🍷`;
      if (greetingDetail)
        greetingDetail.innerText =
          "You are warmly invited to The Newlywed Brunch.";
      if (scheduleDesc)
        scheduleDesc.innerText =
          "Here are the details for our morning The Newlywed Brunch at Barcelona Wine Bar.";
    } else if (tier === "night") {
      eventCardBrunch?.classList.add("hidden");
      eventCardNight?.classList.remove("hidden");
      if (eventsGrid) eventsGrid.className = "grid grid-cols-1 max-w-xl mx-auto";
      rsvpBrunchBlock?.classList.add("hidden");
      rsvpNightBlock?.classList.remove("hidden");
      dresscodeCardBrunch?.classList.add("hidden");
      dresscodeCardNight?.classList.remove("hidden");
      if (dresscodeGrid)
        dresscodeGrid.className = "grid grid-cols-1 max-w-xl mx-auto";
      if (dresscodeSubtitle)
        dresscodeSubtitle.innerText =
          "Below are attire guidelines for the evening celebration.";
      if (greetingName)
        greetingName.innerText = `Welcome, ${guestName || "Guest"}! 🍸`;
      if (greetingDetail)
        greetingDetail.innerText =
          "You are warmly invited to The Wedding Encore @ Donna's on White Oak.";
      if (scheduleDesc)
        scheduleDesc.innerText =
          "Here are the details for our The Wedding Encore night out at Donna's.";
    } else {
      eventCardBrunch?.classList.remove("hidden");
      eventCardNight?.classList.remove("hidden");
      if (eventsGrid)
        eventsGrid.className = "grid md:grid-cols-2 gap-8 lg:gap-12";
      rsvpBrunchBlock?.classList.remove("hidden");
      rsvpNightBlock?.classList.remove("hidden");
      dresscodeCardBrunch?.classList.remove("hidden");
      dresscodeCardNight?.classList.remove("hidden");
      if (dresscodeGrid) dresscodeGrid.className = "grid md:grid-cols-2 gap-8";
      if (dresscodeSubtitle)
        dresscodeSubtitle.innerText =
          "Below are attire guidelines for both events.";
      if (greetingName)
        greetingName.innerText = `Welcome, ${guestName || "Guest"}!`;
      if (greetingDetail)
        greetingDetail.innerText =
          "You are invited to Brunch at 11 AM and The Wedding Encore at 8 PM.";
      if (scheduleDesc)
        scheduleDesc.innerText =
          "We are so excited to celebrate with you across both events of our wedding day!";
    }

    const phone = "phone" in guestObj ? guestObj.phone : "";
    const admin = isAdminPhone(phone);
    setAdminView(admin);
    const signedIn = document.getElementById("adminSignedIn");
    if (signedIn) {
      signedIn.textContent = admin
        ? `Signed in as ${guestName || "Joshua"}`
        : "Admin";
    }

    showPage("invitation");
    if (admin) {
      void loadAdminDashboard();
      return;
    }
    void loadExistingRsvp(guestObj.id ? guestObj : null);
  }

  function escapeHtml(value: unknown): string {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ADMIN_PAGE_SIZE = 10;
  type AdminPerson = {
    family: string;
    guest: string;
    phone: string;
    email: string;
    invite: string;
  };
  type AdminResponse = AdminPerson & {
    brunchAttending: string;
    brunchKids: string;
    barAttending: string;
    dietary: string;
    song: string;
    artist: string;
    updated: string;
  };
  let adminRsvps: AdminResponse[] = [];
  let adminPending: AdminPerson[] = [];
  let adminAttendees: AdminPerson[] = [];
  let rsvpPage = 1;
  let attendeePage = 1;
  let rsvpView: "received" | "pending" = "received";

  function tableCell(value: unknown, sticky = false): string {
    const text = value == null || String(value).trim() === "" ? "—" : String(value);
    const stickyClass = sticky
      ? "sticky left-0 z-10 bg-white shadow-[1px_0_0_0_rgb(231,229,228)]"
      : "";
    return `<td class="px-4 py-3 align-top ${stickyClass}">${escapeHtml(text)}</td>`;
  }

  function answerLabel(value: string): string {
    if (value === "yes") return "Yes";
    if (value === "no") return "No";
    return value;
  }

  function shortWhen(value: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function pageCount(total: number): number {
    return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  }

  function pageSlice<T>(rows: T[], page: number): T[] {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return rows.slice(start, start + ADMIN_PAGE_SIZE);
  }

  function renderPager(
    element: HTMLElement | null,
    page: number,
    total: number,
    table: "rsvp" | "attendees"
  ) {
    if (!element) return;
    const pages = pageCount(total);
    const safePage = Math.min(page, pages);
    const start = total === 0 ? 0 : (safePage - 1) * ADMIN_PAGE_SIZE + 1;
    const end = Math.min(total, safePage * ADMIN_PAGE_SIZE);
    const buttonClass =
      "px-3 py-1.5 rounded-full border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:border-brand-plum disabled:opacity-40 disabled:hover:border-stone-300";
    element.innerHTML = `
      <p>Showing ${start}–${end} of ${total}</p>
      <div class="flex items-center gap-2">
        <button type="button" class="${buttonClass}" data-admin-table="${table}" data-admin-page="prev" ${safePage <= 1 ? "disabled" : ""}>Previous</button>
        <span class="min-w-16 text-center font-semibold text-stone-800">${safePage} / ${pages}</span>
        <button type="button" class="${buttonClass}" data-admin-table="${table}" data-admin-page="next" ${safePage >= pages ? "disabled" : ""}>Next</button>
      </div>`;
  }

  function setRsvpToggle(view: "received" | "pending") {
    const received = document.getElementById("adminShowReceived");
    const pending = document.getElementById("adminShowPending");
    const active =
      "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-plum text-white text-xs font-semibold tracking-wide";
    const idle =
      "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-300 text-stone-700 text-xs font-semibold tracking-wide hover:border-brand-plum";
    if (received) {
      received.className = view === "received" ? active : idle;
      received.setAttribute("aria-pressed", view === "received" ? "true" : "false");
    }
    if (pending) {
      pending.className = view === "pending" ? active : idle;
      pending.setAttribute("aria-pressed", view === "pending" ? "true" : "false");
    }
  }

  function renderRsvpTable() {
    const body = document.getElementById("adminRsvpBody");
    const head = document.getElementById("adminRsvpHead");
    const count = document.getElementById("adminRsvpCount");
    const receivedTotal = document.getElementById("adminReceivedTotal");
    const pendingTotal = document.getElementById("adminPendingTotal");
    if (receivedTotal) receivedTotal.textContent = String(adminRsvps.length);
    if (pendingTotal) pendingTotal.textContent = String(adminPending.length);
    setRsvpToggle(rsvpView);

    if (rsvpView === "pending") {
      const pages = pageCount(adminPending.length);
      if (rsvpPage > pages) rsvpPage = pages;
      if (head) {
        head.innerHTML = `<tr>
          <th class="sticky left-0 z-10 bg-stone-50 px-4 py-3 font-semibold">Family</th>
          <th class="px-4 py-3 font-semibold">Guest</th>
          <th class="px-4 py-3 font-semibold">Phone</th>
          <th class="px-4 py-3 font-semibold">Email</th>
          <th class="px-4 py-3 font-semibold">Invite</th>
        </tr>`;
      }
      if (count) {
        count.textContent =
          adminPending.length === 1
            ? "1 household has not responded"
            : `${adminPending.length} households have not responded`;
      }
      if (body) {
        const rows = pageSlice(adminPending, rsvpPage);
        body.innerHTML = rows.length
          ? rows
              .map(
                (row) =>
                  `<tr>${tableCell(row.family, true)}${tableCell(row.guest)}${tableCell(row.phone)}${tableCell(row.email)}${tableCell(row.invite)}</tr>`
              )
              .join("")
          : `<tr><td class="px-4 py-6 text-stone-500" colspan="5">Every household has responded.</td></tr>`;
      }
      renderPager(
        document.getElementById("adminRsvpPager"),
        rsvpPage,
        adminPending.length,
        "rsvp"
      );
      return;
    }

    const pages = pageCount(adminRsvps.length);
    if (rsvpPage > pages) rsvpPage = pages;
    if (head) {
      head.innerHTML = `<tr>
        <th class="sticky left-0 z-10 bg-stone-50 px-4 py-3 font-semibold">Family</th>
        <th class="px-4 py-3 font-semibold">Guest</th>
        <th class="px-4 py-3 font-semibold">Phone</th>
        <th class="px-4 py-3 font-semibold">Email</th>
        <th class="px-4 py-3 font-semibold">Invite</th>
        <th class="px-4 py-3 font-semibold">Brunch</th>
        <th class="px-4 py-3 font-semibold">Kids</th>
        <th class="px-4 py-3 font-semibold">Bar</th>
        <th class="px-4 py-3 font-semibold">Dietary</th>
        <th class="px-4 py-3 font-semibold">Song</th>
        <th class="px-4 py-3 font-semibold">Updated</th>
      </tr>`;
    }
    if (count) {
      count.textContent =
        adminRsvps.length === 1 ? "1 response" : `${adminRsvps.length} responses`;
    }
    if (body) {
      const rows = pageSlice(adminRsvps, rsvpPage);
      body.innerHTML = rows.length
        ? rows
            .map((row) => {
              const song = [row.song, row.artist].filter(Boolean).join(" — ");
              return `<tr>${tableCell(row.family, true)}${tableCell(row.guest)}${tableCell(row.phone)}${tableCell(row.email)}${tableCell(row.invite)}${tableCell(answerLabel(row.brunchAttending))}${tableCell(row.brunchKids)}${tableCell(answerLabel(row.barAttending))}${tableCell(row.dietary)}${tableCell(song)}${tableCell(shortWhen(row.updated))}</tr>`;
            })
            .join("")
        : `<tr><td class="px-4 py-6 text-stone-500" colspan="11">No RSVP responses yet.</td></tr>`;
    }
    renderPager(
      document.getElementById("adminRsvpPager"),
      rsvpPage,
      adminRsvps.length,
      "rsvp"
    );
  }

  function renderAttendeeTable() {
    const body = document.getElementById("adminAttendeeBody");
    const count = document.getElementById("adminAttendeeCount");
    const pages = pageCount(adminAttendees.length);
    if (attendeePage > pages) attendeePage = pages;
    if (count) {
      count.textContent =
        adminAttendees.length === 1
          ? "1 household on the guest list"
          : `${adminAttendees.length} households on the guest list`;
    }
    if (body) {
      const rows = pageSlice(adminAttendees, attendeePage);
      body.innerHTML = rows.length
        ? rows
            .map(
              (row) =>
                `<tr>${tableCell(row.family, true)}${tableCell(row.guest)}${tableCell(row.phone)}${tableCell(row.email)}${tableCell(row.invite)}</tr>`
            )
            .join("")
        : `<tr><td class="px-4 py-6 text-stone-500" colspan="5">No guests on the list.</td></tr>`;
    }
    renderPager(
      document.getElementById("adminAttendeePager"),
      attendeePage,
      adminAttendees.length,
      "attendees"
    );
  }

  async function loadAdminDashboard() {
    const rsvpCount = document.getElementById("adminRsvpCount");
    const attendeeCount = document.getElementById("adminAttendeeCount");
    if (rsvpCount) rsvpCount.textContent = "Loading responses...";
    if (attendeeCount) attendeeCount.textContent = "Loading the guest list...";

    try {
      const res = await fetch("/api/admin/dashboard");
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        rsvps?: AdminResponse[];
        pending?: AdminPerson[];
        attendees?: AdminPerson[];
      };
      if (!res.ok) {
        showToast("error", data.error || "Could not load admin data.");
        if (rsvpCount) rsvpCount.textContent = "Could not load responses.";
        if (attendeeCount) attendeeCount.textContent = "Could not load the guest list.";
        return;
      }

      adminRsvps = data.rsvps || [];
      adminPending = data.pending || [];
      adminAttendees = data.attendees || [];
      rsvpPage = 1;
      attendeePage = 1;
      rsvpView = "received";
      renderRsvpTable();
      renderAttendeeTable();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Could not load admin data."
      );
    }
  }

  async function downloadRsvpCsv() {
    const downloadToast = toast.loading("Preparing the RSVP spreadsheet...", {
      position: "top-right",
    });
    try {
      const res = await fetch("/api/admin/rsvps");
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(
          "error",
          data.error || "Could not download RSVP responses.",
          downloadToast
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const match = /filename="?([^";]+)"?/i.exec(
        res.headers.get("Content-Disposition") || ""
      );
      link.href = url;
      link.download = match?.[1] || "wedding-rsvps.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("success", "RSVP spreadsheet downloaded.", downloadToast);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Could not download RSVP responses.",
        downloadToast
      );
    }
  }

  function fillRsvpForm(rsvp: RsvpRecord, guest?: Guest | null) {
    const firstInput = document.getElementById(
      "rsvpFirstNameInput"
    ) as HTMLInputElement | null;
    const lastInput = document.getElementById(
      "rsvpLastNameInput"
    ) as HTMLInputElement | null;

    if (firstInput) {
      firstInput.value =
        rsvp.guest_first_name ||
        guest?.first_name ||
        (rsvp.guest_names || "").split(" ")[0] ||
        "";
    }
    if (lastInput) {
      lastInput.value =
        rsvp.guest_last_name ||
        guest?.last_name ||
        (rsvp.guest_names || "").split(" ").slice(1).join(" ") ||
        "";
    }

    if (guest) fillGuestNameFields({
      ...guest,
      first_name: firstInput?.value || guest.first_name,
      last_name: lastInput?.value || guest.last_name,
    });

    setRadioValue("brunchAttending", rsvp.brunch_attending || undefined);
    setRadioValue("barAttending", rsvp.bar_attending || undefined);

    const brunchKidsSelect = document.querySelector(
      "#rsvpBrunchBlock select"
    ) as HTMLSelectElement | null;
    if (brunchKidsSelect && rsvp.brunch_kids != null) {
      brunchKidsSelect.value = rsvp.brunch_kids;
    }

    setDietaryValues(rsvp.dietary);

    if (rsvp.jukebox_track) {
      const artwork = "https://placehold.co/100x100/3a152e/ffffff?text=🎵";
      selectSong(
        rsvp.jukebox_track,
        rsvp.jukebox_artist || "",
        artwork,
        ""
      );
      if (rsvp.spotify_url) {
        const selectedSongData = document.getElementById(
          "selectedSongData"
        ) as HTMLInputElement | null;
        const spotifySearchLink = document.getElementById(
          "spotifySearchLink"
        ) as HTMLAnchorElement | null;
        if (spotifySearchLink) spotifySearchLink.href = rsvp.spotify_url;
        if (selectedSongData) {
          selectedSongData.value = JSON.stringify({
            track: rsvp.jukebox_track,
            artist: rsvp.jukebox_artist || "",
            spotifyUrl: rsvp.spotify_url,
          });
        }
      }
    }

    const submitBtn = document.querySelector(
      '#rsvpForm button[type="submit"]'
    ) as HTMLButtonElement | null;
    if (submitBtn) submitBtn.textContent = "Update RSVP Response";
  }

  async function loadExistingRsvp(guest?: Guest | null) {
    const banner = document.getElementById("rsvpAlreadyFilledBanner");
    try {
      const res = await fetch("/api/rsvp");
      const data = (await res.json()) as {
        rsvp?: RsvpRecord | null;
        previouslyFilled?: boolean;
      };
      if (!res.ok || !data.rsvp) {
        banner?.classList.add("hidden");
        if (guest) fillGuestNameFields(guest);
        return;
      }
      fillRsvpForm(data.rsvp, guest);
      banner?.classList.remove("hidden");
      showToast(
        "info",
        "Your previous RSVP details were found."
      );
    } catch {
      banner?.classList.add("hidden");
      if (guest) fillGuestNameFields(guest);
    }
  }

  async function performGuestLookup() {
    const input = document.getElementById(
      "guestSearchInput"
    ) as HTMLInputElement | null;
    const rawQuery = input?.value.trim() || "";
    if (!rawQuery) {
      showToast(
        "warning",
        "Enter the phone number or email from your invitation."
      );
      return;
    }

    const lookupToast = toast.loading("Checking the guest list...", {
      position: "top-right",
    });

    const looksLikeOtp = /^\d{6}$/.test(rawQuery.replace(/\s/g, ""));
    const login = looksLikeOtp ? pendingLogin : rawQuery;
    const otp = looksLikeOtp ? rawQuery.replace(/\s/g, "") : undefined;

    const countrySelect = document.getElementById(
      "countryCodeSelect"
    ) as HTMLSelectElement | null;
    const countryCode = countrySelect?.value || "1";

    if (!looksLikeOtp) {
      pendingLogin = login;
      pendingPhone = isEmail(login) ? "" : normalizePhone(login);
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: pendingLogin || login,
          otp,
          countryCode: isEmail(pendingLogin || login) ? undefined : countryCode,
        }),
      });
      const data = await res.json();

      if (data.needsOtp) {
        showToast(
          "info",
          data.message ||
            "Enter the 6-digit code we texted you, then Unlock again.",
          lookupToast
        );
        if (input) {
          input.value = "";
          input.placeholder = "6-digit code";
          input.focus();
        }
        syncCountryCodeField();
        return;
      }

      if (!res.ok || !data.guest) {
        void fetch("/api/auth/login", { method: "DELETE" });
        showToast(
          data.warning ? "warning" : "error",
          data.error || "This guest is not on the guest list.",
          lookupToast
        );
        return;
      }

      const guest = data.guest as Guest;
      pendingPhone = guest.phone || pendingPhone;
      pendingLogin = guest.email || guest.phone || pendingLogin;
      if (input) input.placeholder = "Phone or email";
      syncCountryCodeField();
      setGuestTier(guest.tier, guest);
      showToast(
        "success",
        `Welcome, ${guestLabel(guest)}. You're signed in.`,
        lookupToast
      );
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Could not reach the invitation server.",
        lookupToast
      );
    }
  }

  function syncCountryCodeField() {
    const input = document.getElementById(
      "guestSearchInput"
    ) as HTMLInputElement | null;
    const select = document.getElementById(
      "countryCodeSelect"
    ) as HTMLSelectElement | null;
    const pickerButton = document.getElementById(
      "countryCodeButton"
    ) as HTMLButtonElement | null;
    if (!select) return;
    const value = input?.value.trim() || "";
    const waitingForCode = (input?.placeholder || "").startsWith("6-digit");
    select.disabled = waitingForCode || isEmail(value);
    if (pickerButton) {
      pickerButton.disabled = select.disabled;
      pickerButton.classList.toggle("opacity-50", select.disabled);
    }
    if (select.disabled) closeCountryMenu();
  }

  const COUNTRY_FLAGS: Record<string, string> = {
    "1": `<svg viewBox="0 0 60 42" width="22" height="15" class="rounded-[2px] shrink-0" aria-hidden="true"><rect width="60" height="42" fill="#B22234"/><g fill="#fff"><rect y="3.23" width="60" height="3.23"/><rect y="9.69" width="60" height="3.23"/><rect y="16.15" width="60" height="3.23"/><rect y="22.62" width="60" height="3.23"/><rect y="29.08" width="60" height="3.23"/><rect y="35.54" width="60" height="3.23"/></g><rect width="26" height="22.6" fill="#3C3B6E"/><g fill="#fff"><circle cx="4" cy="3.4" r="0.9"/><circle cx="9" cy="3.4" r="0.9"/><circle cx="14" cy="3.4" r="0.9"/><circle cx="19" cy="3.4" r="0.9"/><circle cx="6.5" cy="7" r="0.9"/><circle cx="11.5" cy="7" r="0.9"/><circle cx="16.5" cy="7" r="0.9"/><circle cx="4" cy="10.6" r="0.9"/><circle cx="9" cy="10.6" r="0.9"/><circle cx="14" cy="10.6" r="0.9"/><circle cx="19" cy="10.6" r="0.9"/><circle cx="6.5" cy="14.2" r="0.9"/><circle cx="11.5" cy="14.2" r="0.9"/><circle cx="16.5" cy="14.2" r="0.9"/><circle cx="4" cy="17.8" r="0.9"/><circle cx="9" cy="17.8" r="0.9"/><circle cx="14" cy="17.8" r="0.9"/><circle cx="19" cy="17.8" r="0.9"/></g></svg>`,
    "44": `<svg viewBox="0 0 60 30" width="22" height="15" class="rounded-[2px] shrink-0" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" stroke-width="3.5"/><path d="M30 0 V30 M0 15 H60" stroke="#fff" stroke-width="11"/><path d="M30 0 V30 M0 15 H60" stroke="#C8102E" stroke-width="6"/></svg>`,
    "52": `<svg viewBox="0 0 60 42" width="22" height="15" class="rounded-[2px] shrink-0" aria-hidden="true"><rect width="20" height="42" fill="#006847"/><rect x="20" width="20" height="42" fill="#fff"/><rect x="40" width="20" height="42" fill="#CE1126"/><circle cx="30" cy="21" r="5" fill="#C5A572"/></svg>`,
  };

  function paintCountryFlags() {
    document.querySelectorAll<HTMLElement>("[data-flag-code]").forEach((slot) => {
      const code = slot.getAttribute("data-flag-code") || "";
      slot.innerHTML = COUNTRY_FLAGS[code] || "";
    });
  }

  function closeCountryMenu() {
    const menu = document.getElementById("countryCodeMenu");
    const button = document.getElementById("countryCodeButton");
    menu?.classList.add("hidden");
    button?.setAttribute("aria-expanded", "false");
  }

  function selectCountryCode(code: string) {
    const select = document.getElementById(
      "countryCodeSelect"
    ) as HTMLSelectElement | null;
    const label = document.getElementById("countryCodeLabel");
    const flag = document.getElementById("countryCodeFlag");
    const button = document.getElementById("countryCodeButton");
    const option = document.querySelector<HTMLButtonElement>(
      `#countryCodeMenu [data-country="${code}"]`
    );
    if (select) select.value = COUNTRY_FLAGS[code] ? code : "1";
    const dial = `+${select?.value || "1"}`;
    if (label) label.textContent = dial;
    if (flag) {
      flag.setAttribute("data-flag-code", code);
      flag.innerHTML = COUNTRY_FLAGS[code] || "";
    }
    const name = option?.getAttribute("data-country-name") || "";
    button?.setAttribute(
      "aria-label",
      `Country code, ${name} ${dial}`
    );
    document
      .querySelectorAll<HTMLButtonElement>("#countryCodeMenu [data-country]")
      .forEach((item) => {
        item.classList.toggle("bg-stone-50", item.dataset.country === code);
      });
    closeCountryMenu();
  }

  function renderSearchResults(results: ItunesTrack[]) {
    const searchResultsDropdown = document.getElementById(
      "searchResultsDropdown"
    );
    if (!searchResultsDropdown) return;

    if (!results || results.length === 0) {
      searchResultsDropdown.innerHTML = `<div class="p-4 text-xs text-stone-500 text-center">No songs found. Try searching another title.</div>`;
      searchResultsDropdown.classList.remove("hidden");
      return;
    }

    searchResultsDropdown.innerHTML = results
      .map((track) => {
        const artwork = track.artworkUrl100
          ? track.artworkUrl100.replace("100x100bb", "200x200bb")
          : "https://placehold.co/100x100/3a152e/ffffff?text=🎵";
        const trackTitleSafe = track.trackName.replace(/'/g, "\\'");
        const artistTitleSafe = track.artistName.replace(/'/g, "\\'");
        return `
                    <div onclick="selectSong('${trackTitleSafe}', '${artistTitleSafe}', '${artwork}', '${track.previewUrl || ""}')" 
                        class="p-3 hover:bg-stone-50 cursor-pointer flex items-center justify-between gap-3 transition">
                        <div class="flex items-center gap-3 min-w-0">
                            <img src="${artwork}" alt="${track.trackName}" class="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200">
                            <div class="min-w-0">
                                <h6 class="text-xs font-bold text-stone-900 truncate">${track.trackName}</h6>
                                <p class="text-[11px] text-stone-500 truncate">${track.artistName}</p>
                            </div>
                        </div>
                        ${
                          track.previewUrl
                            ? `
                            <button type="button" onclick="event.stopPropagation(); playPreview('${track.previewUrl}')" 
                                class="p-2 text-stone-400 hover:text-brand-plum text-xs flex items-center gap-1 font-bold shrink-0">
                                ▶ Preview
                            </button>
                        `
                            : ""
                        }
                    </div>
                `;
      })
      .join("");
    searchResultsDropdown.classList.remove("hidden");
  }

  function playPreview(url: string) {
    if (activeAudioPreview) activeAudioPreview.pause();
    activeAudioPreview = new Audio(url);
    void activeAudioPreview.play();
  }

  function selectSong(
    trackName: string,
    artistName: string,
    artworkUrl: string,
    _previewUrl: string
  ) {
    if (activeAudioPreview) activeAudioPreview.pause();
    const selectedTrackName = document.getElementById("selectedTrackName");
    const selectedArtistName = document.getElementById("selectedArtistName");
    const selectedTrackArt = document.getElementById(
      "selectedTrackArt"
    ) as HTMLImageElement | null;
    const spotifySearchLink = document.getElementById(
      "spotifySearchLink"
    ) as HTMLAnchorElement | null;
    const selectedSongData = document.getElementById(
      "selectedSongData"
    ) as HTMLInputElement | null;
    const selectedSongCard = document.getElementById("selectedSongCard");
    const searchResultsDropdown = document.getElementById(
      "searchResultsDropdown"
    );
    const songSearchInput = document.getElementById(
      "songSearchInput"
    ) as HTMLInputElement | null;

    if (selectedTrackName) selectedTrackName.innerText = trackName;
    if (selectedArtistName) selectedArtistName.innerText = artistName;
    if (selectedTrackArt) selectedTrackArt.src = artworkUrl;
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
    if (spotifySearchLink) spotifySearchLink.href = spotifyUrl;
    if (selectedSongData)
      selectedSongData.value = JSON.stringify({
        track: trackName,
        artist: artistName,
        spotifyUrl,
      });
    selectedSongCard?.classList.remove("hidden");
    searchResultsDropdown?.classList.add("hidden");
    if (songSearchInput) songSearchInput.value = `${trackName} - ${artistName}`;
  }

  function clearSelectedSong() {
    if (activeAudioPreview) activeAudioPreview.pause();
    document.getElementById("selectedSongCard")?.classList.add("hidden");
    const selectedSongData = document.getElementById(
      "selectedSongData"
    ) as HTMLInputElement | null;
    const songSearchInput = document.getElementById(
      "songSearchInput"
    ) as HTMLInputElement | null;
    if (selectedSongData) selectedSongData.value = "";
    if (songSearchInput) songSearchInput.value = "";
    document.getElementById("searchResultsDropdown")?.classList.add("hidden");
  }

  window.showPage = showPage;
  window.setGuestTier = setGuestTier;
  window.performGuestLookup = performGuestLookup;
  window.selectSong = selectSong;
  window.playPreview = playPreview;
  window.clearSelectedSong = clearSelectedSong;

  countdownTimer = setInterval(updateCountdown, 1000);
  updateCountdown();
  showPage("landing");

  const faqClicks: Array<[Element, EventListener]> = [];
  document.querySelectorAll(".faq-toggle").forEach((button) => {
    const handler = () => {
      const content = button.nextElementSibling;
      const icon = button.querySelector(".faq-icon");
      const isOpen = content && !content.classList.contains("hidden");
      document
        .querySelectorAll(".faq-content")
        .forEach((c) => c.classList.add("hidden"));
      document
        .querySelectorAll(".faq-icon")
        .forEach((i) => (i.textContent = "+"));
      if (!isOpen && content && icon) {
        content.classList.remove("hidden");
        icon.textContent = "−";
      }
    };
    button.addEventListener("click", handler);
    faqClicks.push([button, handler]);
  });

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileHandler = () => mobileMenu?.classList.toggle("hidden");
  mobileMenuBtn?.addEventListener("click", mobileHandler);

  const songSearchInput = document.getElementById(
    "songSearchInput"
  ) as HTMLInputElement | null;
  const searchResultsDropdown = document.getElementById(
    "searchResultsDropdown"
  );
  const songInputHandler = (e: Event) => {
    const query = (e.target as HTMLInputElement).value.trim();
    if (searchDebounce) clearTimeout(searchDebounce);
    if (query.length < 2) {
      searchResultsDropdown?.classList.add("hidden");
      return;
    }
    searchDebounce = setTimeout(() => {
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`
      )
        .then((res) => res.json())
        .then((data: { results: ItunesTrack[] }) =>
          renderSearchResults(data.results)
        )
        .catch(() => searchResultsDropdown?.classList.add("hidden"));
    }, 300);
  };
  songSearchInput?.addEventListener("input", songInputHandler);

  const outsideClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      songSearchInput &&
      !songSearchInput.contains(target) &&
      searchResultsDropdown &&
      !searchResultsDropdown.contains(target)
    ) {
      searchResultsDropdown.classList.add("hidden");
    }
    const countryPicker = document.getElementById("countryCodePicker");
    if (countryPicker && !countryPicker.contains(target)) closeCountryMenu();
  };
  document.addEventListener("click", outsideClick);

  const rsvpForm = document.getElementById("rsvpForm") as HTMLFormElement | null;
  const submitHandler = (e: Event) => {
    e.preventDefault();
    if (!rsvpForm) return;
    rsvpForm.classList.add("opacity-50", "pointer-events-none");

    const guestFirstName =
      (document.getElementById("rsvpFirstNameInput") as HTMLInputElement)
        ?.value || "";
    const guestLastName =
      (document.getElementById("rsvpLastNameInput") as HTMLInputElement)
        ?.value || "";
    const guestNames = `${guestFirstName} ${guestLastName}`.trim();
    const guestPhone =
      (document.getElementById("guestSearchInput") as HTMLInputElement)
        ?.value || pendingPhone;
    const brunchAttending =
      (
        document.querySelector(
          'input[name="brunchAttending"]:checked'
        ) as HTMLInputElement | null
      )?.value || "";
    const brunchKidsSelect = document.querySelector(
      "#rsvpBrunchBlock select"
    ) as HTMLSelectElement | null;
    const brunchKids = brunchKidsSelect ? brunchKidsSelect.value : "0";
    const barAttending =
      (
        document.querySelector(
          'input[name="barAttending"]:checked'
        ) as HTMLInputElement | null
      )?.value || "";
    const dietaryChecked = Array.from(
      document.querySelectorAll('#rsvp input[type="checkbox"]:checked')
    ).map((cb) => {
      const input = cb as HTMLInputElement;
      return (input.value || input.parentElement?.innerText || "").trim();
    });
    const dietary = dietaryChecked.length > 0 ? dietaryChecked.join(", ") : "None";

    let jukeboxTrack = "";
    let jukeboxArtist = "";
    let spotifyUrl = "";
    const songDataVal = (
      document.getElementById("selectedSongData") as HTMLInputElement | null
    )?.value;
    if (songDataVal) {
      try {
        const parsed = JSON.parse(songDataVal);
        jukeboxTrack = parsed.track || "";
        jukeboxArtist = parsed.artist || "";
        spotifyUrl = parsed.spotifyUrl || "";
      } catch {
        /* ignore */
      }
    }

    const payload = {
      guestFirstName,
      guestLastName,
      guestNames,
      guestPhone,
      brunchAttending,
      brunchKids,
      barAttending,
      dietary,
      jukeboxTrack,
      jukeboxArtist,
      spotifyUrl,
    };

    fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          warning?: boolean;
        };
        rsvpForm.classList.remove("opacity-50", "pointer-events-none");
        if (!res.ok) {
          showToast(
            data.warning ? "warning" : "error",
            data.error || "Could not save your RSVP."
          );
          return;
        }
        showToast("success", "RSVP received. We can't wait to celebrate with you.");
        document
          .getElementById("rsvpAlreadyFilledBanner")
          ?.classList.remove("hidden");
        const submitBtn = document.querySelector(
          '#rsvpForm button[type="submit"]'
        ) as HTMLButtonElement | null;
        if (submitBtn) submitBtn.textContent = "Update RSVP Response";
      })
      .catch(() => {
        rsvpForm.classList.remove("opacity-50", "pointer-events-none");
        showToast("error", "Could not save your RSVP.");
      });
  };
  rsvpForm?.addEventListener("submit", submitHandler);
  const adminDownloadBtn = document.getElementById("adminRsvpDownload");
  const adminDownloadHandler = () => {
    void downloadRsvpCsv();
  };
  adminDownloadBtn?.addEventListener("click", adminDownloadHandler);
  const adminShowReceived = document.getElementById("adminShowReceived");
  const adminShowPending = document.getElementById("adminShowPending");
  const showReceivedHandler = () => {
    rsvpView = "received";
    rsvpPage = 1;
    renderRsvpTable();
  };
  const showPendingHandler = () => {
    rsvpView = "pending";
    rsvpPage = 1;
    renderRsvpTable();
  };
  adminShowReceived?.addEventListener("click", showReceivedHandler);
  adminShowPending?.addEventListener("click", showPendingHandler);
  const adminDashboard = document.getElementById("adminDashboard");
  const adminPageHandler = (event: Event) => {
    const button = (event.target as HTMLElement | null)?.closest(
      "button[data-admin-page]"
    ) as HTMLButtonElement | null;
    if (!button || button.disabled) return;
    const table = button.getAttribute("data-admin-table");
    const direction = button.getAttribute("data-admin-page");
    const step = direction === "next" ? 1 : -1;
    if (table === "rsvp") {
      const total = rsvpView === "pending" ? adminPending.length : adminRsvps.length;
      rsvpPage = Math.min(pageCount(total), Math.max(1, rsvpPage + step));
      renderRsvpTable();
    }
    if (table === "attendees") {
      attendeePage = Math.min(
        pageCount(adminAttendees.length),
        Math.max(1, attendeePage + step)
      );
      renderAttendeeTable();
    }
  };
  adminDashboard?.addEventListener("click", adminPageHandler);
  const guestSearchInput = document.getElementById("guestSearchInput");
  const countryCodeHandler = () => syncCountryCodeField();
  guestSearchInput?.addEventListener("input", countryCodeHandler);
  paintCountryFlags();
  selectCountryCode("1");
  const countryCodeButton = document.getElementById(
    "countryCodeButton"
  ) as HTMLButtonElement | null;
  const countryMenu = document.getElementById("countryCodeMenu");
  const countryButtonHandler = () => {
    if (countryCodeButton?.disabled) return;
    const open = countryMenu?.classList.contains("hidden");
    if (open) {
      countryMenu?.classList.remove("hidden");
      countryCodeButton?.setAttribute("aria-expanded", "true");
    } else {
      closeCountryMenu();
    }
  };
  const countryOptionHandler = (event: Event) => {
    const option = (event.target as HTMLElement | null)?.closest(
      "[data-country]"
    ) as HTMLButtonElement | null;
    if (!option?.dataset.country) return;
    selectCountryCode(option.dataset.country);
  };
  countryCodeButton?.addEventListener("click", countryButtonHandler);
  countryMenu?.addEventListener("click", countryOptionHandler);
  syncCountryCodeField();

  fetch("/api/auth/login")
    .then((res) => res.json())
    .then((data: { guest?: Guest | null }) => {
      if (data.guest) {
        pendingPhone = data.guest.phone || "";
        pendingLogin = data.guest.email || data.guest.phone || "";
        const input = document.getElementById(
          "guestSearchInput"
        ) as HTMLInputElement | null;
        if (input && !input.value) {
          input.value = data.guest.email || data.guest.phone || "";
        }
      }
    })
    .catch(() => undefined);

  return () => {
    if (countdownTimer) clearInterval(countdownTimer);
    if (searchDebounce) clearTimeout(searchDebounce);
    faqClicks.forEach(([el, handler]) => el.removeEventListener("click", handler));
    mobileMenuBtn?.removeEventListener("click", mobileHandler);
    songSearchInput?.removeEventListener("input", songInputHandler);
    document.removeEventListener("click", outsideClick);
    rsvpForm?.removeEventListener("submit", submitHandler);
    adminDownloadBtn?.removeEventListener("click", adminDownloadHandler);
    adminShowReceived?.removeEventListener("click", showReceivedHandler);
    adminShowPending?.removeEventListener("click", showPendingHandler);
    adminDashboard?.removeEventListener("click", adminPageHandler);
    guestSearchInput?.removeEventListener("input", countryCodeHandler);
    countryCodeButton?.removeEventListener("click", countryButtonHandler);
    countryMenu?.removeEventListener("click", countryOptionHandler);
  };
}
