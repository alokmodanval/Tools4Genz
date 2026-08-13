import React from 'react';
import RequestMultiStepForm from './RequestMultiStepForm';

export const StudentRequestForm: React.FC = () => {
  return <RequestMultiStepForm formType="student" draftKey="student_request" />;
};

export default StudentRequestForm;
