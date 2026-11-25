'use client';
// Nút "Gửi yêu cầu in" + hộp đặt in: chưa đăng nhập thì đăng ký/đăng nhập NGAY trong hộp (không rời trang → không mất
// thiết kế) → điền số lượng, chất liệu, SĐT/Zalo, ngày cần → gửi kèm file in + ảnh xem trước. Admin báo giá qua Zalo.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Printer, X } from 'lucide-react';
import { authApi, orderApi, useAuth, type PrintOrder, type PrintProduct } from '@/lib/auth';

const QTY: Record<PrintProduct, number[]> = {
  card: [50, 100, 200, 300, 500],
  sticker: [50, 100, 200, 500, 1000],
  keychain: [10, 20, 50, 100, 200],
  hashtag: [1, 2, 5, 10, 20],
  cardvisit: [100, 200, 300, 500, 1000],
  standee: [1, 2, 3, 5, 10],
  packaging: [50, 100, 300, 500, 1000],
  flyer: [500, 1000, 2000, 5000, 10000],
  calendar: [20, 50, 100, 200, 500],
  envelope: [100, 200, 500, 1000, 2000],
  banner: [1, 2, 3, 5, 10],
  brochure: [100, 200, 500, 1000, 2000],
  seal: [500, 1000, 2000, 5000, 10000],
  pouch: [100, 300, 500, 1000, 3000],
  stationery: [100, 200, 500, 1000, 2000],
  cup: [500, 1000, 2000, 5000, 10000],
  tape: [20, 50, 100, 200, 500],
  tote: [50, 100, 200, 500, 1000],
  hangtag: [500, 1000, 2000, 5000, 10000],
  voucher: [100, 200, 500, 1000, 2000],
  badge: [10, 20, 50, 100, 200],
  notebook: [20, 50, 100, 200, 500],
  foodbox: [200, 500, 1000, 2000, 5000],
  tableware: [500, 1000, 2000, 5000, 10000],
  qrstand: [5, 10, 20, 50, 100],
  magnet: [200, 500, 1000, 2000, 5000],
  mug: [1, 10, 50, 100, 300],
  tshirt: [10, 20, 50, 100, 300],
  pin: [50, 100, 200, 500, 1000],
  fan: [100, 300, 500, 1000, 3000],
  canvas: [1, 2, 3, 5, 10],
  pillow: [1, 5, 10, 50, 100],
  umbrella: [20, 50, 100, 200, 500],
  receiptbook: [10, 20, 50, 100, 200],
  giftwrap: [100, 200, 500, 1000, 2000],
  aframe: [1, 2, 3, 5, 10],
  plasticbag: [1000, 2000, 5000, 10000, 20000],
  plaque: [1, 2, 3, 5, 10],
  cap: [20, 50, 100, 200, 500],
  greeting: [50, 100, 200, 500, 1000],
  flag: [2, 5, 10, 20, 50],
  rigidbox: [50, 100, 200, 500, 1000],
  label: [100, 300, 500, 1000, 3000],
  tumbler: [10, 20, 50, 100, 300],
  pen: [100, 300, 500, 1000, 3000],
  certificate: [10, 20, 50, 100, 300],
  booklet: [50, 100, 200, 500, 1000],
  photobook: [1, 2, 5, 10, 20],
  tabletent: [10, 20, 50, 100, 200],
  windowdecal: [1, 2, 3, 5, 10],
  menubook: [5, 10, 20, 30, 50],
  wetwipe: [1000, 2000, 5000, 10000, 20000],
  cakebox: [50, 100, 200, 500, 1000],
  coaster: [50, 100, 200, 500, 1000],
  mousepad: [10, 20, 50, 100, 300],
  bookmark: [100, 200, 500, 1000, 2000],
  postcard: [50, 100, 200, 500, 1000],
  ticket: [100, 200, 500, 1000, 3000],
  lightbox: [1, 2, 3, 5, 10],
  shelftalker: [50, 100, 200, 500, 1000],
  foodbag: [500, 1000, 2000, 5000, 10000],
  selfieframe: [1, 2, 3, 5, 10],
  wallmural: [1, 2, 3, 5, 10],
  signboard: [1, 5, 10, 20, 50],
  tube: [50, 100, 200, 500, 1000],
  sash: [5, 10, 20, 50, 100],
  nametag: [10, 20, 50, 100, 200],
  luggagetag: [50, 100, 200, 500, 1000],
  drawstring: [50, 100, 200, 500, 1000],
  menuboard: [1, 2, 3, 5, 10],
  tissuebox: [100, 200, 500, 1000, 2000],
  deliverybox: [1, 2, 5, 10, 20],
  apron: [10, 20, 50, 100, 200],
  helmet: [20, 50, 100, 200, 500],
  scratchcard: [500, 1000, 2000, 5000, 10000],
  puzzle: [1, 5, 10, 20, 50],
  phonecase: [1, 5, 10, 20, 50],
  playingcards: [10, 20, 50, 100, 200],
  clock: [10, 20, 50, 100, 200],
  invitation: [50, 100, 200, 500, 1000],
  signage: [1, 2, 3, 5, 10],
  pricelist: [1, 5, 10, 20, 50],
  seating: [1, 20, 50, 100, 300],
  welcomesign: [1, 2, 3, 5],
  wovenlabel: [100, 500, 1000, 3000, 5000],
  doormat: [1, 2, 5, 10, 20],
  awning: [1, 2, 3, 5],
  namelabel: [1, 2, 5, 10, 20],
  favorbox: [50, 100, 200, 300, 500],
  poster: [1, 5, 10, 20, 50],
  notepad: [50, 100, 200, 500, 1000],
  ribbon: [1, 5, 10, 20, 50],
  patch: [50, 100, 200, 500, 1000],
  acrylicstand: [1, 10, 20, 50, 100],
  carton: [100, 200, 500, 1000, 3000],
  cupcarrier: [500, 1000, 2000, 5000, 10000],
  ricebag: [500, 1000, 2000, 5000, 10000],
  nonla: [20, 50, 100, 200, 500],
  cardecal: [1, 2, 3, 5, 10],
  mooncakebox: [50, 100, 200, 500, 1000],
  custom: [1, 10, 50, 100, 500],
};
const MATERIALS: Record<PrintProduct, string[]> = {
  card: ['Giấy mỹ thuật (sang, dày)', 'Giấy couche (bóng, rẻ)', 'Giấy kraft (mộc)', 'Chưa biết — tư vấn giúp'],
  sticker: ['Decal giấy', 'Decal nhựa (chống nước)', 'Decal trong', 'Chưa biết — tư vấn giúp'],
  keychain: ['Mica trong 3mm', 'Mica trắng 3mm', 'Chưa biết — tư vấn giúp'],
  hashtag: ['Formex 5mm (cứng, nhẹ)', 'Formex 3mm (rẻ)', 'Mica trắng 3mm (bền)', 'Chưa biết — tư vấn giúp'],
  cardvisit: ['Giấy C300 cán mờ (phổ biến)', 'Giấy C300 cán bóng', 'Giấy mỹ thuật (sang, dày)', 'Giấy kraft (mộc)', 'Chưa biết — tư vấn giúp'],
  standee: ['Standee cuốn nhôm 60×160', 'Standee chữ X 60×160', 'Standee cuốn 80×180', 'Chưa biết — tư vấn giúp'],
  packaging: ['Giấy C300 cán màng', 'Giấy kraft', 'Giấy mỹ thuật (cao cấp)', 'Chưa biết — tư vấn giúp'],
  flyer: ['Couche 150 (phổ biến)', 'Couche 200 cán mờ (dày)', 'Fort 100 (rẻ)', 'Chưa biết — tư vấn giúp'],
  calendar: ['Lịch để bàn chữ A, gáy lò xo', 'Lịch treo tường 7 tờ', 'Lịch treo tường 13 tờ', 'Lịch bloc Tết + bảng treo', 'Chưa biết — tư vấn giúp'],
  envelope: ['Lì xì giấy mỹ thuật ép kim', 'Lì xì couche cán mờ', 'Phong bì Fort 100 (văn phòng)', 'Chưa biết — tư vấn giúp'],
  brochure: ['Couche 150 gấp 3 (phổ biến)', 'Couche 200 cán mờ', 'Giấy mỹ thuật (sang)', 'Chưa biết — tư vấn giúp'],
  seal: ['Decal vỡ (bóc là rách)', 'Decal bạc 7 màu (hologram)', 'Decal giấy thường', 'Chưa biết — tư vấn giúp'],
  pouch: ['Túi zip đứng màng ghép (bạc trong)', 'Túi zip kraft có cửa sổ', 'Túi zip nhôm mờ', 'Chưa biết — tư vấn giúp'],
  stationery: ['Giấy Ford 100 (tiêu đề thư)', 'Couche 300 cán mờ (kẹp file)', 'Bộ đủ: thư + kẹp file + phong bì', 'Chưa biết — tư vấn giúp'],
  cup: ['Ly giấy 1 lớp (nóng)', 'Ly nhựa PET (trà sữa, nước ép)', 'Ly giấy 2 lớp cách nhiệt', 'Chưa biết — tư vấn giúp'],
  tape: ['Băng keo trong in 1 màu', 'Băng keo đục (trắng/kraft) in màu', 'Băng keo giấy kraft', 'Chưa biết — tư vấn giúp'],
  tote: ['Vải canvas mộc', 'Vải canvas màu', 'Vải không dệt (rẻ)', 'Chưa biết — tư vấn giúp'],
  hangtag: ['Giấy C300 cán mờ + dây', 'Giấy kraft 350 + dây gai', 'Giấy mỹ thuật ép kim', 'Chưa biết — tư vấn giúp'],
  voucher: ['Couche 300 cán mờ', 'Nhựa PVC (thẻ cứng)', 'Giấy mỹ thuật ép kim', 'Chưa biết — tư vấn giúp'],
  badge: ['Thẻ nhựa PVC + dây đeo in logo', 'Thẻ giấy ép plastic + dây', 'Thẻ sự kiện giấy C300 + dây', 'Chưa biết — tư vấn giúp'],
  notebook: ['Sổ lò xo bìa cứng A5', 'Sổ bìa da khâu gáy A5', 'Sổ kraft bìa mềm A6', 'Chưa biết — tư vấn giúp'],
  foodbox: ['Giấy Ivory tráng PE (chống dầu)', 'Giấy kraft chống dầu', 'Carton sóng E (hộp pizza)', 'Chưa biết — tư vấn giúp'],
  tableware: ['Giấy lót khay Ford 80', 'Bao đũa giấy', 'Khăn giấy in logo', 'Bộ đủ: lót khay + bao đũa + khăn', 'Chưa biết — tư vấn giúp'],
  qrstand: ['Mica trong 3mm chữ L', 'Mica trắng 3mm in UV', 'Kệ gỗ + thẻ in', 'Chưa biết — tư vấn giúp'],
  magnet: ['Nam châm dẻo cán bóng', 'Nam châm mica dày', 'Chưa biết — tư vấn giúp'],
  mug: ['Ly sứ trắng 11oz in chuyển nhiệt', 'Ly sứ đổi màu (gặp nóng hiện hình)', 'Ly sứ quai màu / lòng màu', 'Chưa biết — tư vấn giúp'],
  tshirt: ['Áo thun cotton 100% in lụa', 'Áo thun cá sấu (polo) thêu logo', 'Áo thun cotton in DTF đủ màu', 'Chưa biết — tư vấn giúp'],
  pin: ['Huy hiệu cài áo 44mm', 'Huy hiệu 58mm', 'Huy hiệu nam châm (không kim)', 'Chưa biết — tư vấn giúp'],
  fan: ['Quạt nhựa PP cầm tay', 'Quạt giấy cán nhựa', 'Chưa biết — tư vấn giúp'],
  canvas: ['Tranh canvas căng khung gỗ', 'Tranh in giấy ảnh + khung viền', 'Chưa biết — tư vấn giúp'],
  pillow: ['Gối vuông vải nhung in 2 mặt', 'Gối vải canvas', 'Chưa biết — tư vấn giúp'],
  umbrella: ['Ô cầm tay 8 nan in 1 múi', 'Ô gấp 3 in logo', 'Dù che quán 2m4 (sân vườn)', 'Chưa biết — tư vấn giúp'],
  receiptbook: ['Giấy carbonless 2 liên', 'Giấy carbonless 3 liên', 'Giấy Ford 1 liên (xé)', 'Chưa biết — tư vấn giúp'],
  giftwrap: ['Giấy couche 80 in logo lặp', 'Giấy kraft in 1 màu', 'Giấy pelure (lụa) gói đồ', 'Chưa biết — tư vấn giúp'],
  aframe: ['Bảng chữ A khung gỗ + bạt in', 'Bảng chữ A sắt + alu in UV', 'Chưa biết — tư vấn giúp'],
  plasticbag: ['Túi xốp HD quai đục lỗ', 'Túi PE quai xách (túi xốp quai)', 'Túi tự huỷ sinh học', 'Chưa biết — tư vấn giúp'],
  plaque: ['Mica + chữ nổi, đinh treo inox', 'Alu xước in UV', 'Inox ăn mòn', 'Chưa biết — tư vấn giúp'],
  cap: ['Mũ kaki thêu logo', 'Mũ lưới (trucker) in logo', 'Mũ kaki in chuyển nhiệt', 'Chưa biết — tư vấn giúp'],
  greeting: ['Thiệp gấp đôi mỹ thuật ép kim', 'Thiệp gấp đôi couche cán mờ', 'Thiệp phẳng 1 tờ + phong bì', 'Chưa biết — tư vấn giúp'],
  flag: ['Cờ phướn (cờ giọt nước) + chân đế', 'Cờ dây tam giác', 'Cờ đuôi nheo cầm tay', 'Chưa biết — tư vấn giúp'],
  rigidbox: ['Hộp cứng nắp rời bồi giấy mỹ thuật', 'Hộp nam châm (nắp gập)', 'Hộp ngăn kéo (trượt)', 'Chưa biết — tư vấn giúp'],
  label: ['Decal giấy cán màng (chai, hũ)', 'Decal nhựa sữa chống nước', 'Decal trong (chai thuỷ tinh)', 'Decal kraft', 'Chưa biết — tư vấn giúp'],
  tumbler: ['Bình inox 500ml khắc laser', 'Bình inox sơn tĩnh điện in UV', 'Ly giữ nhiệt 600ml có ống hút', 'Chưa biết — tư vấn giúp'],
  pen: ['Bút bi nhựa in logo 1 màu', 'Bút kim loại khắc laser', 'Bút bi nhựa in UV đủ màu', 'Chưa biết — tư vấn giúp'],
  certificate: ['Giấy mỹ thuật 250 ép kim', 'Couche 300 cán mờ', 'Kèm bìa/khung giấy khen', 'Chưa biết — tư vấn giúp'],
  booklet: ['Catalogue A4 đóng ghim 8–24 trang', 'Catalogue A5 đóng ghim', 'Catalogue keo gáy (≥ 32 trang)', 'Chưa biết — tư vấn giúp'],
  photobook: ['Photobook bìa cứng 20×20', 'Photobook bìa cứng A4 ngang', 'Kỷ yếu bìa cứng', 'Chưa biết — tư vấn giúp'],
  tabletent: ['Tent card couche 300 cán mờ', 'Tent card mica chữ V', 'Chưa biết — tư vấn giúp'],
  windowdecal: ['Decal PP dán kính trong nhà', 'Decal cắt chữ (không nền)', 'Decal 1 chiều (one-way vision)', 'Chưa biết — tư vấn giúp'],
  menubook: ['Menu bìa da ép logo + ruột cán màng', 'Menu bìa cứng in màu', 'Menu nhựa PVC chống nước', 'Chưa biết — tư vấn giúp'],
  wetwipe: ['Khăn lạnh giấy bạc in 2 màu', 'Khăn ướt gói nhỏ in đủ màu', 'Chưa biết — tư vấn giúp'],
  cakebox: ['Hộp bánh kem giấy Ivory + cửa sổ', 'Hộp cupcake có khay', 'Hộp bánh tráng miệng nắp gài', 'Chưa biết — tư vấn giúp'],
  coaster: ['Lót ly giấy bồi dày 1.5mm', 'Lót ly gỗ in UV', 'Lót ly silicon/cao su', 'Chưa biết — tư vấn giúp'],
  mousepad: ['Lót chuột cao su 3mm', 'Lót chuột cỡ lớn (desk mat)', 'Chưa biết — tư vấn giúp'],
  bookmark: ['Couche 300 cán mờ + dây tua', 'Giấy mỹ thuật ép kim', 'Bookmark kim loại khắc', 'Chưa biết — tư vấn giúp'],
  postcard: ['Couche 300 cán mờ 2 mặt', 'Giấy mỹ thuật (kraft/ trắng sần)', 'Chưa biết — tư vấn giúp'],
  ticket: ['Couche 250 + răng cưa + số nhảy', 'Giấy mỹ thuật ép kim', 'Vé nhựa PVC', 'Chưa biết — tư vấn giúp'],
  lightbox: ['Hộp đèn mica hút nổi', 'Hộp đèn bạt căng 2 mặt', 'Hộp đèn tròn treo vẫy', 'Chưa biết — tư vấn giúp'],
  shelftalker: ['Wobbler giấy C300 + chân nhựa', 'Tem kệ (shelf strip) couche', 'Chưa biết — tư vấn giúp'],
  foodbag: ['Túi giấy kraft đáy vuông (SOS)', 'Túi giấy bánh mì chống dầu', 'Túi giấy có cửa sổ', 'Chưa biết — tư vấn giúp'],
  selfieframe: ['Formex 5mm cắt CNC', 'Formex 3mm (nhẹ)', 'Chưa biết — tư vấn giúp'],
  wallmural: ['Decal PP dán tường cán mờ', 'Giấy dán tường in UV', 'Chưa biết — tư vấn giúp'],
  signboard: ['Mica 3mm in UV + băng keo 2 mặt', 'Alu in UV', 'Decal dạ quang (lối thoát hiểm)', 'Chưa biết — tư vấn giúp'],
  tube: ['Ống giấy bồi nắp rời', 'Ống giấy kraft', 'Ống thiếc in offset', 'Chưa biết — tư vấn giúp'],
  sash: ['Satin in chữ nhũ', 'Vải lụa in chuyển nhiệt', 'Chưa biết — tư vấn giúp'],
  nametag: ['Bảng tên kim loại khắc, kim cài', 'Bảng tên mica in UV, nam châm', 'Chưa biết — tư vấn giúp'],
  luggagetag: ['Thẻ PVC + dây nhựa', 'Thẻ da simili ép logo', 'Chưa biết — tư vấn giúp'],
  drawstring: ['Túi rút vải dù in lụa', 'Túi rút canvas', 'Túi rút vải không dệt', 'Chưa biết — tư vấn giúp'],
  menuboard: ['Bảng menu alu in UV treo tường', 'Hộp đèn menu (mica)', 'Bảng menu gỗ + decal', 'Chưa biết — tư vấn giúp'],
  tissuebox: ['Hộp khăn giấy ivory 350 in offset', 'Hộp khăn giấy kraft', 'Chưa biết — tư vấn giúp'],
  deliverybox: ['Decal dán thùng giao hàng (bộ 4 mặt)', 'Thùng giao hàng + decal in sẵn', 'Chưa biết — tư vấn giúp'],
  apron: ['Tạp dề kaki in lụa', 'Tạp dề vải bố thêu logo', 'Tạp dề vải dù (rẻ)', 'Chưa biết — tư vấn giúp'],
  helmet: ['Mũ bảo hiểm nửa đầu in decal logo', 'Mũ 3/4 in decal', 'Chưa biết — tư vấn giúp'],
  scratchcard: ['Thẻ cào giấy C300 + lớp cào bạc', 'Thẻ cào nhựa PVC', 'Chưa biết — tư vấn giúp'],
  puzzle: ['Puzzle giấy bồi 120 mảnh', 'Puzzle 300 mảnh + hộp', 'Puzzle gỗ', 'Chưa biết — tư vấn giúp'],
  phonecase: ['Ốp dẻo in UV', 'Ốp cứng in tràn viền', 'Chưa biết — tư vấn giúp'],
  playingcards: ['Bộ bài giấy 310gsm + hộp in', 'Bộ bài nhựa PVC', 'Chưa biết — tư vấn giúp'],
  clock: ['Đồng hồ treo tường mặt in logo Ø30', 'Đồng hồ để bàn', 'Chưa biết — tư vấn giúp'],
  invitation: ['Thiệp mời mỹ thuật ép kim + phong bì', 'Thiệp mời couche cán mờ', 'Chưa biết — tư vấn giúp'],
  signage: ['Alu / CNC cắt chữ', 'Chữ nổi mica / inox', 'Hộp đèn', 'Neon flex', 'Bảng in bạt / decal', 'Chưa biết — tư vấn giúp'],
  pricelist: ['Tờ A4 ép plastic', 'Bảng alu treo tường in UV', 'Bảng có khung (nhôm/gỗ)', 'Chưa biết — tư vấn giúp'],
  seating: ['Sơ đồ formex + thẻ tên giấy mỹ thuật', 'Chỉ thẻ tên bàn', 'Chưa biết — tư vấn giúp'],
  welcomesign: ['Formex 5mm + chân giá vẽ', 'Mica trong in UV', 'Chưa biết — tư vấn giúp'],
  wovenlabel: ['Mác dệt satin', 'Mác dệt damask (nét)', 'Mác in vải cotton', 'Chưa biết — tư vấn giúp'],
  doormat: ['Thảm cao su in logo 60×90', 'Thảm xơ dừa in 1 màu', 'Thảm nỉ đế cao su', 'Chưa biết — tư vấn giúp'],
  awning: ['Bạt mái hiên in kỹ thuật số', 'Bạt sọc may chữ', 'Chưa biết — tư vấn giúp'],
  namelabel: ['Tờ nhãn tên decal chống nước', 'Nhãn vở giấy', 'Chưa biết — tư vấn giúp'],
  favorbox: ['Hộp quà cưới giấy mỹ thuật', 'Hộp kraft + ruy băng', 'Chưa biết — tư vấn giúp'],
  poster: ['Poster giấy ảnh bóng', 'Poster + khung', 'Poster formex/ dán tường', 'Chưa biết — tư vấn giúp'],
  notepad: ['Giấy note dán (sticky) in logo', 'Sổ note xé 50 tờ + bìa', 'Hộp giấy note vuông', 'Chưa biết — tư vấn giúp'],
  ribbon: ['Ruy băng satin in nhũ (cuộn 50m)', 'Ruy băng grosgrain in màu', 'Chưa biết — tư vấn giúp'],
  patch: ['Patch thêu viền vắt sổ', 'Patch in chuyển nhiệt', 'Patch PVC dẻo', 'Chưa biết — tư vấn giúp'],
  acrylicstand: ['Standee mica trong 3mm in UV', 'Standee mica 5mm 2 lớp', 'Chưa biết — tư vấn giúp'],
  carton: ['Thùng carton 3 lớp in 1–2 màu', 'Thùng carton 5 lớp', 'Hộp carton nắp gài (e-commerce)', 'Chưa biết — tư vấn giúp'],
  cupcarrier: ['Túi PE quai đựng 1–2 ly', 'Túi giấy kraft đựng ly', 'Túi vải không dệt đựng ly', 'Chưa biết — tư vấn giúp'],
  ricebag: ['Bao PP dệt in flexo (5–25kg)', 'Túi gạo hút chân không PA/PE', 'Chưa biết — tư vấn giúp'],
  nonla: ['Nón lá in/vẽ logo', 'Nón lá in decal', 'Chưa biết — tư vấn giúp'],
  cardecal: ['Decal cán màng dán xe (bộ 2 bên + sau)', 'Decal cắt chữ dán xe', 'Chưa biết — tư vấn giúp'],
  mooncakebox: ['Hộp bánh trung thu cứng 4–6 bánh', 'Hộp giấy + khay nhựa', 'Chưa biết — tư vấn giúp'],
  banner: ['Hiflex thường (ngoài trời)', 'Bạt Hiflex 3M (bền màu)', 'Backdrop khung sắt + bạt', 'Chưa biết — tư vấn giúp'],
  custom: ['Chưa biết — tư vấn giúp'],
};
const plusDays = (n: number) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };

