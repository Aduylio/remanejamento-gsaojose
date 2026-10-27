export interface LocalizacaoValidada {
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  origem: "informada_pelo_cliente";
  capturadaEm: string;
}

/**
 * Valida coordenadas enviadas pelo navegador. Trata os dados como não
 * confiáveis: precisam ser números finitos dentro dos limites geográficos.
 * A origem é sempre identificada como informada pelo cliente, nunca como
 * estimativa por IP.
 */
export function validarLocalizacaoCliente(input: {
  latitude?: unknown;
  longitude?: unknown;
  precisao?: unknown;
}): LocalizacaoValidada | null {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return null;
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  if (
    input.latitude === undefined ||
    input.longitude === undefined ||
    input.latitude === "" ||
    input.longitude === ""
  ) {
    return null;
  }

  const precisao = Number(input.precisao);
  const precisaoMetros =
    Number.isFinite(precisao) && precisao >= 0 ? precisao : undefined;

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    precisaoMetros,
    origem: "informada_pelo_cliente",
    capturadaEm: new Date().toISOString(),
  };
}
