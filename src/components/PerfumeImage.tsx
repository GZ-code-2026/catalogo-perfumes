"use client";

import Image from "next/image";
import { useState } from "react";
import { BottlePlaceholder } from "./BottlePlaceholder";

type PerfumeImageProps = {
  src: string | null;
  alt: string;
  family?: string;
  size: "card" | "hero";
};

// Foto do frasco (webp sem fundo) flutuando sobre a página.
// Sem foto, ou se ela falhar ao carregar, mostra o frasco ilustrado.
export function PerfumeImage({ src, alt, family, size }: PerfumeImageProps) {
  const [falhou, setFalhou] = useState(false);

  const altura = size === "hero" ? "h-80 sm:h-[26rem]" : "h-48";
  const sizes = size === "hero" ? "(min-width: 640px) 420px, 80vw" : "(min-width: 640px) 240px, 45vw";

  if (!src || falhou) {
    return (
      <div className={`relative w-full ${altura}`}>
        <BottlePlaceholder family={family} label={alt} />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${altura}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain"
        priority={size === "hero"}
        onError={() => setFalhou(true)}
      />
    </div>
  );
}
