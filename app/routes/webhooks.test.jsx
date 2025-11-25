// Test endpoint to verify webhook routes are accessible
export const loader = async ({ request }) => {
  return Response.json({ 
    message: "Webhook test endpoint is working",
    timestamp: new Date().toISOString(),
    url: request.url
  });
};