export interface PrintFiles { file: Blob; fileName: string; preview: Blob }

export function PrintRequest({ product, title, defaultMaterial, design, makeFiles }: {
  product: PrintProduct; title: string; defaultMaterial?: string; design: unknown; makeFiles: () => Promise<PrintFiles>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm" data-testid="print-request">
        <Printer className="w-4 h-4" /> Gửi yêu cầu in
      </button>
      {open && <Dialog onClose={() => setOpen(false)} {...{ product, title, defaultMaterial, design, makeFiles }} />}
    </>
  );
}

function Dialog({ product, title, defaultMaterial, design, makeFiles, onClose }: {
  product: PrintProduct; title: string; defaultMaterial?: string; design: unknown; makeFiles: () => Promise<PrintFiles>; onClose: () => void;
}) {
  const { me, ready, refresh } = useAuth();
  const [qty, setQty] = useState(QTY[product][1]);
  const [material, setMaterial] = useState(defaultMaterial && MATERIALS[product].includes(defaultMaterial) ? defaultMaterial : MATERIALS[product][0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [needBy, setNeedBy] = useState(plusDays(10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<PrintOrder | null>(null);

  useEffect(() => { if (me) { setName((n) => n || me.name); setPhone((p) => p || me.phone || ''); } }, [me]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const f = await makeFiles();
      const fd = new FormData();
      Object.entries({ product, title, quantity: String(qty), material, contact_name: name, phone, address, need_by: needBy, note, design: JSON.stringify(design) })
        .forEach(([k, v]) => fd.append(k, v));
      fd.append('file', f.file, f.fileName);
      fd.append('preview', f.preview, 'preview.jpg');
      setDone(await orderApi.create(fd));
      refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/50 p-0 sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-mv-surface rounded-t-2xl sm:rounded-2xl border border-mv-hair shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Gửi yêu cầu in" data-testid="print-dialog">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-mv-fg">Gửi yêu cầu in</div>
            <div className="text-xs text-slate-400 mt-0.5">{title}</div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-slate-400 hover:text-mv-fg" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        {!ready ? <div className="h-32 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          : done ? <Done order={done} onClose={onClose} />
            : !me ? <MiniAuth onDone={refresh} />
              : (
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <span className="mv-label block mb-1.5">Số lượng</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {QTY[product].map((n) => (
                        <button key={n} type="button" onClick={() => setQty(n)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${qty === n ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300'}`}>{n}</button>
                      ))}
                      <input type="number" min={1} max={100000} required className="mv-input !w-24 !py-1.5" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Số lượng khác" data-testid="print-qty" />
                    </div>
                  </div>
                  <label className="block"><span className="mv-label block mb-1.5">Chất liệu</span>
                    <select className="mv-input" value={material} onChange={(e) => setMaterial(e.target.value)} data-testid="print-material">
                      {MATERIALS[product].map((m) => <option key={m}>{m}</option>)}
                    </select></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mv-label block mb-1.5">Tên người nhận</span>
                      <input className="mv-input" required value={name} onChange={(e) => setName(e.target.value)} data-testid="print-name" /></label>
                    <label className="block"><span className="mv-label block mb-1.5">SĐT / Zalo</span>
                      <input className="mv-input" required inputMode="tel" placeholder="0909 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="print-phone" /></label>
                  </div>
                  <label className="block"><span className="mv-label block mb-1.5">Địa chỉ giao (TP.HCM)</span>
                    <input className="mv-input" placeholder="Số nhà, đường, phường, quận" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="print-address" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mv-label block mb-1.5">Cần nhận trước ngày</span>
                      <input className="mv-input" type="date" min={plusDays(3)} value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></label>
                    <label className="block"><span className="mv-label block mb-1.5">Ghi chú</span>
                      <input className="mv-input" placeholder="Cán màng, bo góc…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
                  </div>
                  <div className="rounded-xl bg-ink/[0.03] border border-mv-hair px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
                    File in đúng chuẩn được gửi kèm tự động. Mivy báo giá qua <b>Zalo trong ngày</b> → bạn chuyển cọc → in <b>mẫu cho bạn duyệt</b> trước khi in số lượng lớn. Hiện chỉ giao trong TP.HCM.
                  </div>
                  {err && <p className="text-xs text-rose-400" data-testid="print-error">{err}</p>}
                  <button type="submit" disabled={busy} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 disabled:opacity-70" data-testid="print-submit">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo file in & gửi…</> : 'Gửi yêu cầu — nhận báo giá miễn phí'}
                  </button>
                </form>
              )}
      </div>
    </div>
  );
}

function MiniAuth({ onDone }: { onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'register') await authApi.register(email, password, name, phone); else await authApi.login(email, password);
      await onDone();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Có lỗi, thử lại nhé.'); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="print-auth">
      <p className="text-xs text-slate-400">Tạo tài khoản (30 giây) để Mivy gửi báo giá và bạn theo dõi đơn. Thiết kế đang làm vẫn giữ nguyên.</p>
      <div className="mv-seg flex">
        <button type="button" onClick={() => { setMode('register'); setErr(''); }} data-active={mode === 'register'} className="mv-seg-btn flex-1 !justify-center">Tạo tài khoản</button>
        <button type="button" onClick={() => { setMode('login'); setErr(''); }} data-active={mode === 'login'} className="mv-seg-btn flex-1 !justify-center">Đã có tài khoản</button>
      </div>
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mv-label block mb-1.5">Tên</span><input className="mv-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-testid="auth-name" /></label>
          <label className="block"><span className="mv-label block mb-1.5">SĐT / Zalo</span><input className="mv-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" data-testid="auth-phone" /></label>
        </div>
      )}
      <label className="block"><span className="mv-label block mb-1.5">Email</span><input className="mv-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" /></label>
      <label className="block"><span className="mv-label block mb-1.5">Mật khẩu</span><input className="mv-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} data-testid="auth-password" /></label>
      {err && <p className="text-xs text-rose-400" data-testid="auth-error">{err}</p>}
      <button type="submit" disabled={busy} className="mv-btn mv-btn-primary w-full !flex justify-center !py-2.5 disabled:opacity-70" data-testid="auth-submit">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'register' ? 'Tạo tài khoản & tiếp tục' : 'Đăng nhập & tiếp tục'}
      </button>
    </form>
  );
}

function Done({ order, onClose }: { order: PrintOrder; onClose: () => void }) {
  return (
    <div className="text-center space-y-3 py-2" data-testid="print-done">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
      <div className="text-base font-bold text-mv-fg">Đã gửi yêu cầu · mã đơn <span data-testid="print-code">{order.code}</span></div>
      <p className="text-xs text-slate-400 leading-relaxed">Mivy sẽ nhắn báo giá qua Zalo <b>{order.phone}</b> trong ngày. Bạn xem trạng thái đơn bất cứ lúc nào ở mục <b>Đơn in của tôi</b>.</p>
      <div className="flex gap-2 justify-center pt-1">
        <button type="button" onClick={onClose} className="mv-btn mv-btn-ghost !text-xs">Tiếp tục thiết kế</button>
        <Link href="/studio/orders" className="mv-btn mv-btn-primary !text-xs">Xem đơn của tôi</Link>
      </div>
    </div>
  );
}
