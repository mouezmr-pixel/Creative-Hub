import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ClientPortal() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/client-portal/projects", { replace: true });
  }, [setLocation]);

  return null;
}
