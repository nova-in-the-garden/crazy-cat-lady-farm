# Crazy Cat Lady's Cat Sanctuary

A cozy, browser-playable 3D world for the **Crazy Cat Lady Simulator** game idea:
a life sim where you find, raise, breed, feed, pet, love and rehome cats, and act as a part-time vet.

The farm is being turned into a **cat sanctuary** that's getting ready to open (no cats yet). Its host is the
**Crazy Cat Lady**, who lives at the heart of the sanctuary, greets visitors ("Welcome to my farm, dearie!"), chats about each spot you visit and mutters
cozy cat thoughts when you stand still. No cats yet. They're coming!

## What's in the world
- **Whisker Wellness Animal Hospital**, the sanctuary's vet clinic where sick cats will go. You can walk inside: the roof
  and the walls nearest the camera fade away. Inside: exam table, cat scale, IV stand, a medicine cabinet full of
  bottles, four recovery kennels with blankets, cat beds, a reception desk with a computer and clipboard, posters and
  a warm ceiling lamp. Outside: planters, a bench, a Cat Ambulance wagon and a signpost.
- A pastel cottage with a porch, chimney smoke, flower boxes, a cat flap, a cat tree, food bowls and a rocking chair
- A red barn with a cat weathervane, hay bales and a scratching post
- A fenced veggie garden (carrots, cabbages, pumpkins) with a cat-eared scarecrow
- A pond with lily pads and cattails, dirt paths, stepping stones, trees, bushes, flowers, rocks and butterflies
- An entrance arch sign and a mailbox with a paw-print flag

## Controls
| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Walk | WASD or arrow keys | on-screen joystick |
| Run | hold Shift | push the joystick all the way |
| Look around | drag | drag |
| Zoom | scroll wheel | pinch |
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
- `window.ccl` in the browser console exposes the scene, camera, lady, world and a `teleport(x, z)` helper for testing.
