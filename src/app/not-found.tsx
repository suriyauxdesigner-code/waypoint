import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Off the map</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">This page doesn’t exist. Your trip is still where you left it.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
        Back to Today
      </Link>
    </div>
  );
}
