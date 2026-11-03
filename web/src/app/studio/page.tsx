import { redirect } from 'next/navigation';

// Trang chính của studio = kho Mẫu thiết kế (trang Tổng quan cũ đã ẩn)
export default function Page() { redirect('/studio/templates'); }
