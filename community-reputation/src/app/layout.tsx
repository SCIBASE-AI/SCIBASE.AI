import "./globals.css";
import { Providers } from "@/components/Providers";
import { DemoLoginBar } from "@/components/DemoLoginBar";

export const metadata = { title: "SCIBASE Community" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <DemoLoginBar />
          <nav>
            <a href="/" className="brand">
              SCI<span>BASE</span>
            </a>
            <ul className="nav-links">
              <li><a href="/leaderboard">Leaderboard</a></li>
            </ul>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
