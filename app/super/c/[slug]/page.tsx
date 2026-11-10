import Admin from "@/components/Admin";

export const metadata = { title: "Superadmin · ARCO POLÍTICO", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Admin token={`~${slug}`} />;
}
