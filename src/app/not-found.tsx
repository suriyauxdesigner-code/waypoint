import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-medium text-accent-foreground">404</p>
      <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Off the map</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">This page doesn’t exist. Your trip is still where you left it.</p>
      <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground">
        Back to Today
      </Link>
    </div>
  );
}
