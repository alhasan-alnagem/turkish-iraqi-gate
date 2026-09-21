"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";

const MAX_CV_BYTES = 4 * 1024 * 1024; // 4 MB

export default function Career() {
  const { t, lang } = useLanguage();
  const c = t.career;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvError, setCvError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function choosePosition(title: string) {
    setSelectedPosition(title);
    setStatus("idle");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setCvError(null);
    if (!file) {
      setCvFileName("");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setCvError(c.form.cvError);
      e.target.value = "";
      setCvFileName("");
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setCvError(c.form.sizeError);
      e.target.value = "";
      setCvFileName("");
      return;
    }
    setCvFileName(file.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const file = fd.get("cv") as File | null;

    if (!file || file.size === 0) {
      setCvError(c.form.cvError);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setCvError(c.form.cvError);
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setCvError(c.form.sizeError);
      return;
    }

    setStatus("loading");
    setCvError(null);
    setErrorDetail("");
    fd.set("lang", lang);

    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = typeof data.message === "string" ? data.message : "";
        } catch {
          // non-JSON error response
        }
        throw new Error(detail);
      }
      setStatus("success");
      formEl.reset();
      setCvFileName("");
      setSelectedPosition("");
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "");
      setStatus("error");
    }
  }

  return (
    <>
      <section className="bg-[var(--primary)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[var(--accent-light)] font-semibold text-sm uppercase tracking-widest mb-4">
              {c.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {c.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {c.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-[var(--primary)] mb-2">
            {c.positions.title}
          </h2>
          <p className="text-[var(--muted)] mb-10">
            {c.positions.subtitle}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {c.positions.items.map((item, i) => (
              <article
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-[var(--primary)] mb-3">
                  {item.title}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-1 rounded-full">
                    {item.type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-[var(--muted)] px-2.5 py-1 rounded-full">
                    📍 {item.location}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-6 flex-1">
                  {item.desc}
                </p>
                <button
                  onClick={() => choosePosition(item.title)}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors self-start"
                >
                  {c.positions.apply}
                </button>
              </article>
            ))}
          </div>

          <div ref={formRef} className="scroll-mt-28">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-[var(--primary)] mb-2">
                {c.form.title}
              </h2>
              <p className="text-[var(--muted)] mb-8">
                {c.form.subtitle}
              </p>

              {status === "success" ? (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-6">
                  <p className="font-semibold text-lg mb-1">
                    {c.form.successTitle}
                  </p>
                  <p className="text-sm text-green-700">
                    {c.form.successMessage}
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-4 text-sm text-[var(--accent)] hover:underline font-semibold"
                  >
                    {c.form.sendAnother}
                  </button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        {c.form.name} *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder={c.form.placeholders.name}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        {c.form.email} *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        dir="ltr"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder={c.form.placeholders.email}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.phone}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={c.form.placeholders.phone}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="position"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.position} *
                    </label>
                    <select
                      id="position"
                      name="position"
                      required
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"
                    >
                      <option value="" disabled>
                        {c.form.selectPosition}
                      </option>
                      {c.positions.items.map((item, i) => (
                        <option key={i} value={item.title}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="cv"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.cv} *
                    </label>
                    <input
                      type="file"
                      id="cv"
                      name="cv"
                      accept="application/pdf,.pdf"
                      required
                      onChange={handleFileChange}
                      className="w-full text-sm text-[var(--muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-light)] file:cursor-pointer"
                    />
                    {cvFileName ? (
                      <p className="mt-1 text-xs text-[var(--accent)] font-medium" dir="ltr">
                        {cvFileName}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {c.form.cvHint}
                      </p>
                    )}
                    {cvError && (
                      <p className="mt-1 text-xs text-red-600">{cvError}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.message}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={c.form.placeholders.message}
                    />
                  </div>

                  {status === "error" && (
                    <>
                      <p className="text-red-600 text-sm">{c.form.errorMessage}</p>
                      {errorDetail && (
                        <p className="text-xs text-red-500 mt-1 break-all" dir="ltr">
                          {errorDetail}
                        </p>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                  >
                    {status === "loading" ? c.form.sending : c.form.submit}
                  </button>
                  <p className="text-xs text-[var(--muted)]">{c.form.required}</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}