export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="scroll-mt-4">
      <h2 className="font-display text-3xl">{children}</h2>
      <div className="rule mt-2" />
    </div>
  );
}
