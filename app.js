/**
 * בית היוגה — מערכת ניהול לידים ומשימות (CRM)
 * Includes:
 * 1. Full "הלידים שלי" (/crm) Kanban & List View
 * 2. Full "המשימות שלי" (/today) Tasks screen (Today, Tomorrow, Yesterday, Date Range, Overdue)
 *    bound directly to leads and their "הפעולה הבאה" indicator
 * 3. Expandable Custom Statuses (add, rename, recolor, reorder, toggle board column visibility)
 * 4. Time-based Column Transition Engine (e.g. "מכירה" -> after 1 week -> "לאחר שבוע")
 */

const STORAGE_KEY = "tc_crm_local_state_v2";

const UNIT_MS = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

const UNIT_LABELS = {
  seconds: "שניות",
  minutes: "דקות",
  hours: "שעות",
  days: "ימים",
  weeks: "שבועות",
};

const TASK_TYPE_META = {
  call: { label: "📞 שיחת טלפון", short: "שיחת טלפון" },
  whatsapp: { label: "💬 וואטסאפ", short: "וואטסאפ" },
  meeting: { label: "🤝 פגישה", short: "פגישה" },
  intro_session: { label: "🏋️ אימון היכרות", short: "אימון היכרות" },
  follow_up: { label: "🔔 מעקב", short: "מעקב" },
  task: { label: "✅ משימה", short: "משימה" },
};

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getOffsetDateKey(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return toDateKey(d);
}

function formatDateDisplay(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("-");
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDefaultState() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const todayKey = getOffsetDateKey(0);
  const tomorrowKey = getOffsetDateKey(1);
  const yesterdayKey = getOffsetDateKey(-1);

  return {
    activePage: "crm", // 'crm' | 'today'
    viewMode: "kanban",
    tasksTab: "today", // 'today' | 'tomorrow' | 'yesterday' | 'range' | 'overdue'
    showAllColumns: true,
    searchQuery: "",
    stages: [
      { id: "249", name: "ליד חדש", color: "#4f8cff", showInBoard: true, isSystem: true },
      { id: "250", name: "בוצע ניסיון שיחה", color: "#38bdf8", showInBoard: true, isSystem: true },
      { id: "251", name: "שיחה שהתקיימה", color: "#a78bfa", showInBoard: true, isSystem: true },
      { id: "252", name: "אימון היכרות", color: "#ffb74d", showInBoard: true, isSystem: true },
      { id: "253", name: "מעקב אחרי אימון היכרות", color: "#f472b6", showInBoard: true, isSystem: true },
      { id: "254", name: "מכירה", color: "#16b364", showInBoard: true, isTerminal: true },
      { id: "256", name: "לאחר שבוע", color: "#8b5cf6", showInBoard: true, isTerminal: true },
      { id: "255", name: "לא נסגר", color: "#ef4444", showInBoard: false, isTerminal: true },
    ],
    rules: [
      {
        id: "rule_default_1",
        fromStageId: "254", // מכירה
        toStageId: "256",   // לאחר שבוע
        durationValue: 1,
        durationUnit: "weeks",
        enabled: true,
      },
    ],
    tasks: [
      {
        id: "T1",
        leadId: "L104",
        type: "call",
        dueDate: todayKey,
        dueTime: "17:00",
        note: "ביקשה שנחזור אליה אחרי העבודה להסבר על כרטיסיית היכרות",
        done: false,
      },
      {
        id: "T2",
        leadId: "L101",
        type: "whatsapp",
        dueDate: todayKey,
        dueTime: "13:40",
        note: "לשלוח מערכת שעות של השבוע הקרוב בוואטסאפ",
        done: false,
      },
      {
        id: "T3",
        leadId: "L106",
        type: "intro_session",
        dueDate: tomorrowKey,
        dueTime: "10:30",
        note: "תואם שיעור ניסיון יוגה נשית — לוודא הגעה בבוקר",
        done: false,
      },
      {
        id: "T4",
        leadId: "L107",
        type: "follow_up",
        dueDate: tomorrowKey,
        dueTime: "14:00",
        note: "שיחת סיכום אחרי אימון היכרות והצעת מנוי שנתי",
        done: false,
      },
      {
        id: "T5",
        leadId: "L105",
        type: "call",
        dueDate: yesterdayKey,
        dueTime: "11:00",
        note: "לסגור סופית הגעה עם חברה שלה דורין",
        done: false,
      },
      {
        id: "T6",
        leadId: "L108",
        type: "whatsapp",
        dueDate: yesterdayKey,
        dueTime: "09:30",
        note: "ווטסאפ ברוכים הבאים לאחר רכישת כרטיסייה",
        done: true,
      },
    ],
    leads: [
      {
        id: "L101",
        name: "ליסה נתנאל",
        phone: "+972533011333",
        email: "alisa31986@gmail.com",
        stageId: "249",
        platform: "אינסטגרם",
        meta: "קמפיין חדש1 · 35-60 נשים · 8.10, 10.11",
        formName: "טופס לידים חדש",
        leadType: "טופס לידים",
        createdAt: now - 6 * hour,
        stageEnteredAt: now - 6 * hour,
        notes: [
          { text: "ליד נקלט אוטומטית מקמפיין אינסטגרם", date: "היום, 07:00", author: "מערכת" }
        ],
      },
      {
        id: "L102",
        name: "מיכל אברהמי",
        phone: "052-8441920",
        email: "michal.av@gmail.com",
        stageId: "249",
        platform: "פייסבוק",
        meta: "קמפיין חדש1 · 35-60 נשים · מודעת וידאו",
        formName: "טופס לידים חדש",
        leadType: "טופס לידים",
        createdAt: now - 3 * hour,
        stageEnteredAt: now - 3 * hour,
        notes: [],
      },
      {
        id: "L103",
        name: "Lena Mullokandov Hariton",
        phone: "+972544203837",
        email: "elena290674@gmail.com",
        stageId: "250",
        platform: "פייסבוק",
        meta: "קמפיין חדש1 · 35-60 נשים · 8.10, 10.11",
        formName: "טופס לידים חדש",
        leadType: "טופס לידים",
        createdAt: now - 8 * day,
        stageEnteredAt: now - 2 * day,
        notes: [
          { text: "ניסיון חיוג ראשון, לא היה מענה, נשלחה הודעת וואטסאפ", date: "לפני יומיים", author: "בית היוגה" }
        ],
      },
      {
        id: "L104",
        name: "רונית שחר",
        phone: "054-6691203",
        email: "ronit.sh@gmail.com",
        stageId: "250",
        platform: "אינסטגרם",
        meta: "קמפיין סתיו · יוגה נשית",
        formName: "טופס לידים חדש",
        leadType: "טופס לידים",
        createdAt: now - 1 * day,
        stageEnteredAt: now - 18 * hour,
        notes: [],
      },
      {
        id: "L105",
        name: "קרן ציפר",
        phone: "0509923881",
        email: "kerenzip14@gmail.com",
        stageId: "251",
        platform: "חבר מביא חבר",
        meta: "חבר מביא חבר · המליץ: דורין סבחה 0504564536",
        formName: "המלצת חבר",
        leadType: "referral",
        createdAt: now - 15 * day,
        stageEnteredAt: now - 4 * day,
        notes: [
          { text: "לסגור סופית אבל ככל הנראה תגיע ביום שני עם דורין", date: "11.11, 08:23", author: "בית היוגה" },
          { text: "🎁 הגיע דרך «חבר מביא חבר» — המליץ: דורין סבחה (0504564536) / ללא ניסיון", date: "10.11, 19:10", author: "מערכת" }
        ],
      },
      {
        id: "L106",
        name: "נועה ברקוביץ",
        phone: "058-4410922",
        email: "noa.berko@gmail.com",
        stageId: "252",
        platform: "אינסטגרם",
        meta: "קמפיין חדש1 · תיאמה שיעור ניסיון ליום שלישי",
        formName: "טופס לידים חדש",
        leadType: "טופס לידים",
        createdAt: now - 5 * day,
        stageEnteredAt: now - 2 * day,
        notes: [],
      },
      {
        id: "L107",
        name: "יעל גולן",
        phone: "050-7123987",
        email: "yael.golan@walla.co.il",
        stageId: "253",
        platform: "לקוח עבר",
        meta: "חזרה לאימון היכרות מחודש · מתעניינת במנוי שנתי",
        formName: "ידני",
        leadType: "ידני",
        createdAt: now - 6 * day,
        stageEnteredAt: now - 1 * day,
        notes: [],
      },
      {
        id: "L108",
        name: "שירה לוי (דוגמא במכירה)",
        phone: "052-3391044",
        email: "shira.levi@gmail.com",
        stageId: "254",
        platform: "חבר מביא חבר",
        meta: "רכשה כרטיסיית היכרות · נמצאת בעמודת מכירה (תעבור אוטומטית ל'לאחר שבוע')",
        formName: "המלצת חבר",
        leadType: "referral",
        createdAt: now - 3 * day,
        stageEnteredAt: now - 2 * day,
        notes: [
          { text: "נסגרה מכירה! החוק האוטומטי יעביר אותה לעמודת 'לאחר שבוע' כשיחלפו 7 ימים מרגע הכניסה לעמודה.", date: "לפני יומיים", author: "בית היוגה" }
        ],
      }
    ],
  };
}

