# Granny's Cat Sanctuary

A cozy, browser-playable 3D world for the **Crazy Cat Lady Simulator** game idea:
a life sim where you find, raise, breed, feed, pet, love and rehome cats, and act as a part-time vet.

The farm is now a **cat sanctuary**, open to cats. Its host is the
**Granny** (the Crazy Cat Lady), who lives at the heart of the sanctuary, greets visitors ("Welcome to my cat sanctuary, dearie!"), chats about each spot you visit and mutters
cozy cat thoughts when you stand still. Cats arrive over time (up to **10 at once**), each one gets a Welcome
Vet Check (where you name them), and from then on you feed, pet, play with, groom and doctor them. Poorly cats stay
in the clinic kennels until they're healed. Happy, healthy, bonded cats can be **adopted out** to kind visitors for
coins, and those coins buy cat food and medicine at the **Farmers Market**. The garden grows Granny's own
meals, plus **catnip** treats.

It stays cozy: no cat dies or gets worse than "a bit run-down". Neglect only lowers happiness and health down to a
soft floor. (The code has a ready-made hook for real stakes later: see `NEGLECT` and `CatManager.onDecline` in
`js/cats.js`.)

## How to play: the cats
**New arrivals.** Three starter cats arrive over the first few days:
- **Day 1:** a rescue kitty waits at the gate (look for the yellow **!**).
- **Day 2:** a shy stray hides by the garden (look for the **?**). Sit quietly with them (press E) until they trust
  you. Offering a little cat food helps.
- **Day 3:** a kitten adopted from the shelter waits at the gate.

From day 4, while there's room, **new cats keep turning up** (at most one a day): rescues, shelter transfers, shy
strays and neighbors' fosters. Every one is different: 11 coats (orange, silver and brown tabbies, cream tabby,
calico, tortoiseshell, black, white, blue-grey, tuxedo and cream point), lots of breeds and ages from kitten to
senior, and 8 personalities (affectionate, playful, shy, independent, food-motivated, sleepy, curious and chatty).
Some arrive already poorly (a cold, a sore ear, a sprained leg or fleas).

**Welcome Vet Check.** Press E next to a new arrival to walk them to the Whisker Wellness clinic. Stand at the exam
table and press E to start. In the calm close-up you weigh them, take their temperature, listen with the stethoscope
and check their coat, eyes and ears, teeth and paws. Each check fills the clipboard: breed and coat, age, a hint about
their personality and anything that needs treating. Then the **naming card** opens. Type a name, tap a suggestion, or
roll the dice. The cat joins the sanctuary only after this check (and goes to a kennel first if they need care).

**Stats card.** Click or tap any cat (or choose **Stats card** in the care menu) to see their portrait, sex, age,
breed and coat, personality, discovered favorites, bond hearts, five bars (**Health, Happiness, Hunger, Cleanliness,
Energy**), their current condition and treatment, and whether they're ready for adoption.

**Daily care.** Press E next to one of your cats to open the care menu, then pick with keys 1-7 or tap:
- **Pet**, **Play** (feather wand or yarn ball: every cat has a favorite), **Brush & groom**.
- **Catnip treat**: grow catnip in the garden and offer a sprig. Big happiness boost and +bond (once every 6 hours per
  cat).
- **Stats card**, and **Take to the clinic** when a cat seems a little off.

**The Cats' House** (the old red barn, east of the cottage) is the cats' own home, with room for 10:
- **Feeding station** (back right corner): press E to fill every empty bowl with cat food. Ten bowls line the east
  wall. Breakfast at 8 AM and supper at 6 PM are served automatically too, as long as you have cat food.
- **Five litter boxes** along the front wall, one for every two cats. Press E next to a clumpy box to scoop it.
- **Ten named beds**: five on the floor and five up on a sturdy bunk shelf, each with a name plaque, plus a scratching
  post, a cat tree and a basket of toys.

Caring for a cat raises their **bond** (0 to 5 hearts). Higher bonds unlock new behavior: they trill hello, follow you
around, nap near you when you rest, bring you little gifts, and curl up with you at night. At night most cats sleep
in their own beds in the Cats' House; your three closest friends (3+ hearts) pile onto your bed in the cottage.

