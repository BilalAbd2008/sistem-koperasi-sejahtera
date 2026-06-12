import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koperasi PRI BDAPK Cinagara",
  description: "Sistem Informasi Koperasi PRI BDAPK Cinagara",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body suppressHydrationWarning className="min-h-screen flex flex-col overflow-x-hidden">
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`(() => {
            const attrPattern = /^(bis_|fdprocessedid$|__processed_|data-new-gr-c-s-check-loaded$|data-gr-ext-installed$)/;

            const scrub = (root) => {
              if (!root || !root.querySelectorAll) return;

              const allNodes = [root, ...root.querySelectorAll('*')];
              for (const node of allNodes) {
                for (const attr of Array.from(node.attributes || [])) {
                  if (attrPattern.test(attr.name)) {
                    node.removeAttribute(attr.name);
                  }
                }
              }
            };

            scrub(document.documentElement);
          })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
