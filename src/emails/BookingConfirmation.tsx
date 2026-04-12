import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
  Button,
} from "@react-email/components";

interface BookingConfirmationProps {
  clientName: string;
  eventType: string;
  eventDate: string;
  venueName: string;
  editUrl: string;
}

export default function BookingConfirmation({
  clientName,
  eventType,
  eventDate,
  venueName,
  editUrl,
}: BookingConfirmationProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Logo */}
          <Section style={logoSectionStyle}>
            <Img
              src="https://www.lmeband.com/images/logos/lme-typo-white.png"
              alt="LME"
              height={40}
              style={logoStyle}
            />
          </Section>

          {/* Heading */}
          <Section style={headingSectionStyle}>
            <Text style={headingStyle}>WE GOT YOU</Text>
          </Section>

          {/* Body text */}
          <Section style={bodySectionStyle}>
            <Text style={bodyTextStyle}>
              Your booking form has been received. We&apos;ll review your
              details and be in touch with a Performance Contract for signing.
            </Text>
          </Section>

          {/* Details card */}
          <Section style={cardSectionStyle}>
            <table style={cardTableStyle} width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={cardRowStyle}>
                    <Text style={labelStyle}>Client</Text>
                    <Text style={valueStyle}>{clientName}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={cardRowDividerStyle}>
                    <Hr style={dividerStyle} />
                  </td>
                </tr>
                <tr>
                  <td style={cardRowStyle}>
                    <Text style={labelStyle}>Event Type</Text>
                    <Text style={valueStyle}>{eventType}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={cardRowDividerStyle}>
                    <Hr style={dividerStyle} />
                  </td>
                </tr>
                <tr>
                  <td style={cardRowStyle}>
                    <Text style={labelStyle}>Date</Text>
                    <Text style={valueStyle}>{eventDate}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={cardRowDividerStyle}>
                    <Hr style={dividerStyle} />
                  </td>
                </tr>
                <tr>
                  <td style={cardRowStyle}>
                    <Text style={labelStyle}>Venue</Text>
                    <Text style={valueStyle}>{venueName}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA Button */}
          <Section style={ctaSectionStyle}>
            <Button href={editUrl} style={buttonStyle}>
              View or Edit Your Booking
            </Button>
          </Section>

          {/* Plain text URL */}
          <Section style={urlSectionStyle}>
            <Text style={urlLabelStyle}>Or copy this link:</Text>
            <Link href={editUrl} style={urlLinkStyle}>
              {editUrl}
            </Link>
          </Section>

          <Hr style={footerDividerStyle} />

          {/* Footer */}
          <Section style={footerSectionStyle}>
            <Text style={footerTextStyle}>
              Questions? Email{" "}
              <Link href="mailto:info@lmeband.com" style={footerLinkStyle}>
                info@lmeband.com
              </Link>
            </Text>
            <Text style={copyrightStyle}>
              &copy; {new Date().getFullYear()} LME. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#080808",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#080808",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 24px",
};

const logoSectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "32px",
};

const logoStyle: React.CSSProperties = {
  display: "inline-block",
};

const headingSectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "8px",
};

const headingStyle: React.CSSProperties = {
  color: "#5EEAD4",
  fontSize: "36px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  margin: 0,
  textTransform: "uppercase",
};

const bodySectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "32px",
};

const bodyTextStyle: React.CSSProperties = {
  color: "#F5F5F0",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 auto",
  maxWidth: "480px",
};

const cardSectionStyle: React.CSSProperties = {
  paddingBottom: "32px",
};

const cardTableStyle: React.CSSProperties = {
  backgroundColor: "#141414",
  borderRadius: "8px",
  overflow: "hidden",
};

const cardRowStyle: React.CSSProperties = {
  padding: "16px 24px",
};

const cardRowDividerStyle: React.CSSProperties = {
  padding: "0 24px",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#222222",
  borderTopWidth: "1px",
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  color: "#8A8A8A",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.1em",
  margin: "0 0 4px 0",
  textTransform: "uppercase",
};

const valueStyle: React.CSSProperties = {
  color: "#F5F5F0",
  fontSize: "15px",
  fontWeight: "500",
  margin: 0,
};

const ctaSectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "16px",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#14B8A6",
  borderRadius: "6px",
  color: "#080808",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "0.05em",
  padding: "14px 32px",
  textDecoration: "none",
  textTransform: "uppercase",
};

const urlSectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "32px",
};

const urlLabelStyle: React.CSSProperties = {
  color: "#8A8A8A",
  fontSize: "12px",
  margin: "0 0 4px 0",
};

const urlLinkStyle: React.CSSProperties = {
  color: "#14B8A6",
  fontSize: "12px",
  wordBreak: "break-all",
};

const footerDividerStyle: React.CSSProperties = {
  borderColor: "#222222",
  borderTopWidth: "1px",
  marginBottom: "24px",
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "40px",
};

const footerTextStyle: React.CSSProperties = {
  color: "#8A8A8A",
  fontSize: "13px",
  margin: "0 0 8px 0",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#14B8A6",
  textDecoration: "none",
};

const copyrightStyle: React.CSSProperties = {
  color: "#8A8A8A",
  fontSize: "12px",
  margin: 0,
};
