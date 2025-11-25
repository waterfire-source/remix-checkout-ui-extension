import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generates a PDF from HTML template with order data
 * @param {Object} options - PDF generation options
 * @param {string} options.htmlContent - HTML template content
 * @param {Object} options.personalizationData - Order data and properties
 * @param {string} options.imageUrl - Image URL (optional)
 * @returns {Promise<Buffer>} Generated PDF buffer
 */
export async function generatePDF({
  htmlContent,
  personalizationData,
  imageUrl,
}) {
  let processedHtml = htmlContent;

  // Replace standard placeholders
  processedHtml = processedHtml.replace(
    /\{\{productTitle\}\}/g,
    escapeHtml(personalizationData.productTitle || ""),
  );
  processedHtml = processedHtml.replace(
    /\{\{orderName\}\}/g,
    escapeHtml(personalizationData.orderName || ""),
  );
  processedHtml = processedHtml.replace(
    /\{\{customerEmail\}\}/g,
    escapeHtml(personalizationData.customerEmail || ""),
  );
  processedHtml = processedHtml.replace(
    /\{\{quantity\}\}/g,
    escapeHtml(String(personalizationData.quantity || "")),
  );
  processedHtml = processedHtml.replace(
    /\{\{price\}\}/g,
    escapeHtml(String(personalizationData.price || "")),
  );
  processedHtml = processedHtml.replace(
    /\{\{sku\}\}/g,
    escapeHtml(personalizationData.sku || ""),
  );
  processedHtml = processedHtml.replace(
    /\{\{vendor\}\}/g,
    escapeHtml(personalizationData.vendor || ""),
  );

  // Replace all other properties dynamically
  for (const [key, value] of Object.entries(personalizationData)) {
    if (typeof value === "string" || typeof value === "number") {
      const placeholder = `{{${key}}}`;
      processedHtml = processedHtml.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        escapeHtml(String(value)),
      );
    }
  }

  if (imageUrl) {
    processedHtml = processedHtml.replace(/\{\{imageUrl\}\}/g, imageUrl);
    processedHtml = processedHtml.replace(
      /\{\{highQualityImageUrl\}\}/g,
      imageUrl,
    );

    const imageSection = `
      <div class="image-section">
        <img src="${imageUrl}" alt="Personalized Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);" />
      </div>
    `;
    processedHtml = processedHtml.replace(
      /\{\{imageSection\}\}/g,
      imageSection,
    );

    const downloadButtonSection = `
      <div style="text-align: center; margin-top: 30px; padding: 20px;">
        <a href="${imageUrl}" 
           class="download-button" 
           download 
           style="display: inline-block; padding: 15px 30px; background: #d4af37; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          📥 Download High-Quality Image
        </a>
        <p style="margin-top: 10px; color: #7f8c8d; font-size: 14px;">Click the button above to download your high-quality personalized image</p>
      </div>
    `;
    processedHtml = processedHtml.replace(
      /\{\{downloadButtonSection\}\}/g,
      downloadButtonSection,
    );
  } else {
    processedHtml = processedHtml.replace(/\{\{imageSection\}\}/g, "");
    processedHtml = processedHtml.replace(/\{\{downloadButtonSection\}\}/g, "");
  }

  // Generate order details section from all properties
  const orderDetails = [];
  for (const [key, value] of Object.entries(personalizationData)) {
    // Skip internal fields and empty values
    if (
      !["productTitle", "orderName", "customerEmail", "quantity", "price", "sku", "vendor", "imageUrl"].includes(key) &&
      value &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      orderDetails.push(`<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value)).replace(/\n/g, "<br>")}</p>`);
    }
  }

  if (orderDetails.length > 0) {
    const orderDetailsSection = `
      <div class="order-details">
        <h2 style="color: #2c3e50; margin-top: 30px; margin-bottom: 20px;">Order Details</h2>
        ${orderDetails.join("")}
      </div>
    `;
    processedHtml = processedHtml.replace(
      /\{\{orderDetailsSection\}\}/g,
      orderDetailsSection,
    );
  } else {
    processedHtml = processedHtml.replace(/\{\{orderDetailsSection\}\}/g, "");
  }

  processedHtml = processedHtml.replace(
    /\{\{orderName\}\}/g,
    personalizationData.orderName || "",
  );

  return await generatePDFWithPuppeteer({
    htmlContent: processedHtml,
    imageUrl,
  });
}

async function generatePDFWithPuppeteer({ htmlContent, imageUrl }) {
  let browser;

  try {
    // Use local chromium in development, serverless chromium in production
    const isDev = process.env.NODE_ENV !== "production";
    
    browser = await puppeteer.launch({
      args: isDev ? [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: isDev 
        ? undefined // Use bundled Chromium in development
        : await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    await page.setContent(htmlContent, {
      waitUntil: ["networkidle0", "load"],
    });

    if (imageUrl) {
      try {
        await page.waitForSelector("img", { timeout: 5000 });

        await page.evaluate(() => {
          return Promise.all(
            Array.from(document.images).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                setTimeout(reject, 5000);
              });
            }),
          );
        });
      } catch (error) {
        console.warn(
          "Image loading timeout, continuing with PDF generation:",
          error,
        );
      }
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } catch (error) {
    console.error("Error generating PDF with Puppeteer:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
