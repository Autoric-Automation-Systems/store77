const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "cadastro",
  "registro",
  "dashboard",
  "estoque",
  "caixa",
  "financeiro",
  "vitrine",
  "usuarios",
  "loja",
  "admin",
  "app",
  "www",
]);

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** Converte "#4f46e5" em "79 70 229" para uso com rgb(var(--x) / alpha). */
export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = /^[0-9a-fA-F]{6}$/.test(full) ? full : "4f46e5";
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}
