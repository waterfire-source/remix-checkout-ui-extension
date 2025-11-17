import { authenticate } from "../shopify.server";
import db from "../db.server";
import { generateOrderPdf } from "../services/pdf.server";
import { storePdfLocally } from "../services/storage.server";

export const action = async ({ request }) => {
  const { payload, shop, topic, session } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const orderData = payload;

    console.log(`[Webhook] Order data keys:`, Object.keys(orderData));
    console.log(`[Webhook] Order name/number fields:`, {
      name: orderData.name,
      order_number: orderData.order_number,
      number: orderData.number,
      order_name: orderData.order_name,
    });

    let orderId = orderData.id;
    if (typeof orderId === "string" && orderId.includes("/")) {
      orderId = orderId.split("/").pop();
    }
    const orderIdString = orderId.toString();
    
    const orderNumber = orderData.name || 
                       orderData.order_number || 
                       orderData.number || 
                       orderData.order_name || 
                       null;
    
    console.log(`[Webhook] Extracted orderId: ${orderIdString}, orderNumber: ${orderNumber}`);

    const pdfBuffer = await generateOrderPdf(orderData);

    const fileName = `order-${orderIdString}-${Date.now()}.pdf`;

    const storageMethod = process.env.STORAGE_METHOD || "local";
    let pdfUrl;

    switch (storageMethod) {
      case "s3":
        const { uploadPdfToS3 } = await import("../services/s3.server");
        pdfUrl = await uploadPdfToS3(pdfBuffer, fileName);
        break;

      case "cloudinary":
        try {
          const { uploadPdfToCloudinary } = await import(
            "../services/cloudinary.server"
          );
          pdfUrl = await uploadPdfToCloudinary(pdfBuffer, fileName);
        } catch (error) {
          throw new Error(
            "Cloudinary is not installed. Run: npm install cloudinary",
          );
        }
        break;

      case "shopify":
        if (!session) {
          throw new Error("Session required for Shopify file upload");
        }
        const { uploadPdfToShopify } = await import(
          "../services/shopify-files.server"
        );
        pdfUrl = await uploadPdfToShopify(pdfBuffer, fileName, session);
        break;

      case "local":
      default:
        const relativePath = await storePdfLocally(pdfBuffer, fileName);

        const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
        pdfUrl = `${appUrl}${relativePath}`;
        break;
    }

    await db.orderPdf.upsert({
      where: {
        orderId: orderIdString,
      },
      update: {
        pdfUrl,
        orderNumber,
        updatedAt: new Date(),
      },
      create: {
        orderId: orderIdString,
        orderNumber,
        shop,
        pdfUrl,
      },
    });

    console.log(
      `PDF generated and uploaded for order ${orderIdString} (${orderNumber || "no number"}): ${pdfUrl}`,
    );

    return new Response(JSON.stringify({ success: true, pdfUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing order webhook:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
