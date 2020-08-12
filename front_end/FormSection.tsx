import React, { useState, useEffect }from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useFormikContext } from 'formik';
import { useToasts } from 'react-toast-notifications';
import * as Yup from 'yup';
import Loader from 'react-loader-spinner'
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"

import { RemoteCallContainer, UploadImageType } from '../../../provider/RemoteCallContainer';

import Button from '../../../components/Button';
import FormikWizard, { WizardStep } from '../../../components/FormikWizard';
import InputField from '../../../components/InputField';
import UploadField from '../../../components/UploadField';
import { TermsOfUseView } from '../../home/TermsOfUseView';

import useWindowSize from '../../../hooks/useWindowSize';
import { useAsyncState } from '../../../hooks/useAsyncState';

import { Routes } from '../../../utils/routes';

import { APPLY_DINER, TailWindBreakpoints } from '../../../utils/constants';
import OpenMealLogo from '../../../images/logo_and_wordmark.svg';

interface DinerSignUpProps {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  uploadedFiles: File | Array<File>;
}

export default function FormSection() {

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [isDisplayForm, setIsDisplayForm] = useState(true);
  const [dinerResponse, setDinerResponse] = useAsyncState({});
  const [totalFormSteps, setTotalFormSteps] = useState(0);

  // useEffect( () => {
  //   if (Object.keys(dinerResponse).length > 0) {
  //     if (dinerResponse.token) {
  //     }
  //   }
  // }, [dinerResponse]);
  
  const windowSize = useWindowSize();
  const history = useHistory();
  const { addToast } = useToasts();
  const APICaller = RemoteCallContainer.useContainer();

  const initialValues: DinerSignUpProps = {
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    uploadedFiles: null
  };

  const validationSchemaBasicInfo = Yup.object().shape({
    name: Yup.string().required('Please enter full name')
      .max(72),
    email: Yup.string().required('Please enter email')
      .email('Please enter a valid email'),
    phone: Yup.string().required("Please enter phone")
      .matches(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Please enter a valild phone number'),
    password: Yup.string()
      .required('Please enter password')
      .min(8)
      .max(32)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\@\#\$%\^\&\+\=])/,
        'Requires 1 lower, 1 upper, 1 number, and 1 of @#$%^&+='),
    passwordConfirm: Yup.string()
      .required('Please confirm password')
      .test('passwords-match', 'Passwords must match', function (value) {
        return this.parent.password === value;
      })
  });

  const validationSchemaUpload = Yup.object().shape({
    uploadedFiles: Yup.mixed().required('Please upload a photo ID')
  });

  const inputFieldClassName = 'w-full sm:w-80 md:w-88 lg:w-96 xl:w-104';
  const successFailWrapperClassName = 'w-72 sm:w-auto sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl'
  const successFailHeaderClassName = '\
    font-extrabold text-center \
    text-base md:text-lg lg:text-xl xl:text-2xl \
    w-72 sm:w-auto mb-2 mt-6 \
  ';

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const resetState = () => {
    setDinerResponse({});
    setIsSaveInProgress(false);
    setIsDisplayForm(true);
    setTotalFormSteps(0);
  }

  /*
   * form submit handler
   */ 
  const handleSignUpDiner = async (values, bag, numberOfFormSteps) => {

    // values from all form steps (uploadedFiles is an array of JS File objects)
    const {name, email, phone, password, uploadedFiles} = values;

    // make sure valid image has been specified before proceeding with API calls
    if (uploadedFiles && uploadedFiles.length > 0) {
      setIsSaveInProgress(true);

      // keep only numbers from the phone (Yup validation ensures there can only be 10 numbers plus (-.))
      const phoneNumbersOnly = phone.replace(/\D/g, '');

      // get uploaded file's extension from its MIME type:  assumes only one file can be uploaded
      const fileExtension = (uploadedFiles[0].type).replace(/^.*\//, '').toLowerCase();

      /*
       * upload diner image
       */
      const fileData = new Blob(uploadedFiles);
      const reader = new FileReader();
      reader.readAsArrayBuffer(fileData);
      reader.onload = async () => {
        const arrayBuffer = reader.result;
        const bytes = new Uint8Array(arrayBuffer as any);

        let responseData = await APICaller.uploadImage(bytes, UploadImageType.Item, fileExtension, setDinerResponse);      

        if (responseData.file_name) {
          /*
           * save diner info
           */
          const data = {
            name: name,
            email: email,
            phone: phoneNumbersOnly,
            password: password,
            imageURL: responseData.file_name
          }
          responseData = await APICaller.signUpDiner(data, setDinerResponse);
        }
        
        if (responseData.errorMessage) {
          addToast(responseData.errorMessage, { appearance: 'error' })
        } else {
          addToast('You\'ve been signed up!  Please follow the directions above to complete the process.', {
            appearance: 'success'
          });
          setIsDisplayForm(false);
          setTotalFormSteps(numberOfFormSteps);
        }
        setIsSaveInProgress(false);
        scrollToTop();
      };
    }
  };

  const handleGotoGoogleApplication = () => {
    resetState();
  };

  const handleGoBackToBeginning = () => {
    resetState();
  }

  return (
    <div className="
      flex flex-col items-center justify-center
      mx-auto
      my-24 md:my-32
      px-4 sm:px-16 md:px-24 xl:px-32
      py-8 sm:py-10 md:py-12
      bg-white rounded-md border border-solid border-gray-400 shadow"
    >

      { isSaveInProgress && <Loader
          type="Watch"
          color="#ff6027"
          height={ windowSize.width < TailWindBreakpoints.SM ? '2rem' : 
                   windowSize.width < TailWindBreakpoints.MD ? '3rem' : '4rem' }
          width={ windowSize.width < TailWindBreakpoints.SM ? "2rem" : 
                  windowSize.width < TailWindBreakpoints.MD ? '3rem' : '4rem' }
        /> }
        
      { isDisplayForm ? ( /* form view */
        <FormikWizard
          initialValues={initialValues}
          onSubmit={handleSignUpDiner}
          buttonClassName="my-4"
          numberOfStepsToAddToDisplay={1}
        >
          {/* 
            * Step 1. Basic Info 
            */}
          <WizardStep
            onSubmit={ () => {/* console.log('Step1 onSubmit'); */} }
            validationSchema={validationSchemaBasicInfo}
            buttonNextLabel="Next"
            buttonPreviousLabel="Previous"
            contentUnderButton={<span>Already have an account? Sign in <Link className="text-pop underline" to={Routes.SignInPage}>here</Link></span>}
            header="Create a Diner Account"
          >
            <InputField
              className={inputFieldClassName}
              type="text"
              name="name"
              label="Full Name"
            />
            <InputField
              className={`${inputFieldClassName} mt-1`}
              type="email"
              name="email"
              label="Email"
            />
            <InputField
              className={`${inputFieldClassName} mt-1`}
              type="text"
              name="phone"
              label="Phone Number"
              tooltip="Examples:<ul><li>1112223333</li><li>111.222.3333</li><li>111-222-3333</li><li>(111) 222-3333</li></ul>"
            />
            <InputField
              className={`${inputFieldClassName} mt-1`}
              type="passwordShowHide"
              name="password"
              label="Password"
            />
            <InputField
              className={`${inputFieldClassName} mt-1`}
              type="passwordShowHide"
              name="passwordConfirm"
              label="Confirm Password"
            />
          </WizardStep>
          {/*
            * Terms of Use agreement
            */}
          <WizardStep
            onSubmit={ () => {/* console.log('Step2 onSubmit') */} }
            buttonNextLabel="I Agree"
            buttonPreviousLabel="Previous"
            header="Terms of Use"
          >
            <div className="
              h-64 sm:h-112
              mb-6 sm:mb-8 mt-6 sm:mt-8
              border border-solid border-gray-400 rounded-sm
              overflow-x-hidden overflow-y-scroll
            ">
              <TermsOfUseView isContentOnly={true} />
            </div>
          </WizardStep>
          {/*
            * Upload ID
            */}
          <WizardStep
            onSubmit={ () => {/*console.log("Step3 onSubmit") */} }
            buttonSubmitLabel="Sign Up"
            buttonPreviousLabel="Previous"
            validationSchema={validationSchemaUpload}
            header="Upload Your ID"
          >
            <div className="text-left w-72 sm:w-auto">
              Our team is working hard to ensure that the donations make their
              way to the right people. Please upload a picture ID (i.e. driver’s
              license, state ID, etc.) as proof of your identity so we may assist
              you.
            </div>
            <UploadField fieldName="uploadedFiles" useFormikContext={useFormikContext} />
          </WizardStep>
        </FormikWizard>
        ) : ( /* Success View */
          <>
            <img
              className="w-48 sm:w-40 md:w-48 lg:w-56 xl:w-64"
              src={OpenMealLogo}
              alt="OpenMeal"
            />
            <div className={`${successFailWrapperClassName} text-left`}>
              <p className={successFailHeaderClassName}>
                Thank You for Your Interest in Becoming an OpenMeal Diner!
              </p>
              <p className="text-base lg:text-lg xl:text-xl text-center mb-4">
                {`Step ${totalFormSteps + 1 } of ${totalFormSteps + 1}`}
              </p>
              <p className="mb-4">
                Next, we'd like to ask you to complete the following application.
              </p>
              <p className="mb-4">
                It will take about 20 minutes to complete, and we will get back to you within 48 hours.
              </p>
              <p className="mb-4">
                Once you've applied and approved as a requester, you will be able to place orders.
              </p>
              <p className='mb-4'>
                If you've already applied, we'll be in touch shortly. Thank you for your patience!
              </p>
              <div className="text-center">
                <a 
                  href={APPLY_DINER}
                  target="_blank" 
                  rel="noopener noreferrer">
                  <Button 
                    type="primary"
                    size={windowSize.width < TailWindBreakpoints.SM ? 'ml' : 'md'}
                    onClick={handleGotoGoogleApplication}
                  >
                    Go to application
                  </Button>
                </a>
              </div>
            </div>
          </>
        )
      }
    </div>
  );
}