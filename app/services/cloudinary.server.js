/**
 * Uploads a PDF buffer to Cloudinary
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} fileName - The file name for the PDF
 * @returns {Promise<string>} The Cloudinary URL of the uploaded file
 */
export async function uploadPdfToCloudinary(pdfBuffer, fileName) {
  let cloudinary;
  try {
    const cloudinaryModule = await import("cloudinary");
    cloudinary = cloudinaryModule.v2;
  } catch (error) {
    throw new Error("Cloudinary is not installed. Run: npm install cloudinary");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "order-pdfs",
        public_id: fileName.replace(".pdf", ""),
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      },
    );

    uploadStream.end(pdfBuffer);
  });
}
