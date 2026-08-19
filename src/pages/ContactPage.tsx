import React from 'react';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import { RequestMultiStepForm } from '@/components/forms/RequestMultiStepForm';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const ContactPage: React.FC = () => {
  const settings = useSiteSettings();
  const details = [
    settings.support_email && { icon:'✉️', label:'Email', value:settings.support_email, href:`mailto:${settings.support_email}` },
    settings.whatsapp_number && { icon:'💬', label:'WhatsApp', value:settings.whatsapp_number, href:`https://wa.me/${settings.whatsapp_number.replace(/\D/g,'')}` },
    settings.phone_number && { icon:'📞', label:'Phone', value:settings.phone_number, href:`tel:${settings.phone_number.replace(/\s/g,'')}` },
    settings.location_text && { icon:'📍', label:'Location', value:settings.location_text },
    settings.business_hours && { icon:'🕒', label:'Business hours', value:settings.business_hours },
  ].filter(Boolean) as Array<{icon:string;label:string;value:string;href?:string}>;
  const social = [['Instagram',settings.instagram_url],['YouTube',settings.youtube_url],['GitHub',settings.github_url],['LinkedIn',settings.linkedin_url]].filter((item)=>item[1]);
  return <><SEO title="Contact Tools4Genz" description="Contact Tools4Genz for purchase support, project services, or general enquiries." />
    <main className="min-h-screen bg-surface-50 py-14 dark:bg-surface-950"><Container><div className="mb-10 max-w-3xl"><span className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">Support & enquiries</span><h1 className="mt-3 text-4xl font-black text-surface-950 dark:text-white md:text-5xl">Contact Tools4Genz</h1><p className="mt-4 text-lg text-surface-600 dark:text-surface-300">{settings.support_message || 'Send a purchase-support question, project enquiry, or service request. Submitting the form creates no payment obligation.'}</p></div>
      <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.6fr]">
        <aside className="rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 md:p-8"><h2 className="text-xl font-black text-surface-950 dark:text-white">Contact details</h2>{details.length ? <div className="mt-6 space-y-5">{details.map((item)=><div key={item.label} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">{item.icon}</span><div><p className="text-xs font-bold uppercase tracking-wide text-surface-500">{item.label}</p>{item.href?<a href={item.href} className="mt-1 block break-all font-semibold text-surface-900 hover:text-primary-600 dark:text-surface-100 dark:hover:text-primary-400">{item.value}</a>:<p className="mt-1 whitespace-pre-line font-semibold text-surface-900 dark:text-surface-100">{item.value}</p>}</div></div>)}</div>:<p className="mt-4 text-sm leading-6 text-surface-600 dark:text-surface-300">Direct contact details are being configured. Please use the secure request form.</p>}
          {social.length>0&&<div className="mt-7 border-t border-surface-200 pt-6 dark:border-surface-700"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-surface-500">Follow us</p><div className="flex flex-wrap gap-2">{social.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-surface-200 px-3 py-1.5 text-sm font-semibold text-surface-700 hover:border-primary-400 hover:text-primary-600 dark:border-surface-700 dark:text-surface-200">{label}</a>)}</div></div>}
        </aside>
        <div><RequestMultiStepForm formType="client" draftKey="contact-request" initialProjectType="General Enquiry" /></div>
      </div></Container></main></>;
};
export default ContactPage;
