import db from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "false",
  "Access-Control-Max-Age": "86400",
};

export const headers = ({ request }) => {
  return corsHeaders;
};

export const action = async ({ request }) => {
  console.log(`[API] Action called with method: ${request.method}`);
  
  if (request.method === "OPTIONS") {
    console.log("[API] Handling OPTIONS preflight in action");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
};

export const loader = async ({ request }) => {
  console.log(`[API] Loader called with method: ${request.method}`);
  
  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    console.log("[API] Handling OPTIONS preflight in loader");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const shop = url.searchParams.get("shop");

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const orderIdString = orderId.toString();

    console.log(`[API] Looking for PDF - orderId: ${orderIdString}, shop: ${shop || "none"}`);

    const orderPdf = await db.orderPdf.findUnique({
      where: {
        orderId: orderIdString,
      },
    });

    if (!orderPdf) {
      console.log(`[API] PDF not found for orderId: ${orderIdString}`);

      const allOrders = await db.orderPdf.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      console.log(
        `[API] Recent orders in DB:`,
        allOrders.map((o) => ({
          orderId: o.orderId,
          orderNumber: o.orderNumber,
        })),
      );

      return new Response(
        JSON.stringify({
          error: "PDF not found",
          message: "PDF is being generated. Please try again in a few seconds.",
          orderId: orderIdString,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    if (shop && orderPdf.shop !== shop) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({ pdfUrl: orderPdf.pdfUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error fetching order PDF:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
};
