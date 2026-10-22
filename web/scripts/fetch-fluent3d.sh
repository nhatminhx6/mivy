#!/usr/bin/env bash
# Tải bộ minh hoạ 3D Fluent Emoji (Microsoft, MIT) về public/illustrations/fluent3d/<id>.png — chạy 1 lần, lưu tĩnh.
set -u
cd "$(dirname "$0")/.."
OUT=public/illustrations/fluent3d
mkdir -p "$OUT"
BASE="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets"

# id|đường dẫn trong repo
LIST="
laptop|Laptop/3D/laptop_3d.png
mobile_phone|Mobile phone/3D/mobile_phone_3d.png
video_game|Video game/3D/video_game_3d.png
robot|Robot/3D/robot_3d.png
rocket|Rocket/3D/rocket_3d.png
light_bulb|Light bulb/3D/light_bulb_3d.png
megaphone|Megaphone/3D/megaphone_3d.png
bar_chart|Bar chart/3D/bar_chart_3d.png
chart_increasing|Chart increasing/3D/chart_increasing_3d.png
gear|Gear/3D/gear_3d.png
brain|Brain/3D/brain_3d.png
shopping_bags|Shopping bags/3D/shopping_bags_3d.png
shopping_cart|Shopping cart/3D/shopping_cart_3d.png
package|Package/3D/package_3d.png
wrapped_gift|Wrapped gift/3D/wrapped_gift_3d.png
delivery_truck|Delivery truck/3D/delivery_truck_3d.png
money_bag|Money bag/3D/money_bag_3d.png
credit_card|Credit card/3D/credit_card_3d.png
party_popper|Party popper/3D/party_popper_3d.png
fire|Fire/3D/fire_3d.png
glowing_star|Glowing star/3D/glowing_star_3d.png
sparkles|Sparkles/3D/sparkles_3d.png
trophy|Trophy/3D/trophy_3d.png
crown|Crown/3D/crown_3d.png
gem_stone|Gem stone/3D/gem_stone_3d.png
red_heart|Red heart/3D/red_heart_3d.png
lipstick|Lipstick/3D/lipstick_3d.png
lotion_bottle|Lotion bottle/3D/lotion_bottle_3d.png
dress|Dress/3D/dress_3d.png
t_shirt|T-shirt/3D/t-shirt_3d.png
running_shoe|Running shoe/3D/running_shoe_3d.png
high_heeled_shoe|High-heeled shoe/3D/high-heeled_shoe_3d.png
handbag|Handbag/3D/handbag_3d.png
ring|Ring/3D/ring_3d.png
hot_beverage|Hot beverage/3D/hot_beverage_3d.png
bubble_tea|Bubble tea/3D/bubble_tea_3d.png
birthday_cake|Birthday cake/3D/birthday_cake_3d.png
hamburger|Hamburger/3D/hamburger_3d.png
pizza|Pizza/3D/pizza_3d.png
airplane|Airplane/3D/airplane_3d.png
beach_with_umbrella|Beach with umbrella/3D/beach_with_umbrella_3d.png
camera|Camera/3D/camera_3d.png
artist_palette|Artist palette/3D/artist_palette_3d.png
calendar|Calendar/3D/calendar_3d.png
alarm_clock|Alarm clock/3D/alarm_clock_3d.png
house|House/3D/house_3d.png
potted_plant|Potted plant/3D/potted_plant_3d.png
teddy_bear|Teddy bear/3D/teddy_bear_3d.png
pill|Pill/3D/pill_3d.png
check_mark_button|Check mark button/3D/check_mark_button_3d.png
thumbs_up|Thumbs up/Default/3D/thumbs_up_3d_default.png
"

fail=0
while IFS='|' read -r id path; do
  [ -z "$id" ] && continue
  url="$BASE/$(echo "$path" | sed 's/ /%20/g')"
  if ! curl -sfL -m 30 -o "$OUT/$id.png" "$url"; then echo "FAIL $id"; rm -f "$OUT/$id.png"; fail=$((fail+1)); fi
done <<< "$LIST"

cat > "$OUT/LICENSE.txt" <<'EOF'
Fluent Emoji — Copyright (c) Microsoft Corporation. MIT License.
https://github.com/microsoft/fluentui-emoji
EOF
echo "done, fail=$fail, files=$(ls "$OUT"/*.png 2>/dev/null | wc -l)"
