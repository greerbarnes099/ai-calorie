import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type NutritionItem = {
  name: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
};

type AnalyzeResponse = {
  items: NutritionItem[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY не знайдено у змінних середовища." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const meal = typeof body?.meal === "string" ? body.meal.trim() : "";

    if (!meal) {
      return NextResponse.json(
        { error: "Опиши, будь ласка, що ти з'їв." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ти нутриціолог. Аналізуй введену їжу і повертай лише валідний JSON без markdown. Формат відповіді: {\"items\":[{\"name\":\"string\",\"calories\":number,\"protein\":number,\"fats\":number,\"carbs\":number}]}. Значення мають бути реалістичними, округлюй до цілих.",
        },
        {
          role: "user",
          content: `Проаналізуй: ${meal}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Порожня відповідь від OpenAI." }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as AnalyzeResponse;
    const items = Array.isArray(parsed?.items) ? parsed.items : [];

    const sanitizedItems = items
      .map((item) => ({
        name: String(item.name ?? "Невідомий продукт"),
        calories: Number(item.calories ?? 0),
        protein: Number(item.protein ?? 0),
        fats: Number(item.fats ?? 0),
        carbs: Number(item.carbs ?? 0),
      }))
      .filter((item) => item.name.trim().length > 0);

    if (sanitizedItems.length > 0) {
      const rowsToInsert = sanitizedItems.map((item) => ({
        meal_description: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fats,
        carbs: item.carbs,
      }));

      const { error: supabaseError } = await supabase.from("meals").insert(rowsToInsert);

      if (supabaseError) {
        console.error("Supabase insert error:", {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
        });
      }
    }

    return NextResponse.json({ items: sanitizedItems });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "Не вдалося виконати аналіз. Спробуй ще раз." },
      { status: 500 },
    );
  }
}
