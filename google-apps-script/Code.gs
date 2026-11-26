/**
 * ============================================================================
 * בית היוגה — מערכת ניהול לידים ומשימות (Google Sheets CRM Backend)
 * ============================================================================
 * קובץ שרת: Code.gs
 *
 * כולל:
 * 1. אימות חשבונות גוגל מורשים (Whitelist) — ברירת מחדל: dgescheidt3@gmail.com
 *    + ניהול משתמשים מורשים מתוך לשונית AllowedUsers בגוגל שיטס או ישירות מהממשק!
 * 2. הקמה אוטומטית של 5 הלשוניות בגוגל שיטס:
 *    - Leads (לידים)
 *    - Tasks (משימות ופעילויות)
 *    - Stages (עמודות וסטטוסים)
 *    - Rules (חוקי אוטומציית מעבר עמודות לפי זמן)
 *    - AllowedUsers (משתמשים מורשים + הגדרת קבלת מייל משימות יומי)
 * 3. מנוע אוטומציית מעבר עמודות מבוסס זמן שרץ גם בשרתי גוגל כל שעה.
 * 4. מנוע דיוור מייל יומי מעוצב (HTML RTL) בכל בוקר עם המשימות הפתוחות להיום + משימות באיחור.
 */

const PRIMARY_OWNER_EMAIL = "dgescheidt3@gmail.com";

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

// ============================================================================
// 1. Web App Entry Point & Google Account Authorization
// ============================================================================

