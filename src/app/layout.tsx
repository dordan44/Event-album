import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapEvent — כל התמונות מהאירוע שלכם, במקום אחד",
  description:
    "האורחים סורקים ברקוד, משתפים תמונות בשניות, והמסך באולם מתמלא ברגעים. שיתוף מדיה בזמן אמת לחתונות, בר/בת מצווה ואירועי חברה. | Real-time event media sharing for weddings, bar mitzvahs and corporate events.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
