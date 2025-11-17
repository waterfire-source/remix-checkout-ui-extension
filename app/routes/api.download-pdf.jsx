import db from "../db.server";
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

export const headers = () => corsHeaders;

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return new Response("Order ID is required", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const orderIdString = orderId.toString();

    console.log(`[Download API] Fetching PDF for orderId: ${orderIdString}`);

    const orderPdf = await db.orderPdf.findUnique({
      where: {
        orderId: orderIdString,
      },
    });

    if (!orderPdf) {
      return new Response("PDF not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const pdfUrl = orderPdf.pdfUrl;
    const fileName = pdfUrl.split("/").pop() || `order-${orderIdString}.pdf`;

    if (pdfUrl.includes("/pdfs/")) {
      const filePath = join(process.cwd(), "public", "pdfs", fileName);

      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath);

        return new Response(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            ...corsHeaders,
          },
        });
      }
    }

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          ...corsHeaders,
        },
      });
    } catch (fetchError) {
      console.error("[Download API] Error fetching external PDF:", fetchError);
      return new Response("Error fetching PDF", {
        status: 500,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error("[Download API] Error:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
};
