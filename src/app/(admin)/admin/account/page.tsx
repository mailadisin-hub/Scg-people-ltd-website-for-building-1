import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, CheckCircle2 } from "lucide-react";
import bcrypt from "bcryptjs";

async function changePassword(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) redirect("/login");

  const current = formData.get("current") as string;
  const newPw = formData.get("new") as string;
  const confirm = formData.get("confirm") as string;

  if (!current || !newPw || !confirm) return;
  if (newPw !== confirm) return;
  if (newPw.length < 8) return;

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  if (!user) return;

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return;

  const hash = await bcrypt.hash(newPw, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  });

  revalidatePath("/admin/account");
  redirect("/admin/account?changed=1");
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { changed?: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as { name?: string; email?: string };

  return (
    <div className="max-w-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-blue mb-1">My Account</h1>
      <p className="text-gray-500 text-sm mb-8">Change your admin password</p>

      {searchParams.changed === "1" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm animate-scale-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Password changed successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-4 h-4 text-brand-gold" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-gray-600">
            Signed in as <span className="font-medium text-brand-blue">{user.email}</span>
          </div>
          <form action={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                name="current"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
                <span className="text-gray-400 font-normal ml-1">(min 8 characters)</span>
              </label>
              <input
                type="password"
                name="new"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                name="confirm"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
            <Button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue-light">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
