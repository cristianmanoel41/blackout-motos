import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, UserRound, Phone, Mail, FileText } from "lucide-react";
import { BotaoWhatsapp } from "@/components/CardWhatsapp";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("customers")
    .select("*")
    .order("nome");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dourado">
            Clientes
          </h1>

          <p className="text-texto-suave text-sm mt-1">
            Consulte, visualize e altere os dados dos clientes.
          </p>
        </div>

        <Link
          href="/clientes/novo"
          className="flex items-center gap-2 bg-dourado hover:bg-dourado-claro text-preto font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={18} />
          Novo Cliente
        </Link>
      </div>

      {(!clientes || clientes.length === 0) && (
        <div className="bg-grafite border border-grafite-claro rounded-xl p-8 text-center text-texto-suave">
          Nenhum cliente cadastrado ainda.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map((cliente) => (
          <div
            key={cliente.id}
            className="bg-grafite border border-grafite-claro rounded-xl p-5 hover:border-dourado transition"
          >
            <Link
              href={`/clientes/${cliente.id}`}
              className="block"
            >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-dourado/10 text-dourado flex items-center justify-center">
                  <UserRound size={22} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-texto">
                    {cliente.nome}
                  </h3>

                  <p className="text-xs text-texto-suave">
                    Ver ficha completa
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-texto-suave">
                <FileText size={15} />

                <span>
                  {cliente.cpf || "CPF não informado"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-texto-suave">
                <Phone size={15} />

                <span>
                  {cliente.telefone || "Telefone não informado"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-texto-suave">
                <Mail size={15} />

                <span className="truncate">
                  {cliente.email || "E-mail não informado"}
                </span>
              </div>
            </div>
            </Link>

            {cliente.telefone && (
              <div className="mt-4 border-t border-grafite-claro pt-4">
                <BotaoWhatsapp
                  telefone={cliente.telefone}
                  nome={cliente.nome}
                  rotulo="Chamar no WhatsApp"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}