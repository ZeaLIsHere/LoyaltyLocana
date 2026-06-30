import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles redirecting authenticated users to their dashboard.
  // Unauthenticated users visiting / will be redirected to /login by middleware.
  // This page serves as a fallback.
  redirect("/login");
}
