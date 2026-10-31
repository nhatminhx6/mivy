import { redirect } from 'next/navigation';

// Đã gộp vào trang Ảnh & video sản phẩm (tab Video)
export default function Page() { redirect('/studio/image?tab=video'); }
