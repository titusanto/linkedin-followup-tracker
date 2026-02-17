import Image from "next/image";
import { getInitials, cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <div className={cn("relative rounded-full overflow-hidden flex-shrink-0", sizeClass, className)}>
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes="56px"
          unoptimized // LinkedIn images may not work with Next.js optimization
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center flex-shrink-0",
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
