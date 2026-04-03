import { useId } from "react";

type TextAreaFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: boolean;
  placeholder?: string;
};

const TextAreaField = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
}: TextAreaFieldProps) => {
  const id = useId();
  const textareaId = `${id}-textarea`;
  const errorId = `${id}-error`;

  return (
    <label htmlFor={textareaId} className="form-control">
      <div className="label">
        <span className="label-text text-secondary text-base">{label}</span>
      </div>
      <textarea
        id={textareaId}
        name={name}
        className={`textarea h-24 placeholder-secondary text-sm bg-info ${
          error ? "border-2 border-red-500" : ""
        }`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={error || undefined}
        aria-describedby={error ? errorId : undefined}
      ></textarea>
      {error && (
        <p id={errorId} role="alert" className="text-red-500 text-sm mt-1">
          This field is required
        </p>
      )}
    </label>
  );
};

export default TextAreaField;
