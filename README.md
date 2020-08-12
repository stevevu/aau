I could not include every single file but here are the relevant ones that should be good enough
to see how form is rendred on our staging site.  We are using the Tailwind CSS library for styling.

[https://open-meal-frontend-staging.herokuapp.com/diner/sign-up](https://open-meal-frontend-staging.herokuapp.com/diner/sign-up)

1. Front end code (/front_end folder)

- [index.tsx](https://github.com/stevevu/aau/blob/master/front_end/index.tsx)
  - entry point that wraps the form in our layout (nav, background, footer)

- [FormSection.tsx](https://github.com/stevevu/aau/blob/master/front_end/FormSection.tsx)
  - wrapper for the form steps
  - handles the form submission
  - defines the custom validation rules for each field
  - uses state to determine whether to show form or success view

- [FormikWizard.tsx](https://github.com/stevevu/aau/blob/master/front_end/FormikWizard.tsx)
  - the component that handles the logic of of the multi step form
  - keeps track of the form's state
  - handles advancing to the next or previous step
  - based on the formik module which allows us to rapidly create
  forms without the need to repeatedly write the same event handling code
  (e.g., onChange, onBlur, etc)

- [InputField.tsx](https://github.com/stevevu/aau/blob/master/front_end/InputField.tsx)
  - our input field wrapper with optional tool tip next to the label
  - option to use a password field with show/hide functionality

- [UploadField.tsx](https://github.com/stevevu/aau/blob/master/front_end/UploadField.tsx)
  - file upload via drag/drop or click to select file
  - added constraints to limit max file size and the file types that can be uploaded
  - uses the react-dropzone module to 

- [RemoteCallContainer](https://github.com/stevevu/aau/blob/master/front_end/RemoteCallContainer.ts)
  - makes the API calls to our backend server
  - sets response state to determine which view to render based on success or failure
    or API calls
  - we use axios to make the remote calls

2. Back end code, Python/Flask (/back_end folder)
  - [app.py](https://github.com/stevevu/aau/blob/master/back_end/app.py)
    - the route handler

  - [authentication.py](https://github.com/stevevu/aau/blob/master/back_end/authentication.py)
    - API controller for methods related to sign in or registration 

  - [pginstance.py](https://github.com/stevevu/aau/blob/master/back_end/pginstance.py)
    - does the actual database (model) operations via SQL

  - [test_diner](https://github.com/stevevu/aau/blob/master/back_end/test_diner.py)
    - test script to validate that code related to adding a diner works before 
      deploying