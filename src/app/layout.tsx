import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionProvider } from "@/components/ui/SessionProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Dropza — Drop it. Share it. Done.",
  description:
    "Fast, privacy-conscious file sharing and peer-to-peer WebRTC direct transfers across all your devices.",
  keywords: ["file sharing", "webrtc transfer", "direct device transfer", "cloud upload", "secure share", "dropza"],
  authors: [{ name: "Dropza Team" }],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('dropza-theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F6FAF7] dark:bg-[#0B120E] text-[#0E1B13] dark:text-[#F0FDF4] antialiased selection:bg-[#10B981]/25 selection:text-[#10B981]">
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1 flex flex-col w-full">{children}</main>
              <Footer />
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
