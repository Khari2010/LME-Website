import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  magicLinkUrl: string;
  isNewSignup: boolean;
}

const brand = {
  bg: "#0a0a0a",
  text: "#ffffff",
  muted: "#9ca3af",
  accent: "#14b8a6", // teal
  border: "#1f2937",
};

export default function EnhancerWelcome({ magicLinkUrl, isNewSignup }: Props) {
  const headline = isNewSignup ? "You're in." : "Welcome back.";
  const intro = isNewSignup
    ? "You just joined the Enhancers — LME's private community. Click below to unlock exclusive content, mixes and behind-the-scenes."
    : "Click the button below to access your Enhancers area.";
  const preview = isNewSignup
    ? "You're in. One tap to unlock the Enhancers area."
    : "One tap to access your Enhancers area.";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: brand.bg, color: brand.text, fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Section>
            <Text style={{ color: brand.accent, fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
              LME · Enhancers
            </Text>
          </Section>
          <Section style={{ paddingTop: 24 }}>
            <Heading as="h1" style={{ color: brand.text, fontSize: 36, fontWeight: 700, margin: 0 }}>
              {headline}
            </Heading>
            <Text style={{ color: brand.muted, fontSize: 16, lineHeight: 1.6, paddingTop: 12 }}>
              {intro}
            </Text>
          </Section>
          <Section style={{ paddingTop: 32 }}>
            <Button
              href={magicLinkUrl}
              style={{
                backgroundColor: brand.accent,
                color: "#0a0a0a",
                padding: "16px 32px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Open my Enhancers area
            </Button>
            <Text style={{ color: brand.muted, fontSize: 12, paddingTop: 16 }}>
              Or paste this link: <Link href={magicLinkUrl} style={{ color: brand.accent }}>{magicLinkUrl}</Link>
            </Text>
            <Text style={{ color: brand.muted, fontSize: 12 }}>
              This link expires in 7 days and can only be used once.
            </Text>
          </Section>
          <Hr style={{ borderColor: brand.border, margin: "40px 0 16px" }} />
          <Section>
            <Text style={{ color: brand.muted, fontSize: 11, lineHeight: 1.6 }}>
              You're getting this because you signed up to the Enhancers at lmeband.com.
              <br />
              <Link href="https://lmeband.com" style={{ color: brand.muted }}>lmeband.com</Link>
              {" · "}
              <Link href="https://instagram.com/lme.band" style={{ color: brand.muted }}>Instagram</Link>
              {" · "}
              <Link href="https://youtube.com/@livemusicenhancers" style={{ color: brand.muted }}>YouTube</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
