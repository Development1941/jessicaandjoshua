"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { initWeddingSite } from "@/lib/wedding-runtime";
import "react-toastify/dist/ReactToastify.css";

export default function WeddingRuntime() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    return initWeddingSite();
  }, [ready]);

  if (!ready) return null;

  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="light"
    />
  );
}
