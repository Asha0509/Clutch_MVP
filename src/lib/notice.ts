// PRD Sec 11.2 and 11.3. Changing any text here means a new NOTICE_VERSION, which re-asks consent.
export const NOTICE_VERSION = "2026-11-14";

// Every purpose firestore.rules accepts. ai_processing is asked only when the user first uses that feature.
export const ALL_PURPOSES = [
  "core",
  "alerts_email",
  "alerts_push",
  "marketing",
  "ai_processing",
] as const;
export type Purpose = (typeof ALL_PURPOSES)[number];

export const ASKED_AT_SIGNUP: {
  id: Purpose;
  label: string;
  detail: string;
  required: boolean;
}[] = [
  {
    id: "core",
    label: "Store my cards and numbers to run Clutch",
    detail: "Needed for Clutch to work.",
    required: true,
  },
  {
    id: "alerts_email",
    label: "Email me when a card I hold changes",
    detail: "Off unless you turn it on.",
    required: false,
  },
  {
    id: "alerts_push",
    label: "Send me push alerts",
    detail: "Off unless you turn it on.",
    required: false,
  },
  {
    id: "marketing",
    label: "Tell me about card offers",
    detail: "Off unless you turn it on.",
    required: false,
  },
];

export const NOTICE: { heading: string; body: string }[] = [
  {
    heading: "What we store",
    body: "Your Google name and email, your birth year and month, the cards you pick (product and, if you add them, the last four digits) and the numbers you enter, such as spend, points and dates. Never your full card number, expiry, CVV, PIN, OTP or bank login.",
  },
  {
    heading: "Why",
    body: "To work out, in rupees, what your cards may cost you and which card to use. Nothing is shared for advertising.",
  },
  {
    heading: "Who sees it",
    body: "The Founder, to run and support Clutch. Google Cloud, where it is stored. Our email provider, and only your email address, if you turn on email alerts.",
  },
  {
    heading: "How long",
    body: "Until you delete your account. A record of your consent choices, without your name or email, is kept for one year after that.",
  },
  {
    heading: "Deleting your data",
    body: "A delete-account option is being built and will be in Settings before the pilot opens.",
  },
  {
    heading: "Questions or complaints",
    body: "We will publish a grievance contact before the pilot opens.",
  },
];
