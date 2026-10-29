import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { BLOB_PREFIX, isCategoryKey } from "@/lib/catalogs";

export const runtime = "nodejs";

/** Any PDF that fits comfortably through a browser upload. */
const MAX_BYTES = 100 * 1024 * 1024;

/**
 * Issues short-lived client tokens so the browser can upload straight to Vercel
 * Blob, bypassing the serverless request-body limit that would otherwise cap
 * catalog uploads at ~4.5 MB.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) {
          throw new Error("Not signed in.");
        }

        const parts = pathname.split("/");
        const [prefix, category] = parts;
        if (prefix !== BLOB_PREFIX.replace(/\/$/, "") || !category || !isCategoryKey(category)) {
          throw new Error("Unknown catalog category.");
        }
        if (parts.length !== 3 || !pathname.toLowerCase().endsWith(".pdf")) {
          throw new Error("Catalog uploads must be PDF files.");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
      onUploadCompleted: async () => {
        // The catalog page reads the blob listing on every request, so there is
        // nothing to persist here.
      },
    });

    return Response.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload rejected.";
    return Response.json({ error: message }, { status: 400 });
  }
}
