import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl?.startsWith("/") ? callbackUrl : "/";

  if (session?.user?.id) {
    redirect(destination);
  }

  return <LoginForm callbackUrl={destination} />;
}
