#!/usr/bin/env python3
"""
בית היוגה — מנוע שליחת מייל משימות פתוחות יומי אוטומטי (08:00 בבוקר שעון ישראל)
רץ אוטומטית דרך GitHub Actions, קורא את המשימות הפתוחות מה-Google Sheets,
ושולח מייל HTML מעוצב (RTL) עם הלוגו של בית היוגה לכל החשבונות המורשים.
"""

import json
import os
import smtplib
import urllib.request
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

TASK_TYPE_LABELS = {
    "call": "📞 שיחת טלפון",
    "whatsapp": "💬 וואטסאפ",
    "meeting": "🤝 פגישה",
    "intro_session": "🏋️ אימון היכרות",
    "follow_up": "🔔 מעקב",
    "task": "✅ משימה",
}


def normalize_date_str(val: str) -> str:
    s = str(val or "").strip()
    if not s:
        return ""
    if "T" in s:
        d_part = s.split("T")[0]
        if len(d_part) == 10 and d_part[4] == "-" and d_part[7] == "-":
            return d_part
    if "/" in s:
        parts = s.split("/")
        if len(parts) == 3 and len(parts[2]) == 4:
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return s[:10] if len(s) >= 10 else s


def normalize_time_str(val: str) -> str:
    s = str(val or "").strip()
    if not s:
        return "10:00"
    import re
    m = re.search(r"(\d{1,2}):(\d{2})", s)
    if m:
        return f"{m.group(1).zfill(2)}:{m.group(2)}"
    return "10:00"


def format_date_display(yyyy_mm_dd: str) -> str:
    norm = normalize_date_str(yyyy_mm_dd)
    parts = str(norm or "").split("-")
    if len(parts) != 3:
        return str(yyyy_mm_dd or "")
    return f"{parts[2]}/{parts[1]}/{parts[0]}"