let state = loadState();
let activeDrawerLeadId = null;
let draggedLeadId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.stages) && Array.isArray(parsed.leads)) {
        if (!Array.isArray(parsed.tasks)) parsed.tasks = getDefaultState().tasks;
        if (!parsed.activePage) parsed.activePage = "crm";
        if (!parsed.tasksTab) parsed.tasksTab = "today";
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read state from localStorage", e);
  }
  return getDefaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state", e);
  }
}

function resetDemoData() {
  const currentPage = state.activePage || "crm";
  state = getDefaultState();
  state.activePage = currentPage;
  saveState();
  renderAll();
  showToast("🔄 נתוני הדמו, המשימות והאוטומציות אופסו לברירת המחדל");
}

// ============================================================================
// Helpers & Lead Next-Action Computation from Tasks
// ============================================================================

function getStageById(stageId) {
  return state.stages.find((s) => s.id === stageId);
}

function getLeadById(leadId) {
  return state.leads.find((l) => l.id === leadId);
}

function getOpenTasksForLead(leadId) {
  return (state.tasks || [])
    .filter((t) => t.leadId === leadId && !t.done)
    .sort((a, b) => `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`));
}

function computeLeadNextActionInfo(lead) {
  const openTasks = getOpenTasksForLead(lead.id);
  const todayKey = getOffsetDateKey(0);
  const tomorrowKey = getOffsetDateKey(1);

  if (openTasks.length > 0) {
    const nextTask = openTasks[0];
    const typeInfo = TASK_TYPE_META[nextTask.type] || TASK_TYPE_META.task;
    if (nextTask.dueDate < todayKey) {
      return {
        label: `⚠️ באיחור: ${typeInfo.short} (${formatDateDisplay(nextTask.dueDate)} ${nextTask.dueTime})`,
        type: "overdue",
      };
    }
    if (nextTask.dueDate === todayKey) {
      return {
        label: `${typeInfo.label} · היום ב-${nextTask.dueTime}`,
        type: "today",
      };
    }
    if (nextTask.dueDate === tomorrowKey) {
      return {
        label: `${typeInfo.label} · מחר ב-${nextTask.dueTime}`,
        type: "future",
      };
    }
    return {
      label: `${typeInfo.label} · ${formatDateDisplay(nextTask.dueDate)} ${nextTask.dueTime}`,
      type: "future",
    };
  }

  // No open task scheduled — check if cooling/rotting (7+ days old)
  const ageDays = (Date.now() - (lead.createdAt || Date.now())) / (24 * 60 * 60 * 1000);
  if (ageDays >= 7) {
    return {
      label: "🥶 מתקרר — אין מעקב",
      type: "rotting",
    };
  }
  return {
    label: "אין פעולה הבאה",
    type: "none",
  };
}

function getPlatformBadgeClass(platform) {
  switch (platform) {
    case "אינסטגרם":
      return "pf-ig";
    case "פייסבוק":
      return "pf-fb";
    case "לקוח עבר":
      return "pf-past";
    case "חבר מביא חבר":
      return "pf-ref";
    default:
      return "pf-web";
  }
}

