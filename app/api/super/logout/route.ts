import { endSession } from "@/lib/super";
import { json } from "@/lib/server";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
