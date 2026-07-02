import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { blobKey: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blobKey } = params;

  // Verify the document exists and the user has access
  const fileUrl = `/api/documents/${blobKey}/download`;
  const doc = await prisma.document.findFirst({ where: { fileUrl } });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = session.user as { role?: string; id?: string };

  // Admins can access everything; leaseholders are filtered by visibility
  if (user.role !== "ADMIN") {
    if (doc.visibility === "ADMIN_ONLY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (doc.visibility === "SPECIFIC_UNITS") {
      const leaseholder = await prisma.leaseholder.findUnique({
        where: { userId: user.id },
      });
      if (!leaseholder) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const access = await prisma.documentUnitAccess.findFirst({
        where: { documentId: doc.id, unitId: leaseholder.unitId },
      });
      if (!access) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const blob = await readFile(blobKey);

  if (!blob) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(blob), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