function formatRelativeAge(timestampMs) {
  const diff = Math.max(0, Date.now() - timestampMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `לפני ${sec} שנ׳`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `לפני ${min} ד׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} ש׳`;
  const days = Math.floor(hr / 24);
  return `לפני ${days} י׳`;
}

function formatDurationShort(ms) {
  if (ms <= 0) return "כעת";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec} שנ׳`;
  const min = Math.ceil(sec / 60);
  if (min < 60) return `${min} דק׳`;
  const hr = Math.ceil(min / 60);
  if (hr < 24) return `${hr} שע׳`;
  const days = (ms / (24 * 60 * 60 * 1000)).toFixed(1).replace(/\.0$/, "");
  return `${days} ימים`;
}

function getRuleForStage(stageId) {
  return state.rules.find((r) => r.enabled && r.fromStageId === stageId);
}

function getRuleDurationMs(rule) {
  const mult = UNIT_MS[rule.durationUnit] || UNIT_MS.days;
  return Number(rule.durationValue) * mult;
}

// ============================================================================
// Page Navigation: "הלידים שלי" (/crm) <-> "המשימות שלי" (/today)
// ============================================================================

function switchPage(pageName) {
  state.activePage = pageName;
  saveState();

  const isCrm = pageName === "crm";
  document.getElementById("pageCrm").style.display = isCrm ? "flex" : "none";
  document.getElementById("pageToday").style.display = isCrm ? "none" : "flex";

  document.getElementById("navLeads").classList.toggle("active", isCrm);
  document.getElementById("navTasks").classList.toggle("active", !isCrm);

  const headerTitle = document.getElementById("pageHeaderTitle");
  const headerSub = document.getElementById("pageHeaderSubtitle");
  const headerSwitchBtn = document.getElementById("headerSwitchPageBtn");

  if (isCrm) {
    headerTitle.textContent = "הלידים שלי";
    headerSub.textContent = "פייפליין המכירה של בית היוגה · תומך בהרחבת סטטוסים ומעבר עמודות אוטומטי מבוסס זמן";
    headerSwitchBtn.textContent = "📋 המשימות שלי";
    headerSwitchBtn.onclick = () => switchPage("today");
  } else {
    headerTitle.textContent = "📋 המשימות שלי";
    headerSub.textContent = "כל המשימות והשיחות שמחכות לך בבית היוגה — לפי יום";
    headerSwitchBtn.textContent = "🗂️ הלידים שלי";
    headerSwitchBtn.onclick = () => switchPage("crm");
  }

  renderAll();
}

// ============================================================================
// Time-Based Column Transition Engine
// ============================================================================

function evaluateAutomationRules() {
  const now = Date.now();
  let movedCount = 0;

  state.leads.forEach((lead) => {
    const rule = getRuleForStage(lead.stageId);
    if (!rule) return;

    const targetStage = getStageById(rule.toStageId);
    if (!targetStage) return;

    const enteredAt = lead.stageEnteredAt || lead.createdAt || now;
    const requiredMs = getRuleDurationMs(rule);
    const elapsedMs = now - enteredAt;

    if (elapsedMs >= requiredMs) {
      const fromStageName = getStageById(lead.stageId)?.name || "עמודה קודמת";
      lead.stageId = targetStage.id;
      lead.stageEnteredAt = now;
      lead.lastAutoMovedInfo = `הועבר אוטומטית מ"${fromStageName}" אחרי ${rule.durationValue} ${UNIT_LABELS[rule.durationUnit]}`;
      lead.notes = lead.notes || [];
      lead.notes.unshift({
        text: `⚡ אוטומציה: הליד הועבר אוטומטית מעמודת "${fromStageName}" לעמודת "${targetStage.name}" לאחר ${rule.durationValue} ${UNIT_LABELS[rule.durationUnit]}.`,
        date: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
        author: "מנוע אוטומציה",
      });
      movedCount++;
      showToast(`⚡ הליד "${lead.name}" עבר אוטומטית מ"${fromStageName}" ל"${targetStage.name}"!`);
    }
  });

  if (movedCount > 0) {
    saveState();
    renderAll();
    if (activeDrawerLeadId) {
      renderDrawerContent(activeDrawerLeadId);
    }
  } else {
    updateLiveCountdowns();
  }
}

function updateLiveCountdowns() {
  const now = Date.now();
  document.querySelectorAll("[data-countdown-lead]").forEach((el) => {
    const leadId = el.getAttribute("data-countdown-lead");
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const rule = getRuleForStage(lead.stageId);
    if (!rule) return;
    const targetStage = getStageById(rule.toStageId);
    if (!targetStage) return;
    const remaining = Math.max(0, getRuleDurationMs(rule) - (now - (lead.stageEnteredAt || lead.createdAt)));
    el.textContent = `⏱️ יעבור ל"${targetStage.name}" בעוד ${formatDurationShort(remaining)}`;
  });
}

function simulateTimeTravel(minutesForward) {
  const shiftMs = minutesForward * 60 * 1000;
  state.leads.forEach((lead) => {
    lead.stageEnteredAt = (lead.stageEnteredAt || lead.createdAt) - shiftMs;
    lead.createdAt = lead.createdAt - shiftMs;
  });
  saveState();
  const label = minutesForward >= 7 * 24 * 60 ? "7 ימים" : `${Math.round(minutesForward / (60 * 24))} יום`;
  showToast(`⏩ סימולציית זמן: קידמנו את זמן השהייה של הלידים ב-${label} קדימה`);
  evaluateAutomationRules();
  renderAll();
}

// ============================================================================
// Stage Move & Drag-and-Drop
// ============================================================================

function moveLeadToStage(leadId, newStageId, sourceLabel = "ידני") {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead || lead.stageId === newStageId) return;

  const oldStage = getStageById(lead.stageId);
  const newStage = getStageById(newStageId);
  if (!newStage) return;

  lead.stageId = newStageId;
  lead.stageEnteredAt = Date.now();
  delete lead.lastAutoMovedInfo;

  lead.notes = lead.notes || [];
  lead.notes.unshift({
    text: `שלב שונה מ"${oldStage ? oldStage.name : ""}" ל"${newStage.name}" (${sourceLabel})`,
    date: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    author: "בית היוגה",
  });

  saveState();
  renderAll();
  if (activeDrawerLeadId === leadId) {
    renderDrawerContent(leadId);
  }

  const matchingRule = getRuleForStage(newStageId);
  if (matchingRule) {
    const destStage = getStageById(matchingRule.toStageId);
    showToast(
      `✅ "${lead.name}" הועבר ל"${newStage.name}". ⏱️ מתוזמן לעבור ל"${destStage?.name}" בעוד ${matchingRule.durationValue} ${UNIT_LABELS[matchingRule.durationUnit]}`
    );
  } else {
    showToast(`✅ "${lead.name}" הועבר לעמודה "${newStage.name}"`);
  }
}

function handleDragStart(event, leadId) {
  draggedLeadId = leadId;
  event.dataTransfer.setData("text/plain", leadId);
  event.currentTarget.classList.add("dragging");
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".kanban-col.drag-over").forEach((col) => col.classList.remove("drag-over"));
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleDrop(event, targetStageId) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  const leadId = event.dataTransfer.getData("text/plain") || draggedLeadId;
  if (leadId) {
    moveLeadToStage(leadId, targetStageId, "גרירה בלוח");
  }
  draggedLeadId = null;
}

// ============================================================================
// My Tasks Screen ("📋 המשימות שלי" - /today)
// ============================================================================

function setTasksTab(tabName) {
  state.tasksTab = tabName;
  saveState();
  renderTasksPage();
}

function renderTasksPage() {
  const todayKey = getOffsetDateKey(0);
  const tomorrowKey = getOffsetDateKey(1);
  const yesterdayKey = getOffsetDateKey(-1);

  const rangeFromInput = document.getElementById("taskRangeFrom");
  const rangeToInput = document.getElementById("taskRangeTo");
  if (!rangeFromInput.value) rangeFromInput.value = yesterdayKey;
  if (!rangeToInput.value) rangeToInput.value = getOffsetDateKey(7);

  const allTasks = state.tasks || [];

  // Bucket counts
  const todayTasks = allTasks.filter((t) => t.dueDate === todayKey);
  const tomorrowTasks = allTasks.filter((t) => t.dueDate === tomorrowKey);
  const yesterdayTasks = allTasks.filter((t) => t.dueDate === yesterdayKey);
  const overdueTasks = allTasks.filter((t) => !t.done && t.dueDate < todayKey);

  document.getElementById("taskCount_today").textContent = `(${todayTasks.length})`;
  document.getElementById("taskCount_tomorrow").textContent = `(${tomorrowTasks.length})`;
  document.getElementById("taskCount_yesterday").textContent = `(${yesterdayTasks.length})`;
  document.getElementById("taskCount_overdue").textContent = `(${overdueTasks.length})`;

  // Sidebar open tasks count badge
  const totalOpenTasks = allTasks.filter((t) => !t.done).length;
  const sidebarBadge = document.getElementById("sidebarOpenTasksBadge");
  if (sidebarBadge) sidebarBadge.textContent = totalOpenTasks;

  // Toggle active tab class
  ["today", "tomorrow", "yesterday", "range", "overdue"].forEach((tab) => {
    const btn = document.getElementById("taskTab_" + tab);
    if (btn) btn.classList.toggle("active", state.tasksTab === tab);
  });

  // Show/hide range inputs
  document.getElementById("tasksRangeInputs").style.display = state.tasksTab === "range" ? "flex" : "none";

  // Filter tasks for active tab
  let bucketTasks = [];
  if (state.tasksTab === "today") {
    bucketTasks = todayTasks;
  } else if (state.tasksTab === "tomorrow") {
    bucketTasks = tomorrowTasks;
  } else if (state.tasksTab === "yesterday") {
    bucketTasks = yesterdayTasks;
  } else if (state.tasksTab === "overdue") {
    bucketTasks = overdueTasks;
  } else if (state.tasksTab === "range") {
    const fromKey = rangeFromInput.value || "0000-00-00";
    const toKey = rangeToInput.value || "9999-12-31";
    bucketTasks = allTasks.filter((t) => t.dueDate >= fromKey && t.dueDate <= toKey);
  }

  // Search query filter inside tasks page
  const q = (document.getElementById("tasksSearchInput")?.value || "").trim().toLowerCase();
  if (q) {
    bucketTasks = bucketTasks.filter((t) => {
      const lead = getLeadById(t.leadId);
      const typeInfo = TASK_TYPE_META[t.type] || TASK_TYPE_META.task;
      return (
        (lead && lead.name.toLowerCase().includes(q)) ||
        (lead && lead.phone.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        typeInfo.label.toLowerCase().includes(q)
      );
    });
  }

  // Sort by dueDate + dueTime, open tasks first
  bucketTasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`);
  });

  const openInBucket = bucketTasks.filter((t) => !t.done).length;
  document.getElementById("tasksSummaryCount").textContent = `${bucketTasks.length} פעילויות · ${openInBucket} פתוחות`;

  const contentArea = document.getElementById("tasksContentArea");

  if (bucketTasks.length === 0) {
    const emptyMsg =
      state.tasksTab === "overdue"
        ? "אין פעילויות שלא בוצעו 🎉 פותחים ליד בפייפליין וקובעים לו פעולה הבאה."
        : "אין פעילויות מתוזמנות לתצוגה זו. ניתן לקבוע פעילות חדשה מהכפתור למעלה או מתוך כרטיס הליד.";
    contentArea.innerHTML = `<div class="panel-empty"><p style="margin: 0;">${emptyMsg}</p></div>`;
    return;
  }

  const rowsHtml = bucketTasks
    .map((task) => {
      const lead = getLeadById(task.leadId);
      const stage = lead ? getStageById(lead.stageId) : null;
      const typeInfo = TASK_TYPE_META[task.type] || TASK_TYPE_META.task;
      const isOverdue = !task.done && task.dueDate < todayKey;
      const isToday = task.dueDate === todayKey;

      const dateClass = isOverdue ? "tasks-due-overdue" : isToday ? "tasks-due-today" : "";
      const overdueTag = isOverdue ? `<span class="tasks-due-tag">באיחור</span>` : "";

      return `
        <tr class="tasks-row ${task.done ? "tasks-row-done" : ""}" onclick="if('${lead?.id || ""}') openLeadDrawer('${lead?.id || ""}', event)">
          <td class="tasks-col-done" onclick="event.stopPropagation()">
            <button
              type="button"
              class="act-check ${task.done ? "task-check-done" : ""}"
              title="${task.done ? "החזרה לפתוחות" : "סמן כבוצע"}"
              onclick="toggleTaskDone('${task.id}')"
            >✓</button>
          </td>
          <td class="tasks-col-date ${dateClass}">
            ${formatDateDisplay(task.dueDate)}
            ${overdueTag}
          </td>
          <td class="tasks-col-date" dir="ltr">${escapeHtml(task.dueTime || "10:00")}</td>
          <td class="tasks-col-title">
            <span class="tasks-title-chip">${typeInfo.label}</span>
            ${task.note ? `<span class="tasks-body-hint" title="${escapeHtml(task.note)}">${escapeHtml(task.note)}</span>` : ""}
          </td>
          <td>
            ${
              lead
                ? `
                  <a class="tasks-studio-link" onclick="event.stopPropagation(); openLeadDrawer('${lead.id}', event)" title="לכרטיס הליד">
                    ${escapeHtml(lead.name)}
                  </a>
                  <a class="tasks-phone" href="tel:${escapeHtml(lead.phone)}" dir="ltr" onclick="event.stopPropagation()">
                    📞 ${escapeHtml(lead.phone)}
                  </a>
                `
                : `<span style="color: var(--muted);">ליד שנמחק</span>`
            }
          </td>
          <td>
            <span style="color: var(--muted); font-weight: 600;">${escapeHtml(stage ? stage.name : "—")}</span>
          </td>
          <td style="text-align: left;" onclick="event.stopPropagation()">
            <button class="btn danger sm" type="button" onclick="deleteTask('${task.id}')" title="מחק פעילות">🗑️</button>
          </td>
        </tr>
      `;
    })
    .join("");

  contentArea.innerHTML = `
    <div class="tasks-table-wrap">
      <table class="data-table tasks-table">
        <thead>
          <tr>
            <th class="tasks-col-done">בוצע</th>
            <th>תאריך יעד</th>
            <th>שעה</th>
            <th>סוג הפעילות</th>
            <th>שם</th>
            <th>שלב</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function toggleTaskDone(taskId) {
  const task = (state.tasks || []).find((t) => t.id === taskId);
  if (!task) return;
  task.done = !task.done;

  const lead = getLeadById(task.leadId);
  const typeInfo = TASK_TYPE_META[task.type] || TASK_TYPE_META.task;
  if (lead && task.done) {
    lead.notes = lead.notes || [];
    lead.notes.unshift({
      text: `✅ בוצעה פעילות: ${typeInfo.short}${task.note ? " — " + task.note : ""}`,
      date: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      author: "בית היוגה",
    });
  }

  saveState();
  renderAll();
  if (activeDrawerLeadId) renderDrawerContent(activeDrawerLeadId);
  showToast(task.done ? "✅ הפעילות סומנה כבוצעה!" : "↩️ הפעילות הוחזרה לפתוחות");
}

function deleteTask(taskId) {
  state.tasks = (state.tasks || []).filter((t) => t.id !== taskId);
  saveState();
  renderAll();
  if (activeDrawerLeadId) renderDrawerContent(activeDrawerLeadId);
  showToast("🗑️ הפעילות הוסרה");
}

function openNewTaskModal(preselectedLeadId = null) {
  const leadSel = document.getElementById("ntLeadSelect");
  leadSel.innerHTML = state.leads
    .map(
      (l) =>
        `<option value="${l.id}" ${l.id === preselectedLeadId ? "selected" : ""}>${escapeHtml(l.name)} (${escapeHtml(
          l.phone
        )})</option>`
    )
    .join("");

  const dueInput = document.getElementById("ntDueInput");
  dueInput.value = `${getOffsetDateKey(0)}T10:00`;
  document.getElementById("ntNoteInput").value = "";
  document.getElementById("newTaskModal").classList.add("open");
}

function closeNewTaskModal() {
  document.getElementById("newTaskModal").classList.remove("open");
}

function handleCreateTaskModal(event) {
  event.preventDefault();
  const leadId = document.getElementById("ntLeadSelect").value;
  const type = document.getElementById("ntTypeSelect").value;
  const dueRaw = document.getElementById("ntDueInput").value;
  const note = document.getElementById("ntNoteInput").value.trim();

  createTaskForLead(leadId, type, dueRaw, note);
  closeNewTaskModal();
}

function createTaskForLead(leadId, type, dueDateTimeStr, note) {
  const [datePart, timePart] = (dueDateTimeStr || "").split("T");
  const dueDate = datePart || getOffsetDateKey(0);
  const dueTime = (timePart || "10:00").slice(0, 5);

  const newTask = {
    id: "T" + Date.now(),
    leadId,
    type,
    dueDate,
    dueTime,
    note,
    done: false,
  };

  state.tasks = state.tasks || [];
  state.tasks.push(newTask);

  const lead = getLeadById(leadId);
  const typeInfo = TASK_TYPE_META[type] || TASK_TYPE_META.task;
  if (lead) {
    lead.notes = lead.notes || [];
    lead.notes.unshift({
      text: `⏭️ נקבעה פעילות: ${typeInfo.short} ל-${formatDateDisplay(dueDate)} בשעה ${dueTime}${note ? " (" + note + ")" : ""}`,
      date: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      author: "בית היוגה",
    });
  }

  saveState();
  renderAll();
  if (activeDrawerLeadId === leadId) renderDrawerContent(leadId);
  showToast(`⏭️ נקבעה פעילות "${typeInfo.short}" לליד ${lead ? lead.name : ""}`);
}

// ============================================================================
// Rendering CRM Board & List
// ============================================================================

function getFilteredLeads() {
  const q = (state.searchQuery || "").trim().toLowerCase();
  return state.leads.filter((lead) => {
    if (!q) return true;
    return (
      (lead.name && lead.name.toLowerCase().includes(q)) ||
      (lead.phone && lead.phone.toLowerCase().includes(q)) ||
      (lead.email && lead.email.toLowerCase().includes(q)) ||
      (lead.meta && lead.meta.toLowerCase().includes(q)) ||
      (lead.platform && lead.platform.toLowerCase().includes(q))
    );
  });
}

function renderActiveRulesStrip() {
  const strip = document.getElementById("activeRulesStrip");
  const badge = document.getElementById("rulesCountBadge");
  const enabledRules = state.rules.filter((r) => r.enabled);
  badge.textContent = enabledRules.length;

  if (enabledRules.length === 0) {
    strip.innerHTML = `<span style="color: var(--muted); font-size: 13px; font-weight: 600;">⚡ אין כרגע חוקי מעבר אוטומטי פעילים. לחץ על "הגדר חוק חדש" כדי להוסיף.</span>`;
    return;
  }

  const pillsHtml = enabledRules
    .map((rule) => {
      const fromName = getStageById(rule.fromStageId)?.name || "?";
      const toName = getStageById(rule.toStageId)?.name || "?";
      return `
        <span class="automation-pill">
          <span>⚡ בסטטוס <strong>"${escapeHtml(fromName)}"</strong></span>
          <span class="rule-arrow">⬅️</span>
          <span>אחרי <strong>${rule.durationValue} ${UNIT_LABELS[rule.durationUnit]}</strong></span>
          <span class="rule-arrow">⬅️</span>
          <span>עובר ל-<strong>"${escapeHtml(toName)}"</strong></span>
        </span>
      `;
    })
    .join("");

  strip.innerHTML = `
    <span style="font-weight: 700; font-size: 13px; color: #4c1d95;">אוטומציות פעילות:</span>
    ${pillsHtml}
  `;
}

function renderKanban() {
  const container = document.getElementById("kanbanView");
  const filteredLeads = getFilteredLeads();

  const visibleStages = state.stages.filter((s) => {
    if (state.showAllColumns) return s.showInBoard !== false;
    return !s.isTerminal && s.showInBoard !== false;
  });

  let totalInVisibleBoard = 0;

  const colsHtml = visibleStages
    .map((stage) => {
      const stageLeads = filteredLeads.filter((l) => l.stageId === stage.id);
      totalInVisibleBoard += stageLeads.length;
      const stageRule = getRuleForStage(stage.id);
      const ruleTarget = stageRule ? getStageById(stageRule.toStageId) : null;

      const cardsHtml =
        stageLeads.length === 0
          ? `<div class="kanban-empty">אין לידים בעמודה זו<br/><span style="font-size:11.5px;">גרור ליד לכאן</span></div>`
          : stageLeads.map((lead) => renderLeadCardHtml(lead)).join("");

      return `
        <div
          class="kanban-col"
          ondragover="handleDragOver(event)"
          ondragleave="handleDragLeave(event)"
          ondrop="handleDrop(event, '${stage.id}')"
        >
          <div class="kanban-col-head">
            <div class="col-title-wrap">
              <span class="stage-dot" style="--stage-color: ${stage.color};"></span>
              <span class="col-title" title="${escapeHtml(stage.name)}">${escapeHtml(stage.name)}</span>
              ${
                stageRule && ruleTarget
                  ? `<span class="col-rule-indicator" title="אחרי ${stageRule.durationValue} ${UNIT_LABELS[stageRule.durationUnit]} עובר אוטומטית ל-${escapeHtml(ruleTarget.name)}">⚡ ${stageRule.durationValue} ${UNIT_LABELS[stageRule.durationUnit]} ⬅️ ${escapeHtml(ruleTarget.name)}</span>`
                  : ""
              }
            </div>
            <span class="kanban-count">${stageLeads.length}</span>
          </div>
          <div class="kanban-cards">
            ${cardsHtml}
          </div>
        </div>
      `;
    })
    .join("");

  const addColButtonHtml = `
    <button class="kanban-add-col" type="button" onclick="openStatusesModal()">
      <span style="font-size: 24px;">➕</span>
      <span>הוסף עמודה / סטטוס</span>
    </button>
  `;

  container.innerHTML = colsHtml + addColButtonHtml;

  const countLabel = document.getElementById("leadsCountLabel");
  countLabel.textContent =
    state.viewMode === "kanban"
      ? `${totalInVisibleBoard} לידים בצינור (${state.leads.length} סה״כ)`
      : `${filteredLeads.length} לידים`;
}

function renderLeadCardHtml(lead) {
  const pfClass = getPlatformBadgeClass(lead.platform);
  const rule = getRuleForStage(lead.stageId);
  const ruleTarget = rule ? getStageById(rule.toStageId) : null;
  const now = Date.now();
  const enteredAt = lead.stageEnteredAt || lead.createdAt || now;
  const nextInfo = computeLeadNextActionInfo(lead);

  let autoBannerHtml = "";
  if (rule && ruleTarget) {
    const remainingMs = Math.max(0, getRuleDurationMs(rule) - (now - enteredAt));
    autoBannerHtml = `
      <div class="auto-move-banner">
        <span data-countdown-lead="${lead.id}">⏱️ יעבור ל"${escapeHtml(ruleTarget.name)}" בעוד ${formatDurationShort(remainingMs)}</span>
      </div>
    `;
  } else if (lead.lastAutoMovedInfo) {
    autoBannerHtml = `
      <div class="auto-move-banner moved-already">
        <span>✅ ${escapeHtml(lead.lastAutoMovedInfo)}</span>
      </div>
    `;
  }

  const nextActionClass =
    nextInfo.type === "rotting"
      ? "next-rotting"
      : nextInfo.type === "today"
      ? "next-today"
      : nextInfo.type === "overdue"
      ? "next-overdue"
      : "next-none";

  const stripeClass = rule
    ? "stripe-auto"
    : nextInfo.type === "overdue"
    ? "stripe-overdue"
    : nextInfo.type === "today"
    ? "stripe-today"
    : nextInfo.type === "future"
    ? "stripe-future"
    : "stripe-none";

  const stageOptionsHtml = state.stages
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === lead.stageId ? "selected" : ""}>${escapeHtml(s.name)}</option>`
    )
    .join("");

  return `
    <article
      class="lead-card ${stripeClass}"
      draggable="true"
      ondragstart="handleDragStart(event, '${lead.id}')"
      ondragend="handleDragEnd(event)"
      onclick="openLeadDrawer('${lead.id}', event)"
    >
      <div class="lead-card-top">
        <strong>${escapeHtml(lead.name)}</strong>
        <div class="lead-badges">
          <span class="pf-badge ${pfClass}">${escapeHtml(lead.platform || "אתר")}</span>
        </div>
      </div>

      <a class="lead-phone" href="tel:${escapeHtml(lead.phone)}" onclick="event.stopPropagation()">
        📞 ${escapeHtml(lead.phone)}
      </a>

      ${lead.meta ? `<div class="lead-meta">${escapeHtml(lead.meta)}</div>` : ""}

      <div class="next-action ${nextActionClass}">
        <span>${escapeHtml(nextInfo.label)}</span>
      </div>

      ${autoBannerHtml}

      <div class="lead-card-foot" onclick="event.stopPropagation()">
        <span class="lead-age" title="זמן בעמודה הנוכחית">${formatRelativeAge(enteredAt)}</span>
        <select
          class="lead-stage-select"
          aria-label="שינוי סטטוס מהיר"
          onchange="moveLeadToStage('${lead.id}', this.value, 'בחירה מהכרטיס')"
        >
          ${stageOptionsHtml}
        </select>
      </div>
    </article>
  `;
}

