import { redirect } from "react-router";
import db from "../db.server";

/**
 * Download route for generated PDFs
 * Accessible via: /download/{token}
 */
export async function loader({ params, request }) {
  const { token } = params;

  if (!token) {
    return new Response("Download token required", { status: 400 });
  }

  try {
    const generatedPdf = await db.generatedPdf.findFirst({
      where: {
        downloadToken: token,
      },
    });

    if (!generatedPdf) {
      return new Response("PDF not found", { status: 404 });
    }

    if (generatedPdf.pdfKey && generatedPdf.pdfKey.startsWith("/")) {
      const fs = await import("fs/promises");
      const path = await import("path");

      try {
        const filePath = path.join(
          process.cwd(),
          "public",
          generatedPdf.pdfUrl,
        );
        const pdfBuffer = await fs.readFile(filePath);

        return new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${generatedPdf.productTitle.replace(/\s+/g, "_")}_${generatedPdf.orderName}.pdf"`,
          },
        });
      } catch (error) {
        console.error("Error reading PDF file:", error);
        return new Response("PDF file not found", { status: 404 });
      }
    }

    if (generatedPdf.pdfUrl.startsWith("http")) {
      return redirect(generatedPdf.pdfUrl);
    }

    const baseUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
    const fullUrl = generatedPdf.pdfUrl.startsWith("/")
      ? `${baseUrl}${generatedPdf.pdfUrl}`
      : generatedPdf.pdfUrl;

    return redirect(fullUrl);
  } catch (error) {
    console.error("Error serving PDF:", error);
    return new Response("Error serving PDF", { status: 500 });
  }
}
