// Vercel serverless function wrapper for React Router
// This file is required for Vercel to properly serve your React Router app

import pkg from "@react-router/node";
const { createRequestHandler } = pkg;
import * as build from "../build/server/index.js";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

export default handler;
