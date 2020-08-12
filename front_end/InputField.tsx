import React, { useState } from 'react';
import { ErrorMessage, Field } from 'formik';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fab } from '@fortawesome/free-brands-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { faEye, faEyeSlash, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import ReactTooltip from 'react-tooltip';

interface InputFieldProps {
  className?: string;
  component?: 'input' | 'textarea'
  name: string;
  type: 'text' | 'email' | 'password' | 'passwordShowHide';
  label?: string;
  placeholder?: string;
  tooltip?: string;
}

const inputGeneralClassName = ' \
  flex items-start justify-start text-left \
  border border-solid border-gray-400 rounded-md \
  text-xs md:text-sm lg:text-base \
  p-4 \
';

const inputHeightClassName = 'h-2 sm:h-3 md:h-6 lg:h-10 xl:h-12';

export default function InputField({ className, component = 'input', name, type, label, placeholder, tooltip }: InputFieldProps) {
  return (
    <div className={`flex flex-col ${
      component === 'textarea' ? 'h-48' : label !== undefined ? 'h-18 sm:h-16 md:h-18 lg:h-20 xl:h-24' : 'h-14 sm:h-12 md:h-14 lg:h-16 xl:h-18'
    } ${className}`}
    >
      <label
        className="font-muli font-semibold text-xs md:text-sm lg:text-base py-1"
        htmlFor={name}
      >
        {label}
        { tooltip && 
          <>
          <span data-tip={tooltip} data-for={name} data-html={true} className="ml-1 text-gray-600">
            <FontAwesomeIcon icon={faQuestionCircle} size="sm" className="fill-current"/>
          </span>
          <ReactTooltip id={name} backgroundColor="#ffffff" border={true} borderColor="#757575" textColor="#757575" />
          </>
        }
      </label>
      
      { type == 'passwordShowHide' ? ( // password field with show/hide functionality
        <Field
          component={PasswordShowHide}
          type={type}
          name={name}
          placeholder={placeholder}
        />
      ) : ( // all other allowed input fields (including standard password field)
        <Field
          className={`
            ${inputGeneralClassName}
            ${component === 'textarea' ? 'h-48 resize-none align-text-top' : inputHeightClassName}
          `}
          component={component}
          type={type}
          name={name}
          placeholder={placeholder}
        />
      )}
      <div className='text-red-700 text-2xs md:text-xs lg:text-sm'>
        <ErrorMessage name={name} />
      </div>
    </div>
  );
}


/*
 * show/hide password field integration with formik
 */
function PasswordShowHide ({ field, form, ...props }) {
  const [isShowPassword, setIsShowPassword] = useState(false);
  return (
    <div className="flex flex-col relative">
      <i
        className="
          absolute top-0 right-0 
          text-gray-600 
          mt-1 mr-2 lg:mt-2 lg:mr-3 xl:mt-3 xl:mr-4
        "
        onClick={() => setIsShowPassword(!isShowPassword)}
      >
        <FontAwesomeIcon className="fill-current" icon={ isShowPassword ? faEyeSlash : faEye } />
      </i>
      <input
        type={isShowPassword ? "text" : "password"}
        {...field}
        className={`${inputGeneralClassName} ${inputHeightClassName}`}
        placeholder={ props.placeholder }
      />
    </div>
  );
};