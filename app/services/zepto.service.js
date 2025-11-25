/**
 * Service to extract and parse Zepto Product Customizer data from Shopify order line items
 */

/**
 * Extracts Zepto personalization data from line item properties
 * @param {Array} lineItems - Order line items from Shopify webhook
 * @returns {Array} Array of processed line items with Zepto data
 */
export function extractZeptoData(lineItems) {
  const processedItems = [];

  for (const item of lineItems) {
    const properties = item.properties || [];
    const zeptoData = {
      productTitle: item.title,
      productId: item.product_id?.toString(),
      variantId: item.variant_id?.toString(),
      lineItemId: item.id?.toString(),
      quantity: item.quantity,
      price: item.price,
      // Extract personalization fields
      singleLineText: null,
      multiLineText: null,
      previewImageUrl: null,
      uploadImageUrl: null,
      rawProperties: {},
    };

    // Parse properties to extract Zepto fields
    for (const prop of properties) {
      const name = prop.name || "";
      const value = prop.value || "";

      // Store all properties in raw format
      zeptoData.rawProperties[name] = value;

      // Extract specific Zepto fields
      if (name.toLowerCase().includes("single line text") || name === "Single Line Text:") {
        zeptoData.singleLineText = value;
      } else if (name.toLowerCase().includes("multi line text") || name === "Multi Line Text:") {
        zeptoData.multiLineText = value;
      } else if (name === "Preview:" || name.toLowerCase().includes("preview")) {
        // Extract URL from value (format: @https://...)
        zeptoData.previewImageUrl = extractImageUrl(value);
      } else if (name === "Upload:" || name.toLowerCase().includes("upload")) {
        // Extract URL from value (format: @https://...)
        zeptoData.uploadImageUrl = extractImageUrl(value);
      }
    }

    // Check if this is a digital tier product (Red Tier)
    const isDigitalTier = item.title?.toLowerCase().includes("red tier") || 
                         item.title?.toLowerCase().includes("digital");

    if (isDigitalTier || zeptoData.singleLineText || zeptoData.multiLineText) {
      zeptoData.isDigitalTier = true;
      processedItems.push(zeptoData);
    }
  }

  return processedItems;
}

/**
 * Extracts image URL from Zepto property value
 * Zepto stores images as "@https://cdn.shopify.com/..."
 * @param {string} value - Property value
 * @returns {string|null} Extracted URL or null
 */
function extractImageUrl(value) {
  if (!value) return null;

  // Remove @ prefix if present
  const url = value.startsWith("@") ? value.substring(1) : value;

  // Validate it's a URL
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Gets the high-quality image URL (prefers Upload over Preview)
 * @param {Object} zeptoData - Zepto data object
 * @returns {string|null} Best quality image URL
 */
export function getHighQualityImageUrl(zeptoData) {
  return zeptoData.uploadImageUrl || zeptoData.previewImageUrl || null;
}

