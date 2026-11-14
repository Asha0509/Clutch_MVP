"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { isAdult } from "@/lib/age";
import { update, useLocalStore } from "@/lib/local-store";

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

// PRD Sec 6.1 age check, then straight to the cards. No sign-in: the prototype keeps everything in
// this browser (Founder decision 2026-11-14), and stores only that the visitor is an adult.
export function StartFlow() {
  const s = useLocalStore();
  const router = useRouter();
  const [dob, setDob] = useState({ year: 0, month: 0 });
  const [minor, setMinor] = useState(false);
  const thisYear = new Date().getFullYear();
  useEffect(() => {
    if (s?.adult) router.replace("/cards");
  }, [s, router]);

  if (minor)
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

  if (s?.adult) return null;

  return (
    <section className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold">When were you born?</h1>
      <p className="text-muted-foreground">
        Clutch is for people aged 18 and over. No sign-in: your cards and the
        numbers you enter stay in this browser and are never sent to us. We do
        not keep your birth date. Alerts never contain offers.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="dob-month">Month</FieldLabel>
          <NativeSelect
            id="dob-month"
            value={dob.month || ""}
            onChange={(e) => setDob({ ...dob, month: Number(e.target.value) })}
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
            value={dob.year || ""}
            onChange={(e) => setDob({ ...dob, year: Number(e.target.value) })}
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
        disabled={!dob.year || !dob.month}
        onClick={() => {
          if (!isAdult(dob.year, dob.month, new Date())) return setMinor(true);
          update((st) => ({ ...st, adult: true }));
          router.push("/cards");
        }}
      >
        Continue
      </Button>
    </section>
  );
}
