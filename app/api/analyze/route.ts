import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getKyivDayRangeUtc } from "@/lib/kyiv-time";
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
    const kyivDayRange = getKyivDayRangeUtc();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY не знайдено у змінних середовища." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const meal = typeof body?.meal === "string" ? body.meal.trim() : "";
    const image = typeof body?.image === "string" ? body.image : "";
    const userName = typeof body?.userName === "string" ? body.userName.trim() : "";

    if (!meal && !image) {
      return NextResponse.json(
        { error: "Describe what you ate or upload an image." },
        { status: 400 },
      );
    }

    if (!userName) {
      return NextResponse.json(
        { error: "Profile name not specified. Select a profile and try again." },
        { status: 400 },
      );
    }

    let userContent: string | Array<any>;
    let systemPrompt: string;

    if (image) {
      // Image analysis
      userContent = [
        {
          type: "text",
          text: "Analyze this food image. Estimate portion size, ingredients and provide nutritional information in JSON format.",
        },
        {
          type: "image_url",
          image_url: {
            url: image,
          },
        },
      ];

      systemPrompt =
        "You are a nutritionist analyzing food images. Estimate portion size, identify ingredients, and provide nutritional information. Return only valid JSON without markdown. Response format: {\"items\":[{\"name\":\"string\",\"calories\":number,\"protein\":number,\"fats\":number,\"carbs\":number}]}. Values should be realistic, round to whole numbers. Consider the visual portion size and ingredients visible in the image.";
    } else {
      // Text analysis
      userContent = `Analyze: ${meal}`;
      systemPrompt =
        "You are a nutritionist. Analyze the entered food and return only valid JSON without markdown. Response format: {\"items\":[{\"name\":\"string\",\"calories\":number,\"protein\":number,\"fats\":number,\"carbs\":number}]}. Values should be realistic, round to whole numbers.";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use vision-capable model for image analysis
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: image ? userContent : userContent,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
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
        user_name: userName,
      }));

      const { error: supabaseError } = await supabase.from("meals").insert(rowsToInsert);

      if (supabaseError) {
        console.error("Supabase insert error:", {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
          kyivDayRange,
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