function renderListView() {
  const stageFilterSelect = document.getElementById("listFilterStage");
  const currentStageFilter = stageFilterSelect.value || "ALL";
  const currentPlatformFilter = document.getElementById("listFilterPlatform").value || "ALL";

  stageFilterSelect.innerHTML =
    `<option value="ALL">הכל</option>` +
    state.stages
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === currentStageFilter ? "selected" : ""}>${escapeHtml(s.name)}</option>`
      )
      .join("");

  const filtered = getFilteredLeads().filter((lead) => {
    if (currentStageFilter !== "ALL" && lead.stageId !== currentStageFilter) return false;
    if (currentPlatformFilter !== "ALL" && lead.platform !== currentPlatformFilter) return false;
    return true;
  });

  const tbody = document.getElementById("listTableBody");
  const now = Date.now();

  tbody.innerHTML = filtered
    .map((lead) => {
      const rule = getRuleForStage(lead.stageId);
      const ruleTarget = rule ? getStageById(rule.toStageId) : null;
      const enteredAt = lead.stageEnteredAt || lead.createdAt || now;
      const pfClass = getPlatformBadgeClass(lead.platform);

      let autoCell = `<span style="color: var(--faint);">—</span>`;
      if (rule && ruleTarget) {
        const rem = Math.max(0, getRuleDurationMs(rule) - (now - enteredAt));
        autoCell = `<span style="color: #5b21b6; font-weight: 700;">⚡ ל"${escapeHtml(ruleTarget.name)}" בעוד ${formatDurationShort(rem)}</span>`;
      } else if (lead.lastAutoMovedInfo) {
        autoCell = `<span style="color: var(--green-ink); font-weight: 600;">✅ ${escapeHtml(lead.lastAutoMovedInfo)}</span>`;
      }

      const stageOptions = state.stages
        .map((s) => `<option value="${s.id}" ${s.id === lead.stageId ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
        .join("");

      return `
        <tr onclick="openLeadDrawer('${lead.id}', event)">
          <td><strong>${escapeHtml(lead.name)}</strong></td>
          <td dir="ltr" style="color: var(--accent); font-weight: 600;">${escapeHtml(lead.phone)}</td>
          <td dir="ltr">${escapeHtml(lead.email || "—")}</td>
          <td onclick="event.stopPropagation()">
            <select class="lead-stage-select" onchange="moveLeadToStage('${lead.id}', this.value, 'תצוגת רשימה')">
              ${stageOptions}
            </select>
          </td>
          <td>${formatRelativeAge(enteredAt)}</td>
          <td>${autoCell}</td>
          <td><span class="pf-badge ${pfClass}">${escapeHtml(lead.platform || "אתר")}</span></td>
          <td style="color: var(--muted); font-size: 12.5px;">${escapeHtml(lead.meta || "—")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  document.getElementById("showTerminalColsToggle").checked = state.showAllColumns;
  renderActiveRulesStrip();
  renderKanban();
  renderListView();
  renderTasksPage();
}

// ============================================================================
// View Mode & Search Controls
// ============================================================================

function setViewMode(mode) {
  state.viewMode = mode;
  saveState();
  document.getElementById("tabKanban").classList.toggle("active", mode === "kanban");
  document.getElementById("tabList").classList.toggle("active", mode === "list");
  document.getElementById("kanbanView").style.display = mode === "kanban" ? "flex" : "none";
  document.getElementById("listView").style.display = mode === "list" ? "block" : "none";
  renderAll();
}

function toggleShowAllColumns(checked) {
  state.showAllColumns = checked;
  saveState();
  renderAll();
}

function handleSearch(val) {
  state.searchQuery = val;
  renderAll();
}

// ============================================================================
// Modal 1: Manage & Expand Custom Statuses
// ============================================================================

function openStatusesModal() {
  renderStatusesManagerList();
  document.getElementById("statusesModal").classList.add("open");
}

function closeStatusesModal() {
  document.getElementById("statusesModal").classList.remove("open");
  renderAll();
}

function renderStatusesManagerList() {
  const container = document.getElementById("statusesManagerList");
  container.innerHTML = state.stages
    .map((stage, idx) => {
      const count = state.leads.filter((l) => l.stageId === stage.id).length;
      return `
        <div class="manager-row">
          <input
            type="color"
            class="color-swatch-input"
            value="${stage.color}"
            onchange="updateStageField('${stage.id}', 'color', this.value)"
            title="שנה צבע סטטוס"
          />
          <input
            type="text"
            class="input-control"
            style="flex: 1; height: 34px; font-weight: 700;"
            value="${escapeHtml(stage.name)}"
            onchange="updateStageField('${stage.id}', 'name', this.value)"
          />
          <span class="kanban-count" title="כמות לידים בסטטוס זה">${count} לידים</span>
          <label class="checkbox-label">
            <input
              type="checkbox"
              ${stage.showInBoard !== false ? "checked" : ""}
              onchange="updateStageField('${stage.id}', 'showInBoard', this.checked)"
            />
            <span>הצג בלוח</span>
          </label>
          <button
            class="btn secondary sm"
            type="button"
            ${idx === 0 ? "disabled" : ""}
            onclick="moveStageOrder(${idx}, -1)"
            title="הזז ימינה בלוח"
          >🔼</button>
          <button
            class="btn secondary sm"
            type="button"
            ${idx === state.stages.length - 1 ? "disabled" : ""}
            onclick="moveStageOrder(${idx}, 1)"
            title="הזז שמאלה בלוח"
          >🔽</button>
          <button
            class="btn danger sm"
            type="button"
            onclick="removeStage('${stage.id}')"
            title="הסר סטטוס"
          >🗑️</button>
        </div>
      `;
    })
    .join("");
}

function handleAddStatus(event) {
  event.preventDefault();
  const nameInput = document.getElementById("newStatusName");
  const colorInput = document.getElementById("newStatusColor");
  const showInput = document.getElementById("newStatusShowInBoard");

  const name = nameInput.value.trim();
  if (!name) return;

  const newStage = {
    id: "st_" + Date.now(),
    name,
    color: colorInput.value || "#10b981",
    showInBoard: showInput.checked,
    isTerminal: false,
  };

  state.stages.push(newStage);
  saveState();
  nameInput.value = "";
  renderStatusesManagerList();
  renderAll();
  showToast(`➕ הסטטוס החדש "${name}" נוסף ללוח בהצלחה!`);
}

function updateStageField(stageId, field, value) {
  const stage = getStageById(stageId);
  if (!stage) return;
  stage[field] = value;
  saveState();
  renderAll();
}

function moveStageOrder(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.stages.length) return;
  const temp = state.stages[index];
  state.stages[index] = state.stages[target];
  state.stages[target] = temp;
  saveState();
  renderStatusesManagerList();
  renderAll();
}

function removeStage(stageId) {
  if (state.stages.length <= 2) {
    showToast("⚠️ חייבים להישאר לפחות 2 סטטוסים במערכת");
    return;
  }
  const stage = getStageById(stageId);
  const count = state.leads.filter((l) => l.stageId === stageId).length;
  if (count > 0) {
    const fallbackStage = state.stages.find((s) => s.id !== stageId);
    state.leads.forEach((l) => {
      if (l.stageId === stageId) l.stageId = fallbackStage.id;
    });
    showToast(`ℹ️ ${count} לידים הועברו לעמודה "${fallbackStage.name}" והסטטוס "${stage?.name}" הוסר`);
  } else {
    showToast(`🗑️ הסטטוס "${stage?.name}" הוסר`);
  }
  state.stages = state.stages.filter((s) => s.id !== stageId);
  state.rules = state.rules.filter((r) => r.fromStageId !== stageId && r.toStageId !== stageId);
  saveState();
  renderStatusesManagerList();
  renderAll();
}

// ============================================================================
// Modal 2: Time-Based Column Transition Rules
// ============================================================================

function openAutomationsModal() {
  populateRuleStageSelects();
  renderRulesManagerList();
  document.getElementById("automationsModal").classList.add("open");
}

function closeAutomationsModal() {
  document.getElementById("automationsModal").classList.remove("open");
  renderAll();
}

function populateRuleStageSelects() {
  const fromSel = document.getElementById("ruleFromStage");
  const toSel = document.getElementById("ruleToStage");

  const options = state.stages
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");

  fromSel.innerHTML = options;
  toSel.innerHTML = options;

  if (getStageById("254")) fromSel.value = "254";
  if (getStageById("256")) toSel.value = "256";
  else if (state.stages.length > 1) toSel.value = state.stages[state.stages.length - 1].id;
}

function renderRulesManagerList() {
  const container = document.getElementById("rulesManagerList");
  if (state.rules.length === 0) {
    container.innerHTML = `<div class="kanban-empty">אין עדיין חוקי אוטומציה. הוסף חוק למעלה.</div>`;
    return;
  }

  container.innerHTML = state.rules
    .map((rule) => {
      const fromName = getStageById(rule.fromStageId)?.name || "סטטוס שנמחק";
      const toName = getStageById(rule.toStageId)?.name || "סטטוס שנמחק";
      return `
        <div class="manager-row" style="justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label class="checkbox-label">
              <input
                type="checkbox"
                ${rule.enabled ? "checked" : ""}
                onchange="toggleRuleEnabled('${rule.id}', this.checked)"
              />
              <span>פעיל</span>
            </label>
            <span>כאשר ליד בעמודה <strong>"${escapeHtml(fromName)}"</strong></span>
            <span>⬅️</span>
            <span>אחרי <strong>${rule.durationValue} ${UNIT_LABELS[rule.durationUnit]}</strong></span>
            <span>⬅️</span>
            <span>העבר אוטומטית לעמודה <strong>"${escapeHtml(toName)}"</strong></span>
          </div>
          <button class="btn danger sm" type="button" onclick="deleteRule('${rule.id}')">🗑️ הסר</button>
        </div>
      `;
    })
    .join("");
}

function handleAddRule(event) {
  event.preventDefault();
  const fromStageId = document.getElementById("ruleFromStage").value;
  const toStageId = document.getElementById("ruleToStage").value;
  const durationValue = Math.max(1, Number(document.getElementById("ruleDurationVal").value) || 1);
  const durationUnit = document.getElementById("ruleDurationUnit").value;

  if (fromStageId === toStageId) {
    showToast("⚠️ עמודת המקור ועמודת היעד חייבות להיות שונות");
    return;
  }

  state.rules = state.rules.filter((r) => r.fromStageId !== fromStageId);
  state.rules.push({
    id: "rule_" + Date.now(),
    fromStageId,
    toStageId,
    durationValue,
    durationUnit,
    enabled: true,
  });

  saveState();
  renderRulesManagerList();
  renderAll();

  const fromName = getStageById(fromStageId)?.name;
  const toName = getStageById(toStageId)?.name;
  showToast(`⚡ חוק נשמר: מ"${fromName}" ⬅️ אחרי ${durationValue} ${UNIT_LABELS[durationUnit]} ⬅️ ל"${toName}"`);
}

function toggleRuleEnabled(ruleId, enabled) {
  const rule = state.rules.find((r) => r.id === ruleId);
  if (!rule) return;
  rule.enabled = enabled;
  saveState();
  renderAll();
}

function deleteRule(ruleId) {
  state.rules = state.rules.filter((r) => r.id !== ruleId);
  saveState();
  renderRulesManagerList();
  renderAll();
  showToast("🗑️ חוק האוטומציה הוסר");
}

// ============================================================================
// Modal 3: Create New Lead
// ============================================================================

function openNewLeadModal() {
  const sel = document.getElementById("nlStage");
  sel.innerHTML = state.stages
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");
  document.getElementById("newLeadModal").classList.add("open");
}

function closeNewLeadModal() {
  document.getElementById("newLeadModal").classList.remove("open");
}

function handleCreateLead(event) {
  event.preventDefault();
  const name = document.getElementById("nlName").value.trim();
  const phone = document.getElementById("nlPhone").value.trim();
  const email = document.getElementById("nlEmail").value.trim();
  const stageId = document.getElementById("nlStage").value;
  const platform = document.getElementById("nlPlatform").value;
  const meta = document.getElementById("nlMeta").value.trim();

  if (!name || !phone) return;

  const now = Date.now();
  const newLead = {
    id: "L" + now,
    name,
    phone,
    email,
    stageId,
    platform,
    meta: meta || "ליד ידני מקומי",
    formName: "הוספה ידנית",
    leadType: "ידני",
    createdAt: now,
    stageEnteredAt: now,
    notes: [
      { text: "ליד נוצר במערכת המקומית", date: "כעת", author: "בית היוגה" }
    ],
  };

  state.leads.unshift(newLead);
  saveState();
  closeNewLeadModal();
  renderAll();
  event.target.reset();
  showToast(`➕ הליד "${name}" נוסף בהצלחה!`);
}

// ============================================================================
// Lead Details Drawer (with "+ פעילות" Activity Scheduler bound to My Tasks)
// ============================================================================

function openLeadDrawer(leadId, event) {
  if (event) event.stopPropagation();
  activeDrawerLeadId = leadId;
  renderDrawerContent(leadId);
  document.getElementById("leadDrawerBackdrop").classList.add("open");
}

function closeLeadDrawer() {
  activeDrawerLeadId = null;
  document.getElementById("leadDrawerBackdrop").classList.remove("open");
}

function toggleDrawerActivityForm() {
  const formEl = document.getElementById("drawerActivityForm");
  if (!formEl) return;
  formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
}

function handleDrawerCreateActivity(event, leadId) {
  event.preventDefault();
  const type = document.getElementById("drawerActType").value;
  const due = document.getElementById("drawerActDue").value;
  const note = document.getElementById("drawerActNote").value.trim();
  createTaskForLead(leadId, type, due, note);
}

function renderDrawerContent(leadId) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return;

  document.getElementById("drawerLeadName").textContent = lead.name;
  const stageOptions = state.stages
    .map((s) => `<option value="${s.id}" ${s.id === lead.stageId ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");

  const rule = getRuleForStage(lead.stageId);
  const ruleTarget = rule ? getStageById(rule.toStageId) : null;
  const enteredAt = lead.stageEnteredAt || lead.createdAt || Date.now();

  let ruleBoxHtml = "";
  if (rule && ruleTarget) {
    const rem = Math.max(0, getRuleDurationMs(rule) - (Date.now() - enteredAt));
    ruleBoxHtml = `
      <div class="auto-move-banner" style="padding: 10px 12px; font-size: 13px;">
        <span>⚡ <strong>אוטומציה פעילה על עמודה זו:</strong> יעבור אוטומטית לעמודה <strong>"${escapeHtml(ruleTarget.name)}"</strong> בעוד <strong>${formatDurationShort(rem)}</strong></span>
      </div>
    `;
  }

  // Lead tasks section ("⏭️ הפעולה הבאה")
  const leadTasks = (state.tasks || []).filter((t) => t.leadId === lead.id);
  const defaultTomorrow = `${getOffsetDateKey(1)}T10:00`;

  const leadTasksHtml =
    leadTasks.length === 0
      ? `<div style="font-size: 12.5px; color: var(--muted);">⚠️ אין פעולה הבאה מוגדרת לליד זה</div>`
      : leadTasks
          .map((t) => {
            const typeInfo = TASK_TYPE_META[t.type] || TASK_TYPE_META.task;
            return `
              <div class="task-mini-item" style="${t.done ? "opacity: 0.6;" : ""}">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button
                    type="button"
                    class="act-check ${t.done ? "task-check-done" : ""}"
                    onclick="toggleTaskDone('${t.id}')"
                    title="${t.done ? "סמן כפתוח" : "סמן כבוצע"}"
                  >✓</button>
                  <div>
                    <div style="font-weight: 700; ${t.done ? "text-decoration: line-through;" : ""}">${typeInfo.label} · ${formatDateDisplay(t.dueDate)} ${escapeHtml(t.dueTime)}</div>
                    ${t.note ? `<div style="font-size: 11.5px; color: var(--muted);">${escapeHtml(t.note)}</div>` : ""}
                  </div>
                </div>
                <button class="btn danger sm" type="button" onclick="deleteTask('${t.id}')">🗑️</button>
              </div>
            `;
          })
          .join("");

  const notesHtml =
    (lead.notes || []).length === 0
      ? `<div style="color: var(--faint); font-size: 13px;">אין הערות עדיין</div>`
      : (lead.notes || [])
          .map(
            (n) => `
          <div style="padding: 10px 12px; background: var(--panel-2); border-radius: 9px; border: 1px solid var(--border); font-size: 13px;">
            <div style="font-weight: 600;">${escapeHtml(n.text)}</div>
            <div style="font-size: 11.5px; color: var(--muted); margin-top: 4px;">${escapeHtml(n.date)} · ${escapeHtml(n.author)}</div>
          </div>
        `
          )
          .join("");

  document.getElementById("drawerBodyContent").innerHTML = `
    <div class="drawer-actions">
      <a class="btn secondary sm" href="https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}" target="_blank" rel="noreferrer">💬 וואטסאפ</a>
      <a class="btn secondary sm" href="tel:${escapeHtml(lead.phone)}">📞 חייג</a>
      ${lead.email ? `<a class="btn secondary sm" href="mailto:${escapeHtml(lead.email)}">✉️ מייל</a>` : ""}
    </div>

    ${ruleBoxHtml}

    <div class="form-field">
      <label>שלב בפייפליין</label>
      <select class="input-control" onchange="moveLeadToStage('${lead.id}', this.value, 'חלונית פרטי ליד')">
        ${stageOptions}
      </select>
    </div>

    <!-- Next Activity Box (Synced with My Tasks screen) -->
    <div class="activity-box">
      <div class="activity-box-head">
        <span>⏭️ הפעולה הבאה (${leadTasks.filter((t) => !t.done).length} פתוחות)</span>
        <button class="btn sm" type="button" onclick="toggleDrawerActivityForm()">+ פעילות</button>
      </div>

      <form id="drawerActivityForm" class="activity-form" style="display: none;" onsubmit="handleDrawerCreateActivity(event, '${lead.id}')">
        <div class="form-grid">
          <div class="form-field">
            <label>סוג</label>
            <select id="drawerActType" class="input-control" style="height: 34px;">
              <option value="call">📞 שיחת טלפון</option>
              <option value="whatsapp">💬 וואטסאפ</option>
              <option value="meeting">🤝 פגישה</option>
              <option value="intro_session">🏋️ אימון היכרות</option>
              <option value="follow_up">🔔 מעקב</option>
              <option value="task">✅ משימה</option>
            </select>
          </div>
          <div class="form-field">
            <label>מתי</label>
            <input id="drawerActDue" type="datetime-local" class="input-control" style="height: 34px;" dir="ltr" value="${defaultTomorrow}" required />
          </div>
        </div>
        <div class="form-field">
          <label>הערה (אופציונלי)</label>
          <input id="drawerActNote" type="text" class="input-control" style="height: 34px;" placeholder="למשל: לחזור אחרי 18:00" />
        </div>
        <button class="btn sm" type="submit">קבע פעילות</button>
      </form>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${leadTasksHtml}
      </div>
    </div>

    <dl class="drawer-details">
      <dt>טלפון</dt>
      <dd dir="ltr">${escapeHtml(lead.phone)}</dd>
      <dt>אימייל</dt>
      <dd dir="ltr">${escapeHtml(lead.email || "—")}</dd>
      <dt>פלטפורמה</dt>
      <dd>${escapeHtml(lead.platform || "—")}</dd>
      <dt>קמפיין / מקור</dt>
      <dd>${escapeHtml(lead.meta || "—")}</dd>
      <dt>זמן בעמודה</dt>
      <dd>${formatRelativeAge(enteredAt)}</dd>
    </dl>

    <div class="form-field">
      <label>הערות ויומן פעילות</label>
      <form onsubmit="handleAddNote(event, '${lead.id}')" style="display: flex; gap: 6px;">
        <input id="drawerNewNoteInput" type="text" class="input-control" style="flex: 1; height: 36px;" placeholder="הוסף תיעוד שיחה או הערה…" required />
        <button class="btn sm" type="submit">הוסף</button>
      </form>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${notesHtml}
    </div>
  `;
}

function handleAddNote(event, leadId) {
  event.preventDefault();
  const input = document.getElementById("drawerNewNoteInput");
  const text = input.value.trim();
  if (!text) return;

  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return;
  lead.notes = lead.notes || [];
  lead.notes.unshift({
    text,
    date: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    author: "בית היוגה",
  });
  saveState();
  renderDrawerContent(leadId);
  showToast("📝 ההערה נוספה לתיק הליד");
}

// ============================================================================
// Toast & Security Helpers
// ============================================================================

function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 150ms ease-out";
    setTimeout(() => toast.remove(), 160);
  }, 3800);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================================
