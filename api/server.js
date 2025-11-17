// Vercel serverless function wrapper for React Router
// This file is required for Vercel to properly serve your React Router app

import { createRequestHandler } from "@react-router/node";
import * as build from "../build/server/index.js";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

export default handler;

