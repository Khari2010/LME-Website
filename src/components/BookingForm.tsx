"use client";

import { useState } from "react";
import type { BookingFormData } from "@/lib/booking-types";

const GENRES = [
  "70s/80s Disco",
  "90s RnB",
  "00s RnB",
  "Afrobeats",
  "Amapiano",
  "Soca",
  "Gospel",
  "Dancehall",
  "Reggae",
  "Funky House",
  "Electro Dance",
  "Garage",
  "Pop",
];

function ToggleGroup({
  field,
  options,
  value,
  onChange,
}: {
  field: string;
  options: string[];
  value: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(field, opt)}
          className={`flex-1 py-2.5 text-center font-body text-sm font-semibold rounded-lg border transition-all min-h-[44px] cursor-pointer ${
            value === opt
              ? "border-teal-primary bg-teal-primary/8 text-teal-glow"
              : "border-border bg-card text-muted hover:border-teal-deep hover:text-lme-white"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function GenreCard({
  genre,
  selected,
  onToggle,
}: {
  genre: string;
  selected: boolean;
  onToggle: (genre: string) => void;
}) {
  return (
    <label
      className={`relative flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all min-h-[44px] select-none ${
        selected
          ? "border-teal-primary bg-teal-primary/8"
          : "border-border bg-card hover:border-teal-deep"
      }`}
      onClick={() => onToggle(genre)}
    >
      <span
        className={`w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center border-[1.5px] transition-all ${
          selected
            ? "border-teal-primary bg-teal-primary"
            : "border-border"
        }`}
      >
        {selected && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path
              d="M1 5l3.5 3.5L11 1"
              stroke="#080808"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`font-body text-sm font-medium ${
          selected ? "text-lme-white" : "text-body"
        }`}
      >
        {genre}
      </span>
    </label>
  );
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3.5 mb-7 pb-3.5 border-b-2 border-teal-dark">
      <span className="font-mono text-[0.7rem] font-bold text-teal-mist bg-teal-dark px-2.5 py-1 rounded-full tracking-[0.15em]">
        {num}
      </span>
      <span className="font-display text-[1.6rem] text-lme-white tracking-[0.1em] uppercase">
        {title}
      </span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  hint,
  full,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="block font-mono text-[0.68rem] font-bold text-muted uppercase tracking-[0.2em] mb-2">
        {label}
        {required && <span className="text-teal-primary ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[0.78rem] text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full bg-card border border-border rounded-lg px-3.5 py-3 text-lme-white font-body text-[0.95rem] outline-none transition-colors focus:border-teal-primary placeholder:text-[#555]";

const selectClass =
  "w-full bg-card border border-border rounded-lg px-3.5 py-3 text-lme-white font-body text-[0.95rem] outline-none transition-colors focus:border-teal-primary appearance-none bg-no-repeat bg-[right_14px_center] pr-9";

const selectBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%238A8A8A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export interface BookingFormProps {
  mode: "create" | "edit";
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => Promise<{ token?: string }>;
}

const TOGGLE_KEYS = ["parking", "soundLimiter", "stepFreeAccess", "djRequired"] as const;

export default function BookingForm({ mode, initialData, onSubmit }: BookingFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (!initialData) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(initialData)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  });

  const [toggles, setToggles] = useState<Record<string, string>>(() => {
    if (!initialData) return {};
    const result: Record<string, string> = {};
    for (const key of TOGGLE_KEYS) {
      if (typeof initialData[key] === "string") {
        result[key] = initialData[key] as string;
      }
    }
    return result;
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialData?.genres ?? []
  );

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [editToken, setEditToken] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  function handleInput(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }
  }

  function handleToggle(field: string, value: string) {
    setToggles((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const required = ["clientName", "email", "contactNumber", "eventType", "eventDate", "venueName"];
    const errors: Record<string, boolean> = {};
    let valid = true;
    for (const field of required) {
      if (!formData[field]?.trim()) {
        errors[field] = true;
        valid = false;
      }
    }
    setFieldErrors(errors);

    if (!valid) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        clientName: formData.clientName ?? "",
        email: formData.email ?? "",
        contactNumber: formData.contactNumber ?? "",
        clientAddress: formData.clientAddress,
        dayOfContactName: formData.dayOfContactName,
        dayOfContactNumber: formData.dayOfContactNumber,
        eventType: formData.eventType ?? "",
        eventDate: formData.eventDate ?? "",
        personCelebrated: formData.personCelebrated,
        eventStartTime: formData.eventStartTime,
        guestArrivalTime: formData.guestArrivalTime,
        venueCurfew: formData.venueCurfew,
        expectedGuests: formData.expectedGuests,
        venueName: formData.venueName ?? "",
        venueAddress: formData.venueAddress,
        venueContactName: formData.venueContactName,
        venueContactNumber: formData.venueContactNumber,
        earliestAccessTime: formData.earliestAccessTime,
        powerSupply: formData.powerSupply,
        parking: toggles.parking,
        soundLimiter: toggles.soundLimiter,
        stepFreeAccess: toggles.stepFreeAccess,
        accessRestrictions: formData.accessRestrictions,
        vehicleDistance: formData.vehicleDistance,
        unloadingPoint: formData.unloadingPoint,
        soundcheckTime: formData.soundcheckTime,
        djRequired: toggles.djRequired,
        djSetTimings: formData.djSetTimings,
        djGenres: formData.djGenres,
        genres: selectedGenres,
        otherGenres: formData.otherGenres,
        specialRequests: formData.specialRequests,
      } satisfies BookingFormData;

      const result = await onSubmit(payload);

      if (result.token) {
        setEditToken(result.token);
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "Something went wrong. Please try again or email info@lmeband.com"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!editToken) return;
    const url = `${window.location.origin}/bookingform/edit/${editToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center py-20">
          <h2 className="font-display text-[3.6rem] text-teal-glow tracking-[0.12em] mb-5">
            {mode === "create" ? "WE GOT YOU" : "BOOKING UPDATED"}
          </h2>
          {mode === "create" ? (
            <p className="text-body text-base max-w-[460px] mx-auto leading-relaxed">
              Your booking form has been received. We&apos;ll review your details
              and be in touch with a Performance Contract for signing.
              <br />
              <br />
              Questions? Hit us at{" "}
              <a
                href="mailto:info@lmeband.com"
                className="text-teal-primary hover:text-teal-glow transition-colors"
              >
                info@lmeband.com
              </a>
            </p>
          ) : (
            <p className="text-body text-base max-w-[460px] mx-auto leading-relaxed">
              Your booking details have been updated successfully. We&apos;ll review
              any changes and be in touch if we need anything further.
              <br />
              <br />
              Questions? Hit us at{" "}
              <a
                href="mailto:info@lmeband.com"
                className="text-teal-primary hover:text-teal-glow transition-colors"
              >
                info@lmeband.com
              </a>
            </p>
          )}

          {editToken && (
            <div className="mt-8 max-w-[460px] mx-auto bg-card border border-border rounded-xl p-5 text-left">
              <p className="font-mono text-[0.7rem] text-teal-primary tracking-[0.15em] uppercase mb-3">
                Save this link to update your booking details anytime
              </p>
              <div className="flex gap-2 items-center">
                <span className="flex-1 font-mono text-[0.78rem] text-muted break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/bookingform/edit/${editToken}`
                    : `/bookingform/edit/${editToken}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-shrink-0 font-mono text-[0.75rem] font-bold tracking-[0.1em] uppercase text-lme-black bg-teal-primary rounded-lg px-3 py-2 transition-colors hover:bg-teal-glow cursor-pointer"
                >
                  {copied ? "COPIED" : "Copy Link"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16">
      <form onSubmit={handleSubmit} noValidate>
        {/* 01 — CLIENT DETAILS */}
        <section className="mb-12">
          <SectionHeader num="01" title="CLIENT DETAILS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Client Name" required>
              <input
                type="text"
                className={`${inputClass} ${fieldErrors.clientName ? "!border-red-400" : ""}`}
                value={formData.clientName || ""}
                onChange={(e) => handleInput("clientName", e.target.value)}
              />
            </Field>
            <Field label="Email Address" required>
              <input
                type="email"
                className={`${inputClass} ${fieldErrors.email ? "!border-red-400" : ""}`}
                value={formData.email || ""}
                onChange={(e) => handleInput("email", e.target.value)}
              />
            </Field>
            <Field label="Contact Number" required>
              <input
                type="tel"
                className={`${inputClass} ${fieldErrors.contactNumber ? "!border-red-400" : ""}`}
                value={formData.contactNumber || ""}
                onChange={(e) => handleInput("contactNumber", e.target.value)}
              />
            </Field>
            <Field label="Client Address">
              <input
                type="text"
                className={inputClass}
                value={formData.clientAddress || ""}
                onChange={(e) => handleInput("clientAddress", e.target.value)}
              />
            </Field>
            <Field label="Day-of Contact Name">
              <input
                type="text"
                className={inputClass}
                value={formData.dayOfContactName || ""}
                onChange={(e) =>
                  handleInput("dayOfContactName", e.target.value)
                }
              />
            </Field>
            <Field label="Day-of Contact Number">
              <input
                type="tel"
                className={inputClass}
                value={formData.dayOfContactNumber || ""}
                onChange={(e) =>
                  handleInput("dayOfContactNumber", e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        {/* 02 — EVENT DETAILS */}
        <section className="mb-12">
          <SectionHeader num="02" title="EVENT DETAILS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Event Type" required>
              <select
                className={`${selectClass} ${fieldErrors.eventType ? "!border-red-400" : ""}`}
                style={{ backgroundImage: selectBg }}
                value={formData.eventType || ""}
                onChange={(e) => handleInput("eventType", e.target.value)}
              >
                <option value="" disabled>
                  Select type
                </option>
                <option>Wedding</option>
                <option>Corporate</option>
                <option>Private Party</option>
                <option>Festival</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Event Date" required>
              <input
                type="date"
                className={`${inputClass} ${fieldErrors.eventDate ? "!border-red-400" : ""}`}
                value={formData.eventDate || ""}
                onChange={(e) => handleInput("eventDate", e.target.value)}
              />
            </Field>
            <Field label="Name(s) of Person(s) Celebrated" full>
              <input
                type="text"
                className={inputClass}
                value={formData.personCelebrated || ""}
                onChange={(e) =>
                  handleInput("personCelebrated", e.target.value)
                }
              />
            </Field>
            <Field label="Event Start Time">
              <input
                type="time"
                className={inputClass}
                value={formData.eventStartTime || ""}
                onChange={(e) =>
                  handleInput("eventStartTime", e.target.value)
                }
              />
            </Field>
            <Field label="Guest Arrival Time">
              <input
                type="time"
                className={inputClass}
                value={formData.guestArrivalTime || ""}
                onChange={(e) =>
                  handleInput("guestArrivalTime", e.target.value)
                }
              />
            </Field>
            <Field label="Venue Curfew">
              <input
                type="time"
                className={inputClass}
                value={formData.venueCurfew || ""}
                onChange={(e) => handleInput("venueCurfew", e.target.value)}
              />
            </Field>
            <Field label="Expected Number of Guests">
              <input
                type="number"
                min="1"
                className={inputClass}
                value={formData.expectedGuests || ""}
                onChange={(e) =>
                  handleInput("expectedGuests", e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        {/* 03 — VENUE DETAILS */}
        <section className="mb-12">
          <SectionHeader num="03" title="VENUE DETAILS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Venue Name" required>
              <input
                type="text"
                className={`${inputClass} ${fieldErrors.venueName ? "!border-red-400" : ""}`}
                value={formData.venueName || ""}
                onChange={(e) => handleInput("venueName", e.target.value)}
              />
            </Field>
            <Field label="Venue Address">
              <input
                type="text"
                className={inputClass}
                value={formData.venueAddress || ""}
                onChange={(e) => handleInput("venueAddress", e.target.value)}
              />
            </Field>
            <Field label="Venue Contact Name">
              <input
                type="text"
                className={inputClass}
                value={formData.venueContactName || ""}
                onChange={(e) =>
                  handleInput("venueContactName", e.target.value)
                }
              />
            </Field>
            <Field label="Venue Contact Number">
              <input
                type="tel"
                className={inputClass}
                value={formData.venueContactNumber || ""}
                onChange={(e) =>
                  handleInput("venueContactNumber", e.target.value)
                }
              />
            </Field>
            <Field label="Earliest Building Access Time">
              <input
                type="time"
                className={inputClass}
                value={formData.earliestAccessTime || ""}
                onChange={(e) =>
                  handleInput("earliestAccessTime", e.target.value)
                }
              />
            </Field>
            <Field label="Power Supply">
              <select
                className={selectClass}
                style={{ backgroundImage: selectBg }}
                value={formData.powerSupply || ""}
                onChange={(e) => handleInput("powerSupply", e.target.value)}
              >
                <option value="" disabled>
                  Select
                </option>
                <option>Standard Sockets</option>
                <option>Single Phase</option>
                <option>3 Phase</option>
                <option>Not Sure</option>
              </select>
            </Field>
            <Field label="On-site Parking Available?">
              <ToggleGroup
                field="parking"
                options={["Yes", "No", "Not Sure"]}
                value={toggles.parking || ""}
                onChange={handleToggle}
              />
            </Field>
            <Field label="Sound Limiter?">
              <ToggleGroup
                field="soundLimiter"
                options={["Yes", "No", "Not Sure"]}
                value={toggles.soundLimiter || ""}
                onChange={handleToggle}
              />
            </Field>
          </div>
        </section>

        {/* 04 — LOAD-IN & ACCESS */}
        <section className="mb-12">
          <SectionHeader num="04" title="LOAD-IN & ACCESS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Step-free / Ground-level Access?" full>
              <ToggleGroup
                field="stepFreeAccess"
                options={["Yes", "No", "Not Sure"]}
                value={toggles.stepFreeAccess || ""}
                onChange={handleToggle}
              />
            </Field>
            <Field label="Access Restrictions" full>
              <input
                type="text"
                placeholder="Lifts, stairs, narrow corridors, etc."
                className={inputClass}
                value={formData.accessRestrictions || ""}
                onChange={(e) =>
                  handleInput("accessRestrictions", e.target.value)
                }
              />
            </Field>
            <Field label="Distance from Vehicle to Performance Area">
              <input
                type="text"
                className={inputClass}
                value={formData.vehicleDistance || ""}
                onChange={(e) =>
                  handleInput("vehicleDistance", e.target.value)
                }
              />
            </Field>
            <Field label="Nearest Vehicle Unloading Point">
              <input
                type="text"
                className={inputClass}
                value={formData.unloadingPoint || ""}
                onChange={(e) =>
                  handleInput("unloadingPoint", e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        {/* 05 — PERFORMANCE DETAILS */}
        <section className="mb-12">
          <SectionHeader num="05" title="PERFORMANCE DETAILS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Preferred Soundcheck Start Time"
              hint="We need approximately 90 minutes for soundcheck."
              full
            >
              <input
                type="time"
                className={inputClass}
                value={formData.soundcheckTime || ""}
                onChange={(e) =>
                  handleInput("soundcheckTime", e.target.value)
                }
              />
            </Field>
            <Field label="Do You Require a DJ?" full>
              <ToggleGroup
                field="djRequired"
                options={["Yes", "No"]}
                value={toggles.djRequired || ""}
                onChange={handleToggle}
              />
            </Field>
          </div>

          {toggles.djRequired === "Yes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <Field label="DJ Set Timings">
                <input
                  type="text"
                  className={inputClass}
                  value={formData.djSetTimings || ""}
                  onChange={(e) =>
                    handleInput("djSetTimings", e.target.value)
                  }
                />
              </Field>
              <Field label="Genres for DJ to Cover">
                <input
                  type="text"
                  className={inputClass}
                  value={formData.djGenres || ""}
                  onChange={(e) => handleInput("djGenres", e.target.value)}
                />
              </Field>
            </div>
          )}

          <div className="mt-5 bg-dark-surface border-l-[3px] border-teal-dark p-4 rounded-r-lg text-[0.85rem] text-muted leading-relaxed">
            Band member numbers will be confirmed closer to the event (up to
            7). Please ensure catering, green room space, and parking can
            accommodate this.
          </div>
        </section>

        {/* 06 — GENRE PREFERENCES */}
        <section className="mb-12">
          <SectionHeader num="06" title="GENRE PREFERENCES" />
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {GENRES.map((genre) => (
              <GenreCard
                key={genre}
                genre={genre}
                selected={selectedGenres.includes(genre)}
                onToggle={toggleGenre}
              />
            ))}
          </div>
          <div className="mt-5">
            <Field label="Other Genres or Specific Songs" full>
              <input
                type="text"
                className={inputClass}
                value={formData.otherGenres || ""}
                onChange={(e) => handleInput("otherGenres", e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* 07 — SPECIAL REQUESTS */}
        <section className="mb-12">
          <SectionHeader num="07" title="SPECIAL REQUESTS" />
          <Field label="Anything Else We Should Know" full>
            <textarea
              placeholder="Accessibility needs, special moments, surprises, vibes — tell us everything"
              className={`${inputClass} min-h-[110px] resize-y`}
              value={formData.specialRequests || ""}
              onChange={(e) =>
                handleInput("specialRequests", e.target.value)
              }
            />
          </Field>
        </section>

        {/* Submit */}
        <div className="text-center mt-14">
          {mode === "create" && (
            <p className="text-[0.85rem] text-muted max-w-[480px] mx-auto mb-7 leading-relaxed">
              We&apos;ll review your details and send a Performance Contract for
              signing. Your booking is confirmed once the contract is signed and
              the deposit is received.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="font-display text-[1.3rem] tracking-[0.1em] uppercase text-lme-black bg-teal-primary rounded-[10px] px-12 py-4 min-h-[56px] cursor-pointer transition-colors hover:bg-teal-glow disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full"
          >
            {mode === "create"
              ? submitting ? "SUBMITTING..." : "SUBMIT BOOKING FORM"
              : submitting ? "UPDATING..." : "UPDATE BOOKING"}
          </button>
          {error && (
            <p className="text-red-400 text-[0.9rem] mt-4">{error}</p>
          )}
        </div>
      </form>
    </div>
  );
}
