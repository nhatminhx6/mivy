import { redirect } from 'next/navigation';

// Đã gộp vào trang Ảnh & video sản phẩm (tab Người mẫu AI)
export default function Page() { redirect('/studio/image?tab=model'); }
