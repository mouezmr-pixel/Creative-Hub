import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CelebrityPortal() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/celebrity-portal/offers");
  }, [setLocation]);

  return null;
}
