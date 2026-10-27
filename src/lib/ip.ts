import "server-only";

function listaProxiesConfiaveis(): string[] {
  return (process.env.TRUSTED_PROXIES ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ehIpValido(ip: string): boolean {
  if (!ip) return false;
  const semColchetes = ip.replace(/^\[/, "").replace(/\]$/, "");
  if (semColchetes.includes(":")) {
    return /^[0-9a-fA-F:]+$/.test(semColchetes) && semColchetes.length > 2;
  }
  const partes = semColchetes.split(".");
  if (partes.length !== 4) return false;
  return partes.every((p) => {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255 && p === String(n);
  });
}

function ipv4ParaInteiro(ip: string): number | null {
  if (!ehIpValido(ip) || ip.includes(":")) return null;
  return ip
    .split(".")
    .reduce((acc, parte) => ((acc << 8) + Number(parte)) >>> 0, 0);
}

export function ipPertenceA(ip: string, regra: string): boolean {
  if (regra === ip) return true;
  const [rede, bitsTexto] = regra.split("/");
  if (!rede || !bitsTexto) return false;
  const bits = Number(bitsTexto);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ParaInteiro(ip);
  const redeInt = ipv4ParaInteiro(rede);
  if (ipInt === null || redeInt === null) return false;
  if (bits === 0) return true;
  const mascara = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mascara) === (redeInt & mascara);
}

function ipConfiavel(ip: string, proxies: string[]): boolean {
  return proxies.some((regra) => ipPertenceA(ip, regra));
}

function primeiroNaoConfiavel(
  cadeia: string[],
  proxies: string[],
): string | undefined {
  for (let indice = cadeia.length - 1; indice >= 0; indice -= 1) {
    const ip = cadeia[indice]?.trim();
    if (!ip) continue;
    if (!ipConfiavel(ip, proxies)) return ip;
  }
  return undefined;
}

function obterCabecalho(
  headers: Headers | Record<string, string>,
  nome: string,
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(nome) ?? undefined;
  }
  const alvo = nome.toLowerCase();
  for (const [chave, valor] of Object.entries(headers)) {
    if (chave.toLowerCase() === alvo) return valor;
  }
  return undefined;
}

/**
 * Extrai o IP observado apenas se houver proxies reversos configurados.
 *
 * O proxy deve remover os cabeçalhos enviados pelo cliente e reescrevê-los.
 * A cadeia de X-Forwarded-For é percorrida da direita para a esquerda,
 * ignorando os proxies confiáveis (IPs ou CIDRs IPv4 em TRUSTED_PROXIES).
 * Sem configuração explícita, nenhum cabeçalho é aceito.
 */
export function obterIpObservado(
  headers?: Headers | Record<string, string>,
): { ip?: string; fonte?: string } {
  if (!headers) return {};

  const proxies = listaProxiesConfiaveis();
  if (proxies.length === 0) return {};

  const realIp = obterCabecalho(headers, "x-real-ip")?.trim();
  if (realIp && ehIpValido(realIp)) {
    return { ip: realIp, fonte: "x-real-ip" };
  }

  const cfIp = obterCabecalho(headers, "cf-connecting-ip")?.trim();
  if (cfIp && ehIpValido(cfIp)) {
    return { ip: cfIp, fonte: "cf-connecting-ip" };
  }

  const trueClientIp = obterCabecalho(headers, "true-client-ip")?.trim();
  if (trueClientIp && ehIpValido(trueClientIp)) {
    return { ip: trueClientIp, fonte: "true-client-ip" };
  }

  const forwarded = obterCabecalho(headers, "x-forwarded-for");
  if (forwarded) {
    const cadeia = forwarded.split(",").map((item) => item.trim());
    const cliente = primeiroNaoConfiavel(cadeia, proxies);
    if (cliente && ehIpValido(cliente)) {
      return { ip: cliente, fonte: "x-forwarded-for" };
    }
  }

  return {};
}
