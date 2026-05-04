import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// ---------------------------------------------------------------------------
// BrandLayout — shared wrapper for all LME transactional emails.
//
// Lives under `convex/email-templates/` so Node-runtime Convex actions can
// import it via relative paths. The same templates can also be previewed via
// `pnpm dlx react-email dev --dir convex/email-templates`.
//
// Design tokens mirror the LME brand kit (dark surface, teal accent). All
// styles are inlined — most email clients strip <style> tags and class names.
// ---------------------------------------------------------------------------

const colors = {
  bg: "#080808",
  surface: "#111111",
  border: "#252525",
  text: "#F5F5F0",
  textMuted: "#9ca3af",
  accent: "#14B8A6",
  accentDeep: "#0D9488",
};

export function BrandLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.bg,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
          <Section style={{ marginBottom: 32 }}>
            <Text
              style={{
                color: colors.accent,
                fontSize: 14,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                margin: 0,
                fontWeight: 700,
              }}
            >
              LME · Live Music Enhancers
            </Text>
          </Section>
          {children}
          <Hr style={{ borderColor: colors.border, margin: "40px 0 16px" }} />
          <Section>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Live Music Enhancers Limited · Birmingham, UK
              <br />
              <Link href="mailto:admin@lmeband.com" style={{ color: colors.textMuted }}>
                admin@lmeband.com
              </Link>
              {" · "}
              <Link href="https://lmeband.com" style={{ color: colors.textMuted }}>
                lmeband.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const brand = {
  Heading: ({ children }: { children: React.ReactNode }) => (
    <Text
      style={{
        color: colors.text,
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1.15,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  ),
  Body: ({ children }: { children: React.ReactNode }) => (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: 16,
        lineHeight: 1.6,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  ),
  Cta: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Section style={{ margin: "24px 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: colors.accent,
          color: "#0a0a0a",
          padding: "14px 28px",
          borderRadius: 6,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {children}
      </Link>
    </Section>
  ),
  Small: ({ children }: { children: React.ReactNode }) => (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 1.5,
        margin: "16px 0 0",
      }}
    >
      {children}
    </Text>
  ),
  colors,
};
