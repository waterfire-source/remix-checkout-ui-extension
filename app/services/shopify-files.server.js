import shopify from "../shopify.server.js";

/**
 * Uploads a PDF to Shopify's file storage using the Admin API
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} fileName - The file name for the PDF
 * @param {Object} session - Shopify session object
 * @returns {Promise<string>} The Shopify file URL
 */
export async function uploadPdfToShopify(pdfBuffer, fileName, session) {
  const client = new shopify.clients.Graphql({ session });

  const base64 = pdfBuffer.toString("base64");

  const mutation = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          ... on GenericFile {
            url
            mimeType
          }
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  try {
    const response = await client.request(mutation, {
      variables: {
        files: [
          {
            originalSource: `data:application/pdf;base64,${base64}`,
            filename: fileName,
          },
        ],
      },
    });

    if (response.data.fileCreate.userErrors.length > 0) {
      throw new Error(
        `Shopify file upload error: ${JSON.stringify(
          response.data.fileCreate.userErrors
        )}`
      );
    }

    const file = response.data.fileCreate.files[0];
    return file.url;
  } catch (error) {
    console.error("Error uploading to Shopify:", error);
    throw error;
  }
}

