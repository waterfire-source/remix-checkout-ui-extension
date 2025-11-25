import { authenticate } from "../shopify.server";
import db from "../db.server";
import { extractOrderData, getImageUrl } from "../services/order.service";
import { generatePDF } from "../services/pdf.service";
import { storePDF, storeImage } from "../services/storage.service";
import { randomUUID } from "crypto";

export const loader = async ({ request }) => {
  return Response.json({
    message: "Webhook route is accessible",
    path: "/webhooks/orders/create",
    method: "GET",
  });
};

export const action = async ({ request }) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);

    try {
      const order = payload;
      const orderId = order.id?.toString();
      const orderNumber = order.order_number?.toString();
      const orderName = order.name;
      const customerEmail = order.email;
      const lineItems = order.line_items || [];

      const orderItems = extractOrderData(lineItems);

      if (orderItems.length === 0) {
        return new Response();
      }

      if (orderItems.length > 0) {
        const firstOrderData = orderItems[0];
        try {
          await processOrderItem({
            orderId,
            orderNumber,
            orderName,
            customerEmail,
            orderData: firstOrderData,
            shop,
          });
        } catch (error) {
          console.error(
            `Error processing product ${firstOrderData.productTitle}:`,
            error,
          );
        }
      }

      return new Response();
    } catch (error) {
      console.error("❌ Error processing order data:", error);
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);

      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("❌ Error authenticating webhook:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

async function processOrderItem({
  orderId,
  orderNumber,
  orderName,
  customerEmail,
  orderData,
  shop,
}) {

  let template = await db.letterTemplate.findFirst({
    where: {
      shop,
      productId: orderData.productId,
      isActive: true,
    },
  });

  if (!template) {
    template = await createDefaultTemplate(
      orderData.productId,
      orderData.productTitle,
      shop,
    );
  }

  const imageUrl = getImageUrl(orderData);

  let storedImageUrl = null;
  if (imageUrl) {
    try {
      const imageFilename = `image_${orderId}_${orderData.lineItemId}_${Date.now()}.png`;
      const storedImage = await storeImage(imageUrl, imageFilename, shop);
      storedImageUrl = storedImage.url;
    } catch (error) {
      console.error("Error storing image:", error);
    }
  }

  const pdfBuffer = await generatePDF({
    htmlContent: template.htmlContent,
    personalizationData: {
      productTitle: orderData.productTitle,
      orderName: orderName,
      customerEmail: customerEmail,
      quantity: orderData.quantity,
      price: orderData.price,
      sku: orderData.sku || "",
      vendor: orderData.vendor || "",
      ...orderData.properties,
      ...orderData.textFields,
    },
    imageUrl: imageUrl || storedImageUrl,
  });

  const pdfFilename = `letter_${orderNumber}_${orderData.lineItemId}_${Date.now()}.pdf`;
  const { url: pdfUrl, key: pdfKey } = await storePDF(
    pdfBuffer,
    pdfFilename,
    shop,
  );

  const downloadToken = randomUUID();

  const generatedPdf = await db.generatedPdf.create({
    data: {
      orderId,
      orderNumber,
      orderName,
      lineItemId: orderData.lineItemId,
      productId: orderData.productId,
      productTitle: orderData.productTitle,
      customerEmail,
      templateId: template.id,
      pdfUrl,
      pdfKey,
      personalizationData: orderData.properties,
      imageUrl: imageUrl || storedImageUrl,
      downloadToken,
      shop,
    },
  });

  return generatedPdf;
}

async function createDefaultTemplate(productId, productTitle, shop) {
  const defaultHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Georgia', serif;
      margin: 0;
      padding: 40px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }
    .letter-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #2c3e50;
      font-size: 36px;
      margin: 0;
      font-weight: bold;
    }
    .content {
      line-height: 1.8;
      font-size: 18px;
      color: #34495e;
      margin: 30px 0;
    }
    .single-line {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #d4af37;
    }
    .multi-line {
      font-size: 16px;
      line-height: 2;
      color: #34495e;
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .image-section {
      text-align: center;
      margin: 40px 0;
    }
    .image-section img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .download-button {
      display: inline-block;
      margin-top: 30px;
      padding: 15px 30px;
      background: #d4af37;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      text-align: center;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="header">
      <h1>{{productTitle}}</h1>
    </div>
    
    <div class="content">
      {{imageSection}}
      
      <div class="order-info" style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 4px;">
        <p><strong>Order Number:</strong> {{orderName}}</p>
        <p><strong>Product:</strong> {{productTitle}}</p>
        <p><strong>Quantity:</strong> {{quantity}}</p>
        <p><strong>Price:</strong> {{price}}</p>
      </div>
      
      {{orderDetailsSection}}
      
      {{downloadButtonSection}}
    </div>
    
    <div class="footer">
      <p>Created with love by The Best Letters</p>
      <p>Order: {{orderName}}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return await db.letterTemplate.create({
    data: {
      name: `Default Template - ${productTitle}`,
      productId,
      htmlContent: defaultHtml,
      cssContent: null,
      isActive: true,
      shop,
    },
  });
}