def escape_html(val: str) -> str:
    return (
        str(val or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def fetch_crm_data(webapp_url: str) -> dict:
    sep = "&" if "?" in webapp_url else "?"
    feed_url = f"{webapp_url.strip()}{sep}feed=daily_digest"
    req = urllib.request.Request(feed_url, headers={"User-Agent": "BeitHaYoga-CRM-DailyMailer/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw)


def build_email_html(data: dict, crm_url: str) -> tuple[str, str, list[str]]:
    il_now = datetime.now(timezone(timedelta(hours=2)))
    today_key = data.get("todayKey") or il_now.strftime("%Y-%m-%d")
    today_display = format_date_display(today_key)

    tasks = data.get("tasks") or []
    leads = data.get("leads") or []
    stages = data.get("stages") or []
    users = data.get("users") or []

    open_today = sorted(
        [t for t in tasks if not t.get("done") and normalize_date_str(t.get("dueDate")) == today_key],
        key=lambda x: normalize_time_str(x.get("dueTime")),
    )
    overdue = sorted(
        [t for t in tasks if not t.get("done") and normalize_date_str(t.get("dueDate")) < today_key],
        key=lambda x: f"{normalize_date_str(x.get('dueDate'))}T{normalize_time_str(x.get('dueTime'))}",
    )

    recipients = [
        str(u.get("email")).strip()
        for u in users
        if u.get("email") and u.get("receiveDailyEmail") is not False and str(u.get("receiveDailyEmail")).lower() != "false"
    ]
    if not recipients:
        recipients = ["dgescheidt3@gmail.com", "lightsofyoga@gmail.com"]

    subject = f"📋 בית היוגה · המשימות הפתוחות שלך להיום ({today_display}) — {len(open_today)} להיום, {len(overdue)} באיחור"

    def render_rows(items: list, is_overdue: bool) -> str:
        if not items:
            return '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #667085; font-size: 14px;">אין משימות בקטגוריה זו 🎉</td></tr>'
        rows_html = []
        for t in items:
            lead = next((l for l in leads if str(l.get("id")) == str(t.get("leadId"))), {})
            stage = next((s for s in stages if str(s.get("id")) == str(lead.get("stageId"))), {})
            type_label = TASK_TYPE_LABELS.get(str(t.get("type")), "✅ משימה")
            phone = str(lead.get("phone") or "")
            digits = "".join(ch for ch in phone if ch.isdigit())
            wa_phone = ("972" + digits[1:]) if digits.startswith("0") else digits
            color = "#d92d20" if is_overdue else "#16b364"
            note_html = f'<div style="color: #667085; font-size: 12.5px; margin-top: 4px;">{escape_html(t.get("note"))}</div>' if t.get("note") else ""

            rows_html.append(f"""
              <tr style="border-bottom: 1px solid #e4e7ec;">
                <td style="padding: 12px 10px; font-weight: 700; color: {color}; white-space: nowrap;">
                  {format_date_display(t.get("dueDate"))} · {escape_html(normalize_time_str(t.get("dueTime")))}
                </td>
                <td style="padding: 12px 10px;">
                  <span style="background: #eaf4ff; color: #175cd3; padding: 3px 9px; border-radius: 6px; font-weight: 700; font-size: 12.5px; display: inline-block;">
                    {type_label}
                  </span>
                  {note_html}
                </td>
                <td style="padding: 12px 10px; font-weight: 700; color: #1f2937;">
                  {escape_html(lead.get("name") or "ליד")}
                </td>
                <td style="padding: 12px 10px; color: #667085; font-size: 13px;">
                  {escape_html(stage.get("name") or "—")}
                </td>
                <td style="padding: 12px 10px; white-space: nowrap; direction: ltr; text-align: right;">
                  {f'<a href="tel:{escape_html(phone)}" style="color: #2e90fa; text-decoration: none; font-weight: 700; margin-left: 8px;">📞 {escape_html(phone)}</a>' if phone else ''}
                  {f'<a href="https://wa.me/{wa_phone}" style="background: #ecfdf3; color: #027a48; border: 1px solid #a6f4c5; padding: 3px 8px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700;">💬 וואטסאפ</a>' if wa_phone else ''}
                </td>
              </tr>
            """)
        return "".join(rows_html)

    html = f"""
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f7f8fa; padding: 24px 14px; color: #1f2937; text-align: right;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e7ec; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(16,24,40,0.06);">
        <div style="background: #0f172a; color: #ffffff; padding: 20px 24px; display: flex; align-items: center; gap: 14px;">
          <img src="https://doron-g.github.io/beit-hayoga-crm-demo/logo.png" alt="בית היוגה" style="width: 48px; height: 48px; border-radius: 10px; background: #fff; padding: 2px;" />
          <div>
            <div style="font-size: 13px; color: #fde68a; font-weight: 700; margin-bottom: 3px;">בית היוגה · מקום שמחבר</div>
            <h1 style="margin: 0; font-size: 20px;">📋 המשימות הפתוחות שלך להיום ({today_display})</h1>
            <p style="margin: 5px 0 0; color: #cbd5e1; font-size: 13.5px;">
              מחכות לך כרגע <strong>{len(open_today)} משימות להיום</strong> ו-<strong>{len(overdue)} משימות באיחור</strong>.
            </p>
          </div>
        </div>

        <div style="padding: 22px 24px;">
          <h2 style="margin: 0 0 10px; font-size: 16px; color: #027a48;">🟢 משימות ושיחות להיום ({len(open_today)})</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e4e7ec; border-radius: 10px; overflow: hidden; margin-bottom: 24px; font-size: 13.5px;">
            <thead>
              <tr style="background: #f2f4f7; color: #667085; text-align: right;">
                <th style="padding: 10px;">שעה</th>
                <th style="padding: 10px;">סוג הפעילות והערה</th>
                <th style="padding: 10px;">שם הליד</th>
                <th style="padding: 10px;">שלב</th>
                <th style="padding: 10px;">חיוג / וואטסאפ</th>
              </tr>
            </thead>
            <tbody>{render_rows(open_today, False)}</tbody>
          </table>

          <h2 style="margin: 0 0 10px; font-size: 16px; color: #b42318;">🔴 משימות שלא בוצעו / באיחור ({len(overdue)})</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e4e7ec; border-radius: 10px; overflow: hidden; margin-bottom: 24px; font-size: 13.5px;">
            <thead>
              <tr style="background: #fef3f2; color: #b42318; text-align: right;">
                <th style="padding: 10px;">תאריך יעד</th>
                <th style="padding: 10px;">סוג הפעילות והערה</th>
                <th style="padding: 10px;">שם הליד</th>
                <th style="padding: 10px;">שלב</th>
                <th style="padding: 10px;">חיוג / וואטסאפ</th>
              </tr>
            </thead>
            <tbody>{render_rows(overdue, True)}</tbody>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="{escape_html(crm_url)}" style="display: inline-block; background: #2e90fa; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 10px; font-weight: 700; font-size: 15px;">
              כניסה למערכת הלידים והמשימות — בית היוגה ⬅️
            </a>
          </div>
        </div>
      </div>
    </div>
    """
    return subject, html, recipients


def main():
    webapp_url = os.environ.get("GAS_WEBAPP_URL", "").strip()
    gmail_user = os.environ.get("GMAIL_USER", "dgescheidt3@gmail.com").strip()
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD", "").strip()

    if not webapp_url:
        raise RuntimeError("Missing GAS_WEBAPP_URL secret in GitHub repository settings.")
    if not gmail_app_password:
        raise RuntimeError("Missing GMAIL_APP_PASSWORD secret in GitHub repository settings.")

    data = fetch_crm_data(webapp_url)
    subject, html_body, recipients = build_email_html(data, webapp_url)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"בית היוגה CRM <{gmail_user}>"
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_app_password.replace(" ", ""))
        server.sendmail(gmail_user, recipients, msg.as_string())

    print(f"Successfully sent daily digest to: {', '.join(recipients)}")


if __name__ == "__main__":
    main()
