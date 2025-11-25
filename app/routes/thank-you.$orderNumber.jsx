import { useLoaderData, Link } from "react-router";
import db from "../db.server";

/**
 * Thank-you page route
 * Shows download links for all PDFs in an order
 * Accessible via: /thank-you/{orderNumber}
 */
export async function loader({ params }) {
  const { orderNumber } = params;

  if (!orderNumber) {
    throw new Response("Order number required", { status: 400 });
  }

  // Find all PDFs for this order
  const pdfs = await db.generatedPdf.findMany({
    where: {
      orderNumber: orderNumber,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    orderNumber,
    pdfs: pdfs.map((pdf) => ({
      id: pdf.id,
      productTitle: pdf.productTitle,
      downloadUrl: `/download/${pdf.downloadToken}`,
      createdAt: pdf.createdAt,
    })),
  };
}

export default function ThankYouPage() {
  const { orderNumber, pdfs } = useLoaderData();

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "40px 20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ 
        textAlign: "center", 
        color: "#2c3e50",
        marginBottom: "30px"
      }}>
        Thank You for Your Order!
      </h1>
      
      <div style={{
        background: "#f8f9fa",
        padding: "30px",
        borderRadius: "8px",
        marginBottom: "30px"
      }}>
        <p style={{ fontSize: "18px", marginBottom: "10px" }}>
          <strong>Order Number:</strong> {orderNumber}
        </p>
        <p style={{ color: "#7f8c8d" }}>
          Your personalized letters are ready for download!
        </p>
      </div>

      {pdfs.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px",
          background: "#fff3cd",
          borderRadius: "8px",
          color: "#856404"
        }}>
          <p>No PDFs found for this order. Please contact support if you believe this is an error.</p>
        </div>
      ) : (
        <div>
          <h2 style={{ 
            fontSize: "24px", 
            marginBottom: "20px",
            color: "#2c3e50"
          }}>
            Your Downloads ({pdfs.length})
          </h2>
          
          {pdfs.map((pdf) => (
            <div 
              key={pdf.id}
              style={{
                background: "white",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ 
                  margin: "0 0 10px 0",
                  color: "#2c3e50"
                }}>
                  {pdf.productTitle}
                </h3>
                <p style={{ 
                  margin: 0,
                  color: "#7f8c8d",
                  fontSize: "14px"
                }}>
                  Generated on {new Date(pdf.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <a
                href={pdf.downloadUrl}
                download
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  background: "#d4af37",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  transition: "background 0.3s"
                }}
                onMouseOver={(e) => e.target.style.background = "#b8941f"}
                onMouseOut={(e) => e.target.style.background = "#d4af37"}
              >
                Download PDF
              </a>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: "40px",
        padding: "20px",
        background: "#e9ecef",
        borderRadius: "8px",
        textAlign: "center"
      }}>
        <p style={{ margin: "0 0 10px 0", color: "#495057" }}>
          Need help? Contact us at{" "}
          <a 
            href="mailto:support@thebestletters.com"
            style={{ color: "#007bff" }}
          >
            support@thebestletters.com
          </a>
        </p>
        <p style={{ margin: 0, fontSize: "14px", color: "#6c757d" }}>
          Download links will remain active for your convenience.
        </p>
      </div>
    </div>
  );
}

