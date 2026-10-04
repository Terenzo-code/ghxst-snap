// Thin convenience wrapper around the base-ui toast manager exported from
// "@/components/ui/toast". Keeps the familiar `useToast()` / `toast()` API
// that the rest of the app (forms, mutations) already calls into.
import * as React from "react";

import { toast as toastManager } from "@/components/ui/toast";

export type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: "success" | "info" | "warning" | "error" | "loading" | (string & {});
};

function toast(options: ToastOptions) {
  return toastManager.add(options);
}

function useToast() {
  return { toast };
}

export { useToast, toast };
