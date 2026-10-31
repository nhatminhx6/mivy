import { redirect } from 'next/navigation';

// Đã gộp vào trang Ảnh & video sản phẩm (tab Banner giá)
export default function Page() { redirect('/studio/image?tab=banner'); }
