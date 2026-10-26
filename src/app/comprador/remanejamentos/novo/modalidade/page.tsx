import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const opcoes = [
  {
    href: "/comprador/importar",
    titulo: "Importar um pedido",
    descricao: "Importe um pedido agrupado por loja para gerar os remanejamentos.",
    icone: FileSpreadsheet,
  },
  {
    href: "/comprador/remanejamentos/novo/manual",
    titulo: "Digitar manualmente",
    descricao: "Informe as lojas, os produtos e as quantidades.",
    icone: FileText,
  },
  {
    href: "/comprador/remanejamentos/novo/trier",
    titulo: "Remanejamento do Trier",
    descricao: "Importe um arquivo de transferência exportado pelo Trier.",
    icone: Upload,
  },
];

export default function ModalidadeNovoRemanejamentoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Comprador"
        title="Novo remanejamento"
        description="Escolha a modalidade de criação."
        actions={
          <Link
            href="/comprador"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Voltar
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {opcoes.map((opcao) => {
          const Icone = opcao.icone;

          return (
            <Card key={opcao.href} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icone className="size-4 text-slate-500" aria-hidden="true" />
                  <CardTitle>{opcao.titulo}</CardTitle>
                </div>
                <CardDescription>{opcao.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={opcao.href}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Continuar
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
