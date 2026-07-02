import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { randomUUID } from "crypto";
import { DocVisibility } from "@prisma/client";

async function uploadDocument(formData: FormData) {
  "use server";

  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const title = formData.get("title") as string;
  const visibility = formData.get("visibility") as DocVisibility;
  const file = formData.get("file") as File;
  const unitIds = formData.getAll("unitIds") as string[];

  if (!title || !visibility || !file || file.size === 0) {
    redirect("/admin/documents/upload?error=Missing+required+fields");
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowedTypes.includes(file.type)) {
    redirect("/admin/documents/upload?error=Invalid+file+type.+Allowed:+PDF,+JPG,+PNG,+DOCX");
  }

  if (file.size > 10 * 1024 * 1024) {
    redirect("/admin/documents/upload?error=File+too+large.+Maximum+10MB");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeExt = ["pdf", "jpg", "jpeg", "png", "docx"].includes(ext) ? ext : "bin";
  const blobKey = `${randomUUID()}.${safeExt}`;
  const bytes = await file.arrayBuffer();

  // Store on the server's local disk (see src/lib/storage.ts)
  const { saveFile } = await import("@/lib/storage");
  await saveFile(blobKey, bytes);

  // fileUrl points to our authenticated download route
  const fileUrl = `/api/documents/${blobKey}/download`;

  const doc = await prisma.document.create({
    data: {
      title,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileUrl,
      visibility,
      uploadedById: userId,
    },
  });

  if (visibility === "SPECIFIC_UNITS" && unitIds.length > 0) {
    await prisma.documentUnitAccess.createMany({
      data: unitIds.map((unitId) => ({ documentId: doc.id, unitId })),
    });
  }

  revalidatePath("/admin/documents");
  redirect("/admin/documents");
}

export default async function DocumentUploadPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const units = await prisma.unit.findMany({ orderBy: { unitRef: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/documents"
          className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-blue flex items-center gap-2">
          <Upload className="w-8 h-8" />
          Upload Document
        </h1>
      </div>

      {searchParams.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadDocument} encType="multipart/form-data" className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Annual Accounts 2025"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              <input
                name="file"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-blue file:text-white hover:file:bg-brand-blue-dark"
              />
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG or DOCX · max 10 MB</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                name="visibility"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="ALL_LEASEHOLDERS">All Leaseholders</option>
                <option value="ADMIN_ONLY">Admin Only</option>
                <option value="SPECIFIC_UNITS">Specific Units</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units (if Specific Units selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {units.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-brand-blue">
                    <input type="checkbox" name="unitIds" value={u.id} className="accent-brand-blue" />
                    {u.unitRef}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Upload className="w-4 h-4" /> Upload Document
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
