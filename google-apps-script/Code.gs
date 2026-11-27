/** @OnlyCurrentDoc */
/**
 * ============================================================================
 * בית היוגה — מערכת ניהול לידים ומשימות (Google Sheets CRM Backend)
 * ============================================================================
 * מורשים:
 * 1. dgescheidt3@gmail.com (דורון)
 * 2. lightsofyoga@gmail.com (בית היוגה)
 * + כל חשבון נוסף שיתווסף ללשונית AllowedUsers בגוגל שיטס.
 *
 * הערה: קובץ זה נקי מ-MailApp כדי למנוע חסימת OAuth של גוגל.
 */

const PRIMARY_OWNER_EMAIL = "dgescheidt3@gmail.com";
const SECONDARY_OWNER_EMAIL = "lightsofyoga@gmail.com";

const SHEET_NAMES = {
  LEADS: "Leads",
  TASKS: "Tasks",
  STAGES: "Stages",
  RULES: "Rules",
  USERS: "AllowedUsers",
};

const TASK_TYPE_LABELS = {
  call: "📞 שיחת טלפון",
  whatsapp: "💬 וואטסאפ",
  meeting: "🤝 פגישה",
  intro_session: "🏋️ אימון היכרות",
  follow_up: "🔔 מעקב",
  task: "✅ משימה",
};

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

function setupDatabaseNow() {
  ensureDatabaseInitialized_();
}

