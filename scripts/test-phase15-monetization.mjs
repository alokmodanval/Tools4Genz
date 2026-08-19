import fs from 'node:fs';
import path from 'node:path';
import worker from '../worker/src/index.ts';
import { handleAdsTxt, handleAdminAffiliateSave, handleAffiliateClick, handlePublicAffiliateOffers } from '../worker/src/routes/monetization.ts';
import { getPlatformMetrics, updatePublicSettings } from '../worker/src/services/platform.ts';
import { canLoadAdSense, slotForPlacement } from '../src/utils/monetization.ts';
import { canAccessTool } from '../src/utils/toolAccess.ts';

const root=process.cwd(); const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
let passed=0;let failed=0;
function test(name,condition){if(condition){passed++;console.log(`  ✓ ${name}`);}else{failed++;console.error(`  ✗ ${name}`);}}
async function body(response){return response.json();}

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql.replace(/\s+/g,' ').trim();this.args=[];} bind(...args){this.args=args;return this;}
  async all(){const s=this.sql;
    if(s.includes('FROM site_settings'))return{results:this.args.map(key=>this.db.settings.has(key)?{setting_key:key,setting_value:this.db.settings.get(key)}:null).filter(Boolean)};
    if(s.includes("FROM affiliate_offers WHERE status = 'published'")){let rows=this.db.offers.filter(o=>o.status==='published');if(this.args[0])rows=rows.filter(o=>o.entity_type===null||o.entity_type===this.args[0]);if(this.args[1])rows=rows.filter(o=>o.entity_id===null||o.entity_id===this.args[1]);return{results:rows};}
    if(s.includes('FROM affiliate_offers ORDER BY'))return{results:[...this.db.offers]};
    if(s.includes('FROM analytics_events WHERE entity_type'))return{results:[]};
    return{results:[]};
  }
  async first(){const s=this.sql;if(s.includes('FROM affiliate_offers WHERE id = ?'))return this.db.offers.find(o=>o.id===Number(this.args[0]))||null;
    if(s.includes('COALESCE(SUM(amount),0)'))return{c:this.db.orders.filter(o=>o.status==='paid').reduce((sum,o)=>sum+o.amount,0)};
    if(s.includes("event_name = 'affiliate_click'"))return{c:this.db.events.filter(e=>e.event_name==='affiliate_click').length};
    if(s.includes("affiliate_offers WHERE status = 'published'"))return{c:this.db.offers.filter(o=>o.status==='published').length};
    return{c:0};}
  async run(){const s=this.sql;
    if(s.startsWith('INSERT INTO site_settings')){this.db.settings.set(this.args[0],this.args[1]);return{meta:{changes:1,last_row_id:0}};}
    if(s.startsWith('INSERT INTO affiliate_offers')){if(this.db.offers.some(o=>o.slug===this.args[1]))throw new Error('unique');const id=++this.db.lastId;this.db.offers.push({id,title:this.args[0],slug:this.args[1],description:this.args[2],destination_url:this.args[3],category:this.args[4],image_url:this.args[5],cta_text:this.args[6],disclosure_text:this.args[7],status:this.args[8],featured:this.args[9],sort_order:this.args[10],entity_type:this.args[11],entity_id:this.args[12],created_at:this.args[13],updated_at:this.args[14]});return{meta:{changes:1,last_row_id:id}};}
    if(s.startsWith('UPDATE affiliate_offers SET title')){const row=this.db.offers.find(o=>o.id===Number(this.args[14]));if(row)Object.assign(row,{title:this.args[0],slug:this.args[1],description:this.args[2],destination_url:this.args[3],category:this.args[4],image_url:this.args[5],cta_text:this.args[6],disclosure_text:this.args[7],status:this.args[8],featured:this.args[9],sort_order:this.args[10],entity_type:this.args[11],entity_id:this.args[12],updated_at:this.args[13]});return{meta:{changes:row?1:0,last_row_id:0}};}
    if(s.startsWith("UPDATE affiliate_offers SET status = 'archived'")){const row=this.db.offers.find(o=>o.id===Number(this.args[1]));if(row)row.status='archived';return{meta:{changes:row?1:0,last_row_id:0}};}
    if(s.startsWith('INSERT INTO analytics_events')){this.db.events.push({session_id:this.args[0],customer_user_id:this.args[1],event_name:this.args[2],entity_type:this.args[3],entity_id:this.args[4],created_at:this.args[5]});return{meta:{changes:1,last_row_id:this.db.events.length}};}
    return{meta:{changes:0,last_row_id:0}};
  }
}
class DB{constructor(){this.settings=new Map([['site_name','Tools4Genz'],['ads_enabled','false'],['adsense_enabled','false'],['adsense_publisher_id',''],['auto_ads_enabled','false'],['ads_on_tools','false'],['ads_on_projects','false'],['ads_on_services','false'],['consent_provider_configured','false'],['affiliate_enabled','false'],['affiliate_disclosure_text','Affiliate link']]);this.offers=[];this.events=[];this.orders=[{status:'paid',amount:1250},{status:'payment_pending',amount:999999}];this.lastId=0;}prepare(sql){return new Statement(this,sql);}async batch(statements){return Promise.all(statements.map(s=>s.run()));}}

