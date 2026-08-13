import React from 'react';
import RequestMultiStepForm from './RequestMultiStepForm';

export const ClientRequestForm: React.FC = () => {
  return <RequestMultiStepForm formType="client" draftKey="client_request" />;
};

export default ClientRequestForm;
