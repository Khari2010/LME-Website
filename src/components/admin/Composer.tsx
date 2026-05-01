"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
  const recipients = useQuery(api.contacts.getActiveContactsForSend, {});
  const draft = useQuery(
    api.campaigns.getDraft,
    draftId ? { id: draftId } : "skip",
  );
  const sendTest = useAction(api.campaignSender.sendTest);
  const sendCampaign = useAction(api.campaignSender.sendCampaign);
  const saveDraftMutation = useMutation(api.campaigns.saveDraft);
  const generateDraft = useAction(api.aiDraft.generateEmailDraft);

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
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<
    Id<"campaigns"> | undefined
  >(draftId);
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

  const recipientCount = recipients?.length ?? 0;

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
        router.push(`/admin/marketing/compose?draft=${r.id}`);
      }
      setSendStatus({ kind: "ok", msg: "Draft saved." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendStatus({ kind: "err", msg: `Save failed: ${msg}` });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleAiDraft() {
    if (!aiDescription.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    setAiResult(null);
    try {
      const r = await generateDraft({
        description: aiDescription.trim(),
        audience: aiAudience,
        tone: aiTone,
      });
      setAiResult(r.text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  function handleAiInsert() {
    if (!aiResult) return;
    // Convert plain text with double-newlines to <p>…</p> paragraphs (Chris's pattern).
    const html = aiResult
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
    <div className="space-y-6 text-white">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-400">
            New Campaign
          </p>
          <h1 className="text-3xl font-bold mt-1">Compose</h1>
          <p className="text-gray-500 text-sm mt-1">
            Write your email and send it to active Enhancers. Use{" "}
            <code className="text-teal-400">{`{{firstName}}`}</code> in subject or
            body to personalise per recipient.
          </p>
        </div>
      </header>

      {sendStatus && <StatusBanner status={sendStatus} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT: editor */}
        <div className="space-y-5 min-w-0">
          {/* AI Draft Assistant */}
          <section className="bg-gradient-to-br from-[#0f1f1d] to-[#111111] border border-[#1f3733] rounded-xl p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-teal-400">✦</span>
                  AI Draft Assistant
                  <span className="text-[10px] uppercase tracking-widest text-teal-400 border border-teal-400/40 rounded-full px-2 py-0.5">
                    Powered by Claude
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Tell me what to write — I&apos;ll draft it for you in
                  LME&apos;s voice.
                </p>
              </div>
            </header>

            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs uppercase tracking-widest text-gray-400 mb-2"
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
                  className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest text-gray-400 mb-2"
                    htmlFor="ai-audience"
                  >
                    Audience
                  </label>
                  <select
                    id="ai-audience"
                    value={aiAudience}
                    onChange={(e) => setAiAudience(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
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
                    className="block text-xs uppercase tracking-widest text-gray-400 mb-2"
                    htmlFor="ai-tone"
                  >
                    Tone
                  </label>
                  <select
                    id="ai-tone"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
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

              <button
                type="button"
                onClick={handleAiDraft}
                disabled={aiGenerating || !aiDescription.trim()}
                className="w-full bg-teal-400 text-black uppercase tracking-wider font-bold text-sm py-2.5 rounded hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <span>✦</span>
                {aiGenerating ? "Writing your email…" : "Draft it for me"}
              </button>

              {aiResult && (
                <div className="bg-[#0a0a0a] border border-[#252525] rounded p-4 space-y-3">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {aiResult}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1f1f1f]">
                    <button
                      type="button"
                      onClick={handleAiInsert}
                      className="bg-teal-400 text-black uppercase tracking-wider font-bold text-xs px-4 py-2 rounded hover:bg-teal-300 transition"
                    >
                      + Insert into editor
                    </button>
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={aiGenerating}
                      className="text-gray-400 hover:text-white text-xs uppercase tracking-widest"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="bg-red-950/30 border border-red-900 text-red-400 text-sm rounded px-3 py-2">
                  {aiError}
                </div>
              )}
            </div>
          </section>

          {/* Subject + preheader */}
          <section className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
            <div>
              <label
                htmlFor="subject"
                className="block text-xs uppercase tracking-widest text-gray-400 mb-2"
              >
                Email subject line *
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. The vibes are coming — here's what's on this summer"
                className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="preheader"
                className="block text-xs uppercase tracking-widest text-gray-400 mb-2"
              >
                Preheader (preview text)
              </label>
              <input
                id="preheader"
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Optional — shown next to the subject in inboxes"
                className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </section>

          {/* Body editor */}
          <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-sm uppercase tracking-widest font-semibold">
                Email body
              </h2>
              <div className="flex items-center gap-2">
                <div
                  role="radiogroup"
                  aria-label="Editor mode"
                  className="inline-flex border border-[#252525] rounded-md overflow-hidden"
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
                          ? "bg-teal-500 text-black"
                          : "bg-transparent text-gray-400 hover:text-white"
                      }`}
                    >
                      {m === "rich" ? "Rich text" : "HTML"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="px-3 py-1.5 text-[11px] uppercase tracking-widest border border-[#252525] hover:border-teal-500 text-gray-300 hover:text-white rounded-md transition-colors"
                >
                  Preview
                </button>
              </div>
            </div>

            {mode === "rich" ? (
              <div className="border border-[#252525] rounded-md overflow-hidden">
                <div
                  role="toolbar"
                  aria-label="Text formatting"
                  className="flex flex-wrap gap-1 px-2 py-2 border-b border-[#252525] bg-[#0c0c0c]"
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
                      className="px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
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
                  className="min-h-[280px] p-4 text-white focus:outline-none [&_a]:text-teal-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
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
                  className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-3 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-teal-500 resize-y min-h-[280px]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Paste full HTML email source. Tags will be sent as-is — perfect
                  for templates with tables, inline styles, and Outlook
                  conditionals.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">
              An unsubscribe link will be added automatically to the footer of
              every email.
            </p>
          </section>
        </div>

        {/* RIGHT: send panel */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-[#111111] border border-[#252525] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#252525] text-xs uppercase tracking-widest text-gray-400">
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

            <div className="px-5 py-4 border-t border-[#252525]">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                Send test email
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testing}
                  className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#252525] hover:border-teal-500 rounded-md text-white whitespace-nowrap disabled:opacity-50"
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
                        ? "text-red-400"
                        : "text-gray-400"
                  }`}
                >
                  {testStatus.msg}
                </p>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 space-y-2">
              <button
                type="button"
                onClick={openConfirm}
                disabled={sending || recipientCount === 0}
                className="w-full bg-teal-500 hover:bg-teal-400 text-black font-semibold py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Campaign
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="w-full bg-transparent border border-[#252525] hover:border-gray-500 text-gray-300 py-2.5 rounded-md transition-colors disabled:opacity-50"
              >
                {savingDraft ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        </aside>
      </div>

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
      <div className="bg-[#111111] border border-[#252525] rounded-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#252525]">
          <h2
            id="preview-title"
            className="text-sm uppercase tracking-widest font-semibold text-white"
          >
            Preview
          </h2>
          <div
            role="radiogroup"
            aria-label="Preview device"
            className="inline-flex border border-[#252525] rounded-md overflow-hidden"
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
                    ? "bg-teal-500 text-black"
                    : "bg-transparent text-gray-400 hover:text-white"
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
            className="text-gray-400 hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-[#080808] flex justify-center">
          <iframe
            title="Email preview"
            srcDoc={html || "<p style='font-family:sans-serif;color:#888;padding:24px'>Nothing to preview yet — write your email first.</p>"}
            sandbox="allow-same-origin"
            style={{ width: `${width}px` }}
            className="h-[700px] bg-white border border-[#252525] rounded transition-[width] duration-200"
          />
        </div>
        <p className="px-5 py-3 border-t border-[#252525] text-xs text-gray-500">
          Preview shown without the unsubscribe footer that&apos;s auto-added on send.
        </p>
      </div>
    </div>
  );
}

function SendInfoRow({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs uppercase tracking-widest">
        {label}
      </span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBanner({ status }: { status: NonNullable<Toast> }) {
  const cls =
    status.kind === "ok"
      ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
      : status.kind === "err"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-gray-700 bg-gray-900 text-gray-300";
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
      <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-md w-full p-6 space-y-4">
        <h2
          id="confirm-send-title"
          className="text-xl font-bold text-white"
        >
          Send this campaign?
        </h2>
        <p className="text-sm text-gray-400">
          About to send to{" "}
          <strong className="text-white">{recipientCount.toLocaleString()}</strong>{" "}
          active Enhancer{recipientCount === 1 ? "" : "s"}. This is irreversible.
        </p>
        <dl className="grid grid-cols-[80px_1fr] gap-y-2 gap-x-3 text-sm">
          <dt className="text-[10px] uppercase tracking-widest text-gray-500 self-center">
            Subject
          </dt>
          <dd className="text-white">{subject || "(no subject)"}</dd>
        </dl>
        <div>
          <label
            htmlFor="confirm-text"
            className="block text-xs uppercase tracking-widest text-gray-500 mb-1"
          >
            Type <span className="text-teal-400 font-bold">SEND</span> to confirm
          </label>
          <input
            id="confirm-text"
            type="text"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SEND"
            className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-white tracking-widest font-mono uppercase focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-2 text-sm bg-transparent border border-[#252525] hover:border-gray-500 text-gray-300 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSend}
            className="px-4 py-2 text-sm bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Yes, send it"}
          </button>
        </div>
      </div>
    </div>
  );
}
