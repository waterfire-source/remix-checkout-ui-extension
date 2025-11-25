import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPDFs();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  async function loadPDFs() {
    try {
      setError(null);

      let orderId = null;
      let orderNumber = null;

      try {
        const orderConf = shopify["orderConfirmation"];
        if (
          orderConf &&
          typeof orderConf === "object" &&
          "value" in orderConf
        ) {
          const orderData = orderConf.value;
          if (orderData && typeof orderData === "object") {
            if (
              "order" in orderData &&
              orderData.order &&
              typeof orderData.order === "object"
            ) {
              const order = orderData.order;
              if ("id" in order && order.id) {
                orderId = String(order.id);
              }
            }

            if ("number" in orderData && orderData.number) {
              orderNumber = String(orderData.number).trim();
            }
          }
        }
      } catch (e) {}

      if (!orderNumber) {
        try {
          const query = `
            query {
              orderConfirmation {
                number
              }
            }
          `;

          const result = await shopify.query(query);
          if (
            result?.data &&
            typeof result.data === "object" &&
            result.data !== null
          ) {
            const data = result.data;
            if (
              "orderConfirmation" in data &&
              data.orderConfirmation &&
              typeof data.orderConfirmation === "object"
            ) {
              const orderConf = data.orderConfirmation;
              if ("number" in orderConf && orderConf.number) {
                orderNumber = String(orderConf.number);
              }
            }
          }
        } catch (queryError) {}
      }

      if (!orderNumber && typeof window !== "undefined") {
        const url = window.location.href;
        const patterns = [
          /order[_-]?number[=:](\d+)/i,
          /order[=:](\d+)/i,
          /\/orders\/(\d+)/i,
          /orderNumber=(\d+)/i,
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            orderNumber = match[1];
            break;
          }
        }
      }

      if (!orderNumber && !orderId) {
        setTimeout(() => {
          if (pdfs.length === 0) {
            loadPDFs();
          }
        }, 2000);
        return;
      }

      const appUrl =
        "https://thus-ave-bend-brands.trycloudflare.com";

      const identifier = orderNumber || orderId;
      let apiUrl = `${appUrl}/api/pdfs/${encodeURIComponent(identifier)}`;

      if (orderId && orderNumber) {
        const numericOrderId = orderId.includes("/")
          ? orderId.split("/").pop()
          : orderId;
        apiUrl += `?orderId=${encodeURIComponent(numericOrderId)}`;
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setTimeout(() => {
            if (pdfs.length === 0) {
              loadPDFs();
            }
          }, 3000);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch PDFs: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.pdfs && data.pdfs.length > 0) {
        setPdfs(data.pdfs);
        setLoading(false);
      } else {
        setTimeout(() => {
          if (pdfs.length === 0) {
            loadPDFs();
          }
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (error || pdfs.length === 0) {
    return null;
  }

  const pdf = pdfs[0];
  if (!pdf) {
    return null;
  }

  return (
    <s-banner heading="Your Personalized Letters Are Ready!" tone="success">
      <s-stack gap="base">
        <s-link href={pdf.downloadUrl}>Download PDF</s-link>
      </s-stack>
    </s-banner>
  );
}
