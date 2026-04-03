import { useId, useRef, KeyboardEvent } from "react";

const TabGroup = ({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) => {
  const id = useId();
  const labelId = `${id}-label`;
  const panelId = `${id}-panel`;
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = options.indexOf(value);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const count = options.length;
    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (activeIndex + 1) % count;
        break;
      case "ArrowLeft":
        nextIndex = (activeIndex - 1 + count) % count;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = count - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    onChange(options[nextIndex]);
    tabsRef.current[nextIndex]?.focus();
  };

  return (
    <div className="mb-4">
      <span id={labelId} className="label-text text-secondary text-base">
        {label}
      </span>
      <div
        role="tablist"
        aria-labelledby={labelId}
        className="tabs tabs-boxed justify-start gap-2 max-w-fit"
      >
        {options.map((option, index) => (
          <button
            key={option}
            ref={(el) => {
              tabsRef.current[index] = el;
            }}
            role="tab"
            type="button"
            id={`${id}-tab-${option}`}
            aria-selected={value === option}
            aria-controls={panelId}
            tabIndex={value === option ? 0 : -1}
            className={`tab bg-info ${value === option ? "tab-active" : ""}`}
            onClick={() => onChange(option)}
            onKeyDown={handleKeyDown}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${value}`}
        tabIndex={-1}
        className="sr-only"
      >
        {value.charAt(0).toUpperCase() + value.slice(1)} selected
      </div>
    </div>
  );
};

export default TabGroup;
