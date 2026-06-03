import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FolderOpen, FileText, Plus } from "lucide-react";
import Link from "next/link";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-blue">Documents</h1>
          <p className="text-gray-500 mt-1">{documents.length} documents</p>
        </div>
        <Link href="/admin/documents/upload">
          <Button>
            <Plus className="w-4 h-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No documents uploaded yet.</p>
              <Link href="/admin/documents/upload" className="mt-4 inline-block">
                <Button size="sm" variant="outline">Upload first document</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {documents.map((doc) => {
                const visibilityMap: Record<string, { variant: any; label: string }> = {
                  ALL_LEASEHOLDERS: { variant: "paid", label: "All Leaseholders" },
                  ADMIN_ONLY: { variant: "draft", label: "Admin Only" },
                  SPECIFIC_UNITS: { variant: "gold", label: "Specific Units" },
                };
                const { variant, label } = visibilityMap[doc.visibility] ?? { variant: "default", label: doc.visibility };

                return (
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
                    <Badge variant={variant}>{label}</Badge>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-blue hover:underline"
                    >
                      View
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
