# RPG System

RPG System is a minigame heavily inspired from an old Duck Hunt IRC game  
Principe is simple: enemies spawn randomly, and you have to attack them to loot items that will allow you to kill the
next ones better and faster


# Commands Cheat Sheet

| Command      | Alias | Description |
| --- | ----------- | ----------- |
| !attack | !atk |  When a monster spawns, you can attack it using your weapon with this command |
| !attack `playerName` |  |  Also works with players |
| !heal |  |  Will use your heal item on yourself, requires an item equipped in the heal slot |
| !heal `playerName` |  |  Can also heal/resurrect players (or at least try), requires an item equipped in the heal slot |
| !take | !grab |  Grabs the last item that fell on the ground and puts it in your backpack |
| !take `groundSlot` |  |  Grabs item on the ground slot `groundSlot` and puts it in your backpack |
| !sell |  |  Sells the last item in your backpack (only available when the travelling merchant is present) |
| !sell `inventorySlot` |  |  Sells the item in your inventory slot `inventorySlot` (only available when the travelling merchant is present) |
| !drop |  |  Drops the last item in your backpack |
| !drop `inventorySlot` |  |  Drops the last item in your backpack |
| !look |  |  Shows the items on the floor that you can !take |
| !look `playerName` |  |  Shows the visible informations of a player |
| !equipWeapon `inventorySlot` | !equipW, !ew |  Equips selected item as weapon |
| !equipArmor `inventorySlot` | !equipAr, !ear |  Equips selected item as armor |
| !equipAccessory `inventorySlot` | !equipAc, !eac |  Equips selected item as accessory |
| !equipHeal `inventorySlot` | !equipH, !eh |  Equips selected item as heal item |
| !unequipWeapon | !unequipW, !uew |  Unequips weapon |
| !unequipArmor | !unequipAr, !uear |  Unequips armor |
| !unequipAccessory | !unequipAc, !ueac |  Unequips accessory |
| !unequipHeal | !unequipH, !ueh |  Unequips heal item |
| !inspect `inventorySlot` | !ins |  Shows the item's image, or generates it if there is none yet |
| !reinspect `inventorySlot` | !rei |  Re-inspects an item for 10k gold, regenerating its image |
| !upgradeBackpack | !upgrade |  Upgrades your backpack size (gives 1 new slot per upgrade, upgrade cost is exponential) |
| !setGender `male/female` |  |  Set your character gender for better third person generated text |
| !resurrect |  |  Resurrects you, BUT costs you a backpack slot that you'll have to buy again |
| !forSale `inventorySlot` `price` |  |  Puts an item for sale |
| !notForSale `inventorySlot` |  |  Removes for sale status on an item |
| !buy `playerName` `inventorySlot` |  |  Buys an item from player |
| !shop |  | See all items to sell |


# Tutorial
## Enemies Spawning

The RPG System will randomly spawn enemies  
![Enemy Spawning](https://i.imgur.com/Vb1zIz5.png)  
Those monsters will stay here for a certain time before "leaving" and be replaced by a new enemy

## Attacks

When an enemy is present, you can attack it by using the `!attack` command  
![Attack Command](https://i.imgur.com/YZDfdgp.png)  
Your command will then be read by the RPG System bot a few seconds later, and be removed and replaced by your generated
attack:  
![Attack Message](https://i.imgur.com/rW3sYqP.png)  
The attack description will depend on your equipped items, and apply wounds to the enemy  
Those wounds will stack for every attack until the enemy is dead  
Once an enemy is dead, it will drop a random item on the floor depending on the enemy and its difficulty:  
![Looted Item](https://i.imgur.com/M0qDp6k.png)

## Items and Equipment

When an enemy drops an item, this item is dropped ***on the ground***, not in your inventory  
You'll have to `!take` the item into your backpack first in order to equip it, however, multiple items can be on the
ground at the same time, and the `!take` command will take the newest one first  
Slot numbers are mentioned in most command results when needed, in the example the item fell onto the slot `1` so the
command to take it is `!take 1`:  
![Take Command](https://i.imgur.com/ZJHLn56.png)  
(notice that the item went into the backpack slot number `0`)

Then, you can equip it with one of those three commands:

- `!equipWeapon <backpackSlot>` or `!equipW <backpackSlot>`
- `!equipArmor <backpackSlot>` or `!equipAr <backpackSlot>`
- `!equipAccessory <backpackSlot>` or `!equipAc <backpackSlot>`

So `!equipW 0` in our example would equip out newly looted Epic Longsword as a weapon:  
![Equipped Weapon](https://i.imgur.com/HSXeo2X.png)

Of course, you can also unequip any item using the counterpart commands:

- `!unequipWeapon` or `!unequipW`
- `!unequipArmor` or `!unequipAr`
- `!unequipAccessory` or `!unequipAc`

## Look for items on the floor!

Sometimes, players kill monsters without taking the loot, so there might be items for you to pick for free!  
To see what items are on the ground, you can use the `!look` command:  
![Look Command](https://i.imgur.com/NqEPEiC.png)  
You can then use the number on the left of the item in your `!take <groundSlot>` command to pick the one you want

## Player Inventory and Gold

Each player has its own backpack, used to hold items that you want to keep  
Backpack size starts at only 1, but you can upgrade it using gold

You can use the `!inventory` command to check your inventory and other player information:  
![Inventory Command](https://i.imgur.com/To2bxQU.png)

### How to get gold then?

By selling items from your backpack with the `!sell <backpackSlot>` command!
It will sell your item and generate a price depending on the item:  
![Selling Items](https://i.imgur.com/XsQK8XY.png)  
Item prices may vary a lot from generation to generation, let's say it's a feature and some shopkeepers just want some
items more than others  
This command is only available when the travelling merchant is present, so keep an eye open for him.

Now that you have gold, you can upgrade your backpack with the `!upgrade` command:  
![Upgrade Command](https://i.imgur.com/y5np24E.png)  
First upgrade costs 99 gold, but price goes up exponentially each time you upgrade!

### How do I buy stuff?
You can use `!shop` to list all the items for sale from all players and the travelling merchant, when he's there.