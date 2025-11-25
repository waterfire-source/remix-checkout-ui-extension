import { authenticate } from "../shopify.server";
import db from "../db.server";
import { extractOrderData, getImageUrl } from "../services/order.service";
import { generatePDF } from "../services/pdf.service";
import { storePDF, storeImage } from "../services/storage.service";
import { randomUUID } from "crypto";

export async function loader({ params, request }) {
  const { orderId } = params;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!orderId) {
    return Response.json(
      { error: "Order ID required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    
    const { admin, session } = await authenticate.admin(request);
    
    if (!admin || !session) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders }
      );
    }

    
    // Extract numeric ID from GID (format: gid://shopify/OrderIdentity/16528344416605)
    const numericOrderId = orderId.includes("/") 
      ? orderId.split("/").pop() 
      : orderId;

    // Use REST API to get order with line item properties (easier access)
    const order = await admin.rest.resources.Order.find({
      session,
      id: numericOrderId,
    });

    if (!order) {
      return Response.json(
        { error: "Order not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Convert REST API format to webhook format for Zepto extraction
    const lineItems = (order.line_items || []).map((item) => ({
      id: item.id?.toString(),
      title: item.title,
      quantity: item.quantity,
      product_id: item.product_id?.toString(),
      variant_id: item.variant_id?.toString(),
      properties: (item.properties || []).map((prop) => ({
        name: prop.name,
        value: prop.value,
      })),
    }));

    
    const orderItems = extractOrderData(lineItems);

    if (orderItems.length === 0) {
      return Response.json(
        { error: "No line items found in this order" },
        { status: 404, headers: corsHeaders }
      );
    }

    
    const generatedPdfs = [];

    for (const orderData of orderItems) {
      try {
        const pdf = await generatePDFForProduct({
          order: {
            id: order.id?.toString() || numericOrderId,
            name: order.name,
            orderNumber: order.order_number?.toString() || "",
            email: order.email || "",
          },
          orderData,
          shop: session.shop,
        });
        generatedPdfs.push(pdf);
      } catch (error) {
        console.error(`Error generating PDF for ${orderData.productTitle}:`, error);
      }
    }

    const baseUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
    const pdfsWithUrls = generatedPdfs.map((pdf) => ({
      id: pdf.id,
      productTitle: pdf.productTitle,
      downloadUrl: `${baseUrl}/download/${pdf.downloadToken}`,
    }));

    return Response.json(
      {
        orderNumber: order.order_number?.toString() || order.name,
        pdfs: pdfsWithUrls,
        count: pdfsWithUrls.length,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return Response.json(
      { error: "Failed to generate PDF: " + error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Generates PDF for a single product
 */
async function generatePDFForProduct({ order, orderData, shop }) {
  
  let template = await db.letterTemplate.findFirst({
    where: {
      shop,
      productId: orderData.productId,
      isActive: true,
    },
  });

  if (!template) {
    template = await createDefaultTemplate(orderData.productId, orderData.productTitle, shop);
  }

  
  const imageUrl = getImageUrl(orderData);

  
  let storedImageUrl = null;
  if (imageUrl) {
    try {
      const imageFilename = `image_${order.id}_${orderData.lineItemId}_${Date.now()}.png`;
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
      orderName: order.name,
      customerEmail: order.email || "",
      quantity: orderData.quantity,
      price: orderData.price,
      sku: orderData.sku || "",
      vendor: orderData.vendor || "",
      ...orderData.properties,
      ...orderData.textFields,
    },
    imageUrl: imageUrl || storedImageUrl,
  });

  
  const pdfFilename = `letter_${order.orderNumber || order.name}_${orderData.lineItemId}_${Date.now()}.pdf`;
  const { url: pdfUrl, key: pdfKey } = await storePDF(pdfBuffer, pdfFilename, shop);

  
  const downloadToken = randomUUID();

  
  const generatedPdf = await db.generatedPdf.create({
    data: {
      orderId: order.id.split("/").pop(),
      orderNumber: order.orderNumber?.toString() || "",
      orderName: order.name,
      lineItemId: orderData.lineItemId,
      productId: orderData.productId,
      productTitle: orderData.productTitle,
      customerEmail: order.email || "",
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

/**
 * Creates a default template for a product
 */
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
      font-size: 16px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
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
      
      {{singleLineSection}}
      
      {{multiLineSection}}
      
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

