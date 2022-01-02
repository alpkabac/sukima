# RPG System
RPG System is a minigame heavily inspired from an old Duck Hunt IRC game  
Principe is simple: enemies spawn randomly, and you have to attack them to loot items that will allow you to kill the next ones better and faster

## Enemies Spawning
The RPG System will randomly spawn enemies  
![Enemy Spawning](https://i.imgur.com/Vb1zIz5.png)  
Those monsters will stay here for a certain time before "leaving" and be replaced by a new enemy

## Attacks
When an enemy is present, you can attack it by using the `!attack` command  
![Attack Command](https://i.imgur.com/YZDfdgp.png)  
Your command will then be read by the RPG System bot a few seconds later, and be removed and replaced by your generated attack:  
![Attack Message](https://i.imgur.com/rW3sYqP.png)  
The attack description will depend on your equipped items, and apply wounds to the enemy  
Those wounds will stack for every attack until the enemy is dead  
Once an enemy is dead, it will drop a random item on the floor depending on the enemy and its difficulty:  
![Looted Item](https://i.imgur.com/M0qDp6k.png)

## Items and Equipment
When an enemy drops an item, this item is dropped ***on the ground***, not in your inventory  
You'll have to `!take` the item into your backpack first in order to equip it, however, multiple items can be on the ground at the same time, and the `!take` command will take the oldest one first  
Slot numbers are mentioned in most command results when needed, in the example the item fell onto the slot `1` so the command to take it is `!take 1`:  
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
Item prices may vary a lot from generation to generation, let's say it's a feature and some shopkeepers just want some items more than others  

Now that you have gold, you can upgrade your backpack with the `!upgrade` command:
![Upgrade Command](https://i.imgur.com/y5np24E.png)  
First upgrade costs 99 gold, but price goes up exponentially each time you upgrade!

# Commands Cheat Sheet
```
!attack                   <= When a monster spawns, you can attack it using your weapon with this command (you start with no weapon)
!take <groundSlot?>       <= Grab item on the ground and put it in your backpack (groundSlot can be ommitted)
!sell                     <= Sells your **equipped weapon**
!sell <inventorySlot>     <= Sells the item in your inventory slot X
!drop <inventorySlot>     <= Drops the item in your inventory slot X
!look                     <= Shows the items on the floor that you can !grab
!inventory                <= Shows your inventory
!equipAr <inventorySlot>  <= Equips selected item as armor (you need to put the item slot **number**)
!equipAc <inventorySlot>  <= Equips selected item as accessory
!equipW <inventorySlot>   <= Equips selected item as weapon
!unequipAr                <= Unequips armor
!unequipAc                <= Unequips accessory
!unequipW                 <= Unequips weapon
!upgrade                  <= Upgrades your backpack size (gives 1 new slot per upgrade, upgrade cost is exponential)
```