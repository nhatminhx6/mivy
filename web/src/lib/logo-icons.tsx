import {
  Storefront, ShoppingBag, ShoppingCart, Coffee, ForkKnife, Pizza, Cake, IceCream, Hamburger, Fish,
  Leaf, Flower, Tree, Plant, Heart, Star, Sparkle, Diamond, Crown, Medal,
  Camera, Image as ImageIcon, VideoCamera, MusicNotes, Microphone, Palette, PaintBrush, Scissors, TShirt, Gift,
  Barbell, Bicycle, Waves, Airplane, MapPin, Mountains, Sun, Moon, Drop, Flame,
  Rocket, Lightning, Lightbulb, Code, DeviceMobile, Laptop, Globe, Buildings, House, Briefcase,
  GraduationCap, BookOpen, Stethoscope, Dog, Cat, Baby, Car, Wrench, WifiHigh, type Icon,
} from '@phosphor-icons/react';

export const LOGO_ICONS: { id: string; Comp: Icon }[] = [
  { id: 'store', Comp: Storefront }, { id: 'bag', Comp: ShoppingBag }, { id: 'cart', Comp: ShoppingCart },
  { id: 'coffee', Comp: Coffee }, { id: 'utensils', Comp: ForkKnife }, { id: 'pizza', Comp: Pizza },
  { id: 'cake', Comp: Cake }, { id: 'icecream', Comp: IceCream }, { id: 'burger', Comp: Hamburger }, { id: 'fish', Comp: Fish },
  { id: 'leaf', Comp: Leaf }, { id: 'flower', Comp: Flower }, { id: 'tree', Comp: Tree }, { id: 'sprout', Comp: Plant },
  { id: 'heart', Comp: Heart }, { id: 'star', Comp: Star }, { id: 'sparkles', Comp: Sparkle }, { id: 'gem', Comp: Diamond },
  { id: 'crown', Comp: Crown }, { id: 'award', Comp: Medal }, { id: 'camera', Comp: Camera }, { id: 'image', Comp: ImageIcon },
  { id: 'video', Comp: VideoCamera }, { id: 'music', Comp: MusicNotes }, { id: 'mic', Comp: Microphone }, { id: 'palette', Comp: Palette },
  { id: 'brush', Comp: PaintBrush }, { id: 'scissors', Comp: Scissors }, { id: 'shirt', Comp: TShirt }, { id: 'gift', Comp: Gift },
  { id: 'dumbbell', Comp: Barbell }, { id: 'bike', Comp: Bicycle }, { id: 'waves', Comp: Waves }, { id: 'plane', Comp: Airplane },
  { id: 'map', Comp: MapPin }, { id: 'mountain', Comp: Mountains }, { id: 'sun', Comp: Sun }, { id: 'moon', Comp: Moon },
  { id: 'droplets', Comp: Drop }, { id: 'flame', Comp: Flame }, { id: 'rocket', Comp: Rocket }, { id: 'zap', Comp: Lightning },
  { id: 'bulb', Comp: Lightbulb }, { id: 'code', Comp: Code }, { id: 'phone', Comp: DeviceMobile }, { id: 'laptop', Comp: Laptop },
  { id: 'globe', Comp: Globe }, { id: 'building', Comp: Buildings }, { id: 'home', Comp: House }, { id: 'briefcase', Comp: Briefcase },
  { id: 'grad', Comp: GraduationCap }, { id: 'book', Comp: BookOpen }, { id: 'health', Comp: Stethoscope }, { id: 'dog', Comp: Dog },
  { id: 'cat', Comp: Cat }, { id: 'baby', Comp: Baby }, { id: 'car', Comp: Car }, { id: 'wrench', Comp: Wrench }, { id: 'wifi', Comp: WifiHigh },
];

export const iconById = (id: string): Icon =>
  LOGO_ICONS.find((i) => i.id === id)?.Comp || LOGO_ICONS[0].Comp;

// Gói icon pro từ Iconify, tải sẵn offline (0 network per-user). 'line' = Phosphor ở trên.
export const ICON_STYLES: { id: string; name: string }[] = [
  { id: '3d', name: '3D màu' },
  { id: 'phang', name: 'Phẳng màu' },
  { id: 'noto', name: 'Noto 3D' },
  { id: 'cute', name: 'Dễ thương' },
  { id: 'smooth', name: 'Phẳng mịn' },
  { id: 'duo', name: 'Nét đôi' },
  { id: 'solarbold', name: 'Đậm' },
  { id: 'material', name: 'Material' },
  { id: 'carbon', name: 'Carbon' },
  { id: 'tabler', name: 'Tabler' },
  { id: 'fluentf', name: 'Fluent' },
  { id: 'iconoir', name: 'Iconoir' },
  { id: 'phfill', name: 'Phosphor đặc' },
  { id: 'majestic', name: 'Majestic' },
  { id: 'line', name: 'Vector nét' },
];
// 10 concept chung cho mọi gói (kho tĩnh public/icons/<style>/<concept>.svg), gồm nhóm thiên nhiên.
export const AI_CONCEPTS: { id: string; label: string }[] = [
  { id: 'coffee', label: 'Cà phê' }, { id: 'heart', label: 'Tim' }, { id: 'star', label: 'Sao' },
  { id: 'camera', label: 'Máy ảnh' }, { id: 'gift', label: 'Quà' }, { id: 'home', label: 'Nhà' },
  { id: 'leaf', label: 'Lá' }, { id: 'flower', label: 'Hoa' }, { id: 'sun', label: 'Mặt trời' },
  { id: 'music', label: 'Nhạc' },
];
export const aiIconPath = (style: string, concept: string) => `/icons/${style}/${concept}.svg`;
