"use client";

import * as React from "react";

export function Avatar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative flex shrink-0 overflow-hidden rounded-full bg-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function AvatarImage({
  src,
  alt,
}: {
  src?: string | null;
  alt?: string;
}) {
  const [error, setError] = React.useState(false);

  if (!src || error) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      className="aspect-square h-full w-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export function AvatarFallback({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full w-full items-center justify-center font-medium ${className}`}>
      {children}
    </div>
  );
}
