import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapEvent — כל התמונות מהאירוע שלכם, במקום אחד",
  description:
    "Guests scan a QR, share photos instantly, and your venue screen comes alive. Real-time event media sharing for weddings, bar mitzvahs and corporate events.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
