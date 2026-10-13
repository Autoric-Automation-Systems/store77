import Image from "next/image";
import Link from "next/link";

/**
 * Marca do Store77 (produto). A logo de cada *loja* é configurada por tenant em
 * /vitrine e vive em `stores.logoUrl` — não use este componente na vitrine.
 */
export function Brand({
  href = "/",
  className = "h-9",
  priority = false,
}: {
  href?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      <Image
        src="/logoname.png"
        alt="Store77"
        width={669}
        height={373}
        priority={priority}
        className={`${className} w-auto`}
      />
    </Link>
  );
}
