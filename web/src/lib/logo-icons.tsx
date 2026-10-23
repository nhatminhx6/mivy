import {
  Storefront, ShoppingBag, ShoppingCart, Coffee, ForkKnife, Pizza, Cake, IceCream, Hamburger, Fish,
  BeerBottle, Wine, Cookie, Martini, Carrot, Egg, Shrimp, Avocado,
  Leaf, Flower, Tree, Plant, Butterfly, Cactus, FlowerLotus, Rainbow, Snowflake, Cloud,
  Heart, Star, Sparkle, Diamond, Crown, Medal, CheckCircle, ThumbsUp, Smiley, HandHeart,
  Camera, Image as ImageIcon, VideoCamera, MusicNotes, Microphone, Palette, PaintBrush, Scissors, TShirt, Gift,
  Dress, Sneaker, Handbag, Watch, Sunglasses,
  Barbell, Bicycle, Waves, Airplane, MapPin, Mountains, Sun, Moon, Drop, Flame,
  Rocket, Lightning, Lightbulb, Code, DeviceMobile, Laptop, Globe, Buildings, House, Briefcase,
  Robot, Cpu, Monitor, Gear, Headphones, GameController,
  Tag, Package, Truck, CreditCard, Receipt, Handshake, Megaphone, Percent,
  GraduationCap, BookOpen, PencilSimple, Notebook, Backpack, Certificate, Calculator, PenNib,
  Stethoscope, Heartbeat, Pill, FirstAid, Basketball, SoccerBall, PersonSimpleRun,
  Dog, Cat, Baby, PawPrint, Bird, Rabbit, Bone, Horse,
  Car, Wrench, WifiHigh, Bus, Train, Boat, Compass, SuitcaseRolling, Motorcycle,
  // bổ sung (đã kiểm có trong @phosphor-icons/react)
  Cow, FishSimple, Bug, BugBeetle, Feather, BabyCarriage,
  Lamp, Chair, Armchair, Couch, Bed, Bathtub, Shower, Door, Key, Lock, Umbrella, Clock, Hourglass, Alarm, Bell, Flashlight,
  PottedPlant, Television, Radio, Hammer, Screwdriver, Toolbox, PaintRoller, PaintBucket, Ruler, Needle,
  Cherries, Orange, OrangeSlice, Grains, Bread, Popcorn, Cheese, Pepper, CoffeeBean, BowlFood, BowlSteam, Champagne, Jar, CookingPot, Knife, BeerStein,
  Sock, Pants, Hoodie, BaseballCap, Eyeglasses, HairDryer, Goggles,
  TreePalm, TreeEvergreen, FlowerTulip, Clover, Wind, Fire, Planet,
  Basket, Tote, ShoppingBagOpen, Barcode, QrCode, Wallet, Coins, Money, PiggyBank, Trophy, Ticket, Balloon, Confetti, Warehouse, Factory, Bank,
  Desktop, Keyboard, Mouse, DeviceTablet, Joystick, Printer, Headset, Plug, BatteryFull, SolarPanel, Atom, Flask, Microscope, Dna, Cube,
  Bandaids, Syringe, Thermometer, Tooth, Eye, Brain, Hand, Footprints, Hospital,
  Books, Newspaper, Pen, Calendar, Envelope, Translate, Flag, Target,
  Anchor, Sailboat, Tent, Campfire, Binoculars, Scooter, Van, Taxi, Tractor, GasPump,
  Shield, ShieldCheck, Infinity as InfinityIcon, Peace, YinYang, MusicNote, SpeakerHigh, Recycle, FilmSlate, Guitar, PianoKeys,
  type Icon,
} from '@phosphor-icons/react';

export const ICON_CATS: { id: string; name: string }[] = [
  { id: 'food', name: 'Ẩm thực' },
  { id: 'fashion', name: 'Thời trang & làm đẹp' },
  { id: 'nature', name: 'Thiên nhiên' },
  { id: 'shop', name: 'Mua sắm & dịch vụ' },
  { id: 'tech', name: 'Công nghệ' },
  { id: 'pet', name: 'Động vật & thú cưng' },
  { id: 'home', name: 'Đồ vật & gia dụng' },
  { id: 'baby', name: 'Mẹ & bé' },
  { id: 'health', name: 'Sức khoẻ & thể thao' },
  { id: 'edu', name: 'Giáo dục & văn phòng' },
  { id: 'travel', name: 'Du lịch & xe' },
  { id: 'symbol', name: 'Biểu tượng' },
];

