import { IndustryId } from '@/types';
export const CATEGORIES: {id:string; name:string; industry:IndustryId}[] = [
  {id:'recruitment',name:'Tuyển dụng',industry:'recruitment'},
  {id:'education',name:'Khóa học',industry:'education'},
  {id:'event',name:'Sự kiện',industry:'service'},
  {id:'food',name:'Ẩm thực',industry:'general'},
  {id:'beauty',name:'Làm đẹp',industry:'service'},
  {id:'property',name:'Bất động sản',industry:'service'},
  {id:'travel',name:'Du lịch',industry:'service'},
  {id:'retail',name:'Sản phẩm',industry:'general'},
  {id:'fitness',name:'Thể thao',industry:'service'},
  {id:'technology',name:'App & công nghệ',industry:'general'},
  {id:'personal',name:'Thương hiệu cá nhân',industry:'service'},
  {id:'service',name:'Dịch vụ',industry:'service'},
];
export const TEMPLATES = [
  {id:'editorial',name:'Editorial',description:'Ảnh dọc • tiêu đề lớn • nội dung chia cột',categories:['recruitment','education','personal','service'],bg:'#f2ede3',ink:'#202d28',accent:'#cc472c',photo:true},
  {id:'spotlight',name:'Product spotlight',description:'Sản phẩm nguyên vẹn • thông điệp • ưu đãi',categories:['retail','beauty','food','technology'],bg:'#f4e8d9',ink:'#44291d',accent:'#a83625',photo:true},
  {id:'billboard',name:'Bold announcement',description:'Typography lớn • thông tin nổi bật • tương phản',categories:['event','fitness','recruitment','technology'],bg:'#e4fc73',ink:'#152821',accent:'#152821',photo:false},
  {id:'magazine',name:'Photo journal',description:'Ảnh ngang • tiêu đề • thông tin theo hàng',categories:['travel','property','food','personal','beauty'],bg:'#f8f5ee',ink:'#242e38',accent:'#805031',photo:true},
  {id:'agenda',name:'Program & details',description:'Nội dung dài • danh sách có phân cấp • chia trang',categories:['education','event','recruitment','service','technology'],bg:'#eeeaff',ink:'#302453',accent:'#6241bb',photo:false},
  {id:'portrait',name:'Expert profile',description:'Chân dung • thông điệp • thông tin chuyên môn',categories:['personal','education','fitness','beauty','service','property','travel'],bg:'#173e38',ink:'#fff6e6',accent:'#ecd6a0',photo:true},
] as const;
export type TemplateId = typeof TEMPLATES[number]['id'];
