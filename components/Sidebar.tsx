"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Warehouse,
  Bike,
  ShoppingCart,
  Users,
  HardHat,
  Wrench,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const itens = [
  {
    nome: "Dashboard",
    href: "/dashboard",
    icone: LayoutDashboard,
  },
  {
    nome: "Estoque",
    href: "/estoque",
    icone: Warehouse,
  },
  {
    nome: "Comprar / Cadastrar Moto",
    href: "/motos/nova",
    icone: Bike,
  },
  {
    nome: "Vendas",
    href: "/vendas",
    icone: ShoppingCart,
  },
  {
    nome: "Clientes",
    href: "/clientes",
    icone: Users,
  },
  {
    nome: "Capacetes",
    href: "/capacetes",
    icone: HardHat,
  },
  {
    nome: "Gastos das Motos",
    href: "/gastos",
    icone: Wrench,
  },
  {
    nome: "Despesas da Loja",
    href: "/despesas",
    icone: Receipt,
  },
  {
    nome: "Caixa",
    href: "/caixa",
    icone: Wallet,
  },
  {
    nome: "Relatórios",
    href: "/relatorios",
    icone: BarChart3,
  },
  {
    nome: "Configurações",
    href: "/configuracoes",
    icone: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);

  function rotaAtiva(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function sair() {
    setSaindo(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSaindo(false);
      setAberto(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-lg border border-grafite-claro bg-grafite text-dourado shadow-lg md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-grafite-claro bg-grafite shadow-2xl transition-transform duration-200 ${
          aberto
            ? "translate-x-0"
            : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-grafite-claro px-4">
          <Link
            href="/dashboard"
            onClick={() => setAberto(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-preto">
  <img
    src="/logo-blackout.png"
    alt="Blackout Motos"
    className="h-full w-full object-contain"
  />
</div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-dourado">
                BLACKOUT MOTOS
              </p>
              <p className="text-[11px] text-texto-suave">
                Gestão da Loja
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="rounded-lg p-2 text-texto-suave hover:bg-preto hover:text-dourado md:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {itens.map((item) => {
              const Icone = item.icone;
              const ativo = rotaAtiva(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAberto(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    ativo
                      ? "bg-dourado text-preto"
                      : "text-texto hover:bg-preto hover:text-dourado"
                  }`}
                >
                  <Icone size={19} />
                  <span>{item.nome}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-grafite-claro p-3">
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
          >
            <LogOut size={19} />
            {saindo ? "Saindo..." : "Sair"}
          </button>
        </div>
      </aside>
    </>
  );
}