import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import classNames from 'classnames';

import Button from '../Button';
import { ButtonType, ButtonSize } from '../Button/style';

import useWindowSize from '../../hooks/useWindowSize';

import { TailWindBreakpoints } from '../../utils/constants';

import OpenMealLogo from '../../images/logo_and_wordmark.svg';
import { type } from 'os';

/**
  * Multi-step form wrapper
  * https://github.com/formium/formik/blob/master/examples/MultistepWizard.js
  * 
  * @param string buttonClassName the style className for all buttons
  * @param React.ReactNode children <WizardStep> components
  * @param object initialValues object containing initial values of all form fields to persist in state
  * @param Function onSubmit function to handle form submmission in final step
  * @param number numberOfStepsToAddToDisplay number to add to total steps in the display of 
  *           `Step x to total steps` if parent container has additional non-Wizard steps
  */
interface WizardProps {
  buttonClassName?: string;
  children: React.ReactNode;
  initialValues: object;
  onSubmit: Function;
  numberOfStepsToAddToDisplay?: number;
}

export default function Wizard({
  buttonClassName = '',
  children,
  initialValues,
  onSubmit,
  numberOfStepsToAddToDisplay = 0,
}: WizardProps) {
  const [stepNumber, setStepNumber] = useState(0);
  const steps: Array<any> = React.Children.toArray(children);
  const [snapshot, setSnapshot] = useState(initialValues);

  const step = steps[stepNumber];
  const totalSteps = steps.length;
  const isLastStep = stepNumber === totalSteps - 1;

  const next = values => {
    setSnapshot(values);
    setStepNumber(Math.min(stepNumber + 1, totalSteps - 1));
  };

  const previous = formik => {
    setSnapshot(formik.values);
    setStepNumber(Math.max(stepNumber - 1, 0));
  };

  const handleSubmit = async (values, bag) => {
    if (step.props.onSubmit) {
      await step.props.onSubmit(values, bag);
    }
    if (isLastStep) {
      return await onSubmit(values, bag, totalSteps);
    } else {
      bag.setTouched({});
      next(values);
    }
  };

  const { buttonNextLabel, buttonPreviousLabel, buttonSubmitLabel, contentUnderButton, header } = step.props;

  const windowSize = useWindowSize();

  const size = windowSize.width < TailWindBreakpoints.SM ? 'ml' : 'md';

  const btnClass = classNames('font-muli font-semibold items-center', {
    [`${ButtonSize.md}`]: (size === 'md'),
    [`${ButtonSize.ml}`]: (size === 'ml'),
    [`${buttonClassName}`]: buttonClassName !== undefined
  });

  return (
    <Formik
      initialValues={snapshot}
      onSubmit={handleSubmit}
      validationSchema={step.props.validationSchema}
    >
      {formik => (
        <Form className="
          flex flex-col items-center
          w-80 sm:w-auto sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl
          font-muli text-darkGray
        ">
          <img
            className="w-48 sm:w-40 md:w-48 lg:w-56 xl:w-64"
            src={OpenMealLogo}
            alt="OpenMeal"
          />
          { header ? (
            <p className="
              font-extrabold 
              text-base md:text-lg lg:text-xl xl:text-2xl 
              text-center 
              w-72 sm:w-auto mb-2 mt-6">
              {header}
            </p>
          ) : null }
          <p className="text-base md:text-base lg:text-lg xl:text-xl text-center mb-4">
            Step {stepNumber + 1} of {totalSteps + numberOfStepsToAddToDisplay}
          </p>
          {step} {/* `step` is where each form step is rendered */}
          <div className="flex flex-col sm:flex-row items-center justify-center mt-4 sm:mt-0">
            {stepNumber > 0 && buttonPreviousLabel ? (
              <button
                onClick={() => previous(formik)}
                type="button"
                className={`${btnClass} ${ButtonType.secondary} sm:mr-4`}
              >
                {buttonPreviousLabel}
              </button>
            ) : null}

            {buttonSubmitLabel || buttonNextLabel ? (
              <button
                disabled={formik.isSubmitting}
                type="submit"
                className={`${btnClass} ${ButtonType.primary}`}
              >
                {isLastStep ? buttonSubmitLabel : buttonNextLabel}
              </button>
            ) : null}
          </div>
          {contentUnderButton ? <p className="sm:text-sm lg:text-base">{contentUnderButton}</p> : null}
        </Form>
      )}
    </Formik>
  );
}

/**
 * Wrapper for each step of the multi-step form
 * 
 * @param string buttonNextLabel label for the 'Next' step button
 * @param string buttonPreviousLabel label for the 'Previous' step button
 * @param string buttonSubmitLabel label for the 'Submit' step button (final step)
 * @param React.ReactNode children the contents of the form including input fields
 * @param string|ReactNode contentUnderButton content to place under the button(s)
 *                         (can include HTML in value by sending a ReactNode, eg, {<span>HELLO</span>}) 
 * @param Function onSubmit the submit handler when the Next button is clicked
 * @param object validationSchema the Yup validationSchema
 */
interface WizardStepProps {
  buttonNextLabel?: string;
  buttonPreviousLabel?: string;
  buttonSubmitLabel?: string;
  children: any;
  contentUnderButton?: string | React.ReactNode;
  header?: string;
  onSubmit: Function;
  validationSchema?: object;
}

export function WizardStep({
  buttonNextLabel = '',
  buttonPreviousLabel = '',
  buttonSubmitLabel = '',
  children,
  contentUnderButton = '',
  header = '',
  onSubmit,
  validationSchema = null,
}
  : WizardStepProps) {
  return children;
}