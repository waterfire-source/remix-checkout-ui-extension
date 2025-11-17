import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const appUrl = "https://summit-legendary-chem-curtis.trycloudflare.com";

  useEffect(() => {
    const fetchPdfUrl = async (retryCount = 0) => {
      try {
        const orderConfirmation = shopify.orderConfirmation.value;

        if (
          !orderConfirmation ||
          !orderConfirmation.order ||
          !orderConfirmation.order.id
        ) {
          console.log("[Extension] No order confirmation found");
          setLoading(false);
          return;
        }

        const orderIdentityGid = orderConfirmation.order.id;
        console.log("[Extension] OrderIdentity GID:", orderIdentityGid);

        let orderId = null;
        if (orderIdentityGid && typeof orderIdentityGid === "string") {
          const parts = orderIdentityGid.split("/");
          orderId = parts[parts.length - 1];
          console.log("[Extension] Extracted orderId:", orderId);
        }

        if (!orderId) {
          console.error(
            "[Extension] Could not extract order ID from:",
            orderIdentityGid,
            "Full orderConfirmation:",
            orderConfirmation,
          );
          setLoading(false);
          return;
        }

        console.log(
          `[Extension] Fetching PDF for orderId: ${orderId}, attempt: ${retryCount + 1}`,
        );

        const shopDomain = shopify.shop?.myshopifyDomain || "";

        const apiUrl = `${appUrl}/api/order-pdf?orderId=${orderId}${shopDomain ? `&shop=${shopDomain}` : ""}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[Extension] PDF URL received:", data.pdfUrl);
          setPdfUrl(data.pdfUrl);

          const downloadEndpointUrl = `${appUrl}/api/download-pdf?orderId=${orderId}${shopDomain ? `&shop=${shopDomain}` : ""}`;
          setDownloadUrl(downloadEndpointUrl);

          setLoading(false);
        } else if (response.status === 404 && retryCount < 3) {
          console.log(
            `[Extension] PDF not ready yet, retrying in 2 seconds... (attempt ${retryCount + 1}/3)`,
          );
          setTimeout(() => {
            fetchPdfUrl(retryCount + 1);
          }, 2000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            "[Extension] Failed to fetch PDF:",
            response.status,
            errorData,
          );
          setError(
            "PDF is being generated. Please refresh the page in a few moments.",
          );
          setLoading(false);
        }
      } catch (err) {
        console.error("[Extension] Error fetching PDF:", err);
        setError("Unable to load PDF. Please try refreshing the page.");
        setLoading(false);
      }
    };

    fetchPdfUrl();
  }, []);

  if (loading) {
    return (
      <s-banner heading="Order PDF">
        <s-text>Generating your order PDF... Please wait.</s-text>
      </s-banner>
    );
  }

  if (error) {
    return (
      <s-banner heading="Order PDF" tone="info">
        <s-text>{error}</s-text>
      </s-banner>
    );
  }

  if (!pdfUrl) {
    return null;
  }

  const handleDownload = () => {
    if (!downloadUrl) {
      console.error("[Extension] No download URL available");
      return;
    }

    try {
      const newWindow = window.open(downloadUrl, "_blank");

      if (!newWindow) {
        setError(
          `Popup blocked. Please copy this URL and open it in a new tab:\n\n${downloadUrl}`,
        );
      } else {
        console.log("[Extension] Download URL opened in new window");
      }
    } catch (err) {
      console.error("[Extension] Error opening download URL:", err);
      setError(
        `Please copy this URL and open it in a new tab to download:\n\n${downloadUrl}`,
      );
    }
  };

  return (
    <s-banner heading="Download Your Order Receipt" tone="success">
      <s-stack gap="base">
        <s-text>Your order receipt is ready for download.</s-text>
        <s-button variant="primary" onClick={handleDownload}>
          Download PDF Receipt
        </s-button>
      </s-stack>
    </s-banner>
  );
}
