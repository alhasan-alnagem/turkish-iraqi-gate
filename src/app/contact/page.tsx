"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";

export default function Contact() {
  const { t, lang } = useLanguage();
  const c = t.contact;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, lang }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      e.currentTarget.reset();
    } catch {
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
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-6">
                {c.form.title}
              </h2>

              {status === "success" ? (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-6">
                  <p className="font-semibold text-lg mb-1">
                    {lang === "ar" ? "تم إرسال طلبك!" : "Your request has been sent!"}
                  </p>
                  <p className="text-sm text-green-700">
                    {lang === "ar" ? "سنتواصل معك خلال 24 ساعة." : "We'll get back to you within 24 hours."}
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-4 text-sm text-[var(--accent)] hover:underline font-semibold"
                  >
                    {lang === "ar" ? "إرسال طلب آخر" : "Send another request"}
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
                        htmlFor="phone"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        {c.form.phone} *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder={c.form.placeholders.phone}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="product"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.product} *
                    </label>
                    <input
                      type="text"
                      id="product"
                      name="product"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={c.form.placeholders.product}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        {c.form.quantity}
                      </label>
                      <input
                        type="text"
                        id="quantity"
                        name="quantity"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder={c.form.placeholders.quantity}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="budget"
                        className="block text-sm font-medium text-[var(--foreground)] mb-1"
                      >
                        {c.form.budget}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="budget"
                          name="budget"
                          className="flex-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                          placeholder={c.form.placeholders.budget}
                        />
                        <select
                          name="budgetCurrency"
                          className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white text-sm"
                        >
                          <option value="usd">{c.form.budgetUsd}</option>
                          <option value="iqd">{c.form.budgetIqd}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      {c.form.budgetShipping}
                    </legend>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                        <input
                          type="radio"
                          name="shipping"
                          value="yes"
                          className="accent-[var(--accent)]"
                        />
                        {c.form.budgetShippingYes}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                        <input
                          type="radio"
                          name="shipping"
                          value="no"
                          className="accent-[var(--accent)]"
                        />
                        {c.form.budgetShippingNo}
                      </label>
                    </div>
                  </fieldset>
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.city}
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={c.form.placeholders.city}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="details"
                      className="block text-sm font-medium text-[var(--foreground)] mb-1"
                    >
                      {c.form.details}
                    </label>
                    <textarea
                      id="details"
                      name="details"
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder={c.form.placeholders.details}
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-red-600 text-sm">
                      {lang === "ar" ? "حدث خطأ. الرجاء المحاولة مرة أخرى." : "Something went wrong. Please try again."}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                  >
                    {status === "loading"
                      ? (lang === "ar" ? "جارٍ الإرسال..." : "Sending...")
                      : c.form.submit}
                  </button>
                  <p className="text-xs text-[var(--muted)]">
                    {c.form.required}
                  </p>
                </form>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-6">
                {c.info.title}
              </h2>
              <div className="space-y-8">
                {c.info.people.map((person, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-[var(--primary)] mb-1">
                      {person.name}
                    </h3>
                    <p className="text-[var(--muted)] text-sm mb-1">
                      {person.role}
                    </p>
                    <p className="text-[var(--muted)] text-sm" dir="ltr">
                      {person.phone}
                    </p>
                  </div>
                ))}
                <div>
                  <h3 className="font-semibold text-[var(--primary)] mb-2">
                    {c.info.email}
                  </h3>
                  <p className="text-[var(--muted)] text-sm">
                    info@turkishiraqgate.com
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--primary)] mb-2">
                    {c.info.hours.title}
                  </h3>
                  <div className="text-[var(--muted)] text-sm space-y-1">
                    {c.info.hours.lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
