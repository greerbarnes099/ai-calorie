import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type MealRow = {
  id: number;
  created_at: string;
  meal_description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

async function fetchDailyStats() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const { data, error } = await supabase
    .from("meals")
    .select("id, created_at, meal_description, calories, protein, fat, carbs")
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", endOfDay.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase daily-stats fetch error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error("Supabase daily stats fetch failed");
  }

  return (data ?? []) as MealRow[];
}

export async function GET() {
  try {
    const meals = await fetchDailyStats();
    return NextResponse.json({ meals });
  } catch (error) {
    console.error("Daily stats API error:", error);
    return NextResponse.json(
      { error: "Не вдалося завантажити статистику за сьогодні." },
      { status: 500 },
    );
  }
}