const defaults={ads_enabled:'false',adsense_enabled:'false',adsense_publisher_id:'',auto_ads_enabled:'false',ads_on_tools:'false',ads_on_projects:'false',ads_on_services:'false',consent_provider_configured:'false',adsense_tools_listing_slot_id:'',adsense_tool_content_slot_id:'',adsense_project_content_slot_id:'',adsense_services_content_slot_id:''};
console.log('\nPhase 15 — Monetization tests\n');
test('Ads disabled by default without publisher ID',!canLoadAdSense('/tools',defaults));
test('Missing publisher ID cannot load AdSense',!canLoadAdSense('/tools',{...defaults,ads_enabled:'true',adsense_enabled:'true',ads_on_tools:'true',consent_provider_configured:'true'}));
const enabled={...defaults,ads_enabled:'true',adsense_enabled:'true',adsense_publisher_id:'ca-pub-1234567890123456',auto_ads_enabled:'true',ads_on_tools:'true',ads_on_projects:'true',ads_on_services:'true',consent_provider_configured:'true'};
test('Private purchase route never loads ads',!canLoadAdSense('/my-purchases',enabled));
test('Login route never loads ads',!canLoadAdSense('/login',enabled));
test('Recovery route never loads ads',!canLoadAdSense('/purchase/recover',enabled));
test('Admin route never loads ads',!canLoadAdSense('/admin/dashboard',enabled));
test('Service request form never loads ads',!canLoadAdSense('/services/request',enabled));
test('Eligible tool route supports ads',canLoadAdSense('/tools/word-counter',enabled));
test('Eligible project route supports ads',canLoadAdSense('/projects/example',enabled));
test('Manual slot requires a numeric configured ID',slotForPlacement('tool_content',{...enabled,adsense_tool_content_slot_id:''})==='');
test('Configured manual slot is returned',slotForPlacement('tool_content',{...enabled,adsense_tool_content_slot_id:'1234567890'})==='1234567890');
test('No auto mode or manual slot means no ad request',!canLoadAdSense('/tools/word-counter',{...enabled,auto_ads_enabled:'false'}));
test('Manual slot can enable loading without Auto Ads',canLoadAdSense('/tools/word-counter',{...enabled,auto_ads_enabled:'false',adsense_tool_content_slot_id:'1234567890'}));
const loader=read('src/components/monetization/AdSenseManager.tsx');const slot=read('src/components/monetization/AdSlot.tsx');
test('No fake publisher ID exists in runtime source',!read('src/services/platformService.ts').includes('ca-pub-0000000000000000'));
test('Ad loader uses configured publisher ID',loader.includes('settings.adsense_publisher_id'));
test('Ad slots are separated with generous vertical spacing',slot.includes('my-12')&&slot.includes('py-8'));
test('Development preview requires an explicit flag',slot.includes("VITE_AD_PREVIEW === 'true'"));
test('No ad click instrumentation exists',!`${loader}${slot}`.match(/onClick|addEventListener\(['"]click/));

const db=new DB();let response=await handleAdsTxt(db);let text=await response.text();
test('ads.txt has no fabricated seller record when disabled',!text.includes('google.com, pub-'));
test('ads.txt explains unconfigured state without a fake ID',text.includes('not configured'));
await updatePublicSettings(db,{ads_enabled:'true',adsense_enabled:'true',adsense_publisher_id:'ca-pub-1234567890123456'});response=await handleAdsTxt(db);text=await response.text();
test('ads.txt uses only configured publisher ID',text.includes('google.com, pub-1234567890123456, DIRECT'));

const valid={title:'Useful Hosting',slug:'useful-hosting',description:'A relevant hosting option for developers.',destinationUrl:'https://example.com/hosting?ref=t4g',category:'hosting',imageUrl:null,ctaText:'View hosting',disclosureText:'Affiliate link',status:'published',featured:true,sortOrder:2,entityType:'tool',entityId:'word-counter'};
response=await handleAdminAffiliateSave(new Request('https://test/api/admin/affiliate-offers',{method:'POST',body:JSON.stringify(valid)}),db);const created=await body(response);
test('Admin handler can create affiliate offer',response.status===201&&created.data.id===1);
test('Offer destination is stored from trusted D1 input',db.offers[0].destination_url.startsWith('https://example.com/'));
response=await worker.fetch(new Request('https://test/api/admin/affiliate-offers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)}),{DB:db});
test('Unauthorized affiliate mutation is rejected',response.status===401);
db.settings.set('affiliate_enabled','true');response=await handlePublicAffiliateOffers(new Request('https://test/api/affiliate-offers?entityType=tool&entityId=word-counter'),db);let publicBody=await body(response);
test('Published contextual offer appears publicly',publicBody.data.length===1&&publicBody.data[0].title==='Useful Hosting');
test('Public offer omits internal status and timestamps',!('status'in publicBody.data[0])&&!('updatedAt'in publicBody.data[0]));
db.offers.push({...db.offers[0],id:2,slug:'draft-offer',status:'draft'}, {...db.offers[0],id:3,slug:'hidden-offer',status:'hidden'});
response=await handlePublicAffiliateOffers(new Request('https://test/api/affiliate-offers'),db);publicBody=await body(response);
test('Draft offer is hidden publicly',!publicBody.data.some(o=>o.id===2));
test('Hidden offer is hidden publicly',!publicBody.data.some(o=>o.id===3));
response=await handleAdminAffiliateSave(new Request('https://test/api/admin/affiliate-offers',{method:'POST',body:JSON.stringify({...valid,slug:'unsafe',destinationUrl:'javascript:alert(1)'})}),db);
test('Unsafe affiliate URL is rejected',response.status===400);
response=await handleAdminAffiliateSave(new Request('https://test/api/admin/affiliate-offers',{method:'POST',body:JSON.stringify({...valid,slug:'data-url',destinationUrl:'data:text/html,bad'})}),db);
test('Data URL is rejected',response.status===400);
const resources=read('src/components/monetization/RecommendedResources.tsx');
test('Affiliate links use sponsored/noopener/noreferrer',resources.includes('sponsored noopener noreferrer'));
test('Affiliate content is rendered as React text, not injected HTML',!resources.includes('dangerouslySetInnerHTML'));
test('No arbitrary redirect target is accepted',!read('worker/src/routes/monetization.ts').includes('searchParams.get(\'url\')'));
response=await handleAffiliateClick(new Request('https://test/api/affiliate-offers/1/click',{method:'POST',body:JSON.stringify({sessionId:'anonymous_session_123456789'})}), '1', db);
test('Affiliate click analytics is accepted for published trusted offer',response.status===201);
test('Affiliate analytics records trusted offer ID',db.events.at(-1).entity_id==='1'&&db.events.at(-1).entity_type==='affiliate_offer');
test('Affiliate analytics stores no destination or token',!JSON.stringify(db.events.at(-1)).includes('example.com')&&!JSON.stringify(db.events.at(-1)).includes('ref=t4g'));
response=await handleAffiliateClick(new Request('https://test/api/affiliate-offers/999/click',{method:'POST',body:JSON.stringify({sessionId:'anonymous_session_123456789'})}), '999', db);
test('Unknown affiliate offer cannot be tracked or redirected',response.status===404);
const before=(await getPlatformMetrics(db)).revenue;await db.prepare('INSERT INTO analytics_events(session_id, customer_user_id, event_name, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind('analytics_session_123456789',null,'payment_success','order','fake','now').run();const after=(await getPlatformMetrics(db)).revenue;
test('Project revenue remains authoritative from paid orders',before===1250);
test('Analytics event cannot increase revenue',after===before);
test('Free tool is accessible anonymously',canAccessTool({accessTier:'free'}).allowed===true);
test('Legacy tool defaults to free access',canAccessTool({}).allowed===true);
test('Premium tool grants no fake entitlement',canAccessTool({accessTier:'premium'}).allowed===false);
test('Coming-soon tier is unavailable',canAccessTool({accessTier:'coming-soon'}).allowed===false);
await updatePublicSettings(db,{affiliate_enabled:'true',premium_features_enabled:'false'});
test('Monetization flags update through parameterized settings service',db.settings.get('affiliate_enabled')==='true'&&db.settings.get('premium_features_enabled')==='false');
const publicKeys=read('worker/src/services/platform.ts');
test('Public settings expose no credential secrets',!publicKeys.includes("'RAZORPAY_KEY_SECRET'")&&!publicKeys.includes("'RESEND_API_KEY'"));
test('Privacy includes conditional advertising and consent wording',read('src/pages/PrivacyPage.tsx').includes('If advertising is enabled')&&read('src/pages/PrivacyPage.tsx').includes('consent-management provider'));
test('Terms include affiliate disclosure',read('src/pages/TermsPage.tsx').includes('sponsored or affiliate link'));
test('Affiliate container includes dark-mode readability styles',resources.includes('dark:bg-surface-900')&&resources.includes('dark:text-surface-300'));
test('Monetization containers avoid fixed widths and overlays',!`${resources}${slot}`.includes('fixed')&&!`${resources}${slot}`.includes('min-w-['));
test('Existing route-level SEO metadata remains in tool detail',read('src/pages/ToolDetailPage.tsx').includes('<SEO')&&read('src/pages/ToolDetailPage.tsx').includes('canonicalPath'));
test('Affiliate offers do not create thin public routes',!read('src/router.tsx').includes('affiliate/:'));
test('Migration defaults all monetization channels off',read('worker/migrations/0014_add_monetization.sql').includes("('adsense_enabled', 'false'")&&read('worker/migrations/0014_add_monetization.sql').includes("('affiliate_enabled', 'false'")&&read('worker/migrations/0014_add_monetization.sql').includes("('premium_features_enabled', 'false'"));
response=await worker.fetch(new Request('https://test/api/affiliate-offers',{method:'POST'}),{DB:db});
test('Wrong public affiliate method returns 405',response.status===405);

console.log(`\nPhase 15 monetization: ${passed}/${passed+failed} tests passed.`);if(failed)process.exit(1);
