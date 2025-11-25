/**
 * Storage Service for PDFs and images
 * Can use local file system, S3, Cloudflare R2, or other storage
 */

/**
 * Stores PDF file and returns public URL
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Filename for storage
 * @param {string} shop - Shop domain
 * @returns {Promise<{url: string, key: string}>}
 */
export async function storePDF(pdfBuffer, filename, shop) {
  const storageType = process.env.STORAGE_TYPE || "local"; // "local", "s3", "cloudflare-r2"

  switch (storageType) {
    case "s3":
      return await storeInS3(pdfBuffer, filename, shop);
    case "cloudflare-r2":
      return await storeInCloudflareR2(pdfBuffer, filename, shop);
    default:
      return await storeLocally(pdfBuffer, filename, shop);
  }
}

/**
 * Stores PDF locally in public directory
 */
async function storeLocally(pdfBuffer, filename, shop) {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  // Create storage directory if it doesn't exist
  const storageDir = path.join(process.cwd(), "public", "pdfs", shop);
  await fs.mkdir(storageDir, { recursive: true });

  // Save file
  const filePath = path.join(storageDir, filename);
  await fs.writeFile(filePath, pdfBuffer);

  // Return public URL
  const publicUrl = `/pdfs/${shop}/${filename}`;
  
  return {
    url: publicUrl,
    key: filePath,
  };
}

/**
 * Stores PDF in AWS S3
 */
async function storeInS3(pdfBuffer, filename, shop) {
  // Requires: npm install @aws-sdk/client-s3
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const bucketName = process.env.AWS_S3_BUCKET;
  const key = `pdfs/${shop}/${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      ACL: "public-read",
    })
  );

  const url = `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
  
  return { url, key };
}

/**
 * Stores PDF in Cloudflare R2
 */
async function storeInCloudflareR2(pdfBuffer, filename, shop) {
  // Similar to S3 but using Cloudflare R2
  // Implementation similar to S3
  throw new Error("Cloudflare R2 storage not yet implemented");
}

/**
 * Stores uploaded image
 */
export async function storeImage(imageUrl, filename, shop) {
  // Download image from Shopify CDN and store it
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  
  // Store similar to PDF
  const storageType = process.env.STORAGE_TYPE || "local";
  
  if (storageType === "local") {
    const fs = await import("fs/promises");
    const path = await import("path");
    
    const storageDir = path.join(process.cwd(), "public", "images", shop);
    await fs.mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, filename);
    await fs.writeFile(filePath, imageBuffer);

    return {
      url: `/images/${shop}/${filename}`,
      key: filePath,
    };
  }

  // For cloud storage, implement similar to PDF storage
  return await storePDF(imageBuffer, filename, shop);
}

