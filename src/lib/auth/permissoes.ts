export interface ContextoSessao {
  comprador: boolean;
  filialId?: string | null;
}

export function podeVisualizarAuditoria(contexto: ContextoSessao): boolean {
  return contexto.comprador === true;
}

export function podeGerenciarCredenciais(contexto: ContextoSessao): boolean {
  return contexto.comprador === true;
}

export function precisaConfigurarSenha(senhaHash: string | null): boolean {
  return !senhaHash || senhaHash.trim().length === 0;
}
