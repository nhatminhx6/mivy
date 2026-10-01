import { CopyItem } from '../types';

export const CONCEPTS = [
  { id: 'recruitment-announcement', name: 'Thông báo tuyển dụng', category: 'recruitment', description: 'Thông tin tuyển dụng rõ ràng, nhấn mạnh vị trí và phúc lợi.' },
  { id: 'recruitment-team', name: 'Hồ sơ đội ngũ', category: 'recruitment', description: 'Giới thiệu văn hóa và môi trường làm việc qua hình ảnh nhân viên.' },
  { id: 'property-architecture', name: 'Ảnh kiến trúc lớn', category: 'property', description: 'Tập trung vào không gian, kèm dải thông số kỹ thuật.' },
  { id: 'property-brochure', name: 'Chi tiết 1 ảnh', category: 'property', description: 'Chi tiết tiện ích, không gian tập trung vào 1 ảnh.' },
  { id: 'food-hero', name: 'Hero món ăn', category: 'food', description: 'Ảnh món ăn nổi bật với giá và ưu đãi.' },
  { id: 'food-menu', name: 'Menu combo', category: 'food', description: 'Danh sách món hoặc combo hấp dẫn.' }
];

export const INDUSTRY_FIELDS: Record<string, {key: string, label: string, multiline?: boolean, placeholder?: string, placeholderEn?: string}[]> = {
  'recruitment': [
    { key: 'role', label: 'Vị trí tuyển dụng', placeholder: 'VD: Senior Frontend Developer', placeholderEn: 'e.g. Senior Frontend Developer' },
    { key: 'salary', label: 'Mức lương', placeholder: 'Tùy chọn. VD: Lên đến 2,000 USD', placeholderEn: 'Optional. e.g. Up to 2,000 USD' },
    { key: 'location', label: 'Địa điểm', placeholder: 'VD: Quận 1, TP. HCM', placeholderEn: 'e.g. District 1, HCMC' },
    { key: 'requirements', label: 'Yêu cầu', multiline: true, placeholder: 'Các yêu cầu chính...', placeholderEn: 'Key requirements...' },
    { key: 'benefits', label: 'Quyền lợi', multiline: true, placeholder: 'Các phúc lợi...', placeholderEn: 'Benefits...' },
    { key: 'contact', label: 'Liên hệ', placeholder: 'Email hoặc SĐT', placeholderEn: 'Email or phone' }
  ],
  'property': [
    { key: 'type', label: 'Loại BĐS', placeholder: 'VD: Căn hộ cao cấp 2PN', placeholderEn: 'e.g. Luxury 2BR Apartment' },
    { key: 'price', label: 'Giá', placeholder: 'Tùy chọn. VD: 3.5 Tỷ', placeholderEn: 'Optional. e.g. 3.5 Billion' },
    { key: 'area', label: 'Diện tích', placeholder: 'VD: 75m2', placeholderEn: 'e.g. 75 sqm' },
    { key: 'address', label: 'Địa chỉ', placeholder: 'Vị trí dự án...', placeholderEn: 'Project location...' },
    { key: 'bedrooms', label: 'Phòng ngủ', placeholder: 'Số phòng ngủ, WC...', placeholderEn: 'Bedrooms, baths...' },
    { key: 'amenities', label: 'Tiện ích', multiline: true, placeholder: 'Hồ bơi, công viên...', placeholderEn: 'Pool, park...' },
    { key: 'contact', label: 'Liên hệ', placeholder: 'Hotline, email...', placeholderEn: 'Hotline, email...' }
  ],
  'food': [
    { key: 'item', label: 'Món/Combo', placeholder: 'VD: Combo Family Fiesta', placeholderEn: 'e.g. Family Fiesta Combo' },
    { key: 'price', label: 'Giá', placeholder: 'Tùy chọn. VD: 499.000đ', placeholderEn: 'Optional. e.g. $20' },
    { key: 'description', label: 'Mô tả', multiline: true, placeholder: 'Chi tiết các món...', placeholderEn: 'Dish details...' },
    { key: 'offer', label: 'Ưu đãi', placeholder: 'VD: Tặng kèm 1 tráng miệng', placeholderEn: 'e.g. Free dessert included' },
    { key: 'booking', label: 'Địa chỉ/Đặt món', placeholder: 'Hotline hoặc địa chỉ...', placeholderEn: 'Hotline or address...' }
  ]
};

export const EXAMPLES: Record<string, Record<string, string>> = {
  'recruitment': {
    role: 'Senior Frontend Developer',
    salary: 'Lên đến 2,000 USD',
    location: 'Quận 1, TP. HCM',
    requirements: '3+ năm kinh nghiệm React\nTiếng Anh giao tiếp tốt\nTư duy sản phẩm nhạy bén',
    benefits: 'Bảo hiểm sức khỏe cao cấp\nThưởng dự án và tháng 13\nThiết bị làm việc cấp cao',
    contact: 'hr@techcompany.com\n0901234567'
  },
  'property': {
    type: 'Căn hộ cao cấp',
    price: 'Tốt nhất thị trường 3.5 Tỷ',
    area: '75m2',
    address: 'Khu đô thị mới, TP. Thủ Đức',
    bedrooms: '2 Phòng ngủ | 2 WC',
    amenities: 'Hồ bơi vô cực\nPhòng gym chuẩn 5 sao\nCông viên ven sông',
    contact: 'Hotline: 0912345678\nsales@realestate.vn'
  },
  'food': {
    item: 'Combo Family Fiesta',
    price: '499.000đ',
    description: 'Pizza viền phô mai cỡ lớn\n2 Mì Ý hải sản\nSalad rau củ tươi ngon\n4 Nước ngọt tùy chọn',
    offer: 'Tặng kèm 1 tráng miệng khi đặt bàn trước',
    booking: '123 Đường Ẩm Thực, Quận 3\n0909090909'
  }
};

export function makeIndustryCopy(category: string, fields: Record<string, string>): CopyItem {
  const { __notes, ...visibleFields } = fields;
  const caption = Object.values(visibleFields).filter(Boolean).join('\n');
  switch (category) {
    case 'recruitment': return { 
      headline: fields.role || '', 
      subline: fields.salary || '', 
      cta: '', 
      caption, 
      points: (fields.requirements ? fields.requirements.split('\n') : []).concat(fields.benefits ? fields.benefits.split('\n') : []), 
      pointsEdited: false 
    };
    case 'property': return { 
      headline: fields.type || '', 
      subline: fields.price || '', 
      cta: '', 
      caption, 
      points: [fields.area,fields.address,fields.bedrooms,...(fields.amenities || '').split('\n')].filter(Boolean), 
      pointsEdited: false 
    };
    case 'food': return { 
      headline: fields.item || '', 
      subline: fields.price || '', 
      cta: '', 
      caption, 
      points: [...(fields.description || '').split('\n'),fields.offer].filter(Boolean), 
      pointsEdited: false 
    };
    default: return { headline: '', subline: '', cta: '', caption: '', points: [], pointsEdited: false };
  }
}
