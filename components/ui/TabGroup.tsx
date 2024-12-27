const TabGroup = ({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  label: string
}) => (
  <div className="mb-4">
    <span className="label-text text-secondary text-base">{label}</span>
    <div role="tablist" className="tabs tabs-boxed justify-start gap-2 max-w-fit">
      {options.map((option) => (
        <button
          key={option}
          role="tab"
          type="button"
          className={`tab bg-info ${value === option ? 'tab-active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  </div>
)

export default TabGroup
