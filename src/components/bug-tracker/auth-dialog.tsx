"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn, Loader2, Mail, Lock, User as UserIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

import { useUserAuth } from "@/stores/user-auth-store";

export function AuthDialog({ open, onOpenChange, mode: initialMode = "login" }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: "login" | "register";
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { fetchUser } = useUserAuth();

  const authMutation = useMutation({
    mutationFn: async () => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal");
      return data;
    },
    onSuccess: (data) => {
      toast.success(mode === "login" ? "Berhasil login" : "Akun dibuat! Selamat datang.");
      fetchUser();
      onOpenChange(false);
      setEmail(""); setPassword(""); setName("");
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) return;
    if (mode === "register" && name.trim().length < 1) return;
    authMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase">
            <LogIn className="h-4 w-4" /> {mode === "login" ? "Masuk" : "Daftar"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login" ? "Masuk buat ngobrol & lapor." : "Bikin akun simpel, email + password aja."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase">Nama</Label>
              <div className="relative">
                <UserIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" maxLength={80} className="pl-8" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold uppercase">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@kamu.com" className="pl-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold uppercase">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 karakter" className="pl-8" />
            </div>
          </div>
          <Button type="submit" disabled={authMutation.isPending} className="glow-primary w-full gap-2 uppercase">
            {authMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {mode === "login" ? "Masuk" : "Daftar"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setEmail(""); setPassword(""); setName(""); }}
          className="text-center font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya? Masuk"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
