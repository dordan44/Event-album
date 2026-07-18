"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Lightweight bilingual layer: Hebrew (default, RTL) + English.
 * The choice persists in localStorage and flips document dir/lang globally.
 */
export type Lang = "he" | "en";

const STORAGE_KEY = "snapevent:lang";

export const messages = {
  he: {
    // Landing
    "landing.heroTitle": "כל אורח הוא הצלם שלכם.",
    "landing.heroSub":
      "האורחים סורקים ברקוד על השולחן, משתפים תמונות תוך שניות — בלי אפליקציה ובלי הרשמה — והרגעים שאישרתם עולים בשידור חי למסך באולם. למחרת בבוקר, האלבום המלא אצלכם בלחיצה אחת.",
    "landing.screenCaption": "מסך האולם בשידור חי — מתעדכן ברגע שלוחצים ״אישור״",
    "landing.phoneCaption": "סרקו לשיתוף התמונות שלכם",
    "landing.step1Title": "1. סורקים",
    "landing.step1Body":
      "האורחים מכוונים את מצלמת הטלפון לברקוד שעל השולחן — אפליקציית ווב קלילה נפתחת מיד. בלי הורדה, בלי הרשמה.",
    "landing.step2Title": "2. משתפים",
    "landing.step2Body":
      "התמונות נדחסות בדפדפן ועולות ישירות לאחסון ענן מאובטח — האינטרנט באולם נשאר מהיר.",
    "landing.step3Title": "3. מככבים",
    "landing.step3Body":
      "מאשרים בלחיצה אחת והתמונה עולה למסך הגדול בזמן אמת. למחרת מייצאים את הכל.",
    "landing.checkoutTitle": "יוצרים את האירוע שלכם",
    "landing.checkoutSub": "ההקמה לוקחת שתי דקות. תשלום חד־פעמי — בלי מנויים.",
    "landing.footer": "SnapEvent · נעשה באהבה לחגיגות בישראל",

    // Checkout form
    "form.eventType": "סוג האירוע",
    "form.eventName": "שם האירוע / שמות החוגגים",
    "form.eventNamePlaceholder": "דניאל ועומר",
    "form.eventDate": "תאריך האירוע",
    "form.phone": "טלפון ליצירת קשר",
    "form.phonePlaceholder": "050-1234567",
    "form.email": "אימייל",
    "form.emailPlaceholder": "you@example.com",
    "form.theme": "ערכת עיצוב",
    "form.package": "חבילה",
    "form.submit": "המשך לתשלום",
    "form.submitting": "יוצרים את האירוע…",
    "form.secureNote": "תשלום מאובטח · כרטיס אשראי ו־Apple Pay דרך סליקה ישראלית",
    "form.error": "משהו השתבש",
    "type.WEDDING": "חתונה",
    "type.BAR_MITZVAH": "בר מצווה",
    "type.BAT_MITZVAH": "בת מצווה",
    "type.BRIT": "ברית",
    "type.BIRTHDAY": "יום הולדת",
    "type.CORPORATE": "אירוע חברה",
    "theme.classic": "קלאסי",
    "theme.romance": "רומנטי",
    "theme.night": "לילה",
    "theme.festive": "חגיגי",
    "pkg.BASIC.title": "בסיסית",
    "pkg.BASIC.desc": "אלבום משותף + שלטי ברקוד + הורדת ZIP",
    "pkg.PREMIUM.title": "פרימיום",
    "pkg.PREMIUM.desc": "כל מה שבבסיסית + סליידשואו חי באולם + העלאת סרטונים",
    "created.title": "🎉 האירוע שלכם באוויר!",
    "created.sub": "שמרו את הקישורים — קישור הניהול פרטי, שמרו עליו כמו על סיסמה.",
    "created.admin": "לוח ניהול (פרטי)",
    "created.guest": "עמוד ההעלאה לאורחים",
    "created.slideshow": "סליידשואו לאולם (למסך של הדיג׳יי)",

    // Admin
    "admin.brand": "ניהול SnapEvent",
    "admin.uploaded": "הועלו",
    "admin.approved": "אושרו",
    "admin.pending": "ממתינות",
    "admin.guestsOnline": "אורחים מחוברים",
    "admin.tabModeration": "אישור תמונות",
    "admin.tabAssets": "חומרים להדפסה",
    "admin.tabExport": "ייצוא",
    "admin.newAlert": "תמונות חדשות הגיעו — לחצו לצפייה",
    "admin.filterPending": "ממתינות לאישור",
    "admin.filterAll": "הכל",
    "admin.emptyPending": "הכל מאושר! העלאות חדשות יופיעו כאן מיד. ✨",
    "admin.emptyAll": "אין עדיין תמונות — שימו את הברקודים על השולחנות!",
    "admin.approve": "✓ אישור",
    "admin.reject": "✕ דחייה",
    "admin.statusApproved": "אושרה — מוצגת על המסך",
    "admin.statusRejected": "נדחתה",
    "admin.assetsTitle": "שלטים להדפסה לשולחנות",
    "admin.assetsBody": "הדפיסו שלט לכל שולחן. האורחים סורקים עם מצלמת הטלפון — בלי אפליקציה.",
    "admin.downloadQr": "הורדת ברקוד (PNG להדפסה)",
    "admin.openSign": "פתיחת שלט A5 להדפסה",
    "admin.venueUrl": "כתובת למסך האולם (לתת לדיג׳יי / טכנאי):",
    "admin.exportTitle": "קחו את הזכרונות הביתה",
    "admin.zipApproved": "⬇️ הורדת ZIP — תמונות מאושרות",
    "admin.zipAll": "הורדת ZIP — הכל",
    "admin.googleConnect": "חיבור Google Drive / Photos",
    "admin.googleSync": "☁️ סנכרון תמונות מאושרות ל־Google Drive",
    "admin.syncing": "מסנכרן ל־Google Drive…",
    "admin.syncDone": "הסתיים — {n} קבצים הועלו. פתיחה:",
    "admin.syncFailed": "הסנכרון נכשל:",

    // Guest app
    "guest.tagline": "שתפו אותנו ברגעים שלכם 📸",
    "guest.yourName": "השם שלך",
    "guest.namePlaceholder": "למשל: דנה לוי",
    "guest.enter": "כניסה",
    "guest.noSignup": "בלי הרשמה, בלי אפליקציה — רק השם שלך כדי שנדע למי להגיד תודה 🙏",
    "guest.share": "שתפו את הרגעים שלכם",
    "guest.pickPhotosVideos": "תמונות וסרטונים — אפשר לבחור כמה ביחד",
    "guest.pickPhotos": "תמונות — אפשר לבחור כמה ביחד",
    "guest.pendingNote": "התמונות שלכם יופיעו באלבום (ועל המסך!) אחרי אישור המארחים ✨",
    "guest.connectedAs": "מחובר/ת בתור",
    "guest.changeName": "החלפת שם",
    "guest.compressing": "מכווץ…",
    "guest.uploading": "מעלה…",
    "guest.done": "הועלה ✓ ממתין לאישור",
    "guest.error": "שגיאה",
    "guest.errVideoPremium": "סרטונים זמינים בחבילת פרימיום בלבד",
    "guest.errVideoSize": "סרטון גדול מדי (עד 100MB)",
    "guest.errUpload": "ההעלאה נכשלה, נסו שוב",
    "guest.errSave": "שגיאה בשמירה, נסו שוב",
  },
  en: {
    "landing.heroTitle": "Every guest is your photographer.",
    "landing.heroSub":
      "Guests scan a QR code on their table, share photos in seconds — no app, no signup — and approved moments appear live on the venue screen. The next morning, the full album is yours in one click.",
    "landing.screenCaption": "Live venue slideshow — updates the second you hit “Approve”",
    "landing.phoneCaption": "Scan to share your photos",
    "landing.step1Title": "1. Scan",
    "landing.step1Body":
      "Guests point their camera at the table QR — a lightweight web app opens instantly. No download, no registration.",
    "landing.step2Title": "2. Share",
    "landing.step2Body":
      "Photos are compressed in the browser and fly straight to secure cloud storage — venue Wi-Fi stays fast.",
    "landing.step3Title": "3. Shine",
    "landing.step3Body":
      "You approve with one tap and the photo fades onto the big screen in real time. Export everything the next day.",
    "landing.checkoutTitle": "Create your event",
    "landing.checkoutSub": "Set up takes two minutes. Pay once — no subscriptions.",
    "landing.footer": "SnapEvent · Made with ❤️ for celebrations in Israel",

    "form.eventType": "Event type",
    "form.eventName": "Event name(s)",
    "form.eventNamePlaceholder": "Danielle & Omer",
    "form.eventDate": "Event date",
    "form.phone": "Contact phone",
    "form.phonePlaceholder": "050-1234567",
    "form.email": "Email",
    "form.emailPlaceholder": "you@example.com",
    "form.theme": "Theme",
    "form.package": "Package",
    "form.submit": "Continue to payment",
    "form.submitting": "Creating your event…",
    "form.secureNote": "Secure checkout · Credit card & Apple Pay via Israeli payment gateway",
    "form.error": "Something went wrong",
    "type.WEDDING": "Wedding",
    "type.BAR_MITZVAH": "Bar Mitzvah",
    "type.BAT_MITZVAH": "Bat Mitzvah",
    "type.BRIT": "Brit",
    "type.BIRTHDAY": "Birthday",
    "type.CORPORATE": "Corporate",
    "theme.classic": "Classic",
    "theme.romance": "Romance",
    "theme.night": "Night",
    "theme.festive": "Festive",
    "pkg.BASIC.title": "Basic",
    "pkg.BASIC.desc": "Shared album + QR signs + ZIP export",
    "pkg.PREMIUM.title": "Premium",
    "pkg.PREMIUM.desc": "Everything in Basic + live venue slideshow + video uploads",
    "created.title": "🎉 Your event is live!",
    "created.sub": "Save these links — the admin link is private, treat it like a password.",
    "created.admin": "Admin dashboard (private)",
    "created.guest": "Guest upload page",
    "created.slideshow": "Venue slideshow (for the DJ/AV screen)",

    "admin.brand": "SnapEvent Admin",
    "admin.uploaded": "Uploaded",
    "admin.approved": "Approved",
    "admin.pending": "Pending",
    "admin.guestsOnline": "Guests online",
    "admin.tabModeration": "Moderation",
    "admin.tabAssets": "Assets",
    "admin.tabExport": "Export",
    "admin.newAlert": "new photos just arrived — click to view",
    "admin.filterPending": "Awaiting review",
    "admin.filterAll": "Everything",
    "admin.emptyPending": "All caught up! New uploads will appear here instantly. ✨",
    "admin.emptyAll": "No media yet — get those QR codes on the tables!",
    "admin.approve": "✓ Approve",
    "admin.reject": "✕ Reject",
    "admin.statusApproved": "Approved — live on screen",
    "admin.statusRejected": "Rejected",
    "admin.assetsTitle": "Printable table signs",
    "admin.assetsBody": "Print one per table. Guests scan with their native camera — no app needed.",
    "admin.downloadQr": "Download QR (print-ready PNG)",
    "admin.openSign": "Open printable A5 sign",
    "admin.venueUrl": "Venue screen URL (give this to the DJ/AV):",
    "admin.exportTitle": "Take your memories home",
    "admin.zipApproved": "⬇️ Download ZIP — approved photos",
    "admin.zipAll": "Download ZIP — everything",
    "admin.googleConnect": "Connect Google Drive / Photos",
    "admin.googleSync": "☁️ Sync approved photos to Google Drive",
    "admin.syncing": "Syncing to Google Drive…",
    "admin.syncDone": "Done — {n} files uploaded. Open:",
    "admin.syncFailed": "Sync failed:",

    "guest.tagline": "Share your moments with us 📸",
    "guest.yourName": "Your name",
    "guest.namePlaceholder": "e.g. Dana Levi",
    "guest.enter": "Enter",
    "guest.noSignup": "No signup, no app — just your name so we know who to thank 🙏",
    "guest.share": "Share Your Moments",
    "guest.pickPhotosVideos": "Photos & videos — multi-select supported",
    "guest.pickPhotos": "Photos — multi-select supported",
    "guest.pendingNote": "Your photos appear in the album (and on the big screen!) after host approval ✨",
    "guest.connectedAs": "Connected as",
    "guest.changeName": "Change name",
    "guest.compressing": "Compressing…",
    "guest.uploading": "Uploading…",
    "guest.done": "Uploaded ✓ pending approval",
    "guest.error": "Error",
    "guest.errVideoPremium": "Videos are available on the Premium package only",
    "guest.errVideoSize": "Video too large (max 100MB)",
    "guest.errUpload": "Upload failed, please try again",
    "guest.errSave": "Saving failed, please try again",
  },
} as const;

export type MessageKey = keyof (typeof messages)["he"];

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey) => string;
  dir: "rtl" | "ltr";
}

const LangContext = createContext<LangContextValue>({
  lang: "he",
  setLang: () => {},
  t: (key) => messages.he[key] ?? key,
  dir: "rtl",
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "he") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  return (
    <LangContext.Provider
      value={{
        lang,
        setLang,
        t: (key) => messages[lang][key] ?? messages.he[key] ?? key,
        dir: lang === "he" ? "rtl" : "ltr",
      }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Small floating עב/EN switch. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "he" ? "en" : "he")}
      className={`rounded-full border border-neutral-300 bg-white/80 px-3 py-1 text-xs font-bold text-neutral-600 shadow-sm backdrop-blur transition hover:border-brand-400 ${className}`}
      aria-label={lang === "he" ? "Switch to English" : "מעבר לעברית"}
    >
      {lang === "he" ? "EN" : "עברית"}
    </button>
  );
}
