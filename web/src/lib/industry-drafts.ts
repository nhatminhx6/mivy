import { MarketingState } from '../types';
const key='mivy-industry-drafts-v2';
export function switchIndustry(current:MarketingState,category:string,industry:MarketingState['industry'],storage:Pick<Storage,'getItem'|'setItem'>):MarketingState {
  const id=current.categoryId || (current.industry==='general'?'retail':current.industry);
  if(id===category) return current;
  let drafts:Record<string,MarketingState>={};
  try{drafts=JSON.parse(storage.getItem(key)||'{}');}catch{}
  drafts[id]=current;
  storage.setItem(key,JSON.stringify(drafts));
  if(drafts[category]) return drafts[category];
  const empty={headline:'',subline:'',cta:'',caption:'',points:[]};
  return {...current,categoryId:category,industry,conceptId:undefined,templateId:undefined,industryFields:{},name:'',details:'',offer:'',goal:category,image:'',cutout:'',backgroundImage:'',bgUrl:'',facts:[],storyPage:0,copies:{launch:{...empty},story:{...empty},action:{...empty}}};
}
