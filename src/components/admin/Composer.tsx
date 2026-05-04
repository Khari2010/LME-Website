"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PreSendChecklist } from "./PreSendChecklist";

type EditorMode = "rich" | "html";

type Toast = { kind: "ok" | "err" | "info"; msg: string } | null;

const TOOLBAR_BUTTONS: { cmd: string; label: React.ReactNode; aria: string }[] =
  [
    { cmd: "bold", label: <strong>B</strong>, aria: "Bold" },
    { cmd: "italic", label: <em>I</em>, aria: "Italic" },
    { cmd: "underline", label: <u>U</u>, aria: "Underline" },
    { cmd: "insertUnorderedList", label: "• List", aria: "Bullet list" },
    { cmd: "insertOrderedList", label: "1. List", aria: "Numbered list" },
    { cmd: "justifyLeft", label: "≡L", aria: "Align left" },
    { cmd: "justifyCenter", label: "≡C", aria: "Align centre" },
    { cmd: "removeFormat", label: "✕ Format", aria: "Clear formatting" },
  ];

export default function Composer({
  userId,
  draftId,
}: {
  userId: string;
  draftId?: Id<"campaigns">;
}) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const recipients = useQuery(api.contacts.getActiveContactsForSend, {});
  const distinctTags = useQuery(api.contacts.getDistinctTags, {});
  const segmentCount = useQuery(api.contacts.countActiveByTags, {
    tags: selectedTags,
  });
  const draft = useQuery(
    api.campaigns.getDraft,
    draftId ? { id: draftId } : "skip",
  );
  const sendTest = useAction(api.campaignSender.sendTest);
  const sendCampaign = useAction(api.campaignSender.sendCampaign);
  const saveDraftMutation = useMutation(api.campaigns.saveDraft);
  const scheduleSendMutation = useMutation(api.campaigns.scheduleSend);

  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [mode, setMode] = useState<EditorMode>("rich");
  const [richHtml, setRichHtml] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<Toast>(null);
  const [sendStatus, setSendStatus] = useState<Toast>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  // P2-T3: pre-send checklist modal — runs validation against the saved draft
  // before the typed-SEND ConfirmDialog opens.
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [preparingChecklist, setPreparingChecklist] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<
    Id<"campaigns"> | undefined
  >(draftId);

  // P2-T1: schedule-for-later toggle + datetime
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>(""); // datetime-local string
  const [scheduling, setScheduling] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const draftLoadedRef = useRef(false);

  // AI Draft Assistant state
  const [aiDescription, setAiDescription] = useState("");
  const [aiAudience, setAiAudience] = useState("All LME subscribers");
  const [aiTone, setAiTone] = useState(
    "Hype and energetic — high energy, punchy, like announcing a big night out",
  );
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const totalActiveCount = recipients?.length ?? 0;
  const recipientCount =
    selectedTags.length === 0 ? totalActiveCount : (segmentCount ?? 0);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  // Initialise editor's innerHTML once on mount, after that let contenteditable own it.
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  // Load draft into editor once when it arrives. Only run on initial draft load
  // — don't clobber the editor on subsequent changes (e.g. after saveDraft
  // patches the document and the query reactively re-fires).
  useEffect(() => {
    if (!draft || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    setSubject(draft.subjectLine ?? "");
    setPreheader(draft.preheader ?? "");
    const body = draft.bodyHtml ?? "";
    // Heuristic: if body contains a tag like `<...>`, default to HTML mode so
    // pasted-template drafts don't get reformatted by contenteditable.
    if (/<\w+[^>]*>/.test(body)) {
      setRawHtml(body);
      setMode("html");
    } else {
      setRichHtml(body);
      if (editorRef.current) editorRef.current.innerHTML = body;
      setMode("rich");
    }
  }, [draft]);

  function getCurrentHtml(): string {
    if (mode === "html") return rawHtml.trim();
    return (editorRef.current?.innerHTML ?? "").trim();
  }

  function exec(cmd: string) {
    // execCommand is deprecated but still works in all major browsers — same as
    // Chris's app uses. Fine for an internal admin tool.
    document.execCommand(cmd);
    if (editorRef.current) {
      editorRef.current.focus();
      setRichHtml(editorRef.current.innerHTML);
    }
  }

  function switchMode(target: EditorMode) {
    if (target === mode) return;
    if (target === "html") {
      // Carry rich-text HTML over to the textarea
      setRawHtml(editorRef.current?.innerHTML ?? "");
      setMode("html");
    } else {
      // HTML → rich: warn if there's content that may be stripped
      const current = rawHtml.trim();
      if (current && current !== (editorRef.current?.innerHTML ?? "").trim()) {
        const ok = window.confirm(
          "Switching to rich text may strip Outlook conditionals, tables, and inline styles from your HTML. Continue?",
        );
        if (!ok) return;
        if (editorRef.current) {
          editorRef.current.innerHTML = current;
          setRichHtml(current);
        }
      }
      setMode("rich");
    }
  }

  async function handleSendTest() {
    setTestStatus(null);
    const email = testEmail.trim();
    if (!email || !email.includes("@")) {
      setTestStatus({ kind: "err", msg: "Enter a valid email address." });
      return;
    }
    const html = getCurrentHtml();
    if (!html || html === "<br>" || html === "<p></p>") {
      setTestStatus({ kind: "err", msg: "Write your email first." });
      return;
    }
    if (!subject.trim()) {
      setTestStatus({ kind: "err", msg: "Subject line is required." });
      return;
    }
    setTesting(true);
    setTestStatus({ kind: "info", msg: `Sending test to ${email}…` });
    try {
      await sendTest({ subject: subject.trim(), bodyHtml: html, toEmail: email });
      setTestStatus({ kind: "ok", msg: `Test sent to ${email} ✓` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setTestStatus({ kind: "err", msg: `Test failed: ${msg}` });
    } finally {
      setTesting(false);
    }
  }

  function openConfirm() {
    setSendStatus(null);
    if (!subject.trim()) {
      setSendStatus({ kind: "err", msg: "Subject line is required." });
      return;
    }
    const html = getCurrentHtml();
    if (!html || html === "<br>" || html === "<p></p>") {
      setSendStatus({ kind: "err", msg: "Write your email first." });
      return;
    }
    if (recipientCount === 0) {
      setSendStatus({ kind: "err", msg: "No active recipients." });
      return;
    }
    setConfirmText("");
    setConfirmOpen(true);
  }

  // P2-T3: open the pre-send checklist. The checklist queries against a saved
  // draft, so we save first if needed. After the checklist is dismissed with
  // "confirm", we fall through to the existing typed-SEND ConfirmDialog as the
  // final safety net.
  async function openChecklist() {
    setSendStatus(null);
    if (!subject.trim()) {
      setSendStatus({ kind: "err", msg: "Subject line is required." });
      return;
    }
    const html = getCurrentHtml();
    if (!html || html === "<br>" || html === "<p></p>") {
      setSendStatus({ kind: "err", msg: "Write your email first." });
      return;
    }
    setPreparingChecklist(true);
    try {
      // The checklist query needs a campaignId. If we don't have one yet, save
      // the draft now so it has a stable id with the latest body. If we do
      // have one, save anyway so the checklist runs against the freshest copy.
      const saved = await saveDraftMutation({
        draftId: currentDraftId,
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        bodyHtml: html,
        sentBy: userId,
      });
      if (!currentDraftId) {
        setCurrentDraftId(saved.id);
        router.push(`/marketing/compose?draft=${saved.id}`);
      }
      setChecklistOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendStatus({ kind: "err", msg: `Couldn't run checks: ${msg}` });
    } finally {
      setPreparingChecklist(false);
    }
  }

  async function handleSendCampaign() {
    setSending(true);
    setSendStatus({ kind: "info", msg: `Sending to ${recipientCount}…` });
    try {
      const r = await sendCampaign({
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        bodyHtml: getCurrentHtml(),
        sentBy: userId,
        draftId: currentDraftId,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setSendStatus({
        kind: "ok",
        msg: `Campaign sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}.`,
      });
      setConfirmOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendStatus({ kind: "err", msg: `Send failed: ${msg}` });
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    setSendStatus(null);
    if (!subject.trim() && !getCurrentHtml()) {
      setSendStatus({ kind: "err", msg: "Nothing to save yet — write something first." });
      return;
    }
    setSavingDraft(true);
    try {
      const r = await saveDraftMutation({
        draftId: currentDraftId,
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        bodyHtml: getCurrentHtml(),
        sentBy: userId,
      });
      if (!currentDraftId) {
        setCurrentDraftId(r.id);
        // Push the draft id into the URL so subsequent saves patch the same
        // row (and so refresh resumes the same draft).
        router.push(`/marketing/compose?draft=${r.id}`);
      }
      setSendStatus({ kind: "ok", msg: "Draft saved." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendStatus({ kind: "err", msg: `Save failed: ${msg}` });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleScheduleSend() {
    setSendStatus(null);
    if (!subject.trim()) {
      setSendStatus({ kind: "err", msg: "Subject line is required." });
      return;
    }
    const html = getCurrentHtml();
    if (!html || html === "<br>" || html === "<p></p>") {
      setSendStatus({ kind: "err", msg: "Write your email first." });
      return;
    }
    if (!scheduleAt) {
      setSendStatus({ kind: "err", msg: "Pick a date and time to schedule." });
      return;
    }
    const ms = new Date(scheduleAt).getTime();
    if (Number.isNaN(ms) || ms <= Date.now()) {
      setSendStatus({
        kind: "err",
        msg: "Scheduled time must be in the future.",
      });
      return;
    }
    if (recipientCount === 0) {
      setSendStatus({ kind: "err", msg: "No active recipients." });
      return;
    }
    setScheduling(true);
    setSendStatus({ kind: "info", msg: "Saving and scheduling…" });
    try {
      // First save the draft so we have a stable id with the latest body.
      const saved = await saveDraftMutation({
        draftId: currentDraftId,
        subject: subject.trim(),
        preheader: preheader.trim() || undefined,
        bodyHtml: html,
        sentBy: userId,
      });
      const id = (currentDraftId ?? saved.id) as Id<"campaigns">;
      if (!currentDraftId) {
        setCurrentDraftId(saved.id);
        router.push(`/marketing/compose?draft=${saved.id}`);
      }
      await scheduleSendMutation({
        draftId: id,
        scheduledAt: ms,
        recipientTags: selectedTags,
      });
      const when = new Date(ms).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      setSendStatus({ kind: "ok", msg: `Scheduled for ${when}.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendStatus({ kind: "err", msg: `Schedule failed: ${msg}` });
    } finally {
      setScheduling(false);
    }
  }

  function buildClaudePrompt(): string {
    return `You are an email copywriter for LME (Live Music Enhancers), a Birmingham-based live band and event brand.

LME brand voice: Direct, slang-forward but readable. Energetic and cultural. Like texting mates about a sick night but your manager might read it too.
Use words like: vibes, energy, function, live & direct, different, no dead vibes.
Never use: bespoke, tailored, solutions, corporate, synergy.

Write email body copy only. No subject line. No "Dear subscriber". Start strong — first line should hook immediately.
Keep it punchy. Short paragraphs. Energy throughout. Sign off as Chris from LME.
Use the tone and audience context provided. The email will have an automatic unsubscribe link added at the bottom.

---

Write an LME email about: ${aiDescription.trim()}

Audience: ${aiAudience}
Tone: ${aiTone}

Write the full email body. Make it feel alive — this should feel like it came from a real person, not a marketing tool.`;
  }

  async function handleCopyPrompt() {
    if (!aiDescription.trim()) {
      setAiError("Describe what the email's about first.");
      return;
    }
    setAiError(null);
    const prompt = buildClaudePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setAiResult(prompt);
    } catch {
      // Clipboard API blocked (rare) — show prompt for manual copy
      setAiResult(prompt);
      setAiError("Couldn't copy automatically — copy the prompt manually below.");
    }
  }

  function handlePasteDraft() {
    // Switch to a "paste your draft from Claude" textarea inline.
    const text = window.prompt("Paste the draft from Claude here:");
    if (!text) return;
    insertDraftText(text);
  }

  function insertDraftText(text: string) {
    if (!text.trim()) return;
    // Convert plain text with double-newlines to <p>…</p> paragraphs (Chris's pattern).
    const html = text
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, "<br>").trim()}</p>`)
      .join("");

    if (mode === "html") {
      setRawHtml((prev) => (prev.trim() ? prev + "\n" + html : html));
    } else {
      if (editorRef.current) {
        const existing = editorRef.current.innerHTML.trim();
        editorRef.current.innerHTML =
          existing && existing !== "<br>" && existing !== "<p></p>"
            ? existing + html
            : html;
        setRichHtml(editorRef.current.innerHTML);
      }
    }
  }

  return (
    <div className="space-y-6 text-text-primary">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">
            New Campaign
          </p>
          <h1 className="text-3xl font-bold mt-1">Compose</h1>
          <p className="text-text-muted text-sm mt-1">
            Write your email and send it to active Enhancers. Use{" "}
            <code className="text-accent">{`{{firstName}}`}</code> in subject or
            body to personalise per recipient.
          </p>
        </div>
      </header>

      {sendStatus && <StatusBanner status={sendStatus} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT: editor */}
        <div className="space-y-5 min-w-0">
          {/* AI Draft Assistant */}
          <section className="bg-gradient-to-br from-accent/10 to-bg-card border border-accent/40 rounded-xl p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-accent">✦</span>
                  AI Draft Assistant
                  <span className="text-[10px] uppercase tracking-widest text-accent border border-accent/40 rounded-full px-2 py-0.5">
                    Powered by Claude
                  </span>
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Tell me what to write — I&apos;ll draft it for you in
                  LME&apos;s voice.
                </p>
              </div>
            </header>

            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs uppercase tracking-widest text-text-muted mb-2"
                  htmlFor="ai-description"
                >
                  What&apos;s this email about?
                </label>
                <textarea
                  id="ai-description"
                  rows={2}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g. Flashback Fete is back this summer — July 18th at Hockley Social Club. Tickets on sale Friday."
                  className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest text-text-muted mb-2"
                    htmlFor="ai-audience"
                  >
                    Audience
                  </label>
                  <select
                    id="ai-audience"
                    value={aiAudience}
                    onChange={(e) => setAiAudience(e.target.value)}
                    className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="All LME subscribers">All subscribers</option>
                    <option value="Flashback Fete fans">
                      Flashback Fete fans
                    </option>
                    <option value="ShowReady course interest list">
                      ShowReady interest
                    </option>
                    <option value="Birmingham area subscribers">
                      Birmingham area
                    </option>
                    <option value="LME booking enquiries">
                      Potential bookers
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs uppercase tracking-widest text-text-muted mb-2"
                    htmlFor="ai-tone"
                  >
                    Tone
                  </label>
                  <select
                    id="ai-tone"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="Hype and energetic — high energy, punchy, like announcing a big night out">
                      Hype &amp; energetic
                    </option>
                    <option value="Warm and personal — like texting a friend, genuine and direct">
                      Warm &amp; personal
                    </option>
                    <option value="Professional — clear and informative but still warm, for bookers or business contacts">
                      Professional
                    </option>
                    <option value="Exciting announcement — big reveal energy, build the anticipation">
                      Big announcement
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  disabled={!aiDescription.trim()}
                  className="bg-accent-hover text-bg-base uppercase tracking-wider font-bold text-sm py-2.5 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <span>✦</span>
                  Copy prompt for Claude
                </button>
                <a
                  href="https://claude.ai/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border-crm hover:border-accent text-text-body hover:text-text-primary uppercase tracking-wider font-bold text-sm py-2.5 rounded transition flex items-center justify-center gap-2"
                >
                  Open Claude →
                </a>
              </div>

              {aiResult && (
                <div className="bg-bg-base border border-border-crm rounded p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
                    Prompt copied to clipboard
                  </p>
                  <details className="text-sm text-text-muted">
                    <summary className="cursor-pointer hover:text-text-primary text-xs uppercase tracking-widest">
                      View prompt
                    </summary>
                    <div className="mt-2 text-xs text-text-muted whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                      {aiResult}
                    </div>
                  </details>
                  <div className="flex items-center gap-2 pt-2 border-t border-border-crm">
                    <button
                      type="button"
                      onClick={handlePasteDraft}
                      className="bg-accent-hover text-bg-base uppercase tracking-wider font-bold text-xs px-4 py-2 rounded hover:bg-accent transition"
                    >
                      + Paste draft from Claude
                    </button>
                    <p className="text-xs text-text-muted">
                      Paste in Claude → copy result → click here to insert
                    </p>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="bg-amber-950/30 border border-amber-900 text-amber-400 text-sm rounded px-3 py-2">
                  {aiError}
                </div>
              )}
            </div>
          </section>

          {/* Subject + preheader */}
          <section className="bg-bg-surface border border-border-crm rounded-xl p-6 space-y-4">
            <div>
              <label
                htmlFor="subject"
                className="block text-xs uppercase tracking-widest text-text-muted mb-2"
              >
                Email subject line *
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. The vibes are coming — here's what's on this summer"
                className="w-full bg-bg-base border border-border-crm rounded-md px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="preheader"
                className="block text-xs uppercase tracking-widest text-text-muted mb-2"
              >
                Preheader (preview text)
              </label>
              <input
                id="preheader"
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Optional — shown next to the subject in inboxes"
                className="w-full bg-bg-base border border-border-crm rounded-md px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </section>

          {/* Body editor */}
          <section className="bg-bg-surface border border-border-crm rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-sm uppercase tracking-widest font-semibold">
                Email body
              </h2>
              <div className="flex items-center gap-2">
                <div
                  role="radiogroup"
                  aria-label="Editor mode"
                  className="inline-flex border border-border-crm rounded-md overflow-hidden"
                >
                  {(["rich", "html"] as EditorMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      aria-checked={mode === m}
                      role="radio"
                      className={`px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
                        mode === m
                          ? "bg-accent text-bg-base"
                          : "bg-transparent text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {m === "rich" ? "Rich text" : "HTML"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="px-3 py-1.5 text-[11px] uppercase tracking-widest border border-border-crm hover:border-accent text-text-body hover:text-text-primary rounded-md transition-colors"
                >
                  Preview
                </button>
              </div>
            </div>

            {mode === "rich" ? (
              <div className="border border-border-crm rounded-md overflow-hidden">
                <div
                  role="toolbar"
                  aria-label="Text formatting"
                  className="flex flex-wrap gap-1 px-2 py-2 border-b border-border-crm bg-bg-base"
                >
                  {TOOLBAR_BUTTONS.map((b) => (
                    <button
                      key={b.cmd}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        exec(b.cmd);
                      }}
                      aria-label={b.aria}
                      className="px-2.5 py-1 text-xs text-text-body hover:text-text-primary hover:bg-bg-card rounded transition-colors"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Email body"
                  suppressContentEditableWarning
                  onInput={(e) =>
                    setRichHtml((e.target as HTMLDivElement).innerHTML)
                  }
                  className="min-h-[280px] p-4 text-text-primary focus:outline-none [&_a]:text-accent [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                />
              </div>
            ) : (
              <div>
                <textarea
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  rows={18}
                  spellCheck={false}
                  placeholder={`<!DOCTYPE html>\n<html>\n  <body>\n    Paste your full HTML email source here…\n  </body>\n</html>`}
                  className="w-full bg-bg-base border border-border-crm rounded-md px-3 py-3 text-text-primary font-mono text-xs leading-relaxed focus:outline-none focus:border-accent resize-y min-h-[280px]"
                />
                <p className="text-xs text-text-muted mt-2">
                  Paste full HTML email source. Tags will be sent as-is — perfect
                  for templates with tables, inline styles, and Outlook
                  conditionals.
                </p>
              </div>
            )}

            <p className="text-xs text-text-muted mt-3">
              An unsubscribe link will be added automatically to the footer of
              every email.
            </p>
          </section>
        </div>

        {/* RIGHT: send panel */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-bg-surface border border-border-crm rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border-crm text-xs uppercase tracking-widest text-text-muted">
              Send Options
            </div>
            <div className="p-5 space-y-3 text-sm">
              <SendInfoRow label="From" value="LME" />
              <SendInfoRow
                label="Recipients"
                value={
                  recipients === undefined
                    ? "…"
                    : recipientCount.toLocaleString()
                }
              />
              <SendInfoRow label="Track Opens" value="Yes" valueClass="text-green-400" />
              <SendInfoRow
                label="Track Clicks"
                value="Yes"
                valueClass="text-green-400"
              />
            </div>

            <div className="px-5 py-4 border-t border-border-crm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Segments
                </p>
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-[10px] uppercase tracking-widest text-text-muted hover:text-accent"
                  >
                    Clear
                  </button>
                )}
              </div>
              {distinctTags === undefined ? (
                <p className="text-xs text-text-muted">Loading tags…</p>
              ) : distinctTags.length === 0 ? (
                <p className="text-xs text-text-muted">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {distinctTags.map(({ tag, count }) => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={selected}
                        className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                          selected
                            ? "border-accent bg-accent/10 text-text-primary"
                            : "border-border-crm text-text-muted hover:text-text-primary hover:border-text-muted"
                        }`}
                      >
                        {tag}
                        <span
                          className={`ml-1.5 ${
                            selected ? "text-accent-hover" : "text-text-muted"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-text-muted mt-3">
                Sending to{" "}
                <strong className="text-text-primary">
                  {recipients === undefined
                    ? "…"
                    : recipientCount.toLocaleString()}
                </strong>{" "}
                contact{recipientCount === 1 ? "" : "s"}
                {selectedTags.length === 0 ? " (all active)" : ""}
              </p>
            </div>

            <div className="px-5 py-4 border-t border-border-crm">
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
                Send test email
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-bg-base border border-border-crm rounded-md px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testing}
                  className="px-3 py-1.5 text-xs bg-bg-card border border-border-crm hover:border-accent rounded-md text-text-primary whitespace-nowrap disabled:opacity-50"
                >
                  {testing ? "…" : "Send test"}
                </button>
              </div>
              {testStatus && (
                <p
                  className={`text-xs mt-2 ${
                    testStatus.kind === "ok"
                      ? "text-green-400"
                      : testStatus.kind === "err"
                        ? "text-danger"
                        : "text-text-muted"
                  }`}
                >
                  {testStatus.msg}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border-crm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="accent-teal-500 w-4 h-4"
                />
                <span className="text-[10px] uppercase tracking-widest text-text-muted">
                  Schedule for later
                </span>
              </label>
              {scheduleEnabled && (
                <div className="mt-3 space-y-1">
                  <label
                    htmlFor="schedule-at"
                    className="block text-[10px] uppercase tracking-widest text-text-muted"
                  >
                    Send at
                  </label>
                  <input
                    id="schedule-at"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="w-full bg-bg-base border border-border-crm rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                  <p className="text-[10px] text-text-muted">
                    Cron checks every 5 min; expect a small delay around the
                    scheduled time.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 space-y-2">
              {scheduleEnabled ? (
                <button
                  type="button"
                  onClick={handleScheduleSend}
                  disabled={scheduling || recipientCount === 0}
                  className="w-full bg-accent hover:bg-accent-hover text-bg-base font-semibold py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {scheduling
                    ? "Scheduling…"
                    : `Schedule send${
                        recipientCount > 0
                          ? ` (${recipientCount.toLocaleString()} recipient${
                              recipientCount === 1 ? "" : "s"
                            })`
                          : ""
                      }`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openChecklist}
                  disabled={
                    sending || preparingChecklist || recipientCount === 0
                  }
                  className="w-full bg-accent hover:bg-accent-hover text-bg-base font-semibold py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {preparingChecklist
                    ? "Running checks…"
                    : recipients === undefined
                      ? "Send Campaign"
                      : `Send Campaign (${recipientCount.toLocaleString()} recipient${
                          recipientCount === 1 ? "" : "s"
                        })`}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="w-full bg-transparent border border-border-crm hover:border-text-muted text-text-body py-2.5 rounded-md transition-colors disabled:opacity-50"
              >
                {savingDraft ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {checklistOpen && currentDraftId && (
        <PreSendChecklist
          campaignId={currentDraftId}
          recipientTags={selectedTags}
          onCancel={() => setChecklistOpen(false)}
          onConfirm={() => {
            setChecklistOpen(false);
            // Fall through to the existing typed-SEND ConfirmDialog as the
            // final safety net — the checklist is validation, this is intent.
            setConfirmText("");
            setConfirmOpen(true);
          }}
        />
      )}

      {confirmOpen && (
        <ConfirmDialog
          recipientCount={recipientCount}
          subject={subject}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSendCampaign}
          sending={sending}
        />
      )}

      {previewOpen && (
        <PreviewDialog
          html={getCurrentHtml()}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function PreviewDialog({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = device === "desktop" ? 600 : 375;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6 overflow-auto"
    >
      <div className="bg-bg-surface border border-border-crm rounded-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-crm">
          <h2
            id="preview-title"
            className="text-sm uppercase tracking-widest font-semibold text-text-primary"
          >
            Preview
          </h2>
          <div
            role="radiogroup"
            aria-label="Preview device"
            className="inline-flex border border-border-crm rounded-md overflow-hidden"
          >
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={device === d}
                onClick={() => setDevice(d)}
                className={`px-3 py-1 text-[11px] uppercase tracking-widest transition-colors ${
                  device === d
                    ? "bg-accent text-bg-base"
                    : "bg-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                {d === "desktop" ? "Desktop 600" : "Mobile 375"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-bg-base flex justify-center">
          <iframe
            title="Email preview"
            srcDoc={html || "<p style='font-family:sans-serif;color:#888;padding:24px'>Nothing to preview yet — write your email first.</p>"}
            sandbox="allow-same-origin"
            style={{ width: `${width}px` }}
            className="h-[700px] bg-white border border-border-crm rounded transition-[width] duration-200"
          />
        </div>
        <p className="px-5 py-3 border-t border-border-crm text-xs text-text-muted">
          Preview shown without the unsubscribe footer that&apos;s auto-added on send.
        </p>
      </div>
    </div>
  );
}

function SendInfoRow({
  label,
  value,
  valueClass = "text-text-primary",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted text-xs uppercase tracking-widest">
        {label}
      </span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBanner({ status }: { status: NonNullable<Toast> }) {
  const cls =
    status.kind === "ok"
      ? "border-accent/40 bg-accent/10 text-accent-hover"
      : status.kind === "err"
        ? "border-red-500/40 bg-danger/10 text-red-300"
        : "border-border-crm bg-bg-card text-text-body";
  return (
    <div className={`border rounded-md px-4 py-3 text-sm ${cls}`} role="status">
      {status.msg}
    </div>
  );
}

function ConfirmDialog({
  recipientCount,
  subject,
  confirmText,
  setConfirmText,
  onCancel,
  onConfirm,
  sending,
}: {
  recipientCount: number;
  subject: string;
  confirmText: string;
  setConfirmText: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  sending: boolean;
}) {
  const canSend = confirmText.trim().toUpperCase() === "SEND" && !sending;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-send-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
    >
      <div className="bg-bg-surface border border-border-crm rounded-xl max-w-md w-full p-6 space-y-4">
        <h2
          id="confirm-send-title"
          className="text-xl font-bold text-text-primary"
        >
          Send this campaign?
        </h2>
        <p className="text-sm text-text-muted">
          About to send to{" "}
          <strong className="text-text-primary">{recipientCount.toLocaleString()}</strong>{" "}
          active Enhancer{recipientCount === 1 ? "" : "s"}. This is irreversible.
        </p>
        <dl className="grid grid-cols-[80px_1fr] gap-y-2 gap-x-3 text-sm">
          <dt className="text-[10px] uppercase tracking-widest text-text-muted self-center">
            Subject
          </dt>
          <dd className="text-text-primary">{subject || "(no subject)"}</dd>
        </dl>
        <div>
          <label
            htmlFor="confirm-text"
            className="block text-xs uppercase tracking-widest text-text-muted mb-1"
          >
            Type <span className="text-accent font-bold">SEND</span> to confirm
          </label>
          <input
            id="confirm-text"
            type="text"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SEND"
            className="w-full bg-bg-base border border-border-crm rounded-md px-3 py-2 text-text-primary tracking-widest font-mono uppercase focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-2 text-sm bg-transparent border border-border-crm hover:border-text-muted text-text-body rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSend}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-bg-base font-semibold rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Yes, send it"}
          </button>
        </div>
      </div>
    </div>
  );
}
