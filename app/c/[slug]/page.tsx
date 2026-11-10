import Participate from "@/components/Participate";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Participate slug={slug} />;
}