function doGet(e) {
  ensureDatabaseInitialized_();

  // If requested by GitHub Actions daily 08:00 AM cron OR GitHub Pages web client (?feed=daily_digest)
  if (e && e.parameter && e.parameter.feed === "daily_digest") {
    runTimeBasedAutomationsEngine_();
    const tasks = readSheetObjects_(SHEET_NAMES.TASKS);
    const leads = readSheetObjects_(SHEET_NAMES.LEADS);
    const stages = readSheetObjects_(SHEET_NAMES.STAGES);
    const users = readSheetObjects_(SHEET_NAMES.USERS);
    const todayKey = getOffsetDateKey_(0);

    const payload = {
      ok: true,
      todayKey: todayKey,
      tasks: tasks,
      leads: leads,
      stages: stages,
      rules: readSheetObjects_(SHEET_NAMES.RULES),
      users: users,
    };

    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }

  const template = HtmlService.createTemplateFromFile("index");
  template.currentUserEmail = "";
  template.currentUserName = "בית היוגה";
  template.spreadsheetUrl = "";

  return template
    .evaluate()
    .setTitle("בית היוגה · CRM")
    .setFaviconUrl("https://doron-g.github.io/beit-hayoga-crm-demo/apple-touch-icon.png")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content")
    .addMetaTag("apple-mobile-web-app-capable", "yes")
    .addMetaTag("apple-mobile-web-app-title", "בית היוגה")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  ensureDatabaseInitialized_();
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const body = JSON.parse(raw);

    if (body.action === "verifyLogin") {
      const res = apiVerifyLogin(body.email, body.pass);
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "syncState") {
      const res = apiSyncState(body.payload || {});
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "resetDemoData") {
      const res = apiResetDemoData();
      return ContentService.createTextOutput(JSON.stringify({ ok: true, state: res })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 1. Login & Authorization API (Checks against AllowedUsers in Google Sheets)
// ============================================================================

const SESSION_PROP_KEY = "BY_CRM_ACTIVE_SESSION_USER";

function apiGetActiveSession() {
  try {
    const raw = PropertiesService.getDocumentProperties().getProperty(SESSION_PROP_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

function apiLogoutSession() {
  try {
    PropertiesService.getDocumentProperties().deleteProperty(SESSION_PROP_KEY);
  } catch (e) {}
  return { ok: true };
}

function apiVerifyLogin(emailInput, passInput) {
  ensureDatabaseInitialized_();
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const cleanPass = String(passInput || "").trim();

  if (!cleanEmail) {
    return { ok: false, error: "נא להזין כתובת ג'ימייל" };
  }

  const users = readSheetObjects_(SHEET_NAMES.USERS);
  const found = users.find((u) => String(u.email || "").trim().toLowerCase() === cleanEmail);

  if (!found) {
    return {
      ok: false,
      error: "⛔ החשבון " + cleanEmail + " אינו מופיע ברשימת המורשים של מערכת בית היוגה.",
    };
  }

  const expectedPass = String(found.accessCode || "nati1234").trim();
  if (expectedPass && cleanPass !== expectedPass) {
    return {
      ok: false,
      error: "קוד הגישה שגוי עבור " + cleanEmail,
    };
  }

  const userObj = {
    email: found.email,
    name: found.name || found.email,
  };

  try {
    PropertiesService.getDocumentProperties().setProperty(SESSION_PROP_KEY, JSON.stringify(userObj));
  } catch (e) {}

  return {
    ok: true,
    user: userObj,
  };
}

// ============================================================================
// 2. Client-Callable API Functions (google.script.run)
// ============================================================================

function apiGetInitialState() {
  ensureDatabaseInitialized_();
  runTimeBasedAutomationsEngine_();

  return {
    savedSessionUser: apiGetActiveSession(),
    stages: readSheetObjects_(SHEET_NAMES.STAGES),
    rules: readSheetObjects_(SHEET_NAMES.RULES),
    leads: readSheetObjects_(SHEET_NAMES.LEADS),
    tasks: readSheetObjects_(SHEET_NAMES.TASKS),
    allowedUsers: readSheetObjects_(SHEET_NAMES.USERS),
  };
}

function apiSyncState(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    if (payload.stages) {
      writeSheetObjects_(SHEET_NAMES.STAGES, ["id", "name", "color", "showInBoard", "isTerminal", "isSystem"], payload.stages);
    }
    if (payload.rules) {
      writeSheetObjects_(SHEET_NAMES.RULES, ["id", "fromStageId", "toStageId", "durationValue", "durationUnit", "enabled"], payload.rules);
    }
    if (payload.leads) {
      writeSheetObjects_(
        SHEET_NAMES.LEADS,
        ["id", "name", "phone", "email", "stageId", "platform", "meta", "formName", "leadType", "createdAt", "stageEnteredAt", "lastAutoMovedInfo", "notes"],
        payload.leads
      );
    }
    if (payload.tasks) {
      writeSheetObjects_(SHEET_NAMES.TASKS, ["id", "leadId", "type", "dueDate", "dueTime", "note", "done"], payload.tasks);
    }
    if (payload.allowedUsers) {
      writeSheetObjects_(SHEET_NAMES.USERS, ["email", "name", "accessCode", "receiveDailyEmail", "addedAt"], payload.allowedUsers);
    }

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function apiResetDemoData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    seedDefaultData_(true);
    return apiGetInitialState();
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 3. Time-Based Column Transition Cron (Runs Hourly on Google Servers)
// ============================================================================

function runTimeBasedAutomationsCron() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    ensureDatabaseInitialized_();
    runTimeBasedAutomationsEngine_();
  } finally {
    lock.releaseLock();
  }
}

function runTimeBasedAutomationsEngine_() {
  const stages = readSheetObjects_(SHEET_NAMES.STAGES);
  const rules = readSheetObjects_(SHEET_NAMES.RULES);
  const leads = readSheetObjects_(SHEET_NAMES.LEADS);
  const now = Date.now();
  let changed = false;

  leads.forEach((lead) => {
    const rule = rules.find((r) => r.enabled && String(r.fromStageId) === String(lead.stageId));
    if (!rule) return;

    const targetStage = stages.find((s) => String(s.id) === String(rule.toStageId));
    if (!targetStage) return;

    const enteredAt = Number(lead.stageEnteredAt) || Number(lead.createdAt) || now;
    const mult = UNIT_MS[rule.durationUnit] || UNIT_MS.days;
    const requiredMs = Number(rule.durationValue) * mult;

    if (now - enteredAt >= requiredMs) {
      const fromStage = stages.find((s) => String(s.id) === String(lead.stageId));
      const fromName = fromStage ? fromStage.name : "עמודה קודמת";
      lead.stageId = String(targetStage.id);
      lead.stageEnteredAt = now;
      lead.lastAutoMovedInfo = `הועבר אוטומטית מ"${fromName}" אחרי ${rule.durationValue} ${UNIT_LABELS[rule.durationUnit] || rule.durationUnit}`;
      lead.notes = Array.isArray(lead.notes) ? lead.notes : [];
      lead.notes.unshift({
        text: `⚡ אוטומציה בשרת: הליד הועבר אוטומטית מעמודת "${fromName}" לעמודת "${targetStage.name}" לאחר ${rule.durationValue} ${UNIT_LABELS[rule.durationUnit] || rule.durationUnit}.`,
        date: Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM HH:mm"),
        author: "מנוע אוטומציה",
      });
      changed = true;
    }
  });

  if (changed) {
    writeSheetObjects_(
      SHEET_NAMES.LEADS,
      ["id", "name", "phone", "email", "stageId", "platform", "meta", "formName", "leadType", "createdAt", "stageEnteredAt", "lastAutoMovedInfo", "notes"],
      leads
    );
  }
}

// ============================================================================
// 4. Google Sheets Database Initialization & Read/Write Engine
// ============================================================================

function ensureDatabaseInitialized_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hasLeads = ss.getSheetByName(SHEET_NAMES.LEADS);
  const hasStages = ss.getSheetByName(SHEET_NAMES.STAGES);

  if (!hasLeads || !hasStages) {
    seedDefaultData_(false);
  }
}

function seedDefaultData_(overwriteExisting) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const todayKey = getOffsetDateKey_(0);
  const tomorrowKey = getOffsetDateKey_(1);
  const yesterdayKey = getOffsetDateKey_(-1);

  const defaultStages = [
    { id: "249", name: "ליד חדש", color: "#4f8cff", showInBoard: true, isTerminal: false, isSystem: true },
    { id: "250", name: "בוצע ניסיון שיחה", color: "#38bdf8", showInBoard: true, isTerminal: false, isSystem: true },
    { id: "251", name: "שיחה שהתקיימה", color: "#a78bfa", showInBoard: true, isTerminal: false, isSystem: true },
    { id: "252", name: "אימון היכרות", color: "#ffb74d", showInBoard: true, isTerminal: false, isSystem: true },
    { id: "253", name: "מעקב אחרי אימון היכרות", color: "#f472b6", showInBoard: true, isTerminal: false, isSystem: true },
    { id: "254", name: "מכירה", color: "#16b364", showInBoard: true, isTerminal: true, isSystem: false },
    { id: "256", name: "לאחר שבוע", color: "#8b5cf6", showInBoard: true, isTerminal: true, isSystem: false },
    { id: "255", name: "לא נסגר", color: "#ef4444", showInBoard: false, isTerminal: true, isSystem: false },
  ];

  const defaultRules = [
    {
      id: "rule_default_1",
      fromStageId: "254",
      toStageId: "256",
      durationValue: 1,
      durationUnit: "weeks",
      enabled: true,
    },
  ];

  const defaultLeads = [
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
      lastAutoMovedInfo: "",
      notes: [{ text: "ליד נקלט אוטומטית מקמפיין אינסטגרם", date: "היום, 07:00", author: "מערכת" }],
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
      lastAutoMovedInfo: "",
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
      lastAutoMovedInfo: "",
      notes: [{ text: "ניסיון חיוג ראשון, לא היה מענה, נשלחה הודעת וואטסאפ", date: "לפני יומיים", author: "בית היוגה" }],
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
      lastAutoMovedInfo: "",
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
      lastAutoMovedInfo: "",
      notes: [
        { text: "לסגור סופית אבל ככל הנראה תגיע ביום שני עם דורין", date: "11.11, 08:23", author: "בית היוגה" },
        { text: "🎁 הגיע דרך «חבר מביא חבר» — המליץ: דורין סבחה (0504564536) / ללא ניסיון", date: "10.11, 19:10", author: "מערכת" },
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
      lastAutoMovedInfo: "",
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
      lastAutoMovedInfo: "",
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
      lastAutoMovedInfo: "",
      notes: [
        { text: "נסגרה מכירה! החוק האוטומטי יעביר אותה לעמודת 'לאחר שבוע' כשיחלפו 7 ימים מרגע הכניסה לעמודה.", date: "לפני יומיים", author: "בית היוגה" },
      ],
    },
  ];

  const defaultTasks = [
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
  ];

  const defaultUsers = [
    {
      email: PRIMARY_OWNER_EMAIL,
      name: "דורון (מנהל מערכת)",
      accessCode: "nati1234",
      receiveDailyEmail: true,
      addedAt: todayKey,
    },
    {
      email: SECONDARY_OWNER_EMAIL,
      name: "בית היוגה",
      accessCode: "nati1234",
      receiveDailyEmail: true,
      addedAt: todayKey,
    },
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (overwriteExisting || !ss.getSheetByName(SHEET_NAMES.STAGES)) {
    writeSheetObjects_(SHEET_NAMES.STAGES, ["id", "name", "color", "showInBoard", "isTerminal", "isSystem"], defaultStages);
  }
  if (overwriteExisting || !ss.getSheetByName(SHEET_NAMES.RULES)) {
    writeSheetObjects_(SHEET_NAMES.RULES, ["id", "fromStageId", "toStageId", "durationValue", "durationUnit", "enabled"], defaultRules);
  }
  if (overwriteExisting || !ss.getSheetByName(SHEET_NAMES.LEADS)) {
    writeSheetObjects_(
      SHEET_NAMES.LEADS,
      ["id", "name", "phone", "email", "stageId", "platform", "meta", "formName", "leadType", "createdAt", "stageEnteredAt", "lastAutoMovedInfo", "notes"],
      defaultLeads
    );
  }
  if (overwriteExisting || !ss.getSheetByName(SHEET_NAMES.TASKS)) {
    writeSheetObjects_(SHEET_NAMES.TASKS, ["id", "leadId", "type", "dueDate", "dueTime", "note", "done"], defaultTasks);
  }
  if (overwriteExisting || !ss.getSheetByName(SHEET_NAMES.USERS)) {
    writeSheetObjects_(SHEET_NAMES.USERS, ["email", "name", "accessCode", "receiveDailyEmail", "addedAt"], defaultUsers);
  }
}

function readSheetObjects_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map((h) => String(h).trim());
  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every((cell) => cell === "" || cell === null)) continue;

    const obj = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      if (val instanceof Date) {
        if (h === "dueTime") {
          val = Utilities.formatDate(val, "Asia/Jerusalem", "HH:mm");
        } else {
          val = Utilities.formatDate(val, "Asia/Jerusalem", "yyyy-MM-dd");
        }
      }
      if (h === "dueDate" && typeof val === "string" && val.includes("/")) {
        // Normalize DD/MM/YYYY to YYYY-MM-DD if manually edited in sheet
        const p = val.trim().split("/");
        if (p.length === 3 && p[2].length === 4) {
          val = `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
        }
      }
      if (h === "notes") {
        try {
          obj[h] = val ? JSON.parse(val) : [];
        } catch (e) {
          obj[h] = [];
        }
      } else if (h === "showInBoard" || h === "isTerminal" || h === "isSystem" || h === "enabled" || h === "done" || h === "receiveDailyEmail") {
        obj[h] = val === true || String(val).toLowerCase() === "true";
      } else if (h === "createdAt" || h === "stageEnteredAt" || h === "durationValue") {
        obj[h] = Number(val) || 0;
      } else {
        obj[h] = val !== undefined && val !== null ? String(val) : "";
      }
    });
    result.push(obj);
  }

  return result;
}

function writeSheetObjects_(sheetName, headers, objectsArray) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clearContents();

  const rows = [headers];
  (objectsArray || []).forEach((obj) => {
    const row = headers.map((h) => {
      const val = obj[h];
      if (h === "notes") {
        return JSON.stringify(Array.isArray(val) ? val : []);
      }
      if (val === undefined || val === null) return "";
      return val;
    });
    rows.push(row);
  });

  // Format text/date/phone columns as Plain Text (@) BEFORE writing so Google Sheets never mangles leading zeros in phones or converts dueTime/dueDate into Date serials
  headers.forEach((h, idx) => {
    if (h === "phone" || h === "dueDate" || h === "dueTime" || h === "id" || h === "leadId" || h === "stageId" || h === "fromStageId" || h === "toStageId" || h === "accessCode") {
      sheet.getRange(1, idx + 1, rows.length, 1).setNumberFormat("@");
    }
  });

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f2f4f7");
  sheet.setFrozenRows(1);
}

function getOffsetDateKey_(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + (daysOffset || 0));
  return Utilities.formatDate(d, "Asia/Jerusalem", "yyyy-MM-dd");
}