// Boot & Background Tick
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  switchPage(state.activePage || "crm");
  setInterval(evaluateAutomationRules, 1000);
});


// ============================================================================
// Google Sheets Cloud Sync & Authorized Users / Daily Email Trigger Integration
// ============================================================================

let syncTimeoutId = null;

function setSyncIndicator(status, text) {
  const badge = document.getElementById("syncStatusBadge");
  const icon = document.getElementById("syncStatusIcon");
  const label = document.getElementById("syncStatusText");
  if (!badge || !icon || !label) return;

  label.textContent = text;
  if (status === "saving") {
    icon.textContent = "⏳";
    badge.style.background = "rgba(245, 179, 1, 0.16)";
    badge.style.borderColor = "rgba(245, 179, 1, 0.4)";
    badge.style.color = "#fde68a";
  } else if (status === "saved") {
    icon.textContent = "☁️";
    badge.style.background = "rgba(22, 179, 100, 0.16)";
    badge.style.borderColor = "rgba(22, 179, 100, 0.4)";
    badge.style.color = "#a6f4c5";
  } else if (status === "error") {
    icon.textContent = "⚠️";
    badge.style.background = "rgba(239, 68, 68, 0.18)";
    badge.style.borderColor = "rgba(239, 68, 68, 0.45)";
    badge.style.color = "#fca5a5";
  }
}

