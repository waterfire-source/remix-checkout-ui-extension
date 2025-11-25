import db from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return new Response(null, { status: 405, headers: corsHeaders });
}

export async function loader({ params, request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const { orderNumber } = params;
  const url = new URL(request.url);
  const orderIdParam = url.searchParams.get("orderId");

  if (!orderNumber) {
    return Response.json(
      { error: "Order number required" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    let numericOrderId = null;
    if (orderNumber.includes("OrderIdentity")) {
      const parts = orderNumber.split("/");
      numericOrderId = parts[parts.length - 1];
    } else if (orderIdParam) {
      numericOrderId = orderIdParam;
    }

    const whereClause = {
      OR: [
        { orderNumber: orderNumber },
        { orderName: orderNumber },
        { orderName: `#${orderNumber}` },
        { orderName: orderNumber.replace(/^#/, "") },
      ],
    };

    if (numericOrderId) {
      whereClause.OR.push({ orderId: numericOrderId });
    }

    const pdfs = await db.generatedPdf.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        productTitle: true,
        downloadToken: true,
        createdAt: true,
        orderId: true,
        orderNumber: true,
        orderName: true,
      },
      take: 1,
    });

    const baseUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
    const pdfsWithUrls = pdfs.map((pdf) => ({
      id: pdf.id,
      productTitle: pdf.productTitle,
      downloadUrl: `${baseUrl}/download/${pdf.downloadToken}`,
      createdAt: pdf.createdAt,
    }));

    return Response.json(
      {
        orderNumber,
        pdfs: pdfsWithUrls,
        count: pdfsWithUrls.length,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch PDFs" },
      { status: 500, headers: corsHeaders },
    );
  }
}
