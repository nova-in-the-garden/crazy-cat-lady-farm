# Crazy Cat Lady's Cat Sanctuary

A cozy, browser-playable 3D world for the **Crazy Cat Lady Simulator** game idea:
a life sim where you find, raise, breed, feed, pet, love and rehome cats, and act as a part-time vet.

The farm is being turned into a **cat sanctuary** that's getting ready to open (no cats yet). Its host is the
**Crazy Cat Lady**, who lives at the heart of the sanctuary, greets visitors ("Welcome to my cat sanctuary, dearie!"), chats about each spot you visit and mutters
cozy cat thoughts when you stand still. No cats yet. They're coming! Until they arrive, your job is to grow
enough food so no kitty ever goes hungry.

## How to play: the garden
Grow crops in the garden plot, harvest them, then cook them into **cat food** in the kitchen inside the cottage.

1. **Plow** (Hoe, key `1`): turn a grass tile into soil.
2. **Sow** (Seeds, key `2`; press `Q` to switch carrot / cabbage / pumpkin): plant a seed in plowed soil.
3. **Water** (Watering Can, key `3`): watered soil turns dark and the crop grows. Refill the can at the **pond**.
4. **Harvest** (Hands, key `4`): pick ripe crops (they sparkle).
5. **Cook**: walk into the cottage and use the **stove** in the Cat Food Kitchen. Every crop you're carrying
   becomes cat food in the pantry.

Press **E** or **Space** (or tap **Use** on a phone) to use the tool on the tile in front of her. The prompt at the
bottom tells you what will happen.

**Growing rules**
- Crops only grow while their soil is wet. Soil dries out every morning at 6 AM, so water each day.
- Dry crops never die, they just pause. **Nothing wilts**: once a crop is ripe it stays ripe until you pick it.
- Grow time (in game hours) and food per crop: carrot 12 h → 1 food, cabbage 20 h → 2 food, pumpkin 32 h → 4 food.
- A full day lasts 6 real minutes. At night, sleep in the **bed** in the cottage to skip to morning (crops in
  wet soil keep growing while you sleep).
- The **seed box** next to the garden has free seeds every morning.
- Your garden is saved in the browser automatically. Use **Reset garden** in the controls panel to start over.

## The cottage and kitchen
The cottage is enterable, like the clinic: walk in through the front door and the roof and nearest walls fade
away. Inside is the **Cat Food Kitchen**: stove with a bubbling pot, counters with a sink and a stack of cat bowls,
and a pantry shelf that fills with cans as you cook. There is also her bed with a paw-print quilt, a nightstand, a
little tea table and a cat bed by the stove.

## What's in the world
- **Whisker Wellness Animal Hospital**, the sanctuary's vet clinic where sick cats will go. You can walk inside: the roof
  and the walls nearest the camera fade away. Inside: exam table, cat scale, IV stand, a medicine cabinet full of
  bottles, four recovery kennels with blankets, cat beds, a reception desk with a computer and clipboard, posters and
  a warm ceiling lamp. Outside: planters, a bench, a Cat Ambulance wagon and a signpost.
- A pastel cottage (enterable, with the Cat Food Kitchen and her bed inside) with a porch, chimney smoke, flower boxes, a cat flap, a cat tree, food bowls and a rocking chair
- A red barn with a cat weathervane, hay bales and a scratching post
- A fenced garden plot (6 × 4 tiles) you farm yourself, a cat-eared scarecrow and a free-seed box
- A pond with lily pads and cattails, dirt paths, stepping stones, trees, bushes, flowers, rocks and butterflies
- An entrance arch sign and a mailbox with a paw-print flag

## Controls
| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Walk | WASD or arrow keys | on-screen joystick |
| Run | hold Shift | push the joystick all the way |
| Look around | drag | drag |
| Zoom | scroll wheel | pinch |
| Use tool / interact | E or Space | Use button |
| Pick tool | 1-4, or click the hotbar | tap the hotbar |
| Switch seed type | Q | tap the seed slot again |
| Mute sounds | M, or the Sound button | Sound button |
| Chat with her | T, or click her | tap her |

## Run it locally
It's a plain static site with no build step. Serve the folder with any web server, for example:

```bash
cd website
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` straight from disk won't work, because browsers
block ES modules on `file://`.)

## Host on GitHub Pages
Push this folder to a GitHub repository, then go to **Settings > Pages** and choose the branch and root
folder. All paths are relative, and Three.js is included in `vendor/`, so nothing else is needed.

## Project layout
```
index.html          page, title screen, HUD, nameplate + speech bubble markup
css/style.css       cozy pastel UI styles
js/main.js          renderer, lights, game loop, title screen, start button
js/world.js         the farm: terrain, sky, buildings, garden, pond, trees, named zones
js/kitchen.js       the cottage interior: Cat Food Kitchen, pantry, bed, table
js/building.js      shared helper that fades roofs and camera-side walls when you go inside
js/game.js          the garden sim: tools, actions, cooking, sleeping, saving, host comments
js/garden.js        the 6x4 tile grid and crop models (seed, sprout, growing, ripe)
js/state.js         crop data and the localStorage save
js/time.js          the clock and day/night lighting
js/ui.js            status panel, hotbar, prompts, floating text
js/sound.js         little synthesized sound effects (Web Audio)
js/particles.js     dirt, water, seed and sparkle particles
js/clinic.js        Whisker Wellness Animal Hospital (enterable vet clinic + fading roof/walls)
js/collision.js     simple circle/box collisions and raised floors
js/catLady.js       the Crazy Cat Lady model and her walk / idle / wave / blink animations
js/host.js          her personality: nameplate, speech bubble and everything she says
js/controls.js      keyboard, mouse orbit camera, zoom and the touch joystick
js/util.js          shared helpers (materials, seeded random numbers, canvas textures)
vendor/three/       Three.js r187 (MIT license)
assets/paw.svg      paw icon
screenshots/        preview images
```

## Adding things later
- **Her lines**: edit the `LINES` lists in `js/host.js`.
- **New places**: build them in `js/world.js`, add collisions with `addCircle` / `addBox` from `js/collision.js`, and add a zone in `zones` so she comments on them.
- **Cats**: create a `js/cat.js` that builds a cat like `catLady.js` does, then add and update the cats in the loop in `js/main.js`.
- `window.game` exposes the garden sim, including `game.food.count()`, `game.food.add(n)` and `game.food.consume(n)` for when the cats arrive and start eating.
- `window.ccl` in the browser console exposes the scene, camera, lady, world and a `teleport(x, z)` helper for testing.
