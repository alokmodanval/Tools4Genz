import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { requestService } from '@/services/requestService';
import {
  studentProjectTypeOptions,
  clientServiceTypeOptions,
  studentBudgetOptions,
  clientBudgetOptions,
  technologyStackOptions,
  academicYearOptions,
  contactMethodOptions,
  SelectOption,
} from '@/data/requestOptions';
import { RequestSubmissionResult } from '@/types/request';

export interface RequestMultiStepFormProps {
  formType: 'student' | 'client';
  draftKey: string;
}

export const RequestMultiStepForm: React.FC<RequestMultiStepFormProps> = ({ formType, draftKey }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<RequestSubmissionResult | null>(null);

  const defaultState = {
    name: '',
    email: '',
    phone: '',
    preferredContactMethod: 'email',
    course: '',
    branch: '',
    academicYear: '4th Year',
    collegeName: '',
    company: '',
    websiteUrl: '',
    referenceWebsite: '',
    projectType: formType === 'student' ? 'Final Year Project' : 'Business Website',
    technology: 'Python',
    description: '',
    budget: formType === 'student' ? '₹3,000–₹5,000' : '₹10,000–₹25,000',
    deadline: '',
    additionalNotes: '',
  };

  // Form Fields State with Lazy Draft Initialization
  const [formData, setFormData] = useState(() => {
    const savedDraft = requestService.loadDraft<typeof defaultState>(draftKey);
    return savedDraft ? { ...defaultState, ...savedDraft } : defaultState;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);

  // Auto-save draft on data change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      requestService.saveDraft(draftKey, updated);
      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = t('forms.validation.required', 'Name is required');
      if (!formData.email.trim()) {
        newErrors.email = t('forms.validation.required', 'Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('forms.validation.invalidEmail', 'Invalid email address');
      }
      if (formData.phone && !/^[0-9+\s-]{8,15}$/.test(formData.phone)) {
        newErrors.phone = t('forms.validation.invalidPhone', 'Invalid phone number format');
      }
    }

    if (step === 2) {
      if (!formData.projectType) newErrors.projectType = t('forms.validation.required', 'Selection is required');
      if (!formData.description.trim()) {
        newErrors.description = t('forms.validation.required', 'Please provide a project description or requirements');
      } else if (formData.description.trim().length < 15) {
        newErrors.description = t('forms.validation.descriptionMin', 'Please describe your requirements in at least 15 characters');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestService.submitRequest({
        requestType: formType === 'student' ? 'student-project' : 'client-website',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        preferredContactMethod: formData.preferredContactMethod as 'email' | 'phone' | 'whatsapp',
        projectType: formData.projectType,
        technology: formData.technology,
        description: formData.description,
        budget: formData.budget,
        deadline: formData.deadline,
        additionalDetails: formData.additionalNotes,
        course: formData.course,
        branch: formData.branch,
        collegeName: formData.collegeName,
        company: formData.company,
        referenceWebsite: formData.referenceWebsite,
      });

      setSubmissionResult(result);
      requestService.clearDraft(draftKey);
      setCurrentStep(5); // Confirmation Step
    } catch {
      setErrors({ form: t('forms.error.submitFailed', 'We couldn\'t submit your request. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    requestService.clearDraft(draftKey);
    setFormData(defaultState);
    setSubmissionResult(null);
    setCurrentStep(1);
  };

  const projectOptions: SelectOption[] = formType === 'student' ? studentProjectTypeOptions : clientServiceTypeOptions;
  const budgetOptionsList: SelectOption[] = formType === 'student' ? studentBudgetOptions : clientBudgetOptions;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Progress Bar Header (Steps 1 to 4) */}
      {currentStep <= 4 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            <span className={currentStep >= 1 ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}>
              1. {t('forms.step.contact', 'Contact')}
            </span>
            <span className={currentStep >= 2 ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}>
              2. {t('forms.step.details', 'Details')}
            </span>
            <span className={currentStep >= 3 ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}>
              3. {t('forms.step.budget', 'Budget & Timeline')}
            </span>
            <span className={currentStep >= 4 ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}>
              4. {t('forms.step.review', 'Review')}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>

          {draftSaved && (
            <div className="text-right text-[11px] text-green-600 dark:text-green-400 mt-1 font-mono">
              ✓ {t('forms.draftSaved', 'Draft saved locally')}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Contact Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('forms.step1.title', 'Step 1: Contact Information')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={t('forms.step1.name', 'Full Name')}
              name="name"
              placeholder={t('forms.step1.namePlaceholder', 'e.g. Rahul Sharma')}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <Input
              label={t('forms.step1.email', 'Email Address')}
              type="email"
              name="email"
              placeholder={t('forms.step1.emailPlaceholder', 'rahul@example.com')}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <Input
              label={t('forms.step1.phone', 'Phone Number')}
              type="tel"
              name="phone"
              placeholder={t('forms.step1.phonePlaceholder', '+91 98765 43210')}
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
            />

            <Select
              label={t('forms.step1.contactMethod', 'Preferred Contact Method')}
              name="preferredContactMethod"
              value={formData.preferredContactMethod}
              onChange={handleChange}
              options={contactMethodOptions}
            />
          </div>

          {/* Type-Specific Fields */}
          {formType === 'student' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Input
                label={t('forms.step1.course', 'Course / Degree')}
                name="course"
                placeholder={t('forms.step1.coursePlaceholder', 'e.g. B.Tech / BCA')}
                value={formData.course}
                onChange={handleChange}
              />
              <Input
                label={t('forms.step1.branch', 'Branch / Stream')}
                name="branch"
                placeholder={t('forms.step1.branchPlaceholder', 'e.g. CSE / IT / ECE')}
                value={formData.branch}
                onChange={handleChange}
              />
              <Select
                label={t('forms.step1.academicYear', 'Academic Year')}
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                options={academicYearOptions}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Input
                label={t('forms.step1.company', 'Company / Business Name')}
                name="company"
                placeholder={t('forms.step1.companyPlaceholder', 'e.g. Acme Tech Solutions')}
                value={formData.company}
                onChange={handleChange}
              />
              <Input
                label={t('forms.step1.website', 'Current Website (If any)')}
                type="url"
                name="websiteUrl"
                placeholder={t('forms.step1.websitePlaceholder', 'https://example.com')}
                value={formData.websiteUrl}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={handleNext}>
              {t('forms.step1.next', 'Next: Project Scope')} &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Project Scope & Details */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('forms.step2.title', 'Step 2: Project Scope & Requirements')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label={formType === 'student' ? t('forms.step2.projectCategory', 'Project Category') : t('forms.step2.serviceCategory', 'Service Category')}
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              options={projectOptions}
              error={errors.projectType}
              required
            />

            <Select
              label={t('forms.step2.technology', 'Primary Technology Stack')}
              name="technology"
              value={formData.technology}
              onChange={handleChange}
              options={technologyStackOptions}
            />
          </div>

          <Textarea
            label={formType === 'student' ? t('forms.step2.description', 'Project Description / Abstract Idea') : t('forms.step2.clientDescription', 'Business Requirements & Project Description')}
            name="description"
            rows={5}
            placeholder={
              formType === 'student'
                ? t('forms.step2.descriptionPlaceholderStudent', 'Describe your project topic, objective, key modules, or any specific problem statement...')
                : t('forms.step2.descriptionPlaceholderClient', 'Describe your business goals, target audience, key features needed, or custom software requirements...')
            }
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            required
          />

          {formType === 'client' && (
            <Input
              label={t('forms.step2.referenceWebsite', 'Reference Website or Competitor URL (Optional)')}
              type="url"
              name="referenceWebsite"
              placeholder={t('forms.step2.referenceWebsitePlaceholder', 'https://example-competitor.com')}
              value={formData.referenceWebsite}
              onChange={handleChange}
            />
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack}>
              &larr; {t('forms.step2.back', 'Back')}
            </Button>
            <Button variant="primary" onClick={handleNext}>
              {t('forms.step2.next', 'Next: Budget & Timeline')} &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Budget & Timeline */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('forms.step3.title', 'Step 3: Budget & Target Timeline')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label={t('forms.step3.budget', 'Estimated Budget Range')}
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              options={budgetOptionsList}
            />

            <Input
              label={t('forms.step3.deadline', 'Target Completion Date / Deadline')}
              type="date"
              name="deadline"
              min={new Date().toISOString().split('T')[0]}
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>

          <Textarea
            label={t('forms.step3.additionalNotes', 'Additional Notes or Special Instructions (Optional)')}
            name="additionalNotes"
            rows={3}
            placeholder={t('forms.step3.additionalNotesPlaceholder', 'Any additional requirements, specific database preferences, design guidelines, or submission deadlines...')}
            value={formData.additionalNotes}
            onChange={handleChange}
          />

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack}>
              &larr; {t('forms.step3.back', 'Back')}
            </Button>
            <Button variant="primary" onClick={handleNext}>
              {t('forms.step3.next', 'Next: Review & Submit')} &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Summary Review */}
      {currentStep === 4 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('forms.step4.title', 'Step 4: Review Your Request')}
          </h3>

          <div className="bg-gray-50 dark:bg-gray-900/60 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.name', 'Name')}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formData.name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.email', 'Email')}:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">{formData.email}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.phone', 'Phone')}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formData.phone || t('forms.step4.notProvided', 'Not provided')}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.contactMethod', 'Contact Method')}:</span>
                <Badge variant="primary" size="sm" className="capitalize">{formData.preferredContactMethod}</Badge>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.category', 'Category')}:</span>
                <Badge variant="secondary" size="sm">{formData.projectType}</Badge>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.technology', 'Technology')}:</span>
                <Badge variant="outline" size="sm">{formData.technology}</Badge>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.budget', 'Budget')}:</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">{formData.budget}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('forms.step4.deadline', 'Deadline')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.deadline || t('forms.step4.flexible', 'Flexible')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('forms.step4.description', 'Description')}:</span>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                {formData.description}
              </p>
            </div>
          </div>

          {errors.form && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium">
              {errors.form}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              &larr; {t('forms.step4.edit', 'Edit Details')}
            </Button>
            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
              {isSubmitting ? t('forms.submitting', 'Submitting Request...') : t('forms.step4.submit', 'Confirm & Submit Request')}
            </Button>
          </div>
        </form>
      )}

      {/* Step 5: Confirmation */}
      {currentStep === 5 && submissionResult && (
        <div className="text-center py-8 space-y-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-4xl mx-auto border border-green-200 dark:border-green-800">
            ✓
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">{t('forms.success.badge', 'Request Processed')}</Badge>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('forms.success.title', 'Your Request Has Been Generated!')}
            </h3>
          </div>

          <div className="max-w-md mx-auto p-4 bg-gray-50 dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold block">
              {t('forms.success.referenceId', 'Reference ID')}
            </span>
            <span className="text-2xl font-mono font-extrabold text-primary-600 dark:text-primary-400 block tracking-widest">
              {submissionResult.requestId}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 block">
              {t('forms.success.created', 'Created: {{date}}', { date: new Date(submissionResult.timestamp).toLocaleString() })}
            </span>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs sm:text-sm text-blue-800 dark:text-blue-300 max-w-lg mx-auto leading-relaxed">
            ℹ️ {t('forms.success.note', 'Your request reference has been created. Our team will review your details and contact you shortly. No data has been stored on a live server yet.')}
          </div>

          <div className="pt-4 flex justify-center space-x-4">
            <Button variant="outline" onClick={handleResetForm}>
              {t('forms.submitAnother', 'Submit Another Request')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestMultiStepForm;