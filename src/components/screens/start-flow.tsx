"use client";

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { isAdult } from "@/lib/age";
import { auth } from "@/lib/firebase";
import {
  ASKED_AT_SIGNUP,
  NOTICE,
  NOTICE_VERSION,
  type Purpose,
} from "@/lib/notice";
import { useUser } from "@/lib/use-user";
import { createProfileWithConsent, hasProfile } from "@/lib/user-data";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Step = "dob" | "minor" | "consent";

// PRD Sec 4 journey 1: sign in, birth year and month (Sec 6.1), consent (Sec 11), then pick cards.
export function StartFlow() {
  const user = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>("dob");
  const [profile, setProfile] = useState<{
    uid: string;
    exists: boolean;
  } | null>(null);
  const [dob, setDob] = useState({ dobYear: 0, dobMonth: 0 });
  const [choices, setChoices] = useState<Record<Purpose, boolean>>({
    core: true,
    alerts_email: false,
    alerts_push: false,
    marketing: false,
    ai_processing: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A returning user with a profile goes straight to their cards.
  useEffect(() => {
    if (!user) return;
    let live = true;
    hasProfile(user.uid)
      .then((exists) => live && setProfile({ uid: user.uid, exists }))
      .catch(() => live && setProfile({ uid: user.uid, exists: false }));
    return () => {
      live = false;
    };
  }, [user]);
  useEffect(() => {
    if (profile?.exists) router.replace("/cards");
  }, [profile, router]);

  const thisYear = new Date().getFullYear();

  if (step === "minor")
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold">
          Clutch is for people aged 18 and over
        </h1>
        <p className="text-muted-foreground">
          Please ask a parent or guardian to help you with your cards. We have
          not saved anything about you.
        </p>
      </section>
    );

  if (user === undefined)
    return <p className="py-10 text-muted-foreground">Loading…</p>;

  if (!user)
    return (
      <section className="space-y-6 py-10">
        <h1 className="text-2xl font-semibold">Sign in to check your cards</h1>
        <p className="text-muted-foreground">
          We only ask Google for your name and email. No bank logins, no SMS, no
          Gmail access.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="lg"
          onClick={() => {
            setError(null);
            signInWithPopup(auth, new GoogleAuthProvider()).catch(() =>
              setError("Sign-in did not finish. Try again."),
            );
          }}
        >
          Continue with Google
        </Button>
      </section>
    );

  if (!profile || profile.uid !== user.uid || profile.exists)
    return <p className="py-10 text-muted-foreground">Loading…</p>;

  if (step === "dob")
    return (
      <section className="space-y-6 py-10">
        <h1 className="text-2xl font-semibold">When were you born?</h1>
        <p className="text-muted-foreground">
          Clutch is for people aged 18 and over. We store only the year and
          month.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="dob-month">Month</FieldLabel>
            <NativeSelect
              id="dob-month"
              value={dob.dobMonth || ""}
              onChange={(e) =>
                setDob({ ...dob, dobMonth: Number(e.target.value) })
              }
            >
              <NativeSelectOption value="">Choose</NativeSelectOption>
              {MONTHS.map((m, i) => (
                <NativeSelectOption key={m} value={i + 1}>
                  {m}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="dob-year">Year</FieldLabel>
            <NativeSelect
              id="dob-year"
              value={dob.dobYear || ""}
              onChange={(e) =>
                setDob({ ...dob, dobYear: Number(e.target.value) })
              }
            >
              <NativeSelectOption value="">Choose</NativeSelectOption>
              {Array.from({ length: 100 }, (_, i) => thisYear - i).map((y) => (
                <NativeSelectOption key={y} value={y}>
                  {y}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Button
          size="lg"
          disabled={!dob.dobYear || !dob.dobMonth}
          onClick={() => {
            if (isAdult(dob.dobYear, dob.dobMonth, new Date()))
              setStep("consent");
            else {
              setStep("minor");
              // Data minimisation: remove the sign-in record too, so nothing about a minor is kept.
              void user.delete().catch(() => signOut(auth));
            }
          }}
        >
          Continue
        </Button>
      </section>
    );

  return (
    <section className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold">Before you add cards</h1>
      <div className="space-y-4">
        {NOTICE.map((n) => (
          <div key={n.heading}>
            <h2 className="font-medium">{n.heading}</h2>
            <p className="text-sm text-muted-foreground">{n.body}</p>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Notice version {NOTICE_VERSION}.
        </p>
      </div>
      <div className="space-y-4">
        {ASKED_AT_SIGNUP.map((p) => (
          <label
            key={p.id}
            className="flex items-start justify-between gap-4"
            htmlFor={`consent-${p.id}`}
          >
            <span>
              <span className="block font-medium">{p.label}</span>
              <span className="block text-sm text-muted-foreground">
                {p.detail}
              </span>
            </span>
            <Switch
              id={`consent-${p.id}`}
              checked={p.required || choices[p.id]}
              disabled={p.required}
              onCheckedChange={(on) => setChoices({ ...choices, [p.id]: on })}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="lg"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          createProfileWithConsent(user, dob, choices)
            .then(() => router.push("/cards"))
            .catch(() => {
              setError(
                "We could not save that. Check your connection and try again.",
              );
              setBusy(false);
            });
        }}
      >
        Agree and continue
      </Button>
    </section>
  );
}