function doGet(e) {
  ensureDatabaseInitialized_();

  const auth = checkUserAuthorization_();
  if (!auth.authorized) {
    return HtmlService.createHtmlOutput(renderAccessDeniedHtml_(auth.email))
      .setTitle("גישה חסומה · בית היוגה CRM")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const template = HtmlService.createTemplateFromFile("index");
  template.currentUserEmail = auth.email;
  template.currentUserName = auth.name || auth.email;
  template.spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  return template
    .evaluate()
    .setTitle("בית היוגה · מערכת ניהול לידים ומשימות (CRM)")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function checkUserAuthorization_() {
  const activeEmail = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "")
    .trim()
    .toLowerCase();

  const allowedUsers = getAllowedUsersList_();

  if (!activeEmail) {
    return { authorized: false, email: "לא זוהה חשבון גוגל מחובר" };
  }

  if (activeEmail === PRIMARY_OWNER_EMAIL.toLowerCase()) {
    return { authorized: true, email: activeEmail, name: "דורון (מנהל מערכת)" };
  }

  const found = allowedUsers.find((u) => (u.email || "").trim().toLowerCase() === activeEmail);
  if (found) {
    return { authorized: true, email: activeEmail, name: found.name || activeEmail };
  }

  return { authorized: false, email: activeEmail };
}

function assertAuthorized_() {
  const auth = checkUserAuthorization_();
  if (!auth.authorized) {
    throw new Error("אין הרשאת גישה לחשבון: " + auth.email);
  }
  return auth;
}

function renderAccessDeniedHtml_(email) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Assistant', 'Segoe UI', sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px 28px; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .icon { font-size: 46px; margin-bottom: 12px; }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { color: #94a3b8; font-size: 14.5px; line-height: 1.6; margin: 0 0 18px; }
    .email-pill { background: #0f172a; border: 1px solid #475569; padding: 8px 14px; border-radius: 999px; font-family: monospace; color: #f87171; display: inline-block; margin-bottom: 18px; direction: ltr; }
    .btn { display: inline-block; background: #2e90fa; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>הגישה למערכת בית היוגה מוגבלת</h1>
    <p>המערכת פתוחה אך ורק לחשבונות ג'ימייל מורשים שהוגדרו על ידי מנהל המערכת.</p>
    <div class="email-pill">${email || "חשבון לא מזוהה"}</div>
    <p>אם יש לך חשבון ג'ימייל מורשה נוסף במכשיר זה, החלף חשבון גוגל ונסה שוב:</p>
    <a class="btn" href="https://accounts.google.com/AccountChooser" target="_top">החלף חשבון Google</a>
  </div>
</body>
</html>`;
}

// ============================================================================
// 2. Client-Callable API Functions (google.script.run)
// ============================================================================

/**
 * Loads the complete CRM state from Google Sheets
 */
function apiGetInitialState() {
  const auth = assertAuthorized_();
  ensureDatabaseInitialized_();

  // Evaluate any pending time-based transitions on load
  runTimeBasedAutomationsEngine_();

  return {
    currentUser: auth,
    spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    stages: readSheetObjects_(SHEET_NAMES.STAGES),
    rules: readSheetObjects_(SHEET_NAMES.RULES),
    leads: readSheetObjects_(SHEET_NAMES.LEADS),
    tasks: readSheetObjects_(SHEET_NAMES.TASKS),
    allowedUsers: readSheetObjects_(SHEET_NAMES.USERS),
    triggersInstalled: checkIfTriggersInstalled_(),
  };
}

/**
 * Saves the updated CRM state back to Google Sheets with LockService protection
 */
function apiSyncState(payload) {
  const auth = assertAuthorized_();
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
      writeSheetObjects_(SHEET_NAMES.USERS, ["email", "name", "receiveDailyEmail", "addedAt"], payload.allowedUsers);
    }

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      syncedBy: auth.email,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Resets the Google Sheets database to default demo data
 */
function apiResetDemoData() {
  assertAuthorized_();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    seedDefaultData_(true);
    return apiGetInitialState();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sends the daily tasks summary email immediately (for instant testing or manual trigger)
 */
function apiSendDailyEmailNow() {
  const auth = assertAuthorized_();
  const result = sendDailyOpenTasksEmail();
  return result;
}

/**
 * Installs automatic daily morning email trigger (08:00) and hourly column-transition trigger
 */
function apiInstallAutomationTriggers() {
  assertAuthorized_();

  // Remove existing duplicate triggers first
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach((t) => {
    const fn = t.getHandlerFunction();
    if (fn === "sendDailyOpenTasksEmail" || fn === "runTimeBasedAutomationsCron") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 1. Daily morning email at 08:00 AM Israel time
  ScriptApp.newTrigger("sendDailyOpenTasksEmail")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // 2. Hourly background check for time-based stage transitions (e.g. "מכירה" -> "לאחר שבוע")
  ScriptApp.newTrigger("runTimeBasedAutomationsCron")
    .timeBased()
    .everyHours(1)
    .create();

  return {
    ok: true,
    triggersInstalled: true,
    message: "הופעלו בהצלחה: מייל משימות יומי בכל בוקר (08:00) + בדיקת מעבר עמודות אוטומטית בכל שעה!",
  };
}

function checkIfTriggersInstalled_() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    return triggers.some((t) => t.getHandlerFunction() === "sendDailyOpenTasksEmail");
  } catch (e) {
    return false;
  }
}

// ============================================================================
// 3. Daily Open Tasks Email Digest ("מייל משימות פתוחות להיום")
// ============================================================================

function sendDailyOpenTasksEmail() {
  ensureDatabaseInitialized_();

  const tasks = readSheetObjects_(SHEET_NAMES.TASKS);
  const leads = readSheetObjects_(SHEET_NAMES.LEADS);
  const stages = readSheetObjects_(SHEET_NAMES.STAGES);
  const users = getAllowedUsersList_();

  const todayKey = getOffsetDateKey_(0);
  const todayDisplay = formatDateDisplay_(todayKey);

  const openTodayTasks = tasks
    .filter((t) => !t.done && t.dueDate === todayKey)
    .sort((a, b) => String(a.dueTime || "").localeCompare(String(b.dueTime || "")));

  const overdueTasks = tasks
    .filter((t) => !t.done && t.dueDate < todayKey)
    .sort((a, b) => `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`));

  const recipients = users
    .filter((u) => u.receiveDailyEmail !== false && String(u.receiveDailyEmail) !== "false" && u.email)
    .map((u) => u.email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    recipients.push(PRIMARY_OWNER_EMAIL);
  }

  const webAppUrl = ScriptApp.getService().getUrl() || SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const totalOpenCount = openTodayTasks.length + overdueTasks.length;

  const subject = `📋 בית היוגה · המשימות הפתוחות שלך להיום (${todayDisplay}) — ${openTodayTasks.length} להיום, ${overdueTasks.length} באיחור`;

  const buildTaskRowsHtml = (list, isOverdueSection) => {
    if (list.length === 0) {
      return `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #667085; font-size: 14px;">אין משימות בקטגוריה זו 🎉</td></tr>`;
    }
    return list
      .map((t) => {
        const lead = leads.find((l) => l.id === t.leadId);
        const stage = lead ? stages.find((s) => s.id === lead.stageId) : null;
        const typeLabel = TASK_TYPE_LABELS[t.type] || "✅ משימה";
        const phoneClean = lead && lead.phone ? String(lead.phone).replace(/[^0-9]/g, "") : "";
        const waPhone = phoneClean.startsWith("0") ? "972" + phoneClean.slice(1) : phoneClean;

        return `
          <tr style="border-bottom: 1px solid #e4e7ec;">
            <td style="padding: 12px 10px; font-weight: 700; color: ${isOverdueSection ? "#d92d20" : "#16b364"}; white-space: nowrap;">
              ${formatDateDisplay_(t.dueDate)} · ${t.dueTime || "10:00"}
            </td>
            <td style="padding: 12px 10px;">
              <span style="background: #eaf4ff; color: #175cd3; padding: 3px 9px; border-radius: 6px; font-weight: 700; font-size: 12.5px; display: inline-block;">
                ${typeLabel}
              </span>
              ${t.note ? `<div style="color: #667085; font-size: 12.5px; margin-top: 4px;">${escapeHtml_(t.note)}</div>` : ""}
            </td>
            <td style="padding: 12px 10px; font-weight: 700; color: #1f2937;">
              ${lead ? escapeHtml_(lead.name) : "ליד"}
            </td>
            <td style="padding: 12px 10px; color: #667085; font-size: 13px;">
              ${stage ? escapeHtml_(stage.name) : "—"}
            </td>
            <td style="padding: 12px 10px; white-space: nowrap; direction: ltr; text-align: right;">
              ${
                lead && lead.phone
                  ? `<a href="tel:${escapeHtml_(lead.phone)}" style="color: #2e90fa; text-decoration: none; font-weight: 700; margin-left: 8px;">📞 ${escapeHtml_(lead.phone)}</a>`
                  : ""
              }
              ${
                waPhone
                  ? `<a href="https://wa.me/${waPhone}" style="background: #ecfdf3; color: #027a48; border: 1px solid #a6f4c5; padding: 3px 8px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700;">💬 וואטסאפ</a>`
                  : ""
              }
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const htmlBody = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f7f8fa; padding: 24px 14px; color: #1f2937; text-align: right;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e7ec; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(16,24,40,0.06);">
        
        <!-- Header -->
        <div style="background: #0f172a; color: #ffffff; padding: 20px 24px;">
          <div style="font-size: 13px; color: #fde68a; font-weight: 700; margin-bottom: 4px;">בית היוגה · מקום שמחבר</div>
          <h1 style="margin: 0; font-size: 22px;">📋 סיכום המשימות הפתוחות שלך להיום (${todayDisplay})</h1>
          <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 14px;">
            סה"כ מחכות לך כרגע <strong>${openTodayTasks.length} משימות להיום</strong> ו-<strong>${overdueTasks.length} משימות באיחור</strong> מימים קודמים.
          </p>
        </div>

        <div style="padding: 22px 24px;">
          <!-- Section 1: Today's Tasks -->
          <h2 style="margin: 0 0 10px; font-size: 16.5px; color: #027a48;">🟢 משימות ושיחות להיום (${openTodayTasks.length})</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e4e7ec; border-radius: 10px; overflow: hidden; margin-bottom: 24px; font-size: 13.5px;">
            <thead>
              <tr style="background: #f2f4f7; color: #667085; text-align: right;">
                <th style="padding: 10px;">שעה</th>
                <th style="padding: 10px;">סוג הפעילות והערה</th>
                <th style="padding: 10px;">שם הליד</th>
                <th style="padding: 10px;">שלב בפייפליין</th>
                <th style="padding: 10px;">חיוג / וואטסאפ</th>
              </tr>
            </thead>
            <tbody>
              ${buildTaskRowsHtml(openTodayTasks, false)}
            </tbody>
          </table>

          <!-- Section 2: Overdue Tasks -->
          <h2 style="margin: 0 0 10px; font-size: 16.5px; color: #b42318;">🔴 משימות שלא בוצעו / באיחור (${overdueTasks.length})</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e4e7ec; border-radius: 10px; overflow: hidden; margin-bottom: 24px; font-size: 13.5px;">
            <thead>
              <tr style="background: #fef3f2; color: #b42318; text-align: right;">
                <th style="padding: 10px;">תאריך יעד</th>
                <th style="padding: 10px;">סוג הפעילות והערה</th>
                <th style="padding: 10px;">שם הליד</th>
                <th style="padding: 10px;">שלב בפייפליין</th>
                <th style="padding: 10px;">חיוג / וואטסאפ</th>
              </tr>
            </thead>
            <tbody>
              ${buildTaskRowsHtml(overdueTasks, true)}
            </tbody>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 26px;">
            <a href="${webAppUrl}" style="display: inline-block; background: #2e90fa; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 10px; font-weight: 700; font-size: 15px;">
              כניסה למערכת הלידים והמשימות — בית היוגה ⬅️
            </a>
          </div>
        </div>

        <div style="background: #f2f4f7; padding: 14px 24px; font-size: 12px; color: #667085; text-align: center; border-top: 1px solid #e4e7ec;">
          נשלח אוטומטית ממערכת ה-CRM של בית היוגה (Google Sheets & Apps Script)
        </div>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    htmlBody: htmlBody,
  });

  return {
    ok: true,
    recipients: recipients,
    todayCount: openTodayTasks.length,
    overdueCount: overdueTasks.length,
    totalSent: totalOpenCount,
  };
}

// ============================================================================
// 4. Time-Based Column Transition Cron (Runs Hourly on Google Servers)
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
// 5. Google Sheets Database Initialization & Read/Write Engine
// ============================================================================

function ensureDatabaseInitialized_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hasLeads = ss.getSheetByName(SHEET_NAMES.LEADS);
  const hasStages = ss.getSheetByName(SHEET_NAMES.STAGES);

  if (!hasLeads || !hasStages) {
    seedDefaultData_(false);
  }
}

function getAllowedUsersList_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!sheet) {
    return [{ email: PRIMARY_OWNER_EMAIL, name: "דורון", receiveDailyEmail: true }];
  }
  const rows = readSheetObjects_(SHEET_NAMES.USERS);
  if (rows.length === 0) {
    return [{ email: PRIMARY_OWNER_EMAIL, name: "דורון", receiveDailyEmail: true }];
  }
  return rows;
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
      receiveDailyEmail: true,
      addedAt: todayKey,
    },
    {
      email: "lightsofyoga@gmail.com",
      name: "בית היוגה",
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
  if (!ss.getSheetByName(SHEET_NAMES.USERS)) {
    writeSheetObjects_(SHEET_NAMES.USERS, ["email", "name", "receiveDailyEmail", "addedAt"], defaultUsers);
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
        val = Utilities.formatDate(val, "Asia/Jerusalem", "yyyy-MM-dd");
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

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f2f4f7");
  sheet.setFrozenRows(1);
}

// ============================================================================
// 6. Date & String Utilities
// ============================================================================

function getOffsetDateKey_(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + (daysOffset || 0));
  return Utilities.formatDate(d, "Asia/Jerusalem", "yyyy-MM-dd");
}

function formatDateDisplay_(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  const parts = String(yyyyMmDd).split("-");
  if (parts.length !== 3) return String(yyyyMmDd);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml_(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
