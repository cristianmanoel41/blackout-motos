import { redirect } from "next/navigation";

export default async function VenderMotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/vendas?moto=${id}`);
}