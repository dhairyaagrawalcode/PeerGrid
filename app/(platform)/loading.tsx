export default function PlatformLoading() {
  return (
    <div className="space-y-4" aria-label="Loading">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-white/5" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-white/5" />
      {[1, 2, 3].map((item) => (
        <div
          className="surface h-44 animate-pulse !bg-white/[0.025]"
          key={item}
        />
      ))}
    </div>
  );
}
