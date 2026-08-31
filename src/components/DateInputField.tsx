import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateToDDMMYYYY, convertDDMMYYYYToISO, isDateValid, isDateComplete } from '../utils/dateFormatter';

interface DateInputFieldProps {
  id?: string;
  value?: string | null;
  onChange: (formattedValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: string | null; // Supports DD-MM-YYYY or YYYY-MM-DD
  maxDate?: string | null; // Supports DD-MM-YYYY or YYYY-MM-DD
  hasError?: boolean;
  errorMessage?: string;
}

export const DateInputField: React.FC<DateInputFieldProps> = ({
  id,
  value = '',
  onChange,
  placeholder = 'DD-MM-YYYY',
  disabled = false,
  className = '',
  required = false,
  minDate,
  maxDate,
  hasError = false,
  errorMessage
}) => {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);
  const [localText, setLocalText] = useState<string>(() => formatDateToDDMMYYYY(value, ''));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Synchronize localText whenever external value prop updates
  useEffect(() => {
    const formatted = formatDateToDDMMYYYY(value, '');
    setLocalText(formatted);
    // If the new external value is complete and valid, clear local format error
    if (!formatted || isDateValid(formatted)) {
      setFormatError(null);
    }
  }, [value]);

  const isoValueForPicker = convertDDMMYYYYToISO(value) || '';
  const isoMin = minDate ? convertDDMMYYYYToISO(minDate) || undefined : undefined;
  const isoMax = maxDate ? convertDDMMYYYYToISO(maxDate) || undefined : undefined;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Filter to allow numbers, hyphens, and slashes
    input = input.replace(/[^\d\-/.]/g, '').replace(/[/.]/g, '-');

    const prevLength = localText.length;
    const digitsOnly = input.replace(/\D/g, '');

    let formatted = input;

    // If typing digits forward without dashes, assist with hyphen insertion
    if (input.length > prevLength && !input.includes('-') && digitsOnly.length >= 2) {
      if (digitsOnly.length === 2) {
        formatted = `${digitsOnly}-`;
      } else if (digitsOnly.length > 2 && digitsOnly.length <= 4) {
        formatted = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
      } else if (digitsOnly.length > 4 && digitsOnly.length <= 8) {
        formatted = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4, 8)}`;
      }
    } else if (input.length > prevLength && input.split('-').length === 2 && digitsOnly.length >= 4) {
      // Auto-insert second dash if user typed DD-MM
      const parts = input.split('-');
      if (parts[0].length === 2 && parts[1].length === 2 && !input.endsWith('-')) {
        formatted = `${parts[0]}-${parts[1]}-`;
      }
    }

    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    setLocalText(formatted);
    onChange(formatted);

    // Validation check ONLY after the whole date (10 characters: DD-MM-YYYY) has been typed
    if (formatted.length === 10) {
      if (isDateComplete(formatted) && !isDateValid(formatted)) {
        setFormatError('Invalid date. Use DD-MM-YYYY (e.g., 31-12-2025)');
      } else {
        setFormatError(null);
      }
    } else {
      // While actively typing less than 10 chars, clear format error
      setFormatError(null);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = localText.trim();
    if (!trimmed) {
      setFormatError(null);
      return;
    }

    // Check if user entered pure 8 digits (e.g., 15082026) on blur
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 8 && !trimmed.includes('-')) {
      const normalized = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4, 8)}`;
      setLocalText(normalized);
      onChange(normalized);
      if (!isDateValid(normalized)) {
        setFormatError('Invalid calendar date.');
      } else {
        setFormatError(null);
      }
      return;
    }

    // Validate completed date on blur
    if (trimmed.length > 0 && trimmed.length < 10) {
      setFormatError('Please enter full date in DD-MM-YYYY format');
    } else if (trimmed.length === 10) {
      if (!isDateValid(trimmed)) {
        setFormatError('Invalid calendar date.');
      } else {
        setFormatError(null);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawPickerVal = e.target.value; // YYYY-MM-DD
    if (rawPickerVal) {
      const ddmmyyyy = formatDateToDDMMYYYY(rawPickerVal, '');
      setLocalText(ddmmyyyy);
      setFormatError(null);
      onChange(ddmmyyyy);
    }
  };

  const openNativePicker = () => {
    if (disabled) return;
    if (hiddenDateInputRef.current) {
      try {
        if (typeof hiddenDateInputRef.current.showPicker === 'function') {
          hiddenDateInputRef.current.showPicker();
        } else {
          hiddenDateInputRef.current.click();
        }
      } catch (err) {
        hiddenDateInputRef.current.click();
      }
    }
  };

  const effectiveError = formatError || (hasError ? errorMessage : null);
  const showError = Boolean(effectiveError && (!isFocused || localText.length === 10));

  return (
    <div className="w-full space-y-1">
      <div className="relative flex items-center w-full">
        <input
          id={id}
          type="text"
          value={localText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={10}
          autoComplete="off"
          spellCheck={false}
          className={`w-full bg-[#181b22] border ${
            showError ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-700 focus:border-indigo-500'
          } rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 outline-none text-xs pr-9 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        />

        {/* Hidden native date picker with min/max bounds */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={isoValueForPicker}
          min={isoMin}
          max={isoMax}
          onChange={handlePickerChange}
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          className="absolute right-0 top-0 bottom-0 opacity-0 pointer-events-none w-8 h-full"
        />

        {/* Calendar Icon Button */}
        <button
          type="button"
          onClick={openNativePicker}
          disabled={disabled}
          className="absolute right-2 text-slate-400 hover:text-indigo-400 disabled:opacity-40 transition-colors p-1 cursor-pointer"
          title="Open Calendar (DD-MM-YYYY)"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {showError && (
        <p className="text-[10px] text-rose-400 font-medium flex items-center space-x-1 animate-fadeIn">
          <span>⚠️ {effectiveError}</span>
        </p>
      )}
    </div>
  );
};
export default DateInputField;
