"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";

const MAX_CATALOG_BYTES = 4 * 1024 * 1024; // 4 MB

export default function CatalogSubmit() {
  const { t, lang } = useLanguage();
  const s = t.catalogSubmit;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setFileName("");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError(s.form.pdfError);
      e.target.value = "";
      setFileName("");
      return;
    }
    if (file.size > MAX_CATALOG_BYTES) {
      setFileError(s.form.sizeError);
      e.target.value = "";
      setFileName("");
      return;
    }
    setFileName(file.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const file = fd.get("catalog") as File | null;

    if (!file || file.size === 0) {
      setFileError(s.form.pdfError);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError(s.form.pdfError);
      return;
    }
    if (file.size > MAX_CATALOG_BYTES) {
      setFileError(s.form.sizeError);
      return;
    }

    setStatus("loading");
    setFileError(null);
    setErrorDetail("");
    fd.set("lang", lang);

    try {
      const res = await fetch("/api/catalog-submissions", {
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
      setFileName("");
      setCategory("");
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
              {s.hero.tag}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {s.hero.title}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {s.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--section)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary)] text-center mb-10">
            {s.how.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {s.how.steps.map((step, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent)] text-white font-bold mb-4">
                  {i + 1}
                </span>
                <p className="text-[var(--foreground)] text-sm leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-[var(--primary)] mb-2">
              {s.form.title}
            </h2>
            <p className="text-[var(--muted)] mb-8">
              {s.form.subtitle}
            </p>

            {status === "success" ? (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-6">
                <p className="font-semibold text-lg mb-1">
                  {s.form.successTitle}
                </p>
                <p className="text-sm text-green-700">
                  {s.form.successMessage}
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-sm text-[var(--accent)] hover:underline font-semibold"
                >
                  {s.form.sendAnother}
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {s.form.company} *
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={s.form.placeholders.company}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {s.form.contactName} *
                    </label>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={s.form.placeholders.contactName}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {s.form.email} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={s.form.placeholders.email}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {s.form.phone}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={s.form.placeholders.phone}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-[var(--foreground)] mb-1"
                  >
                    {s.form.category} *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"
                  >
                    <option value="" disabled>
                      {s.form.selectCategory}
                    </option>
                    {s.categories.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="catalog"
                    className="block text-sm font-medium text-[var(--foreground)] mb-1"
                  >
                    {s.form.catalog} *
                  </label>
                  <input
                    type="file"
                    id="catalog"
                    name="catalog"
                    accept="application/pdf,.pdf"
                    required
                    onChange={handleFileChange}
                    className="w-full text-sm text-[var(--muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-light)] file:cursor-pointer"
                  />
                  {fileName ? (
                    <p className="mt-1 text-xs text-[var(--accent)] font-medium" dir="ltr">
                      {fileName}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {s.form.catalogHint}
                    </p>
                  )}
                  {fileError && (
                    <p className="mt-1 text-xs text-red-600">{fileError}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="block text-sm font-medium text-[var(--foreground)] mb-1"
                  >
                    {s.form.website}
                  </label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    dir="ltr"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder={s.form.placeholders.website}
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-[var(--foreground)] mb-1"
                  >
                    {s.form.message}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder={s.form.placeholders.message}
                  />
                </div>

                {status === "error" && (
                  <>
                    <p className="text-red-600 text-sm">{s.form.errorMessage}</p>
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
                  {status === "loading" ? s.form.sending : s.form.submit}
                </button>
                <p className="text-xs text-[var(--muted)]">{s.form.required}</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}