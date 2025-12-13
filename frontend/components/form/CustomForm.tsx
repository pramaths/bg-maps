'use client';

import { useState, useEffect } from 'react';
import { RJSFSchema } from '@rjsf/utils';

interface CustomFormProps {
  jsonSchema: RJSFSchema;
  uiSchema?: any;
  onSubmit: (data: any) => void;
}

export default function CustomForm({ jsonSchema, uiSchema, onSubmit }: CustomFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize form data with defaults
    const initialData = {};
    if (jsonSchema?.properties) {
      Object.keys(jsonSchema.properties).forEach(key => {
        const prop = jsonSchema.properties[key];
        if (prop.default !== undefined) {
          initialData[key] = prop.default;
        }
      });
    }
    setFormData(initialData);
  }, [jsonSchema]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const required = jsonSchema.required || [];
    
    required.forEach(fieldName => {
      if (!formData[fieldName] || formData[fieldName] === '') {
        newErrors[fieldName] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Smooth animation before submit
    await new Promise(resolve => setTimeout(resolve, 300));
    
    onSubmit({ formData });
    setIsSubmitting(false);
  };

  const renderField = (fieldName: string, fieldSchema: any) => {
    const fieldType = fieldSchema.type;
    const fieldTitle = fieldSchema.title || fieldName;
    const fieldDescription = fieldSchema.description;
    const isRequired = jsonSchema.required?.includes(fieldName);
    const hasError = errors[fieldName];

    const baseInputClasses = `
      w-full px-4 py-3 rounded-xl border-2 transition-all duration-300
      bg-white/90 backdrop-blur-sm
      focus:outline-none focus:ring-4 focus:ring-purple-500/20
      ${hasError 
        ? 'border-red-400 focus:border-red-500' 
        : 'border-gray-200 focus:border-purple-500'
      }
      placeholder:text-gray-400
      hover:border-purple-300
      text-gray-900
    `;

    const labelClasses = `
      block text-sm font-semibold text-gray-700 mb-2
      ${hasError ? 'text-red-600' : ''}
    `;

    switch (fieldType) {
      case 'string':
        if (fieldSchema.enum) {
          // Select dropdown
          return (
            <div key={fieldName} className="form-field-wrapper animate-fade-in" style={{ animationDelay: `${Object.keys(jsonSchema.properties).indexOf(fieldName) * 50}ms` }}>
              <label htmlFor={fieldName} className={labelClasses}>
                {fieldTitle}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldDescription && (
                <p className="text-xs text-gray-500 mb-2 italic">{fieldDescription}</p>
              )}
              <select
                id={fieldName}
                value={formData[fieldName] || ''}
                onChange={(e) => handleChange(fieldName, e.target.value)}
                className={baseInputClasses}
              >
                <option value="">Select an option...</option>
                {fieldSchema.enum.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {hasError && (
                <p className="text-red-500 text-xs mt-1 animate-shake">{errors[fieldName]}</p>
              )}
            </div>
          );
        }
        // Text input
        return (
          <div key={fieldName} className="form-field-wrapper animate-fade-in" style={{ animationDelay: `${Object.keys(jsonSchema.properties).indexOf(fieldName) * 50}ms` }}>
            <label htmlFor={fieldName} className={labelClasses}>
              {fieldTitle}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {fieldDescription && (
              <p className="text-xs text-gray-500 mb-2 italic">{fieldDescription}</p>
            )}
            <input
              type="text"
              id={fieldName}
              value={formData[fieldName] || ''}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              placeholder={`Enter ${fieldTitle.toLowerCase()}...`}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-red-500 text-xs mt-1 animate-shake">{errors[fieldName]}</p>
            )}
          </div>
        );

      case 'number':
      case 'integer':
        return (
          <div key={fieldName} className="form-field-wrapper animate-fade-in" style={{ animationDelay: `${Object.keys(jsonSchema.properties).indexOf(fieldName) * 50}ms` }}>
            <label htmlFor={fieldName} className={labelClasses}>
              {fieldTitle}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {fieldDescription && (
              <p className="text-xs text-gray-500 mb-2 italic">{fieldDescription}</p>
            )}
            <input
              type="number"
              id={fieldName}
              value={formData[fieldName] || ''}
              onChange={(e) => handleChange(fieldName, parseFloat(e.target.value) || '')}
              placeholder={`Enter ${fieldTitle.toLowerCase()}...`}
              className={baseInputClasses}
              min={fieldSchema.minimum}
              max={fieldSchema.maximum}
            />
            {hasError && (
              <p className="text-red-500 text-xs mt-1 animate-shake">{errors[fieldName]}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className="form-field-wrapper animate-fade-in" style={{ animationDelay: `${Object.keys(jsonSchema.properties).indexOf(fieldName) * 50}ms` }}>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  id={fieldName}
                  checked={formData[fieldName] || false}
                  onChange={(e) => handleChange(fieldName, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-purple-600 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-300 peer-checked:translate-x-5"></div>
              </div>
              <div>
                <span className={labelClasses.replace('block', 'inline')}>
                  {fieldTitle}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </span>
                {fieldDescription && (
                  <p className="text-xs text-gray-500 italic">{fieldDescription}</p>
                )}
              </div>
            </label>
            {hasError && (
              <p className="text-red-500 text-xs mt-1 animate-shake">{errors[fieldName]}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={fieldName} className="form-field-wrapper animate-fade-in" style={{ animationDelay: `${Object.keys(jsonSchema.properties).indexOf(fieldName) * 50}ms` }}>
            <label htmlFor={fieldName} className={labelClasses}>
              {fieldTitle}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {fieldDescription && (
              <p className="text-xs text-gray-500 mb-2 italic">{fieldDescription}</p>
            )}
            <input
              type="text"
              id={fieldName}
              value={formData[fieldName] || ''}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              placeholder={`Enter ${fieldTitle.toLowerCase()}...`}
              className={baseInputClasses}
            />
            {hasError && (
              <p className="text-red-500 text-xs mt-1 animate-shake">{errors[fieldName]}</p>
            )}
          </div>
        );
    }
  };

  if (!jsonSchema || !jsonSchema.properties) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
        {/* Form Header */}
        {jsonSchema.title && (
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 animate-gradient">
            <h2 className="text-2xl font-bold text-white mb-2">{jsonSchema.title}</h2>
            {jsonSchema.description && (
              <p className="text-purple-100 text-sm">{jsonSchema.description}</p>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {Object.keys(jsonSchema.properties).map(fieldName => 
            renderField(fieldName, jsonSchema.properties[fieldName])
          )}

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full py-4 px-6 rounded-xl font-semibold text-white
                bg-gradient-to-r from-purple-600 to-blue-600
                hover:from-purple-700 hover:to-blue-700
                focus:outline-none focus:ring-4 focus:ring-purple-500/50
                transform transition-all duration-300
                hover:scale-[1.02] hover:shadow-xl
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                active:scale-[0.98]
                relative overflow-hidden
                group
              "
            >
              <span className="relative z-10 flex items-center justify-center">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit
                    <svg className="ml-2 -mr-1 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .form-field-wrapper {
          transition: transform 0.2s ease;
        }

        .form-field-wrapper:hover {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}