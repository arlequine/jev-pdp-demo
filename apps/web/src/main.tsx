import { createRoot } from "react-dom/client";
import ProductPage from "./ProductPage";

const slug = window.location.pathname.split("/p/")[1] || "playera-basica";
createRoot(document.getElementById("root")!).render(<ProductPage slug={slug} />);
