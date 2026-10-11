import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { bootstrap } from "./app/bootstrap";
import { AppContext } from "./app/context";
import "./styles/index.css";

const value = bootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContext.Provider value={value}>
      <App />
    </AppContext.Provider>
  </StrictMode>,
);
