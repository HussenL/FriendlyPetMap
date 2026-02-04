import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { MapPage } from "../modules/map/MapPage";
import { CallbackPage } from "../modules/auth/CallbackPage";

export const router = createBrowserRouter([
  { path: "/", element: <MapPage /> },
  { path: "/auth/callback", element: <CallbackPage /> },
]);
