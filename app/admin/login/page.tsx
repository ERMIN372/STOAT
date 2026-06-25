import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { loginAction } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Вход — админка",
  robots: { index: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const notConfigured = !process.env.ADMIN_PASSWORD;

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center">
      <form action={loginAction} className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Logo href={null} tagline markClassName="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Админка заказов</p>
        </div>

        {notConfigured && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Переменная <code>ADMIN_PASSWORD</code> не задана в окружении — вход
            невозможен.
          </p>
        )}
        {searchParams.error && (
          <p className="text-sm text-destructive">Неверный пароль.</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" variant="brand" className="w-full">
          Войти
        </Button>
      </form>
    </div>
  );
}