**Sickness, injuries and the clinic kennels.** Now and then (more often if a cat is neglected) a cat gets sick or
hurt: a sniffly cold, an ear infection, a sprained leg, a sore paw, an upset tummy, fleas, or new-cat stress. They
show a little thought bubble. Choose **Take to the clinic**, then at the exam table:
1. **Examine:** do at least 3 checks and read the clipboard. Some cats need settling first.
2. **Diagnose** (gently): pick what fits best. A wrong guess never hurts anyone: the cat gets a cozy rest day and you
   look again tomorrow.
3. **Admit:** follow the care plan's first steps on the table: a **shot** (vaccine / antibiotic injection), a
   **bandage wrap** for injuries (you'll see it on the cat's leg) or the first dose of **medicine**. Then admit the
   cat to one of the four **kennels** (or the recovery bed). Chamomile from the garden speeds healing up.
4. **Daily care:** visit the kennel each day (press E there) for **today's medicine** and a **gentle check & cuddle**.
   The **healing bar** fills with each bit of care. A missed dose just means slower healing; nothing bad happens.
5. **Discharge:** when the bar is full the cat sparkles. Press E at the kennel and **discharge** them home to the
   Cats' House. Your bond grows and the case goes in the journal.

**Adoption.** When a cat is healthy, happy and has **3+ bond hearts**, kind people sometimes visit (they wait by the
path near the porch) hoping for a cat with a certain personality. Press E to talk to them, pick a cat (a perfect
personality match pays a bonus) and confirm. The fee is higher for healthier, happier, more bonded cats. You get a
goodbye journal entry with a polaroid, the cat walks off with their new family, and their bed and bowl free up for
the next rescue. There's never any pressure: visitors just head home at 6 PM.

**Cat Journal** (press **J** or the Journal button): cat profiles, the "Adopted into forever homes" photo wall, vet
case history with **Vet Knowledge** (clearer clues and more precise diagnosis options as it rises), and little moments
written down automatically.

## How to play: the economy
- **Coins** (top-left panel): you start with 60. Adoption fees are the main income; the **donation jar** adds a few
  coins every morning (more when you have more cats).
