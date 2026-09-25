import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e5 embedder runs on onnxruntime's native binding, which must be
  // required from node_modules at runtime rather than bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