export const LOGO_ICONS: { id: string; cat: string; Comp: Icon }[] = [
  // Ẩm thực
  { id: 'store', cat: 'food', Comp: Storefront }, { id: 'coffee', cat: 'food', Comp: Coffee }, { id: 'utensils', cat: 'food', Comp: ForkKnife },
  { id: 'pizza', cat: 'food', Comp: Pizza }, { id: 'cake', cat: 'food', Comp: Cake }, { id: 'icecream', cat: 'food', Comp: IceCream },
  { id: 'burger', cat: 'food', Comp: Hamburger }, { id: 'fish', cat: 'food', Comp: Fish }, { id: 'beer', cat: 'food', Comp: BeerBottle },
  { id: 'wine', cat: 'food', Comp: Wine }, { id: 'cookie', cat: 'food', Comp: Cookie }, { id: 'martini', cat: 'food', Comp: Martini },
  { id: 'carrot', cat: 'food', Comp: Carrot }, { id: 'egg', cat: 'food', Comp: Egg }, { id: 'shrimp', cat: 'food', Comp: Shrimp }, { id: 'avocado', cat: 'food', Comp: Avocado },
  // Thời trang & làm đẹp
  { id: 'shirt', cat: 'fashion', Comp: TShirt }, { id: 'dress', cat: 'fashion', Comp: Dress }, { id: 'sneaker', cat: 'fashion', Comp: Sneaker },
  { id: 'handbag', cat: 'fashion', Comp: Handbag }, { id: 'watch', cat: 'fashion', Comp: Watch }, { id: 'sunglasses', cat: 'fashion', Comp: Sunglasses },
  { id: 'scissors', cat: 'fashion', Comp: Scissors }, { id: 'palette', cat: 'fashion', Comp: Palette }, { id: 'brush', cat: 'fashion', Comp: PaintBrush },
  { id: 'gem', cat: 'fashion', Comp: Diamond }, { id: 'crown', cat: 'fashion', Comp: Crown },
  // Thiên nhiên
  { id: 'leaf', cat: 'nature', Comp: Leaf }, { id: 'flower', cat: 'nature', Comp: Flower }, { id: 'tree', cat: 'nature', Comp: Tree },
  { id: 'sprout', cat: 'nature', Comp: Plant }, { id: 'butterfly', cat: 'nature', Comp: Butterfly }, { id: 'cactus', cat: 'nature', Comp: Cactus },
  { id: 'lotus', cat: 'nature', Comp: FlowerLotus }, { id: 'rainbow', cat: 'nature', Comp: Rainbow }, { id: 'snow', cat: 'nature', Comp: Snowflake },
  { id: 'cloud', cat: 'nature', Comp: Cloud }, { id: 'waves', cat: 'nature', Comp: Waves }, { id: 'mountain', cat: 'nature', Comp: Mountains },
  { id: 'sun', cat: 'nature', Comp: Sun }, { id: 'moon', cat: 'nature', Comp: Moon }, { id: 'droplets', cat: 'nature', Comp: Drop }, { id: 'flame', cat: 'nature', Comp: Flame },
  // Mua sắm & dịch vụ
  { id: 'bag', cat: 'shop', Comp: ShoppingBag }, { id: 'cart', cat: 'shop', Comp: ShoppingCart }, { id: 'gift', cat: 'shop', Comp: Gift },
  { id: 'tag', cat: 'shop', Comp: Tag }, { id: 'package', cat: 'shop', Comp: Package }, { id: 'truck', cat: 'shop', Comp: Truck },
  { id: 'card', cat: 'shop', Comp: CreditCard }, { id: 'receipt', cat: 'shop', Comp: Receipt }, { id: 'handshake', cat: 'shop', Comp: Handshake },
  { id: 'mega', cat: 'shop', Comp: Megaphone }, { id: 'percent', cat: 'shop', Comp: Percent }, { id: 'award', cat: 'shop', Comp: Medal },
  { id: 'briefcase', cat: 'shop', Comp: Briefcase }, { id: 'building', cat: 'shop', Comp: Buildings }, { id: 'home', cat: 'shop', Comp: House },
  // Công nghệ
  { id: 'code', cat: 'tech', Comp: Code }, { id: 'phone', cat: 'tech', Comp: DeviceMobile }, { id: 'laptop', cat: 'tech', Comp: Laptop },
  { id: 'globe', cat: 'tech', Comp: Globe }, { id: 'rocket', cat: 'tech', Comp: Rocket }, { id: 'zap', cat: 'tech', Comp: Lightning },
  { id: 'bulb', cat: 'tech', Comp: Lightbulb }, { id: 'wifi', cat: 'tech', Comp: WifiHigh }, { id: 'robot', cat: 'tech', Comp: Robot },
  { id: 'cpu', cat: 'tech', Comp: Cpu }, { id: 'monitor', cat: 'tech', Comp: Monitor }, { id: 'gear', cat: 'tech', Comp: Gear },
  { id: 'headphones', cat: 'tech', Comp: Headphones }, { id: 'game', cat: 'tech', Comp: GameController },
  // Thú cưng & bé
  { id: 'dog', cat: 'pet', Comp: Dog }, { id: 'cat', cat: 'pet', Comp: Cat }, { id: 'baby', cat: 'baby', Comp: Baby },
  { id: 'paw', cat: 'pet', Comp: PawPrint }, { id: 'bird', cat: 'pet', Comp: Bird }, { id: 'rabbit', cat: 'pet', Comp: Rabbit },
  { id: 'bone', cat: 'pet', Comp: Bone }, { id: 'horse', cat: 'pet', Comp: Horse },
  // Sức khoẻ & thể thao
  { id: 'dumbbell', cat: 'health', Comp: Barbell }, { id: 'bike', cat: 'health', Comp: Bicycle }, { id: 'health', cat: 'health', Comp: Stethoscope },
  { id: 'heartbeat', cat: 'health', Comp: Heartbeat }, { id: 'pill', cat: 'health', Comp: Pill }, { id: 'firstaid', cat: 'health', Comp: FirstAid },
  { id: 'basketball', cat: 'health', Comp: Basketball }, { id: 'soccer', cat: 'health', Comp: SoccerBall }, { id: 'run', cat: 'health', Comp: PersonSimpleRun },
  // Giáo dục & văn phòng
  { id: 'grad', cat: 'edu', Comp: GraduationCap }, { id: 'book', cat: 'edu', Comp: BookOpen }, { id: 'pencil', cat: 'edu', Comp: PencilSimple },
  { id: 'notebook', cat: 'edu', Comp: Notebook }, { id: 'backpack', cat: 'edu', Comp: Backpack }, { id: 'cert', cat: 'edu', Comp: Certificate },
  { id: 'calc', cat: 'edu', Comp: Calculator }, { id: 'pennib', cat: 'edu', Comp: PenNib },
  // Du lịch & xe
  { id: 'plane', cat: 'travel', Comp: Airplane }, { id: 'map', cat: 'travel', Comp: MapPin }, { id: 'car', cat: 'travel', Comp: Car },
  { id: 'wrench', cat: 'travel', Comp: Wrench }, { id: 'bus', cat: 'travel', Comp: Bus }, { id: 'train', cat: 'travel', Comp: Train },
  { id: 'boat', cat: 'travel', Comp: Boat }, { id: 'compass', cat: 'travel', Comp: Compass }, { id: 'suitcase', cat: 'travel', Comp: SuitcaseRolling },
  { id: 'moto', cat: 'travel', Comp: Motorcycle },
  // Biểu tượng
  { id: 'heart', cat: 'symbol', Comp: Heart }, { id: 'star', cat: 'symbol', Comp: Star }, { id: 'sparkles', cat: 'symbol', Comp: Sparkle },
  { id: 'check', cat: 'symbol', Comp: CheckCircle }, { id: 'thumb', cat: 'symbol', Comp: ThumbsUp }, { id: 'smiley', cat: 'symbol', Comp: Smiley },
  { id: 'handheart', cat: 'symbol', Comp: HandHeart }, { id: 'camera', cat: 'symbol', Comp: Camera }, { id: 'image', cat: 'symbol', Comp: ImageIcon },
  { id: 'video', cat: 'symbol', Comp: VideoCamera }, { id: 'music', cat: 'symbol', Comp: MusicNotes }, { id: 'mic', cat: 'symbol', Comp: Microphone },

  // ===== Bổ sung =====
  // Ẩm thực
  { id: 'cherries', cat: 'food', Comp: Cherries }, { id: 'orange', cat: 'food', Comp: Orange }, { id: 'orange-slice', cat: 'food', Comp: OrangeSlice },
  { id: 'grains', cat: 'food', Comp: Grains }, { id: 'bread', cat: 'food', Comp: Bread }, { id: 'popcorn', cat: 'food', Comp: Popcorn },
  { id: 'cheese', cat: 'food', Comp: Cheese }, { id: 'pepper', cat: 'food', Comp: Pepper }, { id: 'coffee-bean', cat: 'food', Comp: CoffeeBean },
  { id: 'bowl-food', cat: 'food', Comp: BowlFood }, { id: 'bowl-steam', cat: 'food', Comp: BowlSteam }, { id: 'champagne', cat: 'food', Comp: Champagne },
  { id: 'jar', cat: 'food', Comp: Jar }, { id: 'pot', cat: 'food', Comp: CookingPot }, { id: 'knife', cat: 'food', Comp: Knife }, { id: 'beer-stein', cat: 'food', Comp: BeerStein },
  // Thời trang & làm đẹp
  { id: 'sock', cat: 'fashion', Comp: Sock }, { id: 'pants', cat: 'fashion', Comp: Pants }, { id: 'hoodie', cat: 'fashion', Comp: Hoodie },
  { id: 'cap', cat: 'fashion', Comp: BaseballCap }, { id: 'glasses', cat: 'fashion', Comp: Eyeglasses }, { id: 'hairdryer', cat: 'fashion', Comp: HairDryer },
  { id: 'goggles', cat: 'fashion', Comp: Goggles }, { id: 'needle', cat: 'fashion', Comp: Needle },
  // Thiên nhiên
  { id: 'palm', cat: 'nature', Comp: TreePalm }, { id: 'pine', cat: 'nature', Comp: TreeEvergreen }, { id: 'tulip', cat: 'nature', Comp: FlowerTulip },
  { id: 'clover', cat: 'nature', Comp: Clover }, { id: 'wind', cat: 'nature', Comp: Wind }, { id: 'fire', cat: 'nature', Comp: Fire },
  { id: 'planet', cat: 'nature', Comp: Planet }, { id: 'potted', cat: 'nature', Comp: PottedPlant },
  // Mua sắm & dịch vụ
  { id: 'basket', cat: 'shop', Comp: Basket }, { id: 'tote', cat: 'shop', Comp: Tote }, { id: 'bag-open', cat: 'shop', Comp: ShoppingBagOpen },
  { id: 'barcode', cat: 'shop', Comp: Barcode }, { id: 'qr', cat: 'shop', Comp: QrCode }, { id: 'wallet', cat: 'shop', Comp: Wallet },
  { id: 'coins', cat: 'shop', Comp: Coins }, { id: 'money', cat: 'shop', Comp: Money }, { id: 'piggy', cat: 'shop', Comp: PiggyBank },
  { id: 'trophy', cat: 'shop', Comp: Trophy }, { id: 'ticket', cat: 'shop', Comp: Ticket }, { id: 'balloon', cat: 'shop', Comp: Balloon },
  { id: 'confetti', cat: 'shop', Comp: Confetti }, { id: 'warehouse', cat: 'shop', Comp: Warehouse }, { id: 'factory', cat: 'shop', Comp: Factory }, { id: 'bank', cat: 'shop', Comp: Bank },
  // Công nghệ
  { id: 'desktop', cat: 'tech', Comp: Desktop }, { id: 'keyboard', cat: 'tech', Comp: Keyboard }, { id: 'mouse', cat: 'tech', Comp: Mouse },
  { id: 'tablet', cat: 'tech', Comp: DeviceTablet }, { id: 'joystick', cat: 'tech', Comp: Joystick }, { id: 'printer', cat: 'tech', Comp: Printer },
  { id: 'headset', cat: 'tech', Comp: Headset }, { id: 'plug', cat: 'tech', Comp: Plug }, { id: 'battery', cat: 'tech', Comp: BatteryFull },
  { id: 'solar', cat: 'tech', Comp: SolarPanel }, { id: 'atom', cat: 'tech', Comp: Atom }, { id: 'flask', cat: 'tech', Comp: Flask },
  { id: 'microscope', cat: 'tech', Comp: Microscope }, { id: 'dna', cat: 'tech', Comp: Dna }, { id: 'cube', cat: 'tech', Comp: Cube },
  // Động vật & thú cưng
  { id: 'cow', cat: 'pet', Comp: Cow }, { id: 'fish-simple', cat: 'pet', Comp: FishSimple }, { id: 'bug', cat: 'pet', Comp: Bug },
  { id: 'beetle', cat: 'pet', Comp: BugBeetle }, { id: 'feather', cat: 'pet', Comp: Feather },
  // Đồ vật & gia dụng
  { id: 'lamp', cat: 'home', Comp: Lamp }, { id: 'chair', cat: 'home', Comp: Chair }, { id: 'armchair', cat: 'home', Comp: Armchair },
  { id: 'couch', cat: 'home', Comp: Couch }, { id: 'bed', cat: 'home', Comp: Bed }, { id: 'bathtub', cat: 'home', Comp: Bathtub },
  { id: 'shower', cat: 'home', Comp: Shower }, { id: 'door', cat: 'home', Comp: Door }, { id: 'key', cat: 'home', Comp: Key },
  { id: 'lock', cat: 'home', Comp: Lock }, { id: 'umbrella', cat: 'home', Comp: Umbrella }, { id: 'clock', cat: 'home', Comp: Clock },
  { id: 'hourglass', cat: 'home', Comp: Hourglass }, { id: 'alarm', cat: 'home', Comp: Alarm }, { id: 'bell', cat: 'home', Comp: Bell },
  { id: 'flashlight', cat: 'home', Comp: Flashlight }, { id: 'tv', cat: 'home', Comp: Television }, { id: 'radio', cat: 'home', Comp: Radio },
  { id: 'hammer', cat: 'home', Comp: Hammer }, { id: 'screwdriver', cat: 'home', Comp: Screwdriver }, { id: 'toolbox', cat: 'home', Comp: Toolbox },
  { id: 'roller', cat: 'home', Comp: PaintRoller }, { id: 'bucket', cat: 'home', Comp: PaintBucket }, { id: 'ruler', cat: 'home', Comp: Ruler },
  // Mẹ & bé
  { id: 'stroller', cat: 'baby', Comp: BabyCarriage },
  // Sức khoẻ & thể thao
  { id: 'bandaid', cat: 'health', Comp: Bandaids }, { id: 'syringe', cat: 'health', Comp: Syringe }, { id: 'thermo', cat: 'health', Comp: Thermometer },
  { id: 'tooth', cat: 'health', Comp: Tooth }, { id: 'eye', cat: 'health', Comp: Eye }, { id: 'brain', cat: 'health', Comp: Brain },
  { id: 'hand', cat: 'health', Comp: Hand }, { id: 'footprints', cat: 'health', Comp: Footprints }, { id: 'hospital', cat: 'health', Comp: Hospital },
  // Giáo dục & văn phòng
  { id: 'books', cat: 'edu', Comp: Books }, { id: 'news', cat: 'edu', Comp: Newspaper }, { id: 'pen', cat: 'edu', Comp: Pen },
  { id: 'calendar', cat: 'edu', Comp: Calendar }, { id: 'envelope', cat: 'edu', Comp: Envelope }, { id: 'translate', cat: 'edu', Comp: Translate },
  { id: 'flag', cat: 'edu', Comp: Flag }, { id: 'target', cat: 'edu', Comp: Target },
  // Du lịch & xe
  { id: 'anchor', cat: 'travel', Comp: Anchor }, { id: 'sailboat', cat: 'travel', Comp: Sailboat }, { id: 'tent', cat: 'travel', Comp: Tent },
  { id: 'campfire', cat: 'travel', Comp: Campfire }, { id: 'binoculars', cat: 'travel', Comp: Binoculars }, { id: 'scooter', cat: 'travel', Comp: Scooter },
  { id: 'van', cat: 'travel', Comp: Van }, { id: 'taxi', cat: 'travel', Comp: Taxi }, { id: 'tractor', cat: 'travel', Comp: Tractor }, { id: 'gas', cat: 'travel', Comp: GasPump },
  // Biểu tượng
  { id: 'shield', cat: 'symbol', Comp: Shield }, { id: 'shield-check', cat: 'symbol', Comp: ShieldCheck }, { id: 'infinity', cat: 'symbol', Comp: InfinityIcon },
  { id: 'peace', cat: 'symbol', Comp: Peace }, { id: 'yinyang', cat: 'symbol', Comp: YinYang }, { id: 'note', cat: 'symbol', Comp: MusicNote },
  { id: 'speaker', cat: 'symbol', Comp: SpeakerHigh }, { id: 'recycle', cat: 'symbol', Comp: Recycle }, { id: 'film', cat: 'symbol', Comp: FilmSlate },
  { id: 'guitar', cat: 'symbol', Comp: Guitar }, { id: 'piano', cat: 'symbol', Comp: PianoKeys },
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
