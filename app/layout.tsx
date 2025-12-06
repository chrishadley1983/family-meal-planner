import type { Metadata } from "next";
import "./globals.css";
// import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Family Meal Planner",
  description: "Plan meals, manage recipes, and generate smart shopping lists for your family",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* <SessionProvider> */}
          {children}
        {/* </SessionProvider> */}
      </body>
    </html>
  );
}