// Override saveState to sync directly with Google Sheets when running in Google Apps Script
const originalLocalSaveState = saveState;
saveState = function () {
  originalLocalSaveState();

  if (typeof google !== "undefined" && google.script && google.script.run) {
    setSyncIndicator("saving", "שומר ל-Google Sheets…");
    if (syncTimeoutId) clearTimeout(syncTimeoutId);

    syncTimeoutId = setTimeout(() => {
      google.script.run
        .withSuccessHandler((res) => {
          setSyncIndicator("saved", "מסונכרן עם Google Sheets ✓");
        })
        .withFailureHandler((err) => {
          console.error("Google Sheets sync error:", err);
          setSyncIndicator("error", "שגיאת סנכרון לשיטס");
          showToast("⚠️ שגיאה בשמירה ל-Google Sheets: " + (err.message || err));
        })
        .apiSyncState({
          stages: state.stages,
          rules: state.rules,
          leads: state.leads,
          tasks: state.tasks,
          allowedUsers: state.allowedUsers || [
            { email: "dgescheidt3@gmail.com", name: "דורון (מנהל מערכת)", receiveDailyEmail: true },
          ],
        });
    }, 350);
  }
};

// Override resetDemoData to also reset Google Sheets when in Apps Script
const originalLocalResetDemoData = resetDemoData;
resetDemoData = function () {
  if (typeof google !== "undefined" && google.script && google.script.run) {
    setSyncIndicator("saving", "מאפס נתונים בשיטס…");
    google.script.run
      .withSuccessHandler((serverState) => {
        applyServerState(serverState);
        setSyncIndicator("saved", "מסונכרן עם Google Sheets ✓");
        showToast("🔄 הנתונים ב-Google Sheets אופסו לברירת המחדל");
      })
      .withFailureHandler((err) => {
        showToast("⚠️ שגיאה באיפוס: " + (err.message || err));
      })
      .apiResetDemoData();
  } else {
    originalLocalResetDemoData();
  }
};

