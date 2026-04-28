interface SignalRibbonProps {
  items: string[];
}

export default function SignalRibbon({ items }: SignalRibbonProps) {
  return (
    <div className="signal-ribbon" aria-label="Launch signals">
      <div className="signal-track">
        {items.map((item) => (
          <span key={item} className="signal-pill">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
