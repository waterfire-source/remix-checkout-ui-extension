/**
 * Service to extract order data from Shopify orders
 */

/**
 * Extracts order data from line items
 * @param {Array} lineItems - Order line items from Shopify webhook
 * @returns {Array} Array of processed line items with order data
 */
export function extractOrderData(lineItems) {
  const processedItems = [];

  for (const item of lineItems) {
    const properties = item.properties || [];
    const orderData = {
      productTitle: item.title,
      productId: item.product_id?.toString(),
      variantId: item.variant_id?.toString(),
      lineItemId: item.id?.toString(),
      quantity: item.quantity,
      price: item.price,
      sku: item.sku || null,
      vendor: item.vendor || null,
      // Extract all properties
      properties: {},
      // Extract text fields from properties
      textFields: {},
      // Extract image URLs from properties
      imageUrls: [],
    };

    // Parse properties to extract data
    for (const prop of properties) {
      const name = prop.name || "";
      const value = prop.value || "";

      // Store all properties
      orderData.properties[name] = value;

      // Extract text fields (any property that looks like text)
      if (value && typeof value === "string" && value.length > 0 && !value.startsWith("http") && !value.startsWith("@http")) {
        orderData.textFields[name] = value;
      }

      // Extract image URLs (any property with a URL)
      if (value && typeof value === "string") {
        const imageUrl = extractImageUrl(value);
        if (imageUrl) {
          orderData.imageUrls.push(imageUrl);
        }
      }
    }

    processedItems.push(orderData);
  }

  return processedItems;
}

/**
 * Extracts image URL from property value
 * @param {string} value - Property value
 * @returns {string|null} Extracted URL or null
 */
function extractImageUrl(value) {
  if (!value) return null;

  // Remove @ prefix if present
  const url = value.startsWith("@") ? value.substring(1) : value;

  // Validate it's a URL
  try {
    const urlObj = new URL(url);
    // Check if it's an image URL
    if (urlObj.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Gets the first image URL from order data
 * @param {Object} orderData - Order data object
 * @returns {string|null} First image URL
 */
export function getImageUrl(orderData) {
  return orderData.imageUrls && orderData.imageUrls.length > 0 
    ? orderData.imageUrls[0] 
    : null;
}


