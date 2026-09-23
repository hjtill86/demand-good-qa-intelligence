import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link className={`brand-logo ${className}`.trim()} href="/" aria-label="Demand Good QA home">
      <Image src="/demand-good-qa-logo.png" alt="Demand Good QA" width={190} height={96} priority />
    </Link>
  );
}
