import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FolderOpen, FileText } from "lucide-react";

export default async function LeaseholderDocumentsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const leaseholder = await prisma.leaseholder.findUnique({
    where: { userId },
    include: { unit: true },
  });
  if (!leaseholder) redirect("/portal");

  // Fetch unit-specific access list and all-leaseholder docs in parallel.
  const [unitDocAccess, allLeaseholderDocs] = await Promise.all([
    prisma.documentUnitAccess.findMany({
      where: { unitId: leaseholder.unitId },
      select: { documentId: true },
    }),
    prisma.document.findMany({
      where: { visibility: "ALL_LEASEHOLDERS" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const specificDocIds = unitDocAccess.map((d) => d.documentId);
  const specificDocs = specificDocIds.length
    ? await prisma.document.findMany({
        where: { visibility: "SPECIFIC_UNITS", id: { in: specificDocIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const seen = new Set<string>();
  const documents = [...allLeaseholderDocs, ...specificDocs].filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <FolderOpen className="w-6 h-6" />
          Documents
        </h1>
        <p className="text-gray-500 mt-1">{documents.length} document{documents.length !== 1 ? "s" : ""} available</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No documents available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <div key={doc.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB ·{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark hover:underline flex-shrink-0"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
