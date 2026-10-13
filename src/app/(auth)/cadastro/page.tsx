import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar loja" };

export default function RegisterPage() {
  return <RegisterForm />;
}
