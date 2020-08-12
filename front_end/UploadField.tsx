import React from 'react';
import { useDropzone } from 'react-dropzone';
import { ErrorMessage } from 'formik';

import Button from '../Button';
import { ButtonType, ButtonSize } from '../Button/style';

import useWindowSize from '../../hooks/useWindowSize';

import { TailWindBreakpoints } from '../../utils/constants';

import ArrowInCloud from '../../images/icons/arrow_in_cloud.svg';

export default function UploadField(props) {

  /* 
   * hook into Formik using useFormikContext() and then
   * use its setFieldValue() method to set a Formik state value
   * called 'uploadedFiles' to store the uploaded files
   */
  const formikContext = props.useFormikContext();
  const windowSize = useWindowSize();

  const maxFileSizeBytes = 1048576; // 1Mb
  const maxFileSizeMb = maxFileSizeBytes / 1024. / 1024.;
  const allowedFileMimeTypes = ["image/jpeg", "image/png"];
  const allowedFileTypes = allowedFileMimeTypes.join(' or ').replace(/image\//g, '');
  const validationClassName = 'text-center text-2xs sm:text-xs lg:text-sm';

  const {acceptedFiles, fileRejections, getRootProps, getInputProps, isDragReject, open} = useDropzone({
    accept: allowedFileMimeTypes.join(', '),
    multiple: false,
    maxSize: maxFileSizeBytes,
    minSize: 1,
    noClick: true,
    noKeyboard: true,

    onDrop: acceptedFiles => {
      formikContext.setFieldValue(props.fieldName, acceptedFiles);
    }
  });

  const files = acceptedFiles.map(file => (
    <li className={`${validationClassName} text-green`} key={(file as any).path}>
      {(file as any).path} ({ (file.size / 1024.).toFixed(1) } kb)
    </li>
  ));

  // handle rejected files
  const getFileRejectionErrors = (fileRejection) => {
    let fileErrorMessages = [];
    fileRejection.errors.forEach( error => {
      if (error.code === 'file-invalid-type') {
        fileErrorMessages.push(`File must be ${allowedFileTypes}`);
      }
      if (error.code === 'file-too-large') {
        fileErrorMessages.push(`File must be < ${maxFileSizeMb.toFixed(0)} Mb`);
      }
    })
    return fileErrorMessages.length ? fileErrorMessages.join(". ") : null;
  }

  return (
    <div className="h-80 sm:h-96 my-8">
      <section className='
        flex flex-col items-center justify-center
        bg-gray-100 border border-solid border-gray-400 rounded-lg
        w-72 sm:w-104
        p-4
      '>
        <div {...getRootProps({className: 'dropzone'})} className='flex flex-col items-center justify-center'>
          { fileRejections.length ? 
            <p className={`${validationClassName} mb-4 text-red-700`}>{getFileRejectionErrors(fileRejections[0])}</p> :
            <p className={`${validationClassName} mb-4 text-green`}>{`${allowedFileTypes} format and < ${maxFileSizeMb.toFixed(0)} Mb`}</p>
          }
          <input {...getInputProps()} />
          <img
            alt='Drop file here'
            className='block border border-dashed border-green mb-4 p-10'
            src={ArrowInCloud}
          />
          {windowSize.width < TailWindBreakpoints.SM ? null : (
            <p className='font-bold mb-4 text-green'>Drop file here or</p>
          )}
          <Button className='bg-green' onClick={open} size='md' type='primary'>
            Select file
          </Button>
        </div>
        <aside className='flex flex-col h-4 items-center mt-2'>
          <ul>{files}</ul>
        </aside>
      </section>
      <div className={`${validationClassName} h-4 text-red-700`}>
        <ErrorMessage name='uploadedFiles' />
      </div>
    </div>
  );
}