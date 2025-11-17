import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400",
};

/**
 * Route to serve PDF files stored locally
 * GET /pdfs/:filename
 *
 * This route serves PDFs from the public/pdfs directory
 * The $ in the filename means it's a catch-all route
 */
export const headers = () => corsHeaders;

export const loader = async ({ request, params }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const fileName = params["*"] || params.splat;

    if (!fileName) {
      return new Response("File not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (!/^[a-zA-Z0-9._-]+\.pdf$/.test(fileName)) {
      return new Response("Invalid file name", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const filePath = join(process.cwd(), "public", "pdfs", fileName);

    if (!existsSync(filePath)) {
      return new Response("PDF not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const fileBuffer = await readFile(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "public, max-age=31536000",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return new Response("Error serving PDF", {
      status: 500,
      headers: corsHeaders,
    });
  }
};