function applyServerState(serverState) {
  if (!serverState) return;
  if (Array.isArray(serverState.stages) && serverState.stages.length > 0) state.stages = serverState.stages;
  if (Array.isArray(serverState.rules)) state.rules = serverState.rules;
  if (Array.isArray(serverState.leads)) state.leads = serverState.leads;
  if (Array.isArray(serverState.tasks)) state.tasks = serverState.tasks;
  if (Array.isArray(serverState.allowedUsers)) state.allowedUsers = serverState.allowedUsers;

  if (serverState.currentUser && serverState.currentUser.email) {
    const badge = document.getElementById("currentUserBadge");
    if (badge) badge.textContent = serverState.currentUser.name || serverState.currentUser.email;
  }

  if (serverState.spreadsheetUrl) {
    const link = document.getElementById("openGoogleSheetLink");
    if (link) {
      link.href = serverState.spreadsheetUrl;
      link.style.display = "flex";
    }
  }

  const trigLabel = document.getElementById("triggersStatusLabel");
  if (trigLabel && serverState.triggersInstalled) {
    trigLabel.innerHTML = "✅ <strong>התזמון היומי פעיל בשרתי גוגל!</strong> מייל המשימות נשלח אוטומטית בכל בוקר ב-08:00.";
  }

  originalLocalSaveState();
  renderAll();
}

// ============================================================================
// Modal 5: Authorized Users & Daily Morning Email Controls
// ============================================================================

function openUsersAndEmailModal() {
  if (!Array.isArray(state.allowedUsers) || state.allowedUsers.length === 0) {
    state.allowedUsers = [
      { email: "dgescheidt3@gmail.com", name: "דורון (מנהל מערכת)", receiveDailyEmail: true, addedAt: getOffsetDateKey(0) },
      { email: "lightsofyoga@gmail.com", name: "בית היוגה", receiveDailyEmail: true, addedAt: getOffsetDateKey(0) },
    ];
  }
  renderAllowedUsersList();
  document.getElementById("usersModal").classList.add("open");
}

function closeUsersAndEmailModal() {
  document.getElementById("usersModal").classList.remove("open");
}

