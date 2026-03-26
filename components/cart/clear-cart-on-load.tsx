"use client";

import { useEffect } from "react";

export function ClearCartOnLoad() {
  useEffect(() => {
    void fetch("/api/cart/clear", {
      method: "POST"
    });
  }, []);

  return null;
}
