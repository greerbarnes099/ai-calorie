"use client";

import { useState } from "react";

type NutritionResult = {
  name: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
};

export default function Home() {
  const [mealInput, setMealInput] = useState("");
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!mealInput.trim()) return;
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal: mealInput }),
      });

      const data = (await response.json()) as {
        items?: NutritionResult[];
        error?: string;
      };

      if (!response.ok) {
        setResults([]);
        setError(data.error ?? "Помилка аналізу.");
        return;
      }

      const apiResults = Array.isArray(data.items) ? data.items : [];
      setResults(apiResults);
    } catch {
      setResults([]);
      setError("Не вдалося зв'язатися з сервером. Перевір підключення.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-emerald-100 backdrop-blur sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              AI Calories
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              Підрахунок калорій та БЖВ
            </h1>
            <p className="text-slate-600">
              Введи, що ти з&apos;їв, і натисни <strong>Аналізувати</strong>. Дані
              будуть пораховані через OpenAI API.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={mealInput}
              onChange={(event) => setMealInput(event.target.value)}
              placeholder="Наприклад: омлет із 2 яєць, тост і кава"
              className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none ring-emerald-200 transition focus:border-emerald-400 focus:ring-4"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {isLoading ? "Аналіз..." : "Аналізувати"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500">
              Тут з&apos;являться результати аналізу калорій та БЖВ.
            </div>
          ) : (
            results.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-white/60 bg-white p-5 shadow-md shadow-slate-100"
              >
                <h2 className="mb-4 text-lg font-semibold text-slate-800">{item.name}</h2>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-slate-600">Калорії</span>
                    <span className="font-bold text-emerald-700">{item.calories} ккал</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                    <span className="text-slate-600">Білки</span>
                    <span className="font-semibold text-sky-700">{item.protein} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-slate-600">Жири</span>
                    <span className="font-semibold text-amber-700">{item.fats} г</span>
                  </p>
                  <p className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
                    <span className="text-slate-600">Вуглеводи</span>
                    <span className="font-semibold text-violet-700">{item.carbs} г</span>
                  </p>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
