import React, { useState } from "react";
import { getInitials, getColorFromName, getBgFromName } from "@/lib/utils";

interface CelebrityAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
  full: "w-full aspect-square text-3xl",
};

export function CelebrityAvatar({ name, image, size = "md", className = "" }: CelebrityAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(name);
  const color = getColorFromName(name);
  const bg = getBgFromName(name);

  if (image && !imgFailed) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeMap[size]} object-cover rounded-lg ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-lg flex items-center justify-center font-semibold ${className}`}
      style={{ color, background: bg }}
      title={name}
    >
      {initials}
    </div>
  );
}