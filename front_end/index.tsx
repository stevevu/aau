import React from 'react';
import { useHistory } from 'react-router-dom';

import BackgroundDiv, { PageRatio } from '../../../components/BackgroundDiv';
import NavBar from '../../../components/NavBar';
import Page from '../../../components/Page';

import FormSection from './FormSection';
import NewFooter from '../../../components/NewFooter';

import BackgroundMobile from '../../../images/form/background_mobile.svg';
import BackgroundWeb from '../../../images/form/background_web.svg';

export default function DinerSignUpPage() {
  const history = useHistory();
  return (
    <Page>
      <div className="flex flex-col">
        <NavBar type="dark" />
        <BackgroundDiv
          className="flex flex-col items-center justify-center"
          bgMobile={BackgroundMobile}
          bgWeb={BackgroundWeb}
          page={PageRatio.FormPage}
        >
          <FormSection />
        </BackgroundDiv>
      </div>
      <NewFooter />
    </Page>
  );
}
