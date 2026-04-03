"use client";

import Image from "next/image";
import film from "@/public/film.png";
import { usePathname } from "next/navigation";

const Logo = () => {
  const pathname = usePathname();
  if (pathname === "/recommendations") return null;
  return (
    <Image
      src={film}
      width={99}
      alt="App logo representing a film"
      className="mx-auto h-auto"
      loading="eager"
    />
  );
};

export default Logo;
