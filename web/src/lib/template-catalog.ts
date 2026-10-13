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
const ALL = ['recruitment','education','event','food','beauty','property','travel','retail','fitness','technology','personal','service'];
export const TEMPLATES = [
  {id:'editorial',layout:'editorial',name:'Editorial',description:'Ảnh dọc • tiêu đề lớn • nội dung chia cột',categories:['recruitment','education','personal','service'],bg:'#f2ede3',ink:'#202d28',accent:'#cc472c',photo:true},
  {id:'spotlight',layout:'spotlight',name:'Product spotlight',description:'Sản phẩm nguyên vẹn • thông điệp • ưu đãi',categories:['retail','beauty','food','technology'],bg:'#f4e8d9',ink:'#44291d',accent:'#a83625',photo:true},
  {id:'billboard',layout:'billboard',name:'Bold announcement',description:'Typography lớn • thông tin nổi bật • tương phản',categories:['event','fitness','recruitment','technology'],bg:'#e4fc73',ink:'#152821',accent:'#152821',photo:false},
  {id:'magazine',layout:'magazine',name:'Photo journal',description:'Ảnh ngang • tiêu đề • thông tin theo hàng',categories:['travel','property','food','personal','beauty'],bg:'#f8f5ee',ink:'#242e38',accent:'#805031',photo:true},
  {id:'agenda',layout:'agenda',name:'Program & details',description:'Nội dung dài • danh sách phân cấp • chia trang',categories:['education','event','recruitment','service','technology'],bg:'#eeeaff',ink:'#302453',accent:'#6241bb',photo:false},
  {id:'portrait',layout:'portrait',name:'Expert profile',description:'Chân dung • thông điệp • thông tin chuyên môn',categories:['personal','education','fitness','beauty','service','property','travel'],bg:'#173e38',ink:'#fff6e6',accent:'#ecd6a0',photo:true},
  // --- Mẫu bổ sung (đa dạng bố cục + phối màu) ---
  {id:'banner-amber',layout:'banner',name:'Băng rôn cam',description:'Tiêu đề lớn bên trái • ảnh bên phải',categories:ALL,bg:'#fef3e2',ink:'#3a2a12',accent:'#f97316',photo:true},
  {id:'banner-sky',layout:'banner',name:'Băng rôn xanh',description:'Tiêu đề lớn bên trái • ảnh bên phải',categories:ALL,bg:'#eaf2fe',ink:'#0e2546',accent:'#2f80ed',photo:true},
  {id:'sale-hot',layout:'sale',name:'Khuyến mãi đỏ',description:'Chữ lớn bắt mắt • nhấn ưu đãi',categories:ALL,bg:'#fff0ee',ink:'#4a0d0d',accent:'#e23d28',photo:false},
  {id:'sale-gold',layout:'sale',name:'Ưu đãi vàng',description:'Chữ lớn bắt mắt • nền tối sang',categories:ALL,bg:'#161008',ink:'#fff6e6',accent:'#eab308',photo:false},
  {id:'minimal-light',layout:'minimal',name:'Tối giản sáng',description:'Ít chi tiết • nhiều khoảng thở',categories:ALL,bg:'#f6f6f4',ink:'#1a1a1a',accent:'#10b981',photo:false},
  {id:'minimal-dark',layout:'minimal',name:'Tối giản đậm',description:'Nền tối • chữ nổi • hiện đại',categories:ALL,bg:'#141414',ink:'#f5f5f5',accent:'#a3e635',photo:false},
  {id:'frame-emerald',layout:'frame',name:'Khung viền xanh',description:'Viền nổi bật • nội dung ở giữa',categories:ALL,bg:'#0f2e24',ink:'#eafff5',accent:'#34d399',photo:true},
  {id:'frame-rose',layout:'frame',name:'Khung viền hồng',description:'Viền nổi bật • nội dung ở giữa',categories:ALL,bg:'#2a0f1c',ink:'#ffeef5',accent:'#ec4899',photo:true},
] as const;
export type TemplateId = typeof TEMPLATES[number]['id'];
