"use client";

import { useActionState } from "react";
import { createAdminUser, type AdminFormState } from "@/lib/admin/roles-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type RoleOption = { id: string; name: string; label: string };

export function CreateAdminForm({ roles }: { roles: RoleOption[] }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    createAdminUser,
    {},
  );

  return (
    <Card className="space-y-3">
      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="full_name" placeholder="الاسم الكامل" required />
          <Input name="email" type="email" placeholder="البريد الإلكتروني" dir="ltr" required />
          <Input name="password" type="password" placeholder="كلمة المرور (٨ أحرف فأكثر)" required minLength={8} />
          <Select name="role_id" defaultValue="">
            <option value="">بلا دور</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
        {state.success && (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>
        )}

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "جارٍ الإنشاء…" : "إنشاء حساب مدير"}
        </Button>
      </form>
    </Card>
  );
}