- **The Farmers Market** (the striped market stall between the cottage and the Cats' House): press E to buy **cat food
  bags** (6 portions, the cats' main food), **medicine**, **shots**, **bandage rolls**, and catnip, veggie and
  chamomile seeds. You start with 12 portions of cat food and a few clinic supplies.
- **Her own needs:** Granny has soft **hunger** and **energy** bars (top-left). Cook garden veggies at
  the cottage **stove** into home-cooked meals and eat one (E at the stove or pantry). Sleep restores energy. If
  either runs very low she just walks a bit slower and mentions it. No fail state.

## How to play: the garden
Grow veggies for her meals, catnip for the cats and chamomile for remedies.

1. **Plow** (Hoe, key `1`): turn a grass tile into soil.
2. **Sow** (Seeds, key `2`; press `Q` to switch carrot / cabbage / pumpkin / chamomile / catnip).
3. **Water** (Watering Can, key `3`): watered soil turns dark and the crop grows. Refill the can at the **pond**.
4. **Harvest** (Hands, key `4`): pick ripe crops (they sparkle).
5. **Cook**: use the **stove** in the cottage kitchen. Carrots, cabbages and pumpkins become meals for her.

Press **E** or **Space** (or tap **Use** on a phone) to use the tool on the tile in front of her. The prompt at the
bottom tells you what will happen.

**Growing rules**
- Crops only grow while their soil is wet. Soil dries out every morning at 6 AM, so water each day.
- Dry crops never die, they just pause. **Nothing wilts**: once a crop is ripe it stays ripe until you pick it.
- Grow time (in game hours) and meals: carrot 12 h → 1 meal, cabbage 20 h → 2, pumpkin 32 h → 3. Catnip takes 14 h
  (a cat treat), chamomile 16 h (vet remedies).
- A full day lasts 6 real minutes. **At 10 PM it's bedtime: the clock stops** until you walk to the **bed** in the
  cottage and press **E** or the big **Sleep** button. You wake at 6 AM. You can go to bed early from 6 PM.
- The **mailbox** at the end of the drive gets 3 random seed packets from the seed club every morning ("You Got Mail! 📬").
- Everything is saved in the browser automatically. Use **Reset garden** in the controls panel to start over.

## The cottage and kitchen
The cottage is enterable, like the clinic: walk in through the front door and the roof and nearest walls fade
away. Inside: the kitchen stove with a bubbling pot, counters with a sink, a pantry shelf (its cans show how much cat
food you have), her bed with a paw-print quilt, a nightstand, a little tea table and a cat bed by the stove.

## What's in the world
- **Whisker Wellness Animal Hospital**, the vet clinic: exam table, cat scale, IV stand, medicine cabinet, **four
  kennels with name cards** plus a recovery bed, a reception desk, posters and a warm lamp. Outside: planters, a
  bench, a Cat Ambulance wagon and a signpost.
- A pastel cottage (enterable, kitchen and her bed inside) with a porch, chimney smoke, flower boxes and a cat flap
- The Cats' House: the old red barn turned into the cats' home (10 beds, 10 bowls, 5 litter boxes, cat tree,
  scratching post), plus a cat weathervane and hay bales outside
- **The Farmers Market**: a pink-and-white striped market stall (Whisker Supply Co.)
- Adoption visitors who wait by the path on adoption days
- A fenced garden plot (6 × 4 tiles), and a cat-eared scarecrow
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
| Sleep (wake at 6 AM) | E next to the cottage bed, or the Sleep button | Sleep button by the bed |
| Care for a cat | E next to the cat, then 1-7 | Use next to the cat, then a button |
| Cat stats card | click the cat | tap the cat |
| Shop / kennel care / adoption | E at the Farmers Market, a kennel, or a visitor | Use button |
| Cat Journal | J, or the Journal button | Journal button |
| Close a menu | Esc | the × button |
| Mute sounds | M, or the Sound button | Sound button |
| Chat with her | C, or click her | tap her |
| Emote wheel | T, or the Emotes button (1-8 to pick) | Emotes button |
| Dishes, wash hands, bath, toilet | E at the sinks, tub, toilet (E again to flush / hop out) | Use button |

## Run it locally
It's a plain static site with no build step. Serve the folder with any web server, for example:

```bash
cd website
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating the live site (cache busting)
Before every push, run `python3 tools/bump_version.py`. It stamps every JS module, the stylesheet and Three.js in
`index.html` with the same `?v=<version>` (through the import map), so visitors' browsers always load a matching
set of files and never mix old cached code with new. (Opening `index.html` straight from disk won't work, because browsers
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
js/cats.js          the cats: arrivals, needs, bond levels, behaviors, care actions, night pile
js/catModel.js      the low-poly cat model, its animations and floating name tags / icons
js/catData.js       the starter cats, personalities, favorite spots, vet issues and treatments
js/catMenu.js       the care menu that opens next to a cat
js/catsHouse.js     the Cats' House (old barn): 10 beds, 10 bowls, 5 litter boxes, cat tree
js/statsCard.js     the cat stats card (portrait, bars, condition, kennel care buttons)
js/shop.js          the Farmers Market stall and its shop card
js/adoption.js      adoption visitors, the adoption card and confirm step
js/vet.js           Welcome Vet Checks, naming card, cases: examine, diagnose, admit, kennel care, discharge
js/journal.js       the Cat Journal (profiles, vet cases, moments) and Vet Knowledge
js/time.js          the clock and day/night lighting
js/ui.js            status panel, hotbar, prompts, floating text
js/sound.js         little synthesized sound effects (Web Audio)
js/particles.js     dirt, water, seed and sparkle particles
js/clinic.js        Whisker Wellness Animal Hospital (enterable vet clinic + fading roof/walls)
js/collision.js     simple circle/box collisions and raised floors
js/catLady.js       Granny's model and her walk / idle / wave / blink animations
js/host.js          her personality: nameplate, speech bubble and everything she says
js/controls.js      keyboard, mouse orbit camera, zoom and the touch joystick
js/util.js          shared helpers (materials, seeded random numbers, canvas textures)
vendor/three/       Three.js r187 (MIT license)
assets/paw.svg      paw icon
screenshots/        preview images
tools/bump_version.py  cache-busting version stamp (run before deploying)
```

## Adding things later
- **Her lines**: edit the `LINES` lists in `js/host.js`.
- **New places**: build them in `js/world.js`, add collisions with `addCircle` / `addBox` from `js/collision.js`, and add a zone in `zones` so she comments on them.
- **More cats**: new arrivals are generated by `makeCatDef` in `js/catData.js` from `COATS` (a look from `LOOKS` in
  `js/catModel.js`), ages, personalities and sources. The three starters live in `STARTER_CATS`.
- **More vet cases**: add an issue to `ISSUES` in `js/catData.js` with its cue and clues per check, and a care plan in
  `PLANS` (first-day treatments, daily treatments, days of full care).
- **Real stakes (death from neglect)**: health already drops with neglect down to `NEGLECT.floor` in `js/cats.js`, and
  `CatManager.onDecline(c, hours)` is called every time a neglected cat sits at that floor. Set `NEGLECT.enabled`,
  lower the floor and fill in `onDecline` (and a memorial journal entry) when you're ready.
- `window.game` exposes the sim (`game.cats.list()`, `game.vet.cases()`, `game.journal.moments()`, debug helpers), including `game.food.count()`, `game.food.add(n)` and `game.food.consume(n)` for when the cats arrive and start eating.
- `window.ccl` in the browser console exposes the scene, camera, lady, world and a `teleport(x, z)` helper for testing.

## Sitting and coffee

- **Sit anywhere comfy:** the porch swing, the porch rocking chair, the three kitchen-table chairs, the living-room
  sofa and armchair, and the bench outside the clinic. Walk up and press **E** (or tap **Use**): she sits facing the right
  way. **E** again or just walk off to stand up. Her energy trickles back while she rests, and a friendly cat may hop
  up beside her (sofa, bench, swing) or curl up in her lap (chairs, armchair, rocker) for a little bond.
- **Granny's coffee:** the sage percolator on the kitchen counter. *Pour a cup of coffee* and she zooms at 1.8x speed
  for 45 seconds (speed lines, dust puffs, a ☕ countdown pill by the Save button). The pot takes 60 s to perk a fresh
  batch; no coffee at bedtime. The boost and the pot timer are saved with the game.

## Farmers Market, mailbox and deliveries

- **Farmers Market:** the striped roadside stand at the end of the drive, just outside the gate (across the drive from
  the mailbox). Same catalog as before (cat food bags, medicine, shots, bandages, seeds), but nothing lands in your apron:
  every order is **delivered**.
- **Delivery:** a little Farmers Market van pulls up on the road, the courier walks up the drive with a box, sets the
  parcel by the porch steps, waves and heads off (about 15 s). "Your Farmers Market order is on the porch 📦".
  Walk over and press E (**Open delivery**) to put it all away. Everything bought before he sets off (or while he's
  still walking up) rides in the same box; later buys go on the next trip. Deliveries run 6 AM-9 PM; late orders come
  first thing next morning. Pending orders and parcels on the porch are saved (a courier caught mid-walk by a reload
  just starts his trip again).
- **Mail:** each morning (and on the very first day) the seed club sends **3 random seed packets** (carrot most often,
  then cabbage, pumpkin, chamomile and catnip). The paw flag goes up, an envelope bobs over the mailbox and a big
  **You Got Mail! 📬** banner pops up. **Check the mail** at the mailbox to collect. The box holds up to 9 packets
  (3 days' worth), so missing a day or two is fine. The old free seed box is gone.

## Bathroom, running water, emotes and the hunger gag

- **Granny-chic bathroom:** pink/cream checker tiles, rosebud wallpaper over a sage wainscot, a pink clawfoot tub on brass claw feet (gooseneck faucet, lace shower ring, rubber duck, bath tray), a pull-chain high-tank toilet with an oak seat, a fluted pedestal sink, a gilt oval mirror, a crocheted toilet-roll doll, lace curtains, perfume bottles and a fern.
- **Running water:** `E` at the kitchen sink does the dishes (cooking leaves 2 dirty dishes, eating 1; at 8 the stove says wash up first) or washes her hands when the sink is clear. The bathroom sink washes hands. The tub fills for a bubble bath (energy comes back fast; `E` to hop out). The toilet: sit, then `E` to flush (pull chain + swirl). Sometimes a cat drinks from the toilet.
- **Longer days:** 6 AM to 6 PM runs at half speed (about 6 real minutes of daylight); evening to the 10 PM bedtime is unchanged.
- **Weeds:** a plowed plot left unused (not planted, watered or harvested) grows weeds on day 2 and goes back to grass at dawn on day 3. Planted crops are never affected.
- **Emote wheel:** `T` (or the Emotes button on mobile): smoke a ciggy (cough!), sip coffee, knitting (a cat bats the yarn), MY BABIES!, dance party (cats join), meow (cats meow back), shake fist at sky, nap (+energy). Walking cancels an emote.
- **Hunger gag:** at 15% hunger Granny complains and the hunger bar flashes. At 0 she keels over, every cat piles on ("nom nom" 😱), the screen fades and she wakes up in bed a few hours later (or next morning) a little poorer, with a journal entry. Cats never die. Chat with Granny moved to `C`.
