// import { createBrowserRouter } from "react-router-dom";
// import { MapPage } from "../modules/map/MapPage";
// import { CallbackPage } from "../modules/auth/CallbackPage";

// export const router = createBrowserRouter([
//   { path: "/", element: <MapPage /> },
//   { path: "/auth/callback", element: <CallbackPage /> },
// ]);


import { createBrowserRouter } from "react-router-dom";
import { MapPage } from "../modules/map/MapPage";
import { CallbackPage } from "../modules/auth/CallbackPage";
import { AppShell } from "./AppShell";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <AppShell>
          <MapPage />
        </AppShell>
      ),
    },
    {
      path: "/auth/callback",
      element: (
        <AppShell>
          <CallbackPage />
        </AppShell>
      ),
    },
  ],
  { basename: "/fpm" }
);
