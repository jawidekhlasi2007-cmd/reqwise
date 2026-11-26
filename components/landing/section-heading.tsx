export function SectionHeading({ id, title, intro }: { id?: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="scroll-mt-24 text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[2.2rem]">
        {title}
      </h2>
      {intro ? <p className="mt-3 text-base leading-relaxed text-fg-muted">{intro}</p> : null}
    </div>
  );
}
