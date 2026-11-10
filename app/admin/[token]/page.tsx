import Admin from "@/components/Admin";

export const metadata = { robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <Admin token={token} />;
}
