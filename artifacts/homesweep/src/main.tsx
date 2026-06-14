import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production, VITE_API_URL points to the Railway/Render API server.
// In local dev, leaving it empty lets the browser use relative paths (Vite proxy).
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) setBaseUrl(apiUrl);

createRoot(document.getElementById("root")!).render(<App />);
