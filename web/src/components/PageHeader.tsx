// Tiêu đề trang chuẩn studio: title + mô tả + action phải, có divider hairline.
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5 mb-7 border-b border-white/[0.07]">
      <div>
        <h1 className="mv-h1">{title}</h1>
        {sub && <p className="mv-sub max-w-xl">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
