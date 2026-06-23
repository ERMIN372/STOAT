"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Newsletter opt-in. Stubbed: shows a confirmation toast. Wire the email to a
 * provider (e.g. a Route Handler -> your ESP) where indicated.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // TODO(newsletter): POST `email` to your email provider / CRM here.
    toast.success("Вы подписаны", {
      description: "Спасибо! Будем присылать новости о дропах и коллекциях.",
    });
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ваш e-mail"
        aria-label="E-mail для подписки"
      />
      <Button type="submit" size="icon" variant="brand" aria-label="Подписаться">
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