function renderAllowedUsersList() {
  const container = document.getElementById("allowedUsersList");
  if (!container) return;

  const users = state.allowedUsers || [];
  container.innerHTML = users
    .map((u, idx) => {
      const isPrimary = (u.email || "").toLowerCase() === "dgescheidt3@gmail.com";
      return `
        <div class="manager-row" style="justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <strong dir="ltr" style="color: var(--accent-ink);">${escapeHtml(u.email)}</strong>
            <span style="color: var(--muted);">(${escapeHtml(u.name || "")})</span>
            ${isPrimary ? `<span class="pf-badge pf-past">בעלים ראשי</span>` : ""}
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <label class="checkbox-label">
              <input
                type="checkbox"
                ${u.receiveDailyEmail !== false ? "checked" : ""}
                onchange="toggleUserDailyEmail(${idx}, this.checked)"
              />
              <span>קבלת מייל משימות יומי</span>
            </label>
            ${
              isPrimary
                ? ""
                : `<button class="btn danger sm" type="button" onclick="removeAllowedUser(${idx})">🗑️ הסר</button>`
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function handleAddAllowedUser(event) {
  event.preventDefault();
  const emailInput = document.getElementById("newAllowedEmail");
  const nameInput = document.getElementById("newAllowedName");
  const mailCheck = document.getElementById("newAllowedDailyMail");

  const email = emailInput.value.trim().toLowerCase();
  const name = nameInput.value.trim();
  if (!email) return;

  state.allowedUsers = state.allowedUsers || [];
  if (state.allowedUsers.some((u) => (u.email || "").toLowerCase() === email)) {
    showToast("⚠️ כתובת ג'ימייל זו כבר מופיעה ברשימת המורשים");
    return;
  }

  state.allowedUsers.push({
    email,
    name: name || email,
    receiveDailyEmail: mailCheck.checked,
    addedAt: getOffsetDateKey(0),
  });

  emailInput.value = "";
  nameInput.value = "";
  saveState();
  renderAllowedUsersList();
  showToast(`🔐 החשבון ${email} נוסף לרשימת המורשים ב-Google Sheets!`);
}

function toggleUserDailyEmail(index, checked) {
  if (!state.allowedUsers || !state.allowedUsers[index]) return;
  state.allowedUsers[index].receiveDailyEmail = checked;
  saveState();
  showToast(checked ? "📩 המשתמש יקבל מייל משימות יומי בבוקר" : "🔕 בוטלה שליחת מייל יומי למשתמש זה");
}

function removeAllowedUser(index) {
  if (!state.allowedUsers || !state.allowedUsers[index]) return;
  const removed = state.allowedUsers.splice(index, 1)[0];
  saveState();
  renderAllowedUsersList();
  showToast(`🗑️ ההרשאה של ${removed.email} הוסרה`);
}

function sendDailyEmailTestNow() {
  if (typeof google !== "undefined" && google.script && google.script.run) {
    showToast("📩 שולח כעת מייל סיכום משימות פתוחות לתיבת הג'ימייל שלך…");
    google.script.run
      .withSuccessHandler((res) => {
        showToast(`✅ המייל נשלח בהצלחה ל: ${(res.recipients || []).join(", ")} (${res.todayCount} להיום, ${res.overdueCount} באיחור)`);
      })
      .withFailureHandler((err) => {
        showToast("⚠️ שגיאה בשליחת המייל: " + (err.message || err));
      })
      .apiSendDailyEmailNow();
  } else {
    showToast("ℹ️ שליחת מייל אמיתית פועלת מתוך הקישור של Google Apps Script");
  }
}

function installDailyTriggersNow() {
  if (typeof google !== "undefined" && google.script && google.script.run) {
    showToast("⏰ מגדיר שעון מעורר יומי בשרתי גוגל…");
    google.script.run
      .withSuccessHandler((res) => {
        const trigLabel = document.getElementById("triggersStatusLabel");
        if (trigLabel) {
          trigLabel.innerHTML = "✅ <strong>התזמון היומי פעיל בשרתי גוגל!</strong> מייל המשימות נשלח אוטומטית בכל בוקר ב-08:00.";
        }
        showToast("✅ " + res.message);
      })
      .withFailureHandler((err) => {
        showToast("⚠️ שגיאה בהגדרת טריגר: " + (err.message || err));
      })
      .apiInstallAutomationTriggers();
  } else {
    showToast("ℹ️ הפעלת הטריגר היומי מתבצעת מתוך הקישור של Google Apps Script");
  }
}

// Automatically pull live state from Google Sheets on boot when hosted on Google Apps Script
document.addEventListener("DOMContentLoaded", () => {
  if (typeof google !== "undefined" && google.script && google.script.run) {
    setSyncIndicator("saving", "טוען נתונים מ-Google Sheets…");
    google.script.run
      .withSuccessHandler((serverState) => {
        applyServerState(serverState);
        setSyncIndicator("saved", "מחובר ל-Google Sheets ✓");
      })
      .withFailureHandler((err) => {
        console.error("Failed initial load from Google Sheets:", err);
        setSyncIndicator("error", "שגיאת חיבור לשיטס");
        showToast("⚠️ לא ניתן לטעון מ-Google Sheets: " + (err.message || err));
      })
      .apiGetInitialState();
  }
});


// ============================================================================
// Login Gate for Authorized Gmail Accounts (dgescheidt3@gmail.com & lightsofyoga@gmail.com)
// ============================================================================

const AUTH_SESSION_KEY = "by_crm_logged_in_user_v1";

function checkExistingLoginSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.email) {
        unlockAppForUser(user);
        return;
      }
    }
  } catch (e) {}
  const gate = document.getElementById("loginGateOverlay");
  if (gate) gate.classList.remove("hidden");
}

function unlockAppForUser(user) {
  const gate = document.getElementById("loginGateOverlay");
  if (gate) gate.classList.add("hidden");
  const badge = document.getElementById("currentUserBadge");
  if (badge) badge.textContent = user.name || user.email;
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const emailInput = document.getElementById("loginEmailInput");
  const passInput = document.getElementById("loginPassInput");
  const errBox = document.getElementById("loginErrorBox");
  const submitBtn = document.getElementById("loginSubmitBtn");

  const email = (emailInput.value || "").trim().toLowerCase();
  const pass = (passInput.value || "").trim();

  errBox.style.display = "none";

  const localAllowed = state.allowedUsers && state.allowedUsers.length > 0
    ? state.allowedUsers
    : [
        { email: "dgescheidt3@gmail.com", name: "דורון (מנהל מערכת)", accessCode: "nati1234", receiveDailyEmail: true },
        { email: "lightsofyoga@gmail.com", name: "בית היוגה", accessCode: "nati1234", receiveDailyEmail: true },
      ];

  if (typeof google !== "undefined" && google.script && google.script.run) {
    submitBtn.disabled = true;
    submitBtn.textContent = "מאמת חשבון מול Google Sheets…";
    google.script.run
      .withSuccessHandler((res) => {
        submitBtn.disabled = false;
        submitBtn.textContent = "כניסה למערכת";
        if (res && res.ok) {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(res.user));
          unlockAppForUser(res.user);
          showToast(`👋 שלום ${res.user.name}! התחברת בהצלחה`);
        } else {
          errBox.textContent = (res && res.error) || "גישה נדחתה";
          errBox.style.display = "block";
        }
      })
      .withFailureHandler((err) => {
        submitBtn.disabled = false;
        submitBtn.textContent = "כניסה למערכת";
        errBox.textContent = "שגיאת אימות: " + (err.message || err);
        errBox.style.display = "block";
      })
      .apiVerifyLogin(email, pass);
  } else {
    const found = localAllowed.find((u) => (u.email || "").trim().toLowerCase() === email);
    if (!found) {
      errBox.textContent = `⛔ החשבון ${email} אינו מופיע ברשימת המורשים של בית היוגה.`;
      errBox.style.display = "block";
      return;
    }
    const expected = String(found.accessCode || "nati1234").trim();
    if (expected && pass !== expected) {
      errBox.textContent = "סיסמה / קוד גישה שגויים";
      errBox.style.display = "block";
      return;
    }
    const user = { email: found.email, name: found.name || found.email };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    unlockAppForUser(user);
    showToast(`👋 שלום ${user.name}! התחברת בהצלחה`);
  }
}

function handleLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  const gate = document.getElementById("loginGateOverlay");
  if (gate) gate.classList.remove("hidden");
  showToast("🔒 התנתקת מהמערכת");
}

// Override sendDailyEmailTestNow to open the rich Daily Digest Email Preview & Gmail Compose
sendDailyEmailTestNow = function () {
  const todayKey = getOffsetDateKey(0);
  const openToday = (state.tasks || []).filter((t) => !t.done && t.dueDate === todayKey);
  const overdue = (state.tasks || []).filter((t) => !t.done && t.dueDate < todayKey);
  const recipients = (
    state.allowedUsers && state.allowedUsers.length > 0
      ? state.allowedUsers.filter((u) => u.receiveDailyEmail !== false).map((u) => u.email)
      : ["dgescheidt3@gmail.com", "lightsofyoga@gmail.com"]
  ).join(",");

  const subject = `📋 בית היוגה · המשימות הפתוחות להיום (${formatDateDisplay(todayKey)}) — ${openToday.length} להיום, ${overdue.length} באיחור`;

  const lines = [];
  lines.push(`שלום,`);
  lines.push(`להלן סיכום המשימות והשיחות הפתוחות במערכת בית היוגה להיום (${formatDateDisplay(todayKey)}):`);
  lines.push(``);
  lines.push(`🟢 משימות להיום (${openToday.length}):`);
  if (openToday.length === 0) {
    lines.push(`• אין משימות פתוחות להיום`);
  } else {
    openToday.forEach((t) => {
      const lead = getLeadById(t.leadId);
      const typeInfo = TASK_TYPE_META[t.type] || TASK_TYPE_META.task;
      lines.push(`• [${t.dueTime || "10:00"}] ${typeInfo.label} — ${lead ? lead.name : "ליד"} (${lead ? lead.phone : ""})${t.note ? " | " + t.note : ""}`);
    });
  }
  lines.push(``);
  lines.push(`🔴 משימות שלא בוצעו / באיחור (${overdue.length}):`);
  if (overdue.length === 0) {
    lines.push(`• אין משימות באיחור 🎉`);
  } else {
    overdue.forEach((t) => {
      const lead = getLeadById(t.leadId);
      const typeInfo = TASK_TYPE_META[t.type] || TASK_TYPE_META.task;
      lines.push(`• [${formatDateDisplay(t.dueDate)} ${t.dueTime || ""}] ${typeInfo.label} — ${lead ? lead.name : "ליד"} (${lead ? lead.phone : ""})${t.note ? " | " + t.note : ""}`);
    });
  }

  const bodyText = lines.join("\n");
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipients)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(gmailUrl, "_blank");
  showToast(`📩 נפתח חלון שליחת דו"ח המשימות היומי בג'ימייל ל: ${recipients}`);
};

document.addEventListener("DOMContentLoaded", () => {
  checkExistingLoginSession();
});
