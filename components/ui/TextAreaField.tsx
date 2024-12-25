import React from 'react';

type TextAreaFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: boolean;
  placeholder?: string;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ label, name, value, onChange, error, placeholder }) => {

  return (
    <label className="form-control">
      <div className="label">
        <span className="label-text text-secondary text-base">{label}</span>
      </div>
      <textarea
        name={name}
        className={`textarea h-24 placeholder-secondary text-sm ${
          error ? 'border-2 border-red-500' : ''
        }`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      ></textarea>
      {error && <p className="text-red-500 text-sm mt-1">This field is required</p>}
    </label>
  );
}

export default TextAreaField;