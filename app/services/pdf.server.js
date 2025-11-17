import PDFDocument from "pdfkit";
import { Readable } from "stream";

/**
 * Generates a PDF from order data
 * @param {Object} orderData - The order data from Shopify
 * @returns {Promise<Buffer>} The PDF buffer
 */
export async function generateOrderPdf(orderData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Order Details", { align: "center" }).moveDown();

    doc
      .fontSize(14)
      .text(`Order #${orderData.order_number || orderData.name}`, {
        underline: true,
      })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        `Order Date: ${new Date(orderData.created_at).toLocaleDateString()}`,
      )
      .text(`Order Status: ${orderData.financial_status}`)
      .moveDown();

    if (orderData.customer) {
      doc
        .fontSize(14)
        .text("Customer Information", { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text(
          `Name: ${orderData.customer.first_name} ${orderData.customer.last_name}`,
        )
        .text(`Email: ${orderData.customer.email || "N/A"}`)
        .moveDown();
    }

    if (orderData.shipping_address) {
      doc
        .fontSize(14)
        .text("Shipping Address", { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text(
          [
            orderData.shipping_address.address1,
            orderData.shipping_address.address2,
            `${orderData.shipping_address.city}, ${orderData.shipping_address.province} ${orderData.shipping_address.zip}`,
            orderData.shipping_address.country,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .moveDown();
    }

    doc
      .fontSize(14)
      .text("Order Items", { underline: true })
      .moveDown(0.5)
      .fontSize(12);

    orderData.line_items?.forEach((item, index) => {
      const productName = item.name || "Product";
      const variantTitle = item.variant_title ? ` - ${item.variant_title}` : "";
      doc
        .fontSize(12)
        .text(`${index + 1}. ${productName}${variantTitle}`, { bold: true })
        .moveDown(0.2);

      doc
        .fontSize(11)
        .text(`Quantity: ${item.quantity}`, { continued: true })
        .text(`Unit Price: $${parseFloat(item.price || 0).toFixed(2)}`, {
          align: "right",
        })
        .text(
          `Line Total: $${parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)}`,
          { align: "right" },
        )
        .moveDown(0.3);

      if (item.properties && item.properties.length > 0) {
        doc
          .fontSize(10)
          .text("Customization Options:", { bold: true })
          .moveDown(0.2);
        item.properties.forEach((property) => {
          const propName = property.name || "";
          let propValue = property.value || "";

          if (!propName && !propValue) return;

          if (propValue && propValue.length > 80) {
            const words = propValue.split(" ");
            let currentLine = "";
            let firstLine = true;

            words.forEach((word) => {
              if ((currentLine + word).length > 80 && currentLine) {
                if (firstLine) {
                  doc
                    .fontSize(10)
                    .text(`${propName}:`, { continued: true, bold: true })
                    .text(` ${currentLine.trim()}`)
                    .moveDown(0.1);
                  firstLine = false;
                } else {
                  doc
                    .fontSize(10)
                    .text(`  ${currentLine.trim()}`)
                    .moveDown(0.1);
                }
                currentLine = word + " ";
              } else {
                currentLine += word + " ";
              }
            });

            if (currentLine.trim()) {
              if (firstLine) {
                doc
                  .fontSize(10)
                  .text(`${propName}:`, { continued: true, bold: true })
                  .text(` ${currentLine.trim()}`)
                  .moveDown(0.15);
              } else {
                doc.fontSize(10).text(`  ${currentLine.trim()}`).moveDown(0.15);
              }
            }
          } else {
            doc
              .fontSize(10)
              .text(`${propName}:`, { continued: true, bold: true })
              .text(` ${propValue}`)
              .moveDown(0.15);
          }
        });
        doc.moveDown(0.2);
      }

      if (item.sku) {
        doc.fontSize(10).text(`SKU: ${item.sku}`).moveDown(0.2);
      }

      if (item.variant_options && item.variant_options.length > 0) {
        doc.fontSize(10).text("Variant Options:").moveDown(0.1);
        item.variant_options.forEach((option) => {
          doc
            .fontSize(10)
            .text(`  • ${option.name}: ${option.value}`)
            .moveDown(0.1);
        });
        doc.moveDown(0.2);
      }

      doc.moveDown(0.5);
    });

    doc.moveDown();

    doc
      .fontSize(14)
      .text("Order Summary", { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(
        `Subtotal: $${parseFloat(orderData.subtotal_price || 0).toFixed(2)}`,
        {
          align: "right",
        },
      )
      .text(`Tax: $${parseFloat(orderData.total_tax || 0).toFixed(2)}`, {
        align: "right",
      })
      .text(
        `Shipping: $${parseFloat(orderData.total_shipping_price_set?.shop_money?.amount || 0).toFixed(2)}`,
        {
          align: "right",
        },
      )
      .moveDown(0.5)
      .fontSize(16)
      .text(`Total: $${parseFloat(orderData.total_price || 0).toFixed(2)}`, {
        align: "right",
        bold: true,
      });

    doc.end();
  });
}
