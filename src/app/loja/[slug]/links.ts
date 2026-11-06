/** Link de WhatsApp da loja, com mensagem já preenchida sobre o produto. */
export function whatsappLink(
  whatsapp: string,
  storeName: string,
  product?: { name: string; code: string },
): string {
  const digits = whatsapp.replace(/\D/g, "");
  const text = product
    ? `Olá! Vi "${product.name}" (${product.code}) na vitrine de ${storeName} e gostaria de mais informações.`
    : `Olá! Gostaria de mais informações sobre os produtos de ${storeName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
